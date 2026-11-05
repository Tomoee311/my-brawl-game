// Run: node tests/net.test.js
// Simulates two browsers + a laggy network and checks that the lockstep keeps both game states identical.
const assert = require('assert');
const { Lockstep, netEncodeInput, netDecodeInput, netMulberry32 } = require('../net.js');

function runScenario({ name, latencyMs, jitterMs, delayA, delayB, hzA, hzB, seconds, breakAt }) {
  let now = 0;
  const rng = netMulberry32(12345);
  const wires = { toA: [], toB: [] };           // ordered (reliable) channels with per-message arrival time
  const mkSend = (queue) => {
    let last = 0;
    return (m) => {
      const t = Math.max(last, now + latencyMs + rng() * jitterMs);   // FIFO: never overtakes
      last = t;
      queue.push({ t, m: JSON.parse(JSON.stringify(m)) });
    };
  };
  const A = { ls: new Lockstep(0, delayA, mkSend(wires.toB)), state: 0, acc: 0, frames: 0, hz: hzA, ai: netMulberry32(1) };
  const B = { ls: new Lockstep(1, delayB, mkSend(wires.toA)), state: 0, acc: 0, frames: 0, hz: hzB, ai: netMulberry32(2) };
  // fake game: state mixes both players' inputs; includes a seeded "random" the way weapon spawns do
  const simRngA = netMulberry32(777), simRngB = netMulberry32(777);
  A.rng = simRngA; B.rng = simRngB;
  const step = (M, masks) => {
    M.state = (Math.imul(M.state ^ masks[0], 2654435761) + masks[1] * 31 + Math.floor(M.rng() * 1000)) >>> 0;
    M.frames++;
  };
  const sampler = (M) => () => (M.ai() < 0.3 ? 1 : 0) | (M.ai() < 0.1 ? 32 : 0) | (M.ai() < 0.05 ? 256 : 0);
  const sa = sampler(A), sb = sampler(B);
  const deliver = (queue, M) => { while (queue.length && queue[0].t <= now) M.ls.receive(queue.shift().m); };
  const nextRender = { A: 0, B: 0 };
  let maxStall = 0;
  for (now = 0; now < seconds * 1000; now += 1) {
    deliver(wires.toA, A); deliver(wires.toB, B);
    for (const [M, key, samp] of [[A, 'A', sa], [B, 'B', sb]]) {
      if (now < nextRender[key]) continue;
      nextRender[key] = now + 1000 / M.hz;             // one "render frame"
      M.acc = Math.min(M.acc + 1000 / M.hz, 100);
      while (M.acc >= 1000 / 60) {
        const r = M.ls.advance(samp);
        if (!r) { maxStall = Math.max(maxStall, M.ls.stalls); break; }
        step(M, r);
        if (breakAt && M === B && M.frames === breakAt) M.state ^= 1;   // inject a desync
        M.ls.reportHash(M.state);
        M.acc -= 1000 / 60;
      }
    }
  }
  const diff = Math.abs(A.frames - B.frames);
  return { name, A, B, diff, desync: A.ls.desync || B.ls.desync, stalls: [A.ls.totalStalls, B.ls.totalStalls] };
}

function check(r, expectDesync) {
  // both machines must have simulated nearly the same frame count; compare state at the shared frame count via re-run is not
  // possible here, so compare once both stopped at equal frames: run is long, so assert the desync detector agrees.
  assert.strictEqual(r.desync, !!expectDesync, r.name + ': desync flag');
  assert.ok(r.diff <= Math.max(r.A.ls.delay, r.B.ls.delay) + 2, r.name + ': frame counts drifted apart ' + r.diff);
  assert.ok(r.A.frames > 60 * 5, r.name + ': game barely advanced (' + r.A.frames + ' frames)');
  console.log('ok  ' + r.name.padEnd(46) + ' frames A/B = ' + r.A.frames + '/' + r.B.frames + '  stalls ' + r.stalls.join('/') + (r.desync ? '  (desync detected at frame ' + r.A.ls.desyncFrame + ')' : ''));
}

check(runScenario({ name: 'LAN 5ms, delay 3, both 60Hz', latencyMs: 5, jitterMs: 2, delayA: 3, delayB: 3, hzA: 60, hzB: 60, seconds: 20 }));
check(runScenario({ name: 'Internet 40ms+jitter, delay 4', latencyMs: 40, jitterMs: 20, delayA: 4, delayB: 4, hzA: 60, hzB: 60, seconds: 20 }));
check(runScenario({ name: 'Far away 120ms+jitter, delay 8', latencyMs: 120, jitterMs: 40, delayA: 8, delayB: 8, hzA: 60, hzB: 60, seconds: 20 }));
check(runScenario({ name: '144Hz vs 60Hz monitors', latencyMs: 30, jitterMs: 10, delayA: 4, delayB: 4, hzA: 144, hzB: 60, seconds: 20 }));
check(runScenario({ name: '30fps slow PC vs 60Hz', latencyMs: 30, jitterMs: 10, delayA: 4, delayB: 4, hzA: 30, hzB: 60, seconds: 20 }));
check(runScenario({ name: 'different input delays (3 vs 7)', latencyMs: 50, jitterMs: 15, delayA: 3, delayB: 7, hzA: 60, hzB: 75, seconds: 20 }));
check(runScenario({ name: 'injected desync is detected', latencyMs: 30, jitterMs: 5, delayA: 4, delayB: 4, hzA: 60, hzB: 60, seconds: 10, breakAt: 200 }), true);

// input encoding round trip
for (const attack of [null, 'light', 'heavy']) {
  const i = { left: true, right: false, up: true, down: false, downHeld: true, jump: true, attack, throwWeapon: true, dodge: false };
  assert.deepStrictEqual(netDecodeInput(netEncodeInput(i)), i);
}
console.log('ok  input encode/decode round trip');
