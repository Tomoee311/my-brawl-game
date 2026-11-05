// lobby.js - Lobby menu: PLAY WITH FRIENDS / PLAY WITH BOT (+ Easy/Medium/Hard) / PLAY ONLINE
// Uses bindDomKeys / MENU_FONT from menu.js and the shared look from ui.js.
// Stores the choice in SELECTION.mode ('friends' | 'bot' | 'online') and SELECTION.botLevel ('easy' | 'medium' | 'hard').

class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    if (window.setHelpVisible) window.setHelpVisible(false);
    this.phase = 'main';                 // 'main' | 'bot'
    this.cursor = 0;
    this.leaving = false;
    this.items = [];
    this.input.mouse.disableContextMenu();

    bindDomKeys(this, {
      ArrowUp: () => this.move(-1), KeyW: () => this.move(-1),
      ArrowDown: () => this.move(1), KeyS: () => this.move(1),
      ArrowLeft: () => this.move(-1), KeyA: () => this.move(-1),
      ArrowRight: () => this.move(1), KeyD: () => this.move(1),
      Enter: () => this.confirm(), Space: () => this.confirm(), NumpadEnter: () => this.confirm(), KeyJ: () => this.confirm(),
      Escape: () => this.back(), Backspace: () => this.back(),
      KeyF: () => this.scale.toggleFullscreen(),
    });
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerdown', (p) => this.onClick(p));
    const onResize = () => { if (this.sys.isActive()) this.build(); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.build();
  }

  update(time, delta) { UI.tickEmbers(this, delta); }

  // ---------------------------------------------------------------- layout
  build() {
    UI.clear(this);
    const w = this.scale.width, h = this.scale.height;
    this.W = w; this.H = h;
    UI.backdrop(this, w, h, (typeof MAPS !== 'undefined' && MAPS.pagoda) ? 'pagoda' : Object.keys(MAPS)[0]);
    this.items = [];
    if (this.phase === 'main') this.buildMain(w, h); else this.buildBot(w, h);
  }

  heading(text, sub) {
    const w = this.W, h = this.H;
    const t = UI.title(this, w / 2, h * 0.17, text, Math.round(Math.min(64, w / 13)), sub);
    this.tweens.add({ targets: t, scale: 1.02, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------- MAIN lobby
  buildMain(w, h) {
    this.heading('MY BRAWL GAME', 'Choose a game mode');
    const defs = [
      { key: 'friends', title: 'PLAY WITH FRIENDS', desc: 'P1 vs P2 on the same PC', color: UI.c.p1, icon: 'versus' },
      { key: 'bot', title: 'PLAY WITH BOT', desc: 'Easy / Medium / Hard', color: UI.c.gold, icon: 'bot' },
      { key: 'online', title: 'PLAY ONLINE', desc: '1 vs 1 over the internet with a room code', color: UI.c.mint, icon: 'globe' },
    ];
    this.layoutCards(defs, w, h);
    UI.footer(this, w, h, '↑ / ↓  choose      ENTER  confirm      F  fullscreen');
  }

  // ---------------------------------------------------------------- BOT difficulty
  buildBot(w, h) {
    this.heading('PLAY WITH BOT', 'Choose the Bot level');
    const defs = [
      { key: 'easy', title: 'EASY', desc: 'Reacts slowly and sometimes makes mistakes', color: UI.c.mint, icon: 'bot' },
      { key: 'medium', title: 'MEDIUM', desc: 'Good at dodge / punish, times its heavy attacks', color: UI.c.gold, icon: 'bot' },
      { key: 'hard', title: 'HARD', desc: 'Fastest reactions and relentless pressure', color: UI.c.p1, icon: 'bot' },
    ];
    this.layoutCards(defs, w, h);
    UI.footer(this, w, h, '↑ / ↓  choose      ENTER  confirm      ESC  back');
  }

  layoutCards(defs, w, h) {
    const bw = Math.min(640, w * 0.9), bh = Math.min(96, h * 0.13), gap = bh * 0.22;
    const total = defs.length * bh + (defs.length - 1) * gap;
    const y0 = h * 0.58 - total / 2 + bh / 2;
    defs.forEach((d, i) => {
      const x = w / 2, y = y0 + i * (bh + gap);
      UI.card(this, x, y, bw, bh, Object.assign({}, d, { selected: i === this.cursor, locked: !!d.locked }));
      this.items.push({ d, x, y, bw, bh });
    });
  }

  hitItem(p) {
    return this.items.find((it) => p.x >= it.x - it.bw / 2 && p.x <= it.x + it.bw / 2 && p.y >= it.y - it.bh / 2 && p.y <= it.y + it.bh / 2);
  }

  // ---------------------------------------------------------------- input
  move(dir) {
    if (this.leaving || !this.items.length) return;
    this.cursor = (this.cursor + dir + this.items.length) % this.items.length;
    this.sfx('pickup');
    this.build();
  }

  onMove(p) {
    if (this.leaving) return;
    const hit = this.hitItem(p);
    if (hit) {
      const i = this.items.indexOf(hit);
      if (i !== this.cursor) { this.cursor = i; this.sfx('pickup'); this.build(); }
    }
  }

  onClick(p) {
    if (this.leaving) return;
    const hit = this.hitItem(p);
    if (hit) { this.cursor = this.items.indexOf(hit); this.confirm(); }
  }

  confirm() {
    if (this.leaving) return;
    const it = this.items[this.cursor];
    if (!it) return;
    if (it.d.locked) { this.sfx('throw'); this.cameras.main.shake(120, 0.004); return; }
    if (this.phase === 'main') {
      if (it.d.key === 'friends') { SELECTION.mode = 'friends'; this.go(); }
      else if (it.d.key === 'online') { SELECTION.mode = 'online'; this.leaving = true; this.sfx('heavy_impact'); this.cameras.main.fadeOut(250, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Online')); }
      else if (it.d.key === 'bot') { this.phase = 'bot'; this.cursor = Math.max(0, ['easy', 'medium', 'hard'].indexOf(SELECTION.botLevel || 'medium')); this.sfx('sword_slash'); this.build(); }
    } else {
      SELECTION.mode = 'bot';
      SELECTION.botLevel = it.d.key;
      this.go();
    }
  }

  back() {
    if (this.leaving) return;
    if (this.phase === 'bot') { this.phase = 'main'; this.cursor = 1; this.sfx('pickup'); this.build(); }
  }

  go() {
    this.leaving = true;
    this.sfx('heavy_impact');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }

  sfx(key) {
    if (typeof AudioMgr !== 'undefined') { try { AudioMgr.play(key); } catch (e) {} }
  }
}
