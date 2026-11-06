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

const NET_HOLD_MASK = NET_BIT.left | NET_BIT.right | NET_BIT.up | NET_BIT.downHeld;   // buttons that stay down (the rest are one-shot taps)

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

  // Change this side's input delay while the match runs (the other side needs no coordination: inputs are keyed by frame).
  // Raising it fills the gap with the latest held buttons (one-shot presses are NOT repeated). Lowering it just pauses sampling for a few frames.
  setDelay(d) {
    d = Math.max(1, d | 0);
    if (d === this.delay) return;
    if (d > this.delay) {
      const last = this.buf[this.localIdx].get(this.sampledTo);
      const held = (last === undefined ? 0 : last) & NET_HOLD_MASK;
      for (let f = this.sampledTo + 1; f <= this.frame + d; f++) {
        this.buf[this.localIdx].set(f, held);
        this.send({ t: 'i', f, m: held });
      }
      this.sampledTo = this.frame + d;
    }
    this.delay = d;
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
  repickFlag: false,     // opponent asked to go back to hero select after a match
  jitter: 0,             // ms, smoothed |rtt - average|
  extra: 0,              // extra input-delay frames the opponent asked for after it kept waiting for us
  routeInfo: '',         // debug: which candidate types each side gathered
  noStun: false,
  route: '',             // 'DIRECT' | 'RELAY' once known (relay = traffic goes through a TURN server = more lag)
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
    this.lock = null; this.rtt = 0; this.jitter = 0; this.extra = 0; this.route = ''; this.routeInfo = ''; this.noStun = false; this.repickFlag = false;
    this.remoteSel = null; this.startMsg = null; this.wantRematch = false; this.pending = [];
  },

  // leave a finished match but keep the connection (rematch with new heroes)
  endMatch() {
    this.lock = null; this.pending = []; this.wantRematch = false; this.repickFlag = false; this.extra = 0;
  },

  // after a match: both players go back to the hero/stage select screen
  requestRepick() {
    this.remoteSel = null;
    this.endMatch();
    this.sendMsg({ t: 'repick' });
  },

  close() {
    const conn = this.conn, peer = this.peer;
    try { if (conn && conn.open) conn.send({ t: 'bye' }); } catch (e) {}
    // give the 'bye' a moment to leave before hanging up, so the opponent learns that we left on purpose
    const hangUp = () => { try { if (conn) conn.close(); } catch (e) {} try { if (peer) peer.destroy(); } catch (e) {} };
    if (conn && conn.open) setTimeout(hangUp, 200); else hangUp();
    this.conn = null; this.peer = null;
    clearTimeout(this._joinTimer);
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
    this._ticks = 0; this._lastStalls = 0; this._calm = 0; this._slowAt = 0; this._lastSlowMsg = 0;
    this._ping = setInterval(() => {
      this._ticks++;
      this.sendMsg({ t: 'p', ts: Date.now() });
      if (this.state === 'connected' && Date.now() - this.lastRecv > 8000) this._setState('closed', 'Connection timed out.');
      this._adapt();
      if (this._ticks === 4 || this._ticks % 10 === 0) this._probeRoute();   // keep re-checking: ICE may upgrade RELAY -> DIRECT later
    }, 500);
  },

  // Re-tune the input delay during a match from the measured ping + jitter, and from how often the OTHER side kept waiting for us.
  _adapt() {
    if (!this.lock) return;
    const now = Date.now();
    // we waited for the opponent's input several times in the last 0.5 s -> ask them to send further ahead
    const st = this.lock.totalStalls;
    if (st - this._lastStalls >= 2 && now - this._lastSlowMsg > 1000) { this.sendMsg({ t: 'slow' }); this._lastSlowMsg = now; }
    this._lastStalls = st;
    // the requested extra frames fade away again after 10 quiet seconds
    if (this.extra > 0 && now - this._slowAt > 10000) { this.extra--; this._slowAt = now; }
    const want = this.inputDelay(), cur = this.lock.delay;
    if (want > cur) { this.lock.setDelay(want); this._calm = 0; }
    else if (want < cur) { if (++this._calm >= 6) { this.lock.setDelay(cur - 1); this._calm = 0; } }   // lower it slowly (3 s), one frame at a time
    else this._calm = 0;
  },

  // Is the connection direct (peer-to-peer) or going through a relay server? Relay = noticeably more lag.
  _probeRoute() {
    try {
      const pc = this.conn && this.conn.peerConnection;
      if (!pc || !pc.getStats) return;
      pc.getStats().then((stats) => {
        const byId = {}; let pairId = null, pair = null;
        const lt = {}, rt = {};   // candidate types gathered on each side (host / srflx / prflx / relay)
        stats.forEach((r) => {
          byId[r.id] = r;
          if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
          if (r.type === 'local-candidate' && r.candidateType) lt[r.candidateType] = 1;
          if (r.type === 'remote-candidate' && r.candidateType) rt[r.candidateType] = 1;
        });
        this.routeInfo = 'you:' + (Object.keys(lt).join('+') || 'none') + ' / them:' + (Object.keys(rt).join('+') || 'none');
        this.noStun = !lt.srflx && !lt.prflx;   // we never got a public address -> STUN blocked/failed on our side
        if (pairId) pair = byId[pairId];
        if (!pair) stats.forEach((r) => { if (!pair && r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = r; });
        if (!pair) return;
        const l = byId[pair.localCandidateId], r = byId[pair.remoteCandidateId];
        this.route = ((l && l.candidateType === 'relay') || (r && r.candidateType === 'relay')) ? 'RELAY' : 'DIRECT';
      }).catch(() => {});
    } catch (e) {}
  },

  sendMsg(msg) {
    try { if (this.conn && this.conn.open) this.conn.send(msg); } catch (e) {}
  },

  _onData(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastRecv = Date.now();
    switch (msg.t) {
      case 'i': case 'h':
        if (msg.k !== this.seed) break;     // leftover packet from a previous match
        if (this.lock) this.lock.receive(msg); else this.pending.push(msg);   // opponent can start a moment before us
        break;
      case 'p': this.sendMsg({ t: 'q', ts: msg.ts }); break;
      case 'q': {
        const r = Date.now() - msg.ts;
        if (!this.rtt) { this.rtt = r; this.jitter = 0; }
        else { this.jitter = this.jitter * 0.8 + Math.abs(r - this.rtt) * 0.2; this.rtt = this.rtt * 0.7 + r * 0.3; }
        break;
      }
      case 'slow': if (Date.now() - this._slowAt > 1000) { this.extra = Math.min(6, this.extra + 1); this._slowAt = Date.now(); } break;
      case 'repick': this.remoteSel = null; this.repickFlag = true; if (this.handlers.onRepick) this.handlers.onRepick(); break;
      case 'sel': this.remoteSel = msg; if (this.handlers.onSelect) this.handlers.onSelect(msg); break;
      case 'start': this.startMsg = msg; this.seed = msg.seed; if (this.handlers.onStart) this.handlers.onStart(msg); break;
      case 'full': this._setState('closed', 'That room already has two players.'); break;
      case 'bye': this._setState('closed', 'Opponent left the match.'); break;
    }
  },

  // ---------------------------------------------------------------- match
  inputDelay() {
    // one-way latency + a jitter margin, in frames (+1 safety), plus whatever the opponent asked for. 2 (33ms) .. 12 (200ms)
    const oneWay = (this.rtt || 80) / 2;
    const base = Math.ceil((oneWay + 1.5 * this.jitter) / NET_STEP_MS) + 1;
    return Math.max(2, Math.min(12, base + this.extra));
  },

  // Called by both sides right before the Game scene starts. (Host also calls announceStart first.)
  beginMatch(delay) {
    this.lock = new Lockstep(this.localIdx, delay || this.inputDelay(), (m) => { m.k = this.seed; this.sendMsg(m); });   // k = match id, so old packets can be told apart
    this.wantRematch = false;
    this._lastStalls = 0; this._calm = 0;
    const queued = this.pending; this.pending = [];
    queued.forEach((m) => { if (m.k === this.seed) this.lock.receive(m); });
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
