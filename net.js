// net.js - Online 1v1 networking: PeerJS (WebRTC, peer-to-peer) + deterministic lockstep.
//
// How it works
//  * The host makes a 4-letter room code. The guest types it in. PeerJS's free cloud server only introduces the two
//    browsers; after that, all game data goes directly browser <-> browser (lowest possible lag, no server cost).
//  * Both browsers run the SAME simulation. Each frame they exchange only the players' button presses.
//    A small "input delay" (Net.delay frames) hides the network latency, so the game stays smooth.
//  * If the other player's input for a frame has not arrived yet, the game waits (stalls) instead of guessing.
//  * Every 30 frames a hash of the game state is compared; a mismatch shows a DESYNC warning.
//
// This file has no Phaser code, so it can be tested in plain Node (see tests/net.test.js).

const NET_ROOM_PREFIX = 'mybrawl-';                  // PeerJS id = prefix + 4-letter code
const NET_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';  // no I / O so codes are easy to read out loud
const NET_STEP_MS = 1000 / 60;

// ---- button state <-> integer ----
const NET_BIT = { left: 1, right: 2, up: 4, down: 8, downHeld: 16, jump: 32, throwWeapon: 64, dodge: 128, light: 256, heavy: 512, rematch: 1024 };

function netEncodeInput(i, rematch) {
  let m = 0;
  if (i.left) m |= NET_BIT.left;
  if (i.right) m |= NET_BIT.right;
  if (i.up) m |= NET_BIT.up;
  if (i.down) m |= NET_BIT.down;
  if (i.downHeld) m |= NET_BIT.downHeld;
  if (i.jump) m |= NET_BIT.jump;
  if (i.throwWeapon) m |= NET_BIT.throwWeapon;
  if (i.dodge) m |= NET_BIT.dodge;
  if (i.attack === 'light') m |= NET_BIT.light;
  if (i.attack === 'heavy') m |= NET_BIT.heavy;
  if (rematch) m |= NET_BIT.rematch;
  return m;
}

function netDecodeInput(m) {
  return {
    left: !!(m & NET_BIT.left), right: !!(m & NET_BIT.right), up: !!(m & NET_BIT.up),
    down: !!(m & NET_BIT.down), downHeld: !!(m & NET_BIT.downHeld),
    jump: !!(m & NET_BIT.jump),
    attack: (m & NET_BIT.heavy) ? 'heavy' : ((m & NET_BIT.light) ? 'light' : null),
    throwWeapon: !!(m & NET_BIT.throwWeapon),
    dodge: !!(m & NET_BIT.dodge),
  };
}

// ---- seeded random (both players get the SAME sequence) ----
function netMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =====================================================================================
// Lockstep: pure logic, no networking inside. `send(msg)` is supplied by the caller.
// =====================================================================================
class Lockstep {
  constructor(localIdx, delay, send) {
    this.localIdx = localIdx;        // 0 = host (P1), 1 = guest (P2)
    this.delay = delay;
    this.send = send;
    this.frame = 0;                  // next frame to simulate
    this.buf = [new Map(), new Map()];
    this.sampledTo = -1;             // highest frame we have already sampled our own input for
    this.stalls = 0;                 // consecutive stalled attempts
    this.totalStalls = 0;
    this.localHash = new Map();
    this.remoteHash = new Map();
    this.desync = false;
    this.desyncFrame = -1;
    // frames 0..delay-1 have no real input yet: both sides use "nothing pressed"
    for (let f = 0; f < delay; f++) {
      this.buf[localIdx].set(f, 0);
      this.send({ t: 'i', f, m: 0 });
    }
    this.sampledTo = delay - 1;
  }

  receive(msg) {
    const remote = 1 - this.localIdx;
    if (msg.t === 'i') {
      if (msg.f >= this.frame) this.buf[remote].set(msg.f, msg.m | 0);
    } else if (msg.t === 'h') {
      this.remoteHash.set(msg.f, msg.h);
      this._compare(msg.f);
    }
  }

  // Try to run one frame. sample() returns this machine's button mask. Returns [maskP1, maskP2] or null (must wait).
  advance(sample) {
    const F = this.frame;
    if (this.sampledTo < F + this.delay) {
      const m = sample() | 0;
      this.buf[this.localIdx].set(F + this.delay, m);
      this.send({ t: 'i', f: F + this.delay, m });
      this.sampledTo = F + this.delay;
    }
    const a = this.buf[0].get(F), b = this.buf[1].get(F);
    if (a === undefined || b === undefined) {
      this.stalls++; this.totalStalls++;
      return null;
    }
    this.buf[0].delete(F); this.buf[1].delete(F);
    this.stalls = 0;
    this.frame++;
    return [a, b];
  }

  // call after simulating; h = hash of the game state. Compared every 30 frames.
  reportHash(h) {
    if (this.frame % 30 !== 0) return;
    this.localHash.set(this.frame, h);
    this.send({ t: 'h', f: this.frame, h });
    this._compare(this.frame);
  }

  _compare(f) {
    if (!this.localHash.has(f) || !this.remoteHash.has(f)) return;
    if (this.localHash.get(f) !== this.remoteHash.get(f) && !this.desync) { this.desync = true; this.desyncFrame = f; }
    this.localHash.delete(f); this.remoteHash.delete(f);
  }
}

// =====================================================================================
// Net: PeerJS connection + room + handshake. One global instance `Net`.
// =====================================================================================
const Net = {
  // state: 'idle' | 'hosting' | 'joining' | 'connected' | 'closed'
  state: 'idle',
  role: null,            // 'host' | 'guest'
  code: '',
  error: '',
  peer: null,
  conn: null,
  lock: null,            // Lockstep (exists during a match)
  seed: 1,
  rtt: 0,                // ms, smoothed
  lastRecv: 0,
  remoteSel: null,       // opponent's character/map choice in the select screen
  startMsg: null,        // set when 'start' arrives (guest)
  wantRematch: false,
  pending: [],           // frames that arrived before our own Game scene started
  handlers: {},          // optional callbacks: onState, onSelect, onStart

  get localIdx() { return this.role === 'host' ? 0 : 1; },

  peerOptions() {
    return (typeof window !== 'undefined' && window.PEER_OPTIONS) ? window.PEER_OPTIONS : {};
  },

  available() { return typeof Peer !== 'undefined'; },

  makeCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += NET_CODE_CHARS[Math.floor(Math.random() * NET_CODE_CHARS.length)];
    return c;
  },

  _setState(s, err) {
    this.state = s;
    if (err !== undefined) this.error = err;
    if (this.handlers.onState) this.handlers.onState(s);
  },

  reset() {
    this.close();
    this.state = 'idle'; this.role = null; this.code = ''; this.error = '';
    this.lock = null; this.rtt = 0; this.remoteSel = null; this.startMsg = null; this.wantRematch = false; this.pending = [];
  },

  close() {
    try { if (this.conn && this.conn.open) this.conn.send({ t: 'bye' }); } catch (e) {}
    try { if (this.conn) this.conn.close(); } catch (e) {}
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
    this.conn = null; this.peer = null;
    if (this._ping) { clearInterval(this._ping); this._ping = null; }
  },

  // ---------------------------------------------------------------- host
  host(tries = 0) {
    this.reset();
    if (!this.available()) { this._setState('closed', 'Online library (PeerJS) failed to load. Check your internet connection and reload the page.'); return; }
    this.role = 'host';
    this.code = this.makeCode();
    this._setState('hosting', '');
    const peer = new Peer(NET_ROOM_PREFIX + this.code, this.peerOptions());
    this.peer = peer;
    peer.on('open', () => { if (this.handlers.onOpen) this.handlers.onOpen(this.code); });
    peer.on('connection', (conn) => {
      if (this.conn) {   // room is 1v1 only: tell the third person and hang up
        const refuse = () => { try { conn.send({ t: 'full' }); setTimeout(() => { try { conn.close(); } catch (e) {} }, 300); } catch (e) {} };
        if (conn.open) refuse(); else conn.on('open', refuse);
        return;
      }
      this._attach(conn);
    });
    peer.on('error', (e) => {
      if (e && e.type === 'unavailable-id' && tries < 5) { try { peer.destroy(); } catch (x) {} this.host(tries + 1); return; }   // code already taken: pick another
      this._setState('closed', this._explain(e));
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });   // lost the signalling server only; the game link is separate
  },

  // ---------------------------------------------------------------- guest
  join(code) {
    this.reset();
    if (!this.available()) { this._setState('closed', 'Online library (PeerJS) failed to load. Check your internet connection and reload the page.'); return; }
    this.role = 'guest';
    this.code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    this._setState('joining', '');
    const peer = new Peer(this.peerOptions());
    this.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(NET_ROOM_PREFIX + this.code, { reliable: true });
      this._attach(conn);
      this._joinTimer = setTimeout(() => { if (this.state === 'joining') { this._setState('closed', 'Could not connect. Check the room code, or try again (some networks block direct connections).'); this.close(); } }, 15000);
    });
    peer.on('error', (e) => this._setState('closed', this._explain(e)));
  },

  _explain(e) {
    const t = e && e.type;
    if (t === 'peer-unavailable') return 'Room not found. Check the code (the host must stay on the waiting screen).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Cannot reach the matchmaking server. Check your internet connection.';
    if (t === 'browser-incompatible') return 'This browser does not support WebRTC.';
    return 'Connection error' + (t ? ' (' + t + ')' : '') + '.';
  },

  _attach(conn) {
    this.conn = conn;
    const opened = () => {
      clearTimeout(this._joinTimer);
      this.lastRecv = Date.now();
      this._setState('connected');
      this._startPing();
    };
    if (conn.open) opened(); else conn.on('open', opened);
    conn.on('data', (msg) => this._onData(msg));
    conn.on('close', () => { if (this.state !== 'idle') this._setState('closed', this.error || 'Opponent disconnected.'); });
    conn.on('error', () => { if (this.state !== 'idle') this._setState('closed', this.error || 'Connection lost.'); });
  },

  _startPing() {
    if (this._ping) clearInterval(this._ping);
    this._ping = setInterval(() => {
      this.sendMsg({ t: 'p', ts: Date.now() });
      if (this.state === 'connected' && Date.now() - this.lastRecv > 8000) this._setState('closed', 'Connection timed out.');
    }, 1000);
  },

  sendMsg(msg) {
    try { if (this.conn && this.conn.open) this.conn.send(msg); } catch (e) {}
  },

  _onData(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastRecv = Date.now();
    switch (msg.t) {
      case 'i': case 'h': if (this.lock) this.lock.receive(msg); else this.pending.push(msg); break;   // opponent can start a moment before us
      case 'p': this.sendMsg({ t: 'q', ts: msg.ts }); break;
      case 'q': { const r = Date.now() - msg.ts; this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r; break; }
      case 'sel': this.remoteSel = msg; if (this.handlers.onSelect) this.handlers.onSelect(msg); break;
      case 'start': this.startMsg = msg; this.seed = msg.seed; if (this.handlers.onStart) this.handlers.onStart(msg); break;
      case 'full': this._setState('closed', 'That room already has two players.'); break;
      case 'bye': this._setState('closed', 'Opponent left the match.'); break;
    }
  },

  // ---------------------------------------------------------------- match
  inputDelay() {
    // one-way latency in frames + 2 frames of safety, between 3 (50ms) and 10 (167ms)
    const oneWay = (this.rtt || 80) / 2;
    return Math.max(3, Math.min(10, Math.ceil(oneWay / NET_STEP_MS) + 2));
  },

  // Called by both sides right before the Game scene starts. (Host also calls announceStart first.)
  beginMatch(delay) {
    this.lock = new Lockstep(this.localIdx, delay || this.inputDelay(), (m) => this.sendMsg(m));
    this.wantRematch = false;
    const queued = this.pending; this.pending = [];
    queued.forEach((m) => this.lock.receive(m));
  },

  // host only: choose seed + settings and tell the guest
  announceStart(settings) {
    this.seed = (Math.floor(Math.random() * 0x7fffffff) + 1) | 0;
    const msg = Object.assign({ t: 'start', seed: this.seed }, settings);
    this.sendMsg(msg);
    return msg;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Lockstep, Net, netEncodeInput, netDecodeInput, netMulberry32, NET_BIT };
}
