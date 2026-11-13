// Tests for ledge.js (pure ledge maths). Run: node tests/ledge.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'ledge.js'), 'utf8') + '\nthis.LEDGE = LEDGE; this.findLedge = findLedge; this.ledgeHangCenter = ledgeHangCenter; this.ledgeGetUpCenter = ledgeGetUpCenter;', ctx);
const { LEDGE, findLedge, ledgeHangCenter, ledgeGetUpCenter } = ctx;
let fails = 0;
const eq = (name, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('FAIL', name, 'got', JSON.stringify(a), 'expected', JSON.stringify(b)); } else console.log('ok  ', name); };

const main = { id: 'main', left: 320, right: 960, top: 440, oneWay: false };
const plat = { id: 'plat', left: 400, right: 560, top: 330, oneWay: true };
const parts = [main, plat];

// falling just left of the left edge, hands about at the platform top -> grab the left ledge
let g = findLedge(parts, { cx: 300, top: 440, vy: 200 }, [], null);
eq('grab the left ledge', g && [g.part.id, g.side], ['main', -1]);
g = findLedge(parts, { cx: 985, top: 450, vy: 100 }, [], null);
eq('grab the right ledge', g && [g.part.id, g.side], ['main', 1]);
eq('too far from the edge', findLedge(parts, { cx: 250, top: 440, vy: 100 }, [], null), null);
eq('too high above the platform', findLedge(parts, { cx: 300, top: 380, vy: 100 }, [], null), null);
eq('too far below the platform', findLedge(parts, { cx: 300, top: 520, vy: 100 }, [], null), null);
eq('rising fast: no grab', findLedge(parts, { cx: 300, top: 440, vy: -300 }, [], null), null);
eq('one-way platform edges are not ledges', findLedge(parts, { cx: 385, top: 330, vy: 100 }, [], null), null);
eq('somebody else hangs there', findLedge(parts, { cx: 300, top: 440, vy: 100 }, [{ id: 'main', side: -1 }], null), null);
eq('the ledge we just left is blocked', findLedge(parts, { cx: 300, top: 440, vy: 100 }, [], { id: 'main', side: -1 }), null);
eq('the other ledge is still open', findLedge(parts, { cx: 985, top: 445, vy: 100 }, [], { id: 'main', side: -1 }) !== null, true);
eq('a fighter standing inside the stage edge (inside by 4px) can still grab', findLedge(parts, { cx: 324, top: 440, vy: 50 }, [], null) !== null, true);
eq('...but not deep inside the stage', findLedge(parts, { cx: 360, top: 440, vy: 50 }, [], null), null);

const hang = ledgeHangCenter(main, -1, 40, 60);
eq('hang position is outside the left edge', hang.x < main.left && hang.y === main.top + 2, true);
const up = ledgeGetUpCenter(main, -1, 40, 60);
eq('get-up position is on the platform, standing on top', [up.x > main.left, up.y + 30 <= main.top], [true, true]);
const upR = ledgeGetUpCenter(main, 1, 40, 60);
eq('right ledge get-up is inside the right edge', upR.x < main.right, true);

if (fails) { console.log('\n' + fails + ' failed'); process.exit(1); }
console.log('\nall ledge tests passed');
