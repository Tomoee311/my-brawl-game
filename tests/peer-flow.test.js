// Tests Net (room code, join, handshake, match start, disconnect) against an in-memory fake of the PeerJS API.
const assert = require('assert'), EventEmitter = require('events');
const registry = new Map();
class Conn extends EventEmitter {
  constructor(peer, remoteId) { super(); this.peer = peer; this.remoteId = remoteId; this.open = false; this.other = null; }
  send(m) { const o = this.other; setTimeout(() => o && o.open && o.emit('data', JSON.parse(JSON.stringify(m))), 2); }
  close() { if (!this.open) return; this.open = false; const o = this.other; setTimeout(() => { if (o && o.open) { o.open = false; o.emit('close'); } }, 2); }
}
global.Peer = class Peer extends EventEmitter {
  constructor(id) {
    super();
    this.id = id || 'anon-' + Math.random().toString(36).slice(2); this.open = false; this.destroyed = false;
    setTimeout(() => {
      if (registry.has(this.id)) { this.emit('error', { type: 'unavailable-id' }); return; }
      registry.set(this.id, this); this.open = true; this.emit('open', this.id);
    }, 1);
  }
  connect(id) {
    const c = new Conn(this, id);
    setTimeout(() => {
      const target = registry.get(id);
      if (!target) { this.emit('error', { type: 'peer-unavailable' }); return; }
      const c2 = new Conn(target, this.id); c.other = c2; c2.other = c; c.open = c2.open = true;
      target.emit('connection', c2); c.emit('open');
    }, 3);
    return c;
  }
  destroy() { registry.delete(this.id); this.destroyed = true; }
  reconnect() {}
};
const { Net: NetBase, netDecodeInput, NET_BIT } = require('../net.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = () => { const n = Object.create(NetBase); n.pending = []; n.handlers = {}; return n; };

(async () => {
  const H = mk(), G = mk();
  H.host();
  await wait(20);
  assert.strictEqual(H.state, 'hosting'); assert.ok(/^[A-Z]{4}$/.test(H.code), 'room code looks like ABCD: ' + H.code);
  console.log('ok  host gets room code ' + H.code);

  G.join(H.code.toLowerCase());                  // lowercase typing must work
  await wait(30);
  assert.strictEqual(H.state, 'connected'); assert.strictEqual(G.state, 'connected');
  console.log('ok  guest joined with the code; both connected');

  G.sendMsg({ t: 'sel', char: 'thiri', ready: true, map: 'random' });
  await wait(10);
  assert.strictEqual(H.remoteSel.char, 'thiri'); assert.strictEqual(H.remoteSel.ready, true);
  console.log('ok  selection message delivered');

  let guestStart = null; G.handlers.onStart = (m) => { guestStart = m; };
  const msg = H.announceStart({ p1: 'kyaw', p2: 'thiri', map: 'pagoda' });
  H.beginMatch(4);                                // host starts first and already sends frames
  await wait(20);
  assert.ok(guestStart && guestStart.seed === msg.seed && guestStart.map === 'pagoda'); assert.strictEqual(G.seed, H.seed);
  G.beginMatch(4);                                // guest starts later: early frames must have been buffered
  assert.ok(G.lock.buf[0].size > 0, 'early host frames were buffered');
  console.log('ok  start message + same seed (' + H.seed + '); early frames buffered');

  // play 120 frames through the real lockstep over the fake network
  const log = [];
  for (let i = 0; i < 120; i++) {
    for (const [N, who] of [[H, 0], [G, 1]]) {
      const r = N.lock.advance(() => (who === 0 ? NET_BIT.left : NET_BIT.right | NET_BIT.light));
      if (r) log.push([who, N.lock.frame, r]);
    }
    await wait(3);
  }
  const hf = log.filter((l) => l[0] === 0), gf = log.filter((l) => l[0] === 1);
  const n = Math.min(hf.length, gf.length);
  assert.ok(n > 60, 'game advanced: ' + n);
  for (let i = 0; i < n; i++) assert.deepStrictEqual(hf[i][2], gf[i][2]);
  const last = hf[n - 1][2];
  assert.ok(netDecodeInput(last[0]).left && netDecodeInput(last[1]).attack === 'light');
  console.log('ok  ' + n + ' frames identical on both sides; P1=left, P2=right+light');

  // stale packets from a finished match are ignored; repick reaches the other side
  G.endMatch(); H.endMatch();
  G.handlers.onRepick = () => { G.gotRepick = true; };
  H.requestRepick(); await wait(10);
  assert.ok(G.repickFlag && G.gotRepick && G.remoteSel === null, 'guest got the repick request');
  const oldSeed = H.seed; H.announceStart({ p1: 'kyaw', p2: 'thiri', map: 'pagoda' }); await wait(10);
  assert.notStrictEqual(G.seed, oldSeed);
  G.pending = []; G._onData({ t: 'i', f: 5, m: 1, k: oldSeed });
  assert.strictEqual(G.pending.length, 0, 'old-match packet dropped');
  G.endMatch(); G.beginMatch(4);
  console.log('ok  repick delivered; old-match packets dropped; new match starts clean');

  // third player is refused
  const X = mk(); X.join(H.code); await wait(30);
  assert.strictEqual(X.state, 'closed'); assert.ok(/two players/.test(X.error), X.error);
  console.log('ok  third player refused: "' + X.error + '"');

  // wrong code
  const Y = mk(); Y.join('ZZZZ'); await wait(30);
  assert.strictEqual(Y.state, 'closed'); assert.ok(/not found/i.test(Y.error), Y.error);
  console.log('ok  wrong code: "' + Y.error + '"');

  // opponent leaves
  G.close(); await wait(20);
  assert.strictEqual(H.state, 'closed'); console.log('ok  host notices disconnect: "' + H.error + '"');
  H.reset();
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
