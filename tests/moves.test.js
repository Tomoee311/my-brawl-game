// Tests for moves.js (per-fighter attack overrides). Run: node tests/moves.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'moves.js'), 'utf8') + '\nthis.applyMoves = applyMoves; this.stageAtFrame = stageAtFrame; this.moveKeyChain = moveKeyChain;', ctx);
const { applyMoves, stageAtFrame, moveKeyChain } = ctx;

let fails = 0;
const eq = (name, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', name, 'got', JSON.stringify(a), 'expected', JSON.stringify(b)); } else console.log('ok  ', name); };

const base = { kind: 'light', startup: 6, active: 4, recovery: 12, cooldown: 8, width: 60, height: 40, ox: 1, oy: 0, moveMult: 0.4, damage: 10, baseKb: 200, growth: 5, angle: 30 };
const heavyBase = Object.assign({}, base, { kind: 'heavy', startup: 14, damage: 20 });
const char = { moves: { katana: {
  light: { speed: 0.5, dmg: 0.5, stages: [{ at: 0 }, { at: 3, dmg: 2, angle: 60 }], active: 7 },
  heavy_s: { lunge: 700, armor: 0.6, reach: 1.5, tall: 2 },
  light_u: { lunge: 0 },
} } };

eq('key chain (plain)', moveKeyChain('light_n'), ['light', 'light_n']);
eq('key chain (diagonal)', moveKeyChain('heavy_uf_g'), ['heavy', 'heavy_uf', 'heavy_uf_g']);
eq('key chain (up tilt)', moveKeyChain('light_u_tilt'), ['light', 'light_u', 'light_u_tilt']);

const a0 = applyMoves(char, 'katana', 'light_n', base, 0);
eq('speed 0.5 halves startup/recovery', [a0.startup, a0.recovery], [3, 6]);
eq('dmg 0.5 halves damage (stage 0)', a0.damage, 5);
eq('active override', a0.active, 7);
eq('stage count', a0.stageCount, 2);
const a1 = applyMoves(char, 'katana', 'light_n', base, 1);
eq('stage 1 has doubled damage vs the merged attack', a1.damage, 10);
eq('stage 1 angle', a1.angle, 60);
eq('stageAtFrame before 3', stageAtFrame(a0, char, 'katana', 'light_n', 2), 0);
eq('stageAtFrame at 3', stageAtFrame(a0, char, 'katana', 'light_n', 3), 1);
eq('stageAtFrame at 6', stageAtFrame(a0, char, 'katana', 'light_n', 6), 1);

const h = applyMoves(char, 'katana', 'heavy_s', heavyBase, 0);
eq('lunge + armor', [h.lunge, h.armor], [700, 0.6]);
eq('reach 1.5 -> width 90', h.width, 90);
eq('tall 2 -> height 80', h.height, 80);
eq('base object is not mutated', [base.damage, base.startup, heavyBase.width], [10, 6, 60]);
eq('cache returns the same object', applyMoves(char, 'katana', 'heavy_s', heavyBase, 0) === h, true);
eq('other weapon untouched', applyMoves(char, 'sword', 'light_n', base, 0) === base, true);
eq('character without moves untouched', applyMoves({}, 'katana', 'light_n', base, 0) === base, true);
const up = applyMoves(char, 'katana', 'light_u_tilt', base, 0);
eq('specific key (light_u) on top of general (light)', [up.lunge, up.damage], [0, 5]);

// diagonals inherit the movement parts (boost / dive) of the straight up / down move, but not its hitbox shape
const dchar = { moves: { katana: { heavy_u: { boost: 800, airOnce: true, angle: 88, width: 999, startup: 9, active: 10 }, heavy_d: { dive: 700, width: 888 } } } };
const dbase = Object.assign({}, heavyBase, { diag: true, len: 70, size: 40, angle: 45, back: false });
const uf = applyMoves(dchar, 'katana', 'heavy_uf_a', dbase, 0);
eq('up-forward heavy inherits boost / airOnce', [uf.boost, uf.airOnce], [800, true]);
eq('up-forward keeps its own 45 degree angle and size', [uf.angle, uf.width, uf.len], [45, 60, 70]);
eq('up-forward takes the timings', [uf.startup, uf.active], [9, 10]);
const db = applyMoves(dchar, 'katana', 'heavy_db_a', dbase, 0);
eq('down-back heavy inherits dive', db.dive, 700);
const lightuf = applyMoves(dchar, 'katana', 'light_uf_a', dbase, 0);
eq('a light diagonal does not get the heavy boost', lightuf.boost, undefined);
const own = applyMoves({ moves: { katana: { heavy_u: { boost: 800 }, heavy_uf: { boost: 500 } } } }, 'katana', 'heavy_uf_g', dbase, 0);
eq('the diagonal can override the inherited boost', own.boost, 500);

if (fails) { console.log('\n' + fails + ' failed'); process.exit(1); }
console.log('\nall moves tests passed');
