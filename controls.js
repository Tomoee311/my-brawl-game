// controls.js - rebindable controls (keyboard AND mouse) + music / sound-effect volume.
// Everything is saved in the browser (localStorage) so it is still there next time you open the game.
//
// A binding is a short string "<code>|<label>":
//   keyboard:  "65|A"        (code = the key's keyCode)
//   mouse:     "m0|L-CLICK"  (m0 = left, m1 = middle, m2 = right)
//   ""         = empty slot
// Every action has CONTROL_SLOTS slots, so one action can have e.g. a key AND a mouse button.

const CONTROL_ACTIONS = [
  { id: 'left',  label: 'Move Left' },
  { id: 'right', label: 'Move Right' },
  { id: 'up',    label: 'Up (aim / up attack)' },
  { id: 'down',  label: 'Down (aim / drop through)' },
  { id: 'jump',  label: 'Jump' },
  { id: 'dodge', label: 'Dash / Dodge' },
  { id: 'light', label: 'Light Attack' },
  { id: 'heavy', label: 'Heavy Attack' },
  { id: 'throw', label: 'Pick up / Throw weapon' },
];
const CONTROL_SLOTS = 3;
const MOUSE_LABELS = { 0: 'L-CLICK', 1: 'M-CLICK', 2: 'R-CLICK', 3: 'MOUSE 4', 4: 'MOUSE 5' };

const DEFAULT_CONTROLS = {
  p1: {
    left: ['65|A'], right: ['68|D'], up: ['87|W'], down: ['83|S'],
    jump: ['32|SPACE'], dodge: ['16|SHIFT'],
    light: ['74|J', 'm0|L-CLICK'], heavy: ['75|K', 'm2|R-CLICK'],
    throw: ['69|E', 'm1|M-CLICK', '81|Q'],
  },
  p2: {
    left: ['37|←'], right: ['39|→'], up: ['38|↑'], down: ['40|↓'],
    jump: ['13|ENTER'], dodge: ['96|NUM 0'],
    light: ['97|NUM 1'], heavy: ['98|NUM 2'],
    throw: ['99|NUM 3', '77|M', '101|NUM 5'],
  },
};

const Controls = {
  bindings: null,            // { p1: {action: [slots]}, p2: {...} }
  audio: { music: 30, sfx: 100 },   // 0..100
  mouseKeys: {},             // btn -> pseudo key { mouse, btn, isDown, _just }

  // ---------------------------------------------------------------- storage
  _clone(o) { return JSON.parse(JSON.stringify(o)); },

  _pad(list) {
    const out = (list || []).filter((s) => typeof s === 'string').slice(0, CONTROL_SLOTS);
    while (out.length < CONTROL_SLOTS) out.push('');
    return out;
  },

  load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('mbg_settings_v1') || 'null'); } catch (e) { saved = null; }
    this.bindings = { p1: {}, p2: {} };
    ['p1', 'p2'].forEach((pid) => {
      CONTROL_ACTIONS.forEach((a) => {
        const s = saved && saved.controls && saved.controls[pid] && saved.controls[pid][a.id];
        this.bindings[pid][a.id] = this._pad(Array.isArray(s) ? s : DEFAULT_CONTROLS[pid][a.id]);
      });
    });
    if (saved && saved.audio) {
      if (typeof saved.audio.music === 'number') this.audio.music = Math.max(0, Math.min(100, saved.audio.music));
      if (typeof saved.audio.sfx === 'number') this.audio.sfx = Math.max(0, Math.min(100, saved.audio.sfx));
    }
    this.applyAudio();
  },

  save() {
    try { localStorage.setItem('mbg_settings_v1', JSON.stringify({ controls: this.bindings, audio: this.audio })); } catch (e) { /* private mode etc. */ }
  },

  resetControls(pid) {
    CONTROL_ACTIONS.forEach((a) => { this.bindings[pid][a.id] = this._pad(DEFAULT_CONTROLS[pid][a.id]); });
    this.save();
  },

  // ---------------------------------------------------------------- audio
  applyAudio() {
    if (typeof Music !== 'undefined') {
      Music.volume = (this.audio.music / 100) * 0.5;   // slider 30% = the old default (0.15)
      if (Music.el && Music.wanted && !Music.el.paused) { clearInterval(Music.fade); Music.el.volume = Music.volume; }
    }
    if (typeof AudioMgr !== 'undefined') AudioMgr.sfxVolume = this.audio.sfx / 100;
  },

  setAudio(kind, value) {
    this.audio[kind] = Math.max(0, Math.min(100, Math.round(value)));
    this.applyAudio();
    this.save();
  },

  // ---------------------------------------------------------------- bindings
  parse(b) {
    if (!b) return null;
    const i = b.indexOf('|');
    const code = i < 0 ? b : b.slice(0, i), label = i < 0 ? b : b.slice(i + 1);
    if (code[0] === 'm') return { mouse: true, btn: parseInt(code.slice(1), 10), label };
    return { mouse: false, keyCode: parseInt(code, 10), label };
  },

  fromKeyEvent(e) {
    const c = e.code || '';
    let label = e.key && e.key.length === 1 ? e.key.toUpperCase() : c;
    if (c === 'Space') label = 'SPACE';
    else if (c.startsWith('Shift')) label = 'SHIFT';
    else if (c.startsWith('Control')) label = 'CTRL';
    else if (c.startsWith('Alt')) label = 'ALT';
    else if (c === 'Enter') label = 'ENTER';
    else if (c === 'NumpadEnter') label = 'NUM ENTER';
    else if (c === 'Tab') label = 'TAB';
    else if (c === 'ArrowLeft') label = '←';
    else if (c === 'ArrowRight') label = '→';
    else if (c === 'ArrowUp') label = '↑';
    else if (c === 'ArrowDown') label = '↓';
    else if (c.startsWith('Numpad')) label = 'NUM ' + c.slice(6).replace('Decimal', '.').replace('Add', '+').replace('Subtract', '-').replace('Multiply', '*').replace('Divide', '/');
    else if (c.startsWith('Key')) label = c.slice(3);
    else if (c.startsWith('Digit')) label = c.slice(5);
    return (e.keyCode || 0) + '|' + label;
  },

  fromMouseButton(btn) { return 'm' + btn + '|' + (MOUSE_LABELS[btn] || ('MOUSE ' + (btn + 1))); },

  // put a binding in a slot; the same input is removed from every other slot of this player so one key never does two things
  set(pid, action, slot, binding) {
    const code = binding ? binding.split('|')[0] : '';
    if (code) {
      CONTROL_ACTIONS.forEach((a) => {
        const arr = this.bindings[pid][a.id];
        for (let i = 0; i < arr.length; i++) if (arr[i] && arr[i].split('|')[0] === code) arr[i] = '';
      });
    }
    this.bindings[pid][action][slot] = binding || '';
    this.save();
  },

  // text for the HUD / tutorial, e.g. "J / L-CLICK"
  label(pid, action) {
    const list = (this.bindings[pid][action] || []).filter(Boolean).map((b) => this.parse(b).label);
    return list.length ? list.join(' / ') : '(not set)';
  },

  // ---------------------------------------------------------------- live input objects used by game.js
  // Returns { left: [key...], right: [...], ... } where every key has .isDown; mouse buttons are pseudo keys.
  makeKeys(scene, pid, extra) {
    const out = {};
    CONTROL_ACTIONS.forEach((a) => {
      out[a.id] = [];
      this.bindings[pid][a.id].forEach((b) => {
        const p = this.parse(b);
        if (!p) return;
        if (p.mouse) out[a.id].push(this.mouseKey(p.btn));
        else if (p.keyCode) out[a.id].push(scene.input.keyboard.addKey(p.keyCode));
      });
    });
    // optional extra fixed keys, e.g. { left: [Phaser key] } (used for the arrow keys online)
    Object.keys(extra || {}).forEach((k) => { out[k] = (out[k] || []).concat(extra[k]); });
    return out;
  },

  mouseKey(btn) {
    if (!this.mouseKeys[btn]) this.mouseKeys[btn] = { mouse: true, btn, isDown: false, _just: false };
    return this.mouseKeys[btn];
  },

  clearMouse() { Object.keys(this.mouseKeys).forEach((b) => { this.mouseKeys[b]._just = false; this.mouseKeys[b].isDown = false; }); },

  // one-shot "was it pressed this frame" for both keyboard keys and mouse pseudo keys
  tapped(k) {
    if (k.mouse) { if (k._just) { k._just = false; return true; } return false; }
    return Phaser.Input.Keyboard.JustDown(k);
  },
};

// window-level mouse tracking (also stops the browser's middle-click auto-scroll)
window.addEventListener('mousedown', (e) => {
  const k = Controls.mouseKey(e.button);
  k.isDown = true; k._just = true;
  if (e.button === 1) e.preventDefault();
});
window.addEventListener('mouseup', (e) => { Controls.mouseKey(e.button).isDown = false; });
window.addEventListener('blur', () => Controls.clearMouse());

Controls.load();
