// Checks every fighter's attack style (moves) against the real weapon tables. Run: node tests/fighters.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Phaser: { Math: {}, Geom: {}, Input: { Keyboard: {} } }, WIDTH: 1280, HEIGHT: 720, window: {}, localStorage: { getItem() {}, setItem() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const load = (f, extra) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8') + (extra || ''), ctx, { filename: f });
load('moves.js', '\nthis.applyMoves = applyMoves; this.stageAtFrame = stageAtFrame;');
load('weapons.js', '\nthis.WEAPONS = WEAPONS;');
load('characters.js', '\nthis.CHARACTERS = CHARACTERS;');

let fails = 0, checked = 0;
const bad = (m) => { fails++; console.log('FAIL', m); };
const TYPES = [];
['light', 'heavy'].forEach((k) => {
  ['n', 's', 'd', 'u_tilt', 'u_air'].forEach((d) => TYPES.push(k + '_' + d));
  ['uf', 'ub', 'df', 'db'].forEach((d) => ['g', 'a'].forEach((s) => TYPES.push(k + '_' + d + '_' + s)));
});

const rows = [];
Object.values(ctx.CHARACTERS).forEach((c) => {
  Object.keys(c.moves || {}).forEach((w) => {
    if (c.weaponPool.indexOf(w) === -1) bad(c.name + ' has moves for ' + w + ' but does not carry it');
    TYPES.forEach((t) => {
      const base = ctx.WEAPONS[w].attacks[t];
      if (!base) { bad(c.name + ' ' + w + ' has no base attack ' + t); return; }
      const n = (ctx.applyMoves(c, w, t, base, 0).stageCount) || 1;
      for (let s = 0; s < n; s++) {
        const a = ctx.applyMoves(c, w, t, base, s);
        checked++;
        ['startup', 'active', 'recovery', 'damage', 'baseKb', 'growth', 'angle', 'width', 'height'].forEach((f) => {
          if (typeof a[f] !== 'number' || Number.isNaN(a[f])) bad(c.name + ' ' + w + ' ' + t + ' stage ' + s + ': ' + f + ' = ' + a[f]);
        });
        if (a.startup < 2 || a.recovery < 3 || a.active < 1) bad(c.name + ' ' + w + ' ' + t + ': too short ' + [a.startup, a.active, a.recovery]);
        if (a.damage < 1) bad(c.name + ' ' + w + ' ' + t + ': damage < 1');
        if (a.armor !== undefined && (a.armor <= 0 || a.armor > 1)) bad(c.name + ' ' + w + ' ' + t + ': armor must be 0..1');
        if (a.boost && (a.active < 8 || a.boost < 300)) bad(c.name + ' ' + w + ' ' + t + ': boost needs active >= 8 and boost >= 300');
        if (a.dive && a.dive < 400) bad(c.name + ' ' + w + ' ' + t + ': dive too weak');
        if (a.pull && !(a.pull > 0)) bad(c.name + ' ' + w + ' ' + t + ': bad pull');
      }
      // every stage must start inside the active window, in increasing order
      const e0 = ctx.applyMoves(c, w, t, base, 0);
      if (e0.stageCount) {
        const set = c.moves[w];
        const kind = t.split('_')[0], dir = t.split('_')[1];
        const parent = { uf: kind + '_u', ub: kind + '_u', df: kind + '_d', db: kind + '_d' }[dir];   // diagonals inherit stages from the straight up / down move
        const key = [t, kind + '_' + dir, parent, kind].find((k) => k && set[k] && set[k].stages);
        const ats = set[key].stages.map((x) => x.at || 0);
        ats.forEach((at, i) => {
          if (i && at <= ats[i - 1]) bad(c.name + ' ' + w + ' ' + t + ': stage frames not increasing');
          if (at >= e0.active) bad(c.name + ' ' + w + ' ' + t + ': stage at ' + at + ' is outside the active window (' + e0.active + ')');
        });
      }
    });
    // every up / down heavy movement move must also work on the 45-degree versions (W+A, W+D, S+A, S+D)
    ['uf', 'ub'].forEach((d) => ['g', 'a'].forEach((s) => {
      const up = ctx.applyMoves(c, w, 'heavy_u_air', ctx.WEAPONS[w].attacks.heavy_u_air, 0);
      const dg = ctx.applyMoves(c, w, 'heavy_' + d + '_' + s, ctx.WEAPONS[w].attacks['heavy_' + d + '_' + s], 0);
      if (up.boost && dg.boost !== up.boost) bad(c.name + ' ' + w + ' heavy_' + d + '_' + s + ' lost the heavy-up boost');
    }));
    ['df', 'db'].forEach((d) => ['g', 'a'].forEach((s) => {
      const dn = ctx.applyMoves(c, w, 'heavy_d', ctx.WEAPONS[w].attacks.heavy_d, 0);
      const dg = ctx.applyMoves(c, w, 'heavy_' + d + '_' + s, ctx.WEAPONS[w].attacks['heavy_' + d + '_' + s], 0);
      if (dn.dive && dg.dive !== dn.dive) bad(c.name + ' ' + w + ' heavy_' + d + '_' + s + ' lost the dive');
    }));
    // summary row for the two signature moves
    const l = ctx.applyMoves(c, w, 'light_n', ctx.WEAPONS[w].attacks.light_n, 0);
    const h = ctx.applyMoves(c, w, 'heavy_n', ctx.WEAPONS[w].attacks.heavy_n, 0);
    const f = (a) => [a.startup + '/' + a.active + '/' + a.recovery, a.damage + 'd', a.baseKb + 'kb', a.stageCount ? a.stageCount + ' hits' : '', a.lunge ? 'lunge ' + a.lunge : '', a.boost ? 'boost ' + a.boost : '', a.dive ? 'dive' : '', a.pull ? 'pull' : '', a.armor ? 'armor' : '', a.radial ? 'spin' : '', a.shots ? a.shots + ' shots' : '', a.burst ? 'x' + a.burst + ' burst' : ''].filter(Boolean).join(' ');
    const hs = ctx.applyMoves(c, w, 'heavy_s', ctx.WEAPONS[w].attacks.heavy_s, 0);
    const hu = ctx.applyMoves(c, w, 'heavy_u_air', ctx.WEAPONS[w].attacks.heavy_u_air, 0);
    rows.push([c.name + ' ' + w.padEnd(7), 'S ' + f(hs), 'U ' + f(hu)]);
  });
});
rows.forEach((r) => console.log(r[0].padEnd(18), r[1].padEnd(60), r[2]));
console.log('\nchecked', checked, 'attack variants');
if (fails) { console.log(fails + ' problem(s)'); process.exit(1); }
console.log('all fighter attack styles are valid');
