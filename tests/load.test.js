// Loads every script in index.html order with a stubbed Phaser to catch top-level errors / missing globals.
const vm = require('vm'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith('http'));
const noop = () => {};
const chain = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : chain), apply: () => chain, construct: () => chain });
const Phaser = new Proxy({ Scene: class {}, AUTO: 0, Scale: { RESIZE: 1, NO_CENTER: 0 }, Input: { Keyboard: { KeyCodes: new Proxy({}, { get: () => 1 }) } },
  Game: class { constructor(c) { Phaser.__config = c; } } }, { get: (t, k) => (k in t ? t[k] : chain) });
const sandbox = { Phaser, console, Math, JSON, Date, Object, Array, Map, Set, Number, String, Boolean, Promise, setTimeout, clearTimeout, setInterval, clearInterval,
  URLSearchParams, Symbol, isNaN, parseInt, parseFloat, Infinity, NaN, Error, RegExp, Float32Array, Uint8Array,
  navigator: {}, location: { search: '', origin: 'http://x', pathname: '/' },
  document: { getElementById: () => ({ style: {}, classList: { toggle: noop } }), createElement: () => chain, addEventListener: noop },
  AudioContext: class {}, webkitAudioContext: class {} };
sandbox.window = sandbox; sandbox.addEventListener = noop; sandbox.removeEventListener = noop;
vm.createContext(sandbox);
for (const s of scripts) {
  try { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', s), 'utf8'), sandbox, { filename: s }); }
  catch (e) { console.error('FAIL loading ' + s + ': ' + e.message); process.exit(1); }
}
const names = ['Net', 'OnlineScene', 'isOnline', 'readKeys', 'stepPhysicsOnce', 'sampleLocalMask', 'stateHash', 'rngInt', 'netDecodeInput', 'netMulberry32'];
const missing = names.filter((n) => { try { return vm.runInContext('typeof ' + n, sandbox) === 'undefined'; } catch (e) { return true; } });
if (missing.length) { console.error('missing globals: ' + missing.join(', ')); process.exit(1); }
console.log('ok  loaded ' + scripts.length + ' scripts (' + scripts.join(', ') + ')');
