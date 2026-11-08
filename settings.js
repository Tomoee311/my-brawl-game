// settings.js - Settings screen (opened from the Lobby).
//   Tab 1  AUDIO       music volume + sound-effect volume sliders
//   Tab 2  PLAYER 1    rebind every control (keyboard keys AND mouse buttons)
//   Tab 3  PLAYER 2    same for the second local player
// Click a slot, then press the new key or mouse button.  ESC while waiting = cancel,  BACKSPACE / DELETE = clear the slot.
// Everything is saved automatically by controls.js.

class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    if (typeof Music !== 'undefined') Music.play();
    if (window.setHelpVisible) window.setHelpVisible(false);
    this.tab = 0;                 // 0 audio, 1 P1 controls, 2 P2 controls
    this.waiting = null;          // { pid, action, slot } while we wait for a key / mouse button
    this.zones = [];              // clickable rectangles { x, y, w, h, fn }
    this.dragSlider = null;
    this.note = '';
    this.input.mouse.disableContextMenu();

    // keyboard: used for capturing a binding and for ESC
    this._onKey = (e) => {
      if (!this.sys.isActive()) return;
      if (this.waiting) {
        if (e.repeat) { e.preventDefault(); return; }
        e.preventDefault(); e.stopPropagation();
        if (e.code === 'Escape') { this.waiting = null; this.note = 'Cancelled'; this.build(); return; }
        const { pid, action, slot } = this.waiting;
        if (e.code === 'Backspace' || e.code === 'Delete') Controls.set(pid, action, slot, '');
        else Controls.set(pid, action, slot, Controls.fromKeyEvent(e));
        this.waiting = null; this.note = 'Saved'; this.sfx('pickup'); this.build();
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); this.leave(); }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); this.setTab(this.tab - 1); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); this.setTab(this.tab + 1); }
      else if (e.code === 'KeyF') this.scale.toggleFullscreen();
    };
    window.addEventListener('keydown', this._onKey, true);

    // mouse button while waiting for a binding (window level so middle / right / side buttons are seen too)
    this._onMouse = (e) => {
      if (!this.waiting || !this.sys.isActive()) return;
      if (performance.now() - this.waitStart < 200) return;   // ignore the click that opened the prompt
      e.preventDefault(); e.stopPropagation();
      const { pid, action, slot } = this.waiting;
      Controls.set(pid, action, slot, Controls.fromMouseButton(e.button));
      this.waiting = null; this.note = 'Saved'; this.sfx('pickup'); this.build();
    };
    window.addEventListener('mousedown', this._onMouse, true);

    this.input.on('pointerdown', (p) => this.onDown(p));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', () => { this.dragSlider = null; });
    const onResize = () => { if (this.sys.isActive()) this.build(); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this._onKey, true);
      window.removeEventListener('mousedown', this._onMouse, true);
      this.scale.off('resize', onResize);
    });
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.build();
  }

  update(time, delta) { UI.tickEmbers(this, delta); }

  // ------------------------------------------------------------------ helpers
  sfx(key) { if (typeof AudioMgr !== 'undefined') { try { AudioMgr.play(key); } catch (e) {} } }

  setTab(t) {
    if (this.waiting) return;
    this.tab = (t + 3) % 3;
    this.note = '';
    this.sfx('pickup');
    this.build();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Lobby'));
  }

  zone(x, y, w, h, fn) { this.zones.push({ x, y, w, h, fn }); }

  hit(p) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (p.x >= z.x - z.w / 2 && p.x <= z.x + z.w / 2 && p.y >= z.y - z.h / 2 && p.y <= z.y + z.h / 2) return z;
    }
    return null;
  }

  // ------------------------------------------------------------------ layout
  build() {
    UI.clear(this);
    this.zones = [];
    const w = this.scale.width, h = this.scale.height;
    this.W = w; this.H = h;
    UI.backdrop(this, w, h, (typeof MAPS !== 'undefined' && MAPS.pagoda) ? 'pagoda' : Object.keys(MAPS)[0]);
    UI.title(this, w / 2, h * 0.085, 'SETTINGS', Math.round(Math.min(46, w / 16)));

    // tabs
    const names = ['AUDIO', 'PLAYER 1 CONTROLS', 'PLAYER 2 CONTROLS'];
    const tw = Math.min(250, w * 0.3), ty = h * 0.205, th = 40;
    names.forEach((n, i) => {
      const x = w / 2 + (i - 1) * (tw + 10);
      UI.glass(this, x, ty, tw, th, { accent: i === 1 ? UI.c.p1 : (i === 2 ? UI.c.p2 : UI.c.gold), selected: i === this.tab, radius: 12 });
      UI.text(this, x, ty, n, Math.max(11, Math.min(14, tw / 17)), i === this.tab ? '#ffffff' : UI.c.dim, true);
      this.zone(x, ty, tw, th, () => this.setTab(i));
    });

    if (this.tab === 0) this.buildAudio(w, h); else this.buildControls(w, h, this.tab === 1 ? 'p1' : 'p2');

    if (this.note) UI.text(this, w / 2, h - 50, this.note, 13, UI.c.good);
    UI.footer(this, w, h, this.waiting ? 'Press a key or a mouse button...    ESC = cancel    BACKSPACE = clear slot'
      : '← / →  switch tab      click a slot to change it      ESC  back to Lobby');
  }

  // ------------------------------------------------------------------ AUDIO tab
  buildAudio(w, h) {
    const pw = Math.min(640, w * 0.9), ph = 96, cx = w / 2;
    const rows = [
      { kind: 'music', title: 'MUSIC VOLUME', desc: 'Menu / lobby music' },
      { kind: 'sfx', title: 'SOUND EFFECTS VOLUME', desc: 'Sword hits, jumps, gunshots, pickups...' },
    ];
    rows.forEach((r, i) => {
      const y = h * 0.40 + i * (ph + 24);
      UI.glass(this, cx, y, pw, ph, { accent: UI.c.gold, bar: true });
      UI.text(this, cx - pw / 2 + 40, y - 24, r.title, 17, '#ffffff', true).setOrigin(0, 0.5);
      UI.text(this, cx - pw / 2 + 40, y - 4, r.desc, 12, UI.c.muted).setOrigin(0, 0.5);
      const val = Controls.audio[r.kind];
      UI.text(this, cx + pw / 2 - 40, y - 24, val + '%', 20, UI.css(UI.c.gold), true).setOrigin(1, 0.5);
      // slider
      const sx = cx - pw / 2 + 40, sw = pw - 80, sy = y + 26;
      const g = this.add.graphics().setDepth(8);
      g.fillStyle(0x1a2448, 1).fillRoundedRect(sx, sy - 5, sw, 10, 5);
      if (val > 0) g.fillStyle(UI.c.gold, 1).fillRoundedRect(sx, sy - 5, Math.max(10, sw * val / 100), 10, 5);
      g.fillStyle(0xffffff, 1).fillCircle(sx + sw * val / 100, sy, 10);
      g.lineStyle(2, UI.c.gold, 1).strokeCircle(sx + sw * val / 100, sy, 10);
      const z = { x: cx, y: sy, w: sw + 30, h: 36, fn: null, slider: { kind: r.kind, left: sx, width: sw } };
      this.zones.push(z);
    });
    UI.text(this, cx, h * 0.40 + 2 * (ph + 24) - 8, 'Tip: drag the circle, or just click on the bar', 12, UI.c.dim);
  }

  // ------------------------------------------------------------------ CONTROLS tabs
  buildControls(w, h, pid) {
    const accent = pid === 'p1' ? UI.c.p1 : UI.c.p2;
    const pw = Math.min(900, w * 0.95);
    const rowH = Math.min(46, (h * 0.58) / CONTROL_ACTIONS.length);
    const top = h * 0.30;
    const labelW = pw * 0.34, slotW = (pw - labelW - 30) / CONTROL_SLOTS;
    const left = w / 2 - pw / 2;

    UI.text(this, w / 2, h * 0.265, pid === 'p1'
      ? 'Player 1 (also used online)'
      : 'Player 2 (local friends mode)', 12, UI.c.muted);

    CONTROL_ACTIONS.forEach((a, i) => {
      const y = top + i * (rowH + 4) + rowH / 2;
      UI.glass(this, w / 2, y, pw, rowH, { accent, radius: 10, alpha: 0.7 });
      UI.text(this, left + 22, y, a.label, Math.max(12, Math.min(15, rowH * 0.34)), '#ffffff', true).setOrigin(0, 0.5);
      for (let s = 0; s < CONTROL_SLOTS; s++) {
        const sx = left + labelW + 10 + s * slotW + slotW / 2;
        const waiting = this.waiting && this.waiting.pid === pid && this.waiting.action === a.id && this.waiting.slot === s;
        const b = Controls.bindings[pid][a.id][s];
        const label = waiting ? 'press a key...' : (b ? Controls.parse(b).label : '—');
        const g = this.add.graphics().setDepth(7);
        g.fillStyle(waiting ? 0x3a2f10 : 0x101a3d, 1).fillRoundedRect(sx - slotW / 2 + 4, y - rowH / 2 + 5, slotW - 8, rowH - 10, 8);
        g.lineStyle(waiting ? 2.5 : 1.5, waiting ? UI.c.gold : UI.c.line, 1).strokeRoundedRect(sx - slotW / 2 + 4, y - rowH / 2 + 5, slotW - 8, rowH - 10, 8);
        const isMouse = b && Controls.parse(b).mouse;
        UI.text(this, sx, y, label, Math.max(11, Math.min(14, rowH * 0.32)), waiting ? UI.css(UI.c.gold) : (b ? (isMouse ? UI.css(UI.c.mint) : '#ffffff') : UI.c.dim), true);
        this.zone(sx, y, slotW - 8, rowH - 6, () => this.startWait(pid, a.id, s));
      }
    });

    // reset button
    const by = top + CONTROL_ACTIONS.length * (rowH + 4) + 26, bw = 260, bh = 38;
    UI.glass(this, w / 2, by, bw, bh, { accent: UI.c.red, radius: 12 });
    UI.text(this, w / 2, by, 'RESET TO DEFAULT', 13, '#ffd0d0', true);
    this.zone(w / 2, by, bw, bh, () => {
      if (this.waiting) return;
      Controls.resetControls(pid); this.note = 'Controls reset'; this.sfx('throw'); this.build();
    });
    UI.text(this, w / 2, by + 28, 'Keyboard keys are white, mouse buttons are green. The same key can only do one thing - setting it again moves it.', 11, UI.c.dim);
  }

  startWait(pid, action, slot) {
    this.waiting = { pid, action, slot };
    this.waitStart = performance.now();
    this.note = '';
    this.sfx('pickup');
    this.build();
  }

  // ------------------------------------------------------------------ pointer
  onDown(p) {
    if (this.waiting) return;   // handled by the window mousedown listener
    const z = this.hit(p);
    if (!z) return;
    if (z.slider) { this.dragSlider = z.slider; this.setSlider(p.x); return; }
    if (z.fn) z.fn();
  }

  onMove(p) {
    if (this.dragSlider && p.isDown) this.setSlider(p.x);
  }

  setSlider(x) {
    const s = this.dragSlider;
    if (!s) return;
    const v = Math.round(((x - s.left) / s.width) * 20) * 5;   // steps of 5
    const nv = Math.max(0, Math.min(100, v));
    if (nv === Controls.audio[s.kind]) return;
    Controls.setAudio(s.kind, nv);
    if (s.kind === 'sfx') this.sfx('sword_slash');
    this.build();
  }
}
