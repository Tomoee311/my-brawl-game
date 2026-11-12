// Smoke test: every fighter's own attack effects (HERO_SWING in juice.js) run without errors and draw something. Run: node tests/effects.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ctx = { console, Math, Phaser: { Math: { Between: (a, b) => a, DegToRad: (d) => d * Math.PI / 180 }, Geom: {} }, window: {}, document: {}, navigator: {}, localStorage: { getItem() {}, setItem() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'juice.js'), 'utf8') + '\nthis.HERO_SWING = HERO_SWING; this.VFX = VFX; this.VfxMgr = VfxMgr;', ctx, { filename: 'juice.js' });
const { HERO_SWING, VFX, VfxMgr } = ctx;
VfxMgr.shake = () => {}; VfxMgr.spearDust = () => VFX.push({ type: 'dust' }); VfxMgr.danteDashTrail = () => VFX.push({ type: 'afterimage' });

const mkP = (id) => ({ char: { id }, sprite: { x: 100, body: { blocked: { down: true }, bottom: 140, top: 80, center: { y: 110 } } }, facing: 1, attack: { back: false, stage: 0 }, equippedWeapon: null });
const combos = { dante: ['katana'], sekiro: ['katana', 'spear'], zawgyi: ['spear'], minsitthar: ['sword', 'axe'], aung_zeya: ['sword', 'spear'], thazin: ['chakram'], thaung: ['axe'], hla: ['spear'], kan: ['axe'] };
let fails = 0, calls = 0;
Object.keys(combos).forEach((id) => {
  if (!HERO_SWING[id]) { fails++; console.log('FAIL no effects for', id); return; }
  combos[id].forEach((w) => ['n', 'u', 'df'].forEach((tok) => [false, true].forEach((heavy) => [0, 1, 2].forEach((stage) => {
    const p = mkP(id);
    p.attack.stage = stage;
    const c = { base: { owner: p, sgn: 1, heavy, color: 1, alt: 2, age: 0 }, sgn: 1, heavy, w, tok, up: tok.indexOf('u') !== -1, down: tok.indexOf('d') !== -1, fx: { main: 0xffffff, alt: 0xaaaaaa }, stage };
    const before = VFX.length;
    try { HERO_SWING[id](p, { kind: heavy ? 'heavy' : 'light' }, c); } catch (e) { fails++; console.log('FAIL', id, w, tok, heavy, stage, e.message); }
    calls++;
    VFX.slice(before).forEach((e) => { if (e.type === 'arc' && (Number.isNaN(e.a0) || Number.isNaN(e.a1) || !(e.r > 0))) { fails++; console.log('FAIL bad arc', id, w, e); } });
  }))));
});
console.log('ran', calls, 'effect calls');
if (fails) process.exit(1);
console.log('all fighter effects ok');
