// Menu scene: character select + map select
// Like Brawlhalla: a roster card row on top, a panel for each player below (idle animation + stats), then the map grid.
//
// P1: A / D move, SPACE (or J) = lock in      P2: Left/Right move, ENTER (or Numpad 1) = lock in
// Mouse: left click = P1 cursor, right click = P2 cursor        ESC / BACKSPACE = back

// Listen to the browser's native keydown directly (the Phaser key 'down' event tends to replay the previous key after a scene change)
// map = { KeyA: fn, Space: fn, ... } (by event.code); removed automatically when the scene closes
function bindDomKeys(scene, map) {
  const h = (e) => {
    if (e.repeat) return;
    const fn = map[e.code];
    if (!fn || !scene.sys || !scene.sys.isActive()) return;
    e.preventDefault();
    fn(e);
  };
  window.addEventListener('keydown', h);
  scene.events.once('shutdown', () => window.removeEventListener('keydown', h));
}

const MENU_FONT = (typeof UI !== 'undefined') ? UI.font : 'Arial, "Noto Sans Myanmar", "Myanmar Text", sans-serif';
const MENU_P_COLORS = [0xff6b5a, 0x5ab8ff];          // P1 red-purple / P2 blue
const MENU_P_CSS = ['#ff8f80', '#8cc8ff'];
const MENU_LOCKED_SLOTS = 3;                          // number of "?" cards left for adding more characters
const MENU_MAP_COLS = 5;
const MENU_MAP_SLOTS = 10;                            // total card count in the map grid (random + maps + locked)

// for stat bars: (min, max) -> 0..1
const MENU_STAT_RANGES = {
  SPEED: ['moveSpeed', 250, 360],
  JUMP: ['jumpSpeed', 470, 590],
  WEIGHT: ['weight', 0.82, 1.38],
  AIR: ['airControl', 0.7, 1.02],
};

class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    if (window.setHelpVisible) window.setHelpVisible(false);
    if (typeof setupCharacters === 'function') setupCharacters(this);   // register the idle animations (${id}_idle)
    this.charIds = Object.keys(CHARACTERS);
    // selectable cards = characters + Random
    this.choices = [...this.charIds, 'random'];
    this.mapIds = Object.keys(MAPS).filter((id) => MAPS[id].layers && MAPS[id].layers.length);
    this.mapChoices = ['random', ...this.mapIds];

    this.phase = 'chars';
    this.cursor = [Math.max(0, this.charIds.indexOf(SELECTION.p1)), Math.max(0, this.charIds.indexOf(SELECTION.p2))];
    if (this.cursor[0] === this.cursor[1]) this.cursor[1] = (this.cursor[0] + 1) % this.charIds.length;
    this.ready = [false, false];
    this.mapCursor = Math.max(0, this.mapChoices.indexOf(SELECTION.map));
    this.starting = false;
    this.lastClickMap = -1;

    this.input.mouse.disableContextMenu();
    bindDomKeys(this, {
      KeyA: () => this.move(0, -1), KeyD: () => this.move(0, 1),
      KeyW: () => this.moveV(-1), KeyS: () => this.moveV(1),
      Space: () => this.confirm(0), KeyJ: () => this.confirm(0),
      ArrowLeft: () => this.move(1, -1), ArrowRight: () => this.move(1, 1),
      ArrowUp: () => this.moveV(-1), ArrowDown: () => this.moveV(1),
      Enter: () => this.confirm(1), Numpad1: () => this.confirm(1), NumpadEnter: () => this.confirm(1),
      Escape: () => this.back(), Backspace: () => this.back(),
      KeyF: () => this.scale.toggleFullscreen(),
    });

    this.input.on('pointerdown', (p) => this.onPointer(p));
    this.input.on('pointermove', (p) => this.onPointerMove(p));

    const onResize = () => { if (this.sys.isActive()) this.build(); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.build();
  }

  // ------------------------------------------------------------------ build / layout
  build() {
    UI.clear(this);
    this.zones = [];
    this.panelObjs = [[], []];
    const w = this.scale.width, h = this.scale.height;
    this.W = w; this.H = h;

    this.drawBackdrop(w, h);
    this.hl = this.add.graphics().setDepth(30);     // cursor highlight (custom redraw)
    this.tagTexts = null;

    if (this.phase === 'chars') this.buildChars(w, h);
    else this.buildMaps(w, h);
  }

  update(time, delta) { UI.tickEmbers(this, delta); }

  drawBackdrop(w, h) {
    UI.backdrop(this, w, h, this.mapIds[0] || 'default');
  }

  title(text, sub) {
    const w = this.W;
    this.add.text(w / 2, this.H * 0.055, text, {
      fontFamily: MENU_FONT, fontSize: Math.round(Math.min(34, w / 26)) + 'px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setStroke('#0a1230', 6).setShadow(0, 3, '#000000', 6, true, true).setDepth(10);
    if (sub) {
      this.add.text(w / 2, this.H * 0.055 + Math.min(30, w / 30), sub, {
        fontFamily: MENU_FONT, fontSize: Math.round(Math.min(15, w / 70)) + 'px', color: '#bcd4ff',
      }).setOrigin(0.5).setDepth(10);
    }
  }

  // ------------------------------------------------------------------ CHARACTER SELECT
  buildChars(w, h) {
    this.title('CHOOSE YOUR LEGEND', SELECTION.mode === 'bot'
      ? 'P1 = you, P2 = BOT (' + ((typeof BOT_LEVELS !== 'undefined' && BOT_LEVELS[SELECTION.botLevel]) ? BOT_LEVELS[SELECTION.botLevel].label : '') + ') — pick both heroes and lock in (ESC = Lobby)'
      : 'Pick your hero and lock in (ESC = Lobby)');
    const items = [...this.choices];
    for (let i = 0; i < MENU_LOCKED_SLOTS; i++) items.push('locked');
    const n = items.length;
    const size = Math.max(54, Math.min(108, (w * 0.92) / (n * 1.1)));
    const gap = size * 0.14;
    const rowW = n * size + (n - 1) * gap;
    const y = h * 0.19 + size * 0.5;
    this.cards = [];
    items.forEach((id, i) => {
      const x = w / 2 - rowW / 2 + size / 2 + i * (size + gap);
      this.drawCharCard(id, x, y, size);
      if (id !== 'locked') {
        const z = this.add.zone(x, y, size, size).setInteractive({ useHandCursor: true }).setDepth(40);
        z.cardIndex = this.choices.indexOf(id);
        this.zones.push(z);
        this.cards[z.cardIndex] = { x, y, size };
      }
    });

    // two panels
    const pw = Math.min(w * 0.44, 540), ph = Math.min(h * 0.5, 390);
    const py = h * 0.62 + ph * 0.1;
    this.panelRects = [
      { x: w * 0.26, y: py, w: pw, h: ph },
      { x: w * 0.74, y: py, w: pw, h: ph },
    ];
    this.panelRects.forEach((r, i) => this.drawPanel(i, r));

    // bottom hint text
    this.hint = this.add.text(w / 2, h - 18, '', {
      fontFamily: MENU_FONT, fontSize: Math.round(Math.min(14, w / 80)) + 'px', color: '#d6e6ff', align: 'center',
    }).setOrigin(0.5).setDepth(10);
    this.updateHint();
  }

  drawCharCard(id, x, y, size) {
    const g = this.add.graphics().setDepth(2);
    const r = size * 0.12;
    g.fillStyle(0x0d1a3e, 0.92).fillRoundedRect(x - size / 2, y - size / 2, size, size, r);
    const locked = id === 'locked';
    g.lineStyle(2, locked ? 0x2b3a66 : 0x4fd0e8, locked ? 0.7 : 0.95).strokeRoundedRect(x - size / 2, y - size / 2, size, size, r);
    if (locked) {
      this.add.text(x, y, '?', { fontFamily: MENU_FONT, fontSize: Math.round(size * 0.5) + 'px', fontStyle: 'bold', color: '#2b3a66' }).setOrigin(0.5).setDepth(3);
      this.add.text(x, y + size * 0.34, 'SOON', { fontFamily: MENU_FONT, fontSize: Math.round(size * 0.13) + 'px', color: '#3f5088' }).setOrigin(0.5).setDepth(3);
      return;
    }
    if (id === 'random') {
      this.drawDice(x, y - size * 0.04, size * 0.5);
      this.add.text(x, y + size * 0.37, 'RANDOM', { fontFamily: MENU_FONT, fontSize: Math.round(size * 0.13) + 'px', fontStyle: 'bold', color: '#cfe8ff' }).setOrigin(0.5).setDepth(3);
      return;
    }
    const c = CHARACTERS[id];
    // crop and show the art (face + upper body)
    const key = c.sheetKey;
    if (this.textures.exists(key)) {
      const im = this.add.image(x, y - size * 0.06, key, 0).setDepth(3);
      im.setCrop(46, 32, 68, 66);
      const s = (size - 8) / 68;
      im.setScale(s);
      im.y = y - size * 0.06 - (65 - 64) * s;   // center the crop on the card center
    }
    // name ribbon
    g.fillStyle(0x040a22, 0.85).fillRoundedRect(x - size / 2 + 2, y + size * 0.26, size - 4, size * 0.22, r * 0.6);
    this.add.text(x, y + size * 0.37, c.name.toUpperCase(), {
      fontFamily: MENU_FONT, fontSize: Math.round(Math.min(size * 0.115, 13)) + 'px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(3);
  }

  drawDice(x, y, s) {
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-s / 2, -s / 2, s, s, s * 0.18);
    g.lineStyle(2, 0xb8c4d8, 1).strokeRoundedRect(-s / 2, -s / 2, s, s, s * 0.18);
    g.fillStyle(0x1a2238, 1);
    const d = s * 0.26, r = s * 0.075;
    [[-d, -d], [d, -d], [0, 0], [-d, d], [d, d]].forEach(([px, py]) => g.fillCircle(px, py, r));
    g.setPosition(x, y).setRotation(-0.2);
  }

  panelAccent(i) {
    return MENU_P_COLORS[i];
  }

  drawPanel(i, r) {
    // redraw the whole panel (whenever the selection changes)
    (this.panelObjs[i] || []).forEach((o) => o.destroy());
    const objs = [];
    this.panelObjs[i] = objs;
    const add = (o) => { objs.push(o); return o; };
    const { x, y, w, h } = r;
    const acc = this.panelAccent(i);
    const id = this.choices[this.cursor[i]];
    const isRandom = id === 'random';
    const c = isRandom ? null : CHARACTERS[id];
    const rdy = this.ready[i];

    const g = add(this.add.graphics().setDepth(5));
    // glow
    for (let k = 3; k >= 1; k--) g.lineStyle(k * 4, acc, rdy ? 0.12 * (4 - k) : 0.06 * (4 - k)).strokeRoundedRect(x - w / 2 - k, y - h / 2 - k, w + 2 * k, h + 2 * k, 14);
    g.fillStyle(0x060a26, 0.93).fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    g.lineStyle(3, rdy ? 0x57e389 : acc, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    // header
    g.fillStyle(acc, 0.9).fillRoundedRect(x - w / 2 + 14, y - h / 2 - 13, 118, 26, 8);
    add(this.add.text(x - w / 2 + 73, y - h / 2, 'PLAYER ' + (i + 1), {
      fontFamily: MENU_FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6));

    const fs = (v) => Math.round(Math.min(v, v * w / 480)) + 'px';
    // left = character art
    const cx = x - w * 0.26, cy = y + h * 0.1;
    if (isRandom) {
      add(this.add.text(cx, cy - 6, '?', { fontFamily: MENU_FONT, fontSize: Math.round(h * 0.42) + 'px', fontStyle: 'bold', color: '#cfe8ff' }).setOrigin(0.5).setDepth(6));
      add(this.add.text(cx, cy + h * 0.28, 'RANDOM', { fontFamily: MENU_FONT, fontSize: fs(18), fontStyle: 'bold', color: '#9fc0ff' }).setOrigin(0.5).setDepth(6));
    } else {
      // foot shadow + idle animation
      add(this.add.ellipse(cx, y + h * 0.36, h * 0.46, h * 0.07, 0x000000, 0.38).setDepth(5));
      const s = (h / 128) * 1.02;
      const sp = add(this.add.sprite(cx, y + h * 0.36 + (128 - 100) * s - 64 * s + 64 * s - (28 * s), c.sheetKey, 0).setScale(s).setDepth(6));
      sp.setOrigin(0.5, 100 / 128);                 // baseline at the tip of the feet (y=100)
      sp.y = y + h * 0.36;
      const anim = c.id + '_idle';
      if (this.anims.exists(anim)) sp.play(anim);
    }

    // right = info
    const tx = x - w * 0.02, top = y - h / 2 + h * 0.1;
    const name = isRandom ? 'RANDOM' : c.name.toUpperCase();
    add(this.add.text(tx, top, name, { fontFamily: MENU_FONT, fontSize: fs(28), fontStyle: 'bold', color: '#ffffff' }).setDepth(6).setStroke('#0a1230', 4));
    let yy = top + h * 0.115;
    add(this.add.text(tx, yy, isRandom ? 'A surprise hero!' : c.title, { fontFamily: MENU_FONT, fontSize: fs(14), fontStyle: 'italic', color: '#9fc0ff' }).setDepth(6));
    yy += h * 0.1;

    if (!isRandom) {
      // weapon chip
      let wx = tx;
      c.weaponPool.forEach((wp) => {
        const label = wp.toUpperCase();
        const t = add(this.add.text(wx + 8, yy, label, { fontFamily: MENU_FONT, fontSize: fs(12), fontStyle: 'bold', color: '#0a1230' }).setDepth(7));
        const chipW = t.width + 16;
        g.fillStyle(0xcfe8ff, 0.95).fillRoundedRect(wx, yy - 3, chipW, t.height + 6, 6);
        wx += chipW + 8;
      });
      yy += h * 0.105;
      // stat bars
      const barW = w * 0.34;
      Object.keys(MENU_STAT_RANGES).forEach((label) => {
        const [key, lo, hi] = MENU_STAT_RANGES[label];
        const v = Phaser.Math.Clamp(((c.stats[key] != null ? c.stats[key] : lo) - lo) / (hi - lo), 0.05, 1);
        add(this.add.text(tx, yy - 2, label, { fontFamily: MENU_FONT, fontSize: fs(11), color: '#8aa4d8' }).setDepth(6));
        const bx = tx + w * 0.17;
        g.fillStyle(0x16224f, 1).fillRoundedRect(bx, yy, barW * 0.82, 9, 4);
        g.fillStyle(acc, 1).fillRoundedRect(bx, yy, barW * 0.82 * v, 9, 4);
        yy += h * 0.075;
      });
      add(this.add.text(tx, yy + 2, c.stats.playstyle || '', {
        fontFamily: MENU_FONT, fontSize: fs(11), color: '#7f95c8', wordWrap: { width: w * 0.5 },
      }).setDepth(6));
    }

    // bottom status
    const keys = i === 0 ? 'A / D  =  SELECT     SPACE  =  LOCK IN' : '';
    add(this.add.text(x, y + h / 2 - 20, rdy ? '✔  READY!' : keys, {
      fontFamily: MENU_FONT, fontSize: rdy ? fs(18) : fs(12), fontStyle: rdy ? 'bold' : 'normal', color: rdy ? '#57e389' : '#8aa4d8',
    }).setOrigin(0.5).setDepth(6));
  }

  updateHint() {
    if (!this.hint) return;
    this.hint.setText(this.ready[0] && this.ready[1]
      ? 'Ready ✔  — heading to the stage select...'
      : (SELECTION.mode === 'bot'
        ? 'A / D + SPACE = pick and lock in      Left click = cursor      F = fullscreen'
        : 'A / D + SPACE = pick and lock in      Left click = cursor      F = fullscreen'));
  }

  // ------------------------------------------------------------------ MAP SELECT
  buildMaps(w, h) {
    this.title('CHOOSE A STAGE', 'Choose a stage and press SPACE / ENTER (move with the arrow keys, ESC = back)');
    const cols = MENU_MAP_COLS;
    const rows = Math.ceil(MENU_MAP_SLOTS / cols);
    const cardW = Math.max(110, Math.min(250, (w * 0.94) / (cols * 1.08)));
    const cardH = cardW * 9 / 16;
    const gapX = cardW * 0.08, gapY = cardH * 0.34;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const gridH = rows * cardH + (rows - 1) * gapY;
    const x0 = w / 2 - gridW / 2;
    const y0 = h * 0.5 - gridH / 2 + h * 0.02;
    this.mapCards = [];
    for (let i = 0; i < MENU_MAP_SLOTS; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = x0 + col * (cardW + gapX) + cardW / 2;
      const y = y0 + row * (cardH + gapY) + cardH / 2 + 8;
      const id = i < this.mapChoices.length ? this.mapChoices[i] : 'locked';
      this.drawMapCard(id, x, y, cardW, cardH);
      if (id !== 'locked') {
        const z = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true }).setDepth(40);
        z.mapIndex = i;
        this.zones.push(z);
        this.mapCards[i] = { x, y, w: cardW, h: cardH };
      }
    }
    this.hint = this.add.text(w / 2, h - 18, '', {
      fontFamily: MENU_FONT, fontSize: Math.round(Math.min(14, w / 80)) + 'px', color: '#d6e6ff',
    }).setOrigin(0.5).setDepth(10);
    this.updateMapHint();
  }

  drawMapCard(id, x, y, cw, ch) {
    const g = this.add.graphics().setDepth(2);
    const label = id === 'locked' ? '' : (id === 'random' ? 'RANDOM' : (MAPS[id].name || id).toUpperCase());
    if (label) {
      this.add.text(x, y - ch / 2 - 11, label, {
        fontFamily: MENU_FONT, fontSize: Math.round(Math.min(13, cw / 14)) + 'px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setDepth(3).setShadow(0, 2, '#000000', 4, true, true);
    }
    g.fillStyle(0x0d1a3e, 0.92).fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 6);
    if (id === 'locked') {
      g.lineStyle(2, 0x2b3a66, 0.7).strokeRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 6);
      this.add.text(x, y, '?', { fontFamily: MENU_FONT, fontSize: Math.round(ch * 0.5) + 'px', fontStyle: 'bold', color: '#2b3a66' }).setOrigin(0.5).setDepth(3);
      this.add.text(x, y + ch * 0.33, 'COMING SOON', { fontFamily: MENU_FONT, fontSize: Math.round(ch * 0.11) + 'px', color: '#3f5088' }).setOrigin(0.5).setDepth(3);
      return;
    }
    if (id === 'random') {
      this.drawDice(x, y, ch * 0.5);
    } else {
      const key = 'thumb_' + id;
      if (this.textures.exists(key)) {
        const im = this.add.image(x, y, key).setDepth(3);
        im.setScale(Math.max(cw / im.width, ch / im.height));
        im.setCrop(0, 0, im.width, im.height);
      } else {
        this.add.text(x, y, MAPS[id].name || id, { fontFamily: MENU_FONT, fontSize: '16px', color: '#9fc0ff' }).setOrigin(0.5).setDepth(3);
      }
    }
    g.lineStyle(2, 0x4fd0e8, 0.95).strokeRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 6);
  }

  updateMapHint() {
    if (!this.hint) return;
    const id = this.mapChoices[this.mapCursor];
    const desc = id === 'random' ? 'Random — a random stage is picked when the match starts'
      : (MAPS[id].desc || MAPS[id].name);
    this.hint.setText(desc);
  }

  // ------------------------------------------------------------------ input
  move(p, dir) {
    if (this.starting) return;
    if (this.phase === 'maps') { this.moveMap(dir, 0); return; }
    if (this.ready[p]) return;
    const n = this.choices.length;
    this.cursor[p] = (this.cursor[p] + dir + n) % n;
    this.sfx('pickup');
    this.drawPanel(p, this.panelRects[p]);
  }

  moveV(dir) {
    if (this.phase === 'maps') this.moveMap(0, dir);
  }

  moveMap(dx, dy) {
    const cols = MENU_MAP_COLS;
    const n = this.mapChoices.length;
    let i = this.mapCursor;
    if (dx) i = (i + dx + n) % n;
    if (dy) {
      const row = Math.floor(i / cols) + dy;
      const j = row * cols + (i % cols);
      if (j >= 0 && j < n) i = j;
    }
    if (i !== this.mapCursor) { this.mapCursor = i; this.sfx('pickup'); this.updateMapHint(); }
  }

  confirm(p) {
    if (this.starting) return;
    if (this.phase === 'chars') {
      this.ready[p] = !this.ready[p];
      this.sfx(this.ready[p] ? 'sword_slash' : 'pickup');
      this.drawPanel(p, this.panelRects[p]);
      this.updateHint();
      if (this.ready[0] && this.ready[1]) {
        this.time.delayedCall(650, () => { if (this.ready[0] && this.ready[1] && this.phase === 'chars') { this.phase = 'maps'; this.build(); } });
      }
    } else {
      this.startGame();
    }
  }

  back() {
    if (this.starting) return;
    if (this.phase === 'maps') {
      this.phase = 'chars';
      this.ready = [false, false];
      this.build();
    } else if (this.phase === 'chars' && typeof LobbyScene !== 'undefined') {
      this.starting = true;
      this.scene.start('Lobby');                  // ESC from character select = back to the Lobby
    }
  }

  onPointer(p) {
    if (this.starting) return;
    const hit = this.zones.find((z) => z.getBounds().contains(p.x, p.y));
    if (!hit) return;
    const b = p.button !== undefined ? p.button : 0;
    if (this.phase === 'chars' && hit.cardIndex !== undefined) {
      const pl = b === 2 ? 1 : 0;
      if (!this.ready[pl]) { this.cursor[pl] = hit.cardIndex; this.sfx('pickup'); this.drawPanel(pl, this.panelRects[pl]); }
    } else if (this.phase === 'maps' && hit.mapIndex !== undefined) {
      if (this.mapCursor === hit.mapIndex) { this.startGame(); return; }   // clicking again = confirm and start
      this.mapCursor = hit.mapIndex; this.sfx('pickup'); this.updateMapHint();
    }
  }

  onPointerMove(p) {
    if (this.phase !== 'maps' || this.starting) return;
    const hit = this.zones.find((z) => z.mapIndex !== undefined && z.getBounds().contains(p.x, p.y));
    if (hit && hit.mapIndex !== this.mapCursor) { this.mapCursor = hit.mapIndex; this.updateMapHint(); }
  }

  sfx(key) {
    if (typeof AudioMgr !== 'undefined') { try { AudioMgr.play(key); } catch (e) {} }
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    const pick = (i) => {
      const id = this.choices[this.cursor[i]];
      return id === 'random' ? Phaser.Utils.Array.GetRandom(this.charIds) : id;
    };
    SELECTION.p1 = pick(0);
    SELECTION.p2 = pick(1);
    const m = this.mapChoices[this.mapCursor];
    SELECTION.map = m === 'random' ? Phaser.Utils.Array.GetRandom(this.mapIds) : m;
    this.sfx('heavy_impact');
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  // ------------------------------------------------------------------ per-frame cursor highlight
  update(time) {
    if (!this.hl) return;
    const g = this.hl;
    g.clear();
    const pulse = 0.55 + 0.45 * Math.sin(time / 170);
    if (this.phase === 'chars' && this.cards) {
      [0, 1].forEach((p) => {
        const c = this.cards[this.cursor[p]];
        if (!c) return;
        const inset = p === 0 ? 0 : 5;
        const col = MENU_P_COLORS[p];
        g.lineStyle(4, col, this.ready[p] ? 1 : pulse).strokeRoundedRect(c.x - c.size / 2 - 3 + inset, c.y - c.size / 2 - 3 + inset, c.size + 6 - inset * 2, c.size + 6 - inset * 2, 10);
        if (this.ready[p]) {
          g.fillStyle(0x57e389, 0.9).fillRoundedRect(c.x - c.size / 2 + (p ? c.size * 0.52 : 0), c.y - c.size / 2 - 20, c.size * 0.48, 16, 5);
        } else {
          g.fillStyle(col, 0.95).fillRoundedRect(c.x - c.size / 2 + (p ? c.size * 0.52 : 0), c.y - c.size / 2 - 20, c.size * 0.48, 16, 5);
        }
      });
      // P1 / P2 tag text (created once, only moved afterwards)
      if (!this.tagTexts || this.tagTexts[0].scene !== this) this.tagTexts = null;
      if (!this.tagTexts) {
        this.tagTexts = [0, 1].map((p) => this.add.text(0, 0, 'P' + (p + 1), { fontFamily: MENU_FONT, fontSize: '11px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setDepth(31));
      }
      [0, 1].forEach((p) => {
        const c = this.cards[this.cursor[p]];
        if (!c) return;
        this.tagTexts[p].setText(this.ready[p] ? 'P' + (p + 1) + ' ✔' : 'P' + (p + 1));
        this.tagTexts[p].setPosition(c.x - c.size / 2 + (p ? c.size * 0.52 : 0) + c.size * 0.24, c.y - c.size / 2 - 12);
      });
    } else if (this.phase === 'maps' && this.mapCards) {
      const c = this.mapCards[this.mapCursor];
      if (c) {
        g.lineStyle(5, 0xffd54a, 0.35).strokeRoundedRect(c.x - c.w / 2 - 6, c.y - c.h / 2 - 6, c.w + 12, c.h + 12, 10);
        g.lineStyle(4, 0xffd54a, 0.55 + 0.45 * pulse).strokeRoundedRect(c.x - c.w / 2 - 3, c.y - c.h / 2 - 3, c.w + 6, c.h + 6, 8);
      }
    }
  }
}
