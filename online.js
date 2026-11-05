// online.js - PLAY ONLINE screens: Host / Join (room code) -> waiting -> character select -> start.
// Uses bindDomKeys-style native key handling, MENU_FONT / MENU_P_COLORS from menu.js, and Net from net.js.

class OnlineScene extends Phaser.Scene {
  constructor() {
    super('Online');
  }

  create() {
    if (window.setHelpVisible) window.setHelpVisible(false);
    this.input.mouse.disableContextMenu();
    this.leaving = false;
    this.phase = 'menu';            // menu | hosting | joinInput | joining | select | error
    this.cursor = 0;
    this.codeInput = '';
    this.errorMsg = '';
    this.flash = '';
    this.charIds = Object.keys(CHARACTERS);
    this.mapIds = Object.keys(MAPS).filter((id) => MAPS[id].layers && MAPS[id].layers.length);
    this.myChar = Math.max(0, this.charIds.indexOf(SELECTION.p1));
    this.myReady = false;
    this.mapIdx = Math.max(0, ['random', ...this.mapIds].indexOf(SELECTION.map));   // 0 = random
    this.starting = false;
    this.pingText = null;

    Net.reset();
    Net.handlers = {
      onState: () => this.onNetState(),
      onSelect: () => { this.render(); this.checkStart(); },   // host: start as soon as the guest's READY arrives
      onOpen: () => this.render(),
      onStart: (m) => this.beginGame(m),
    };

    this.kd = (e) => { if (!e.repeat && this.sys && this.sys.isActive()) this.onKey(e); };
    window.addEventListener('keydown', this.kd);
    this.pasteHandler = (e) => {
      if (this.phase !== 'joinInput') return;
      const t = ((e.clipboardData && e.clipboardData.getData('text')) || '').toUpperCase();
      const m = t.match(/ROOM=([A-Z]{4})/) || t.match(/\b([A-Z]{4})\b/);
      if (m) { this.codeInput = m[1]; this.render(); }
    };
    window.addEventListener('paste', this.pasteHandler);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.kd);
      window.removeEventListener('paste', this.pasteHandler);
      Net.handlers = {};
    });
    this.input.on('pointerdown', (p) => this.onClick(p));
    this.input.on('pointermove', (p) => this.onHover(p));
    const onResize = () => { if (this.sys.isActive()) this.render(); };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (this.phase === 'select' && this.pingText && this.pingText.active) this.pingText.setText(this.pingLabel()); } });

    // invite link: ?room=ABCD joins straight away
    const room = new URLSearchParams(window.location.search).get('room');
    if (room && /^[A-Za-z]{4}$/.test(room)) { this.codeInput = room.toUpperCase(); this.joinNow(); } else this.render();
  }

  update(time, delta) { UI.tickEmbers(this, delta); }

  pingLabel() { return 'ping ' + (Net.rtt ? Math.round(Net.rtt) + ' ms' : '…'); }

  // ------------------------------------------------------------------ network events
  onNetState() {
    if (!this.sys.isActive() || this.starting) return;
    if (Net.state === 'connected' && (this.phase === 'hosting' || this.phase === 'joining')) {
      this.phase = 'select'; this.myReady = false; this.sendSel(); this.sfx('pickup'); this.render();
    } else if (Net.state === 'closed') {
      this.errorMsg = Net.error || 'Connection closed.';
      this.phase = 'error'; this.myReady = false; this.render();
    }
  }

  joinNow() {
    if (this.codeInput.length !== 4) { this.flashMsg('Enter the 4-letter room code'); return; }
    this.phase = 'joining';
    Net.join(this.codeInput);
    this.render();
  }

  hostNow() {
    this.phase = 'hosting';
    Net.host();
    this.render();
  }

  sendSel() {
    Net.sendMsg({ t: 'sel', char: this.charIds[this.myChar], ready: this.myReady, map: this.mapIdOf() });
  }

  mapIdOf() { return this.mapIdx === 0 ? 'random' : this.mapIds[this.mapIdx - 1]; }

  checkStart() {
    if (Net.role !== 'host' || this.starting) return;
    const r = Net.remoteSel;
    if (!(this.myReady && r && r.ready && r.char)) return;
    this.starting = true;
    let map = this.mapIdOf();
    if (map === 'random') map = this.mapIds[Math.floor(Math.random() * this.mapIds.length)];
    const msg = Net.announceStart({ p1: this.charIds[this.myChar], p2: r.char, map });
    this.time.delayedCall(350, () => this.beginGame(msg, true));
  }

  beginGame(m, fromHost) {
    if (this.starting && !fromHost) return;
    this.starting = true;
    SELECTION.mode = 'online';
    SELECTION.p1 = m.p1; SELECTION.p2 = m.p2; SELECTION.map = m.map;
    this.sfx('heavy_impact');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    Net.reset();
    this.scene.start('Lobby');
  }

  // ------------------------------------------------------------------ input
  onKey(e) {
    const c = e.code;
    const stop = () => e.preventDefault();
    if (this.starting) return;
    if (this.phase === 'joinInput') {
      if (/^Key[A-Z]$/.test(c) && !e.ctrlKey && !e.metaKey) { if (this.codeInput.length < 4) { this.codeInput += c[3]; this.sfx('pickup'); this.render(); } stop(); return; }
      if (c === 'Backspace') { this.codeInput = this.codeInput.slice(0, -1); this.render(); stop(); return; }
      if (c === 'Enter' || c === 'NumpadEnter') { this.joinNow(); stop(); return; }
      if (c === 'Escape') { this.phase = 'menu'; this.render(); stop(); return; }
      return;
    }
    const up = c === 'ArrowUp' || c === 'KeyW', down = c === 'ArrowDown' || c === 'KeyS';
    const left = c === 'ArrowLeft' || c === 'KeyA', right = c === 'ArrowRight' || c === 'KeyD';
    const ok = c === 'Enter' || c === 'Space' || c === 'NumpadEnter' || c === 'KeyJ';
    if (this.phase === 'menu') {
      if (up || left) { this.cursor = (this.cursor + 1) % 2; this.sfx('pickup'); this.render(); stop(); }
      else if (down || right) { this.cursor = (this.cursor + 1) % 2; this.sfx('pickup'); this.render(); stop(); }
      else if (ok) { this.chooseMenu(this.cursor); stop(); }
      else if (c === 'Escape' || c === 'Backspace') { this.leave(); stop(); }
    } else if (this.phase === 'hosting') {
      if (c === 'KeyC') { this.copyLink(); stop(); }
      else if (c === 'Escape') { Net.reset(); this.phase = 'menu'; this.render(); stop(); }
    } else if (this.phase === 'joining') {
      if (c === 'Escape') { Net.reset(); this.phase = 'joinInput'; this.render(); stop(); }
    } else if (this.phase === 'error') {
      if (c === 'Escape' || ok) { Net.reset(); this.phase = 'menu'; this.render(); stop(); }
    } else if (this.phase === 'select') {
      if (left) { this.myChar = (this.myChar + this.charIds.length - 1) % this.charIds.length; this.changedSel(); stop(); }
      else if (right) { this.myChar = (this.myChar + 1) % this.charIds.length; this.changedSel(); stop(); }
      else if (Net.role === 'host' && (up || down)) {
        const n = this.mapIds.length + 1;
        this.mapIdx = (this.mapIdx + (down ? 1 : n - 1)) % n; this.changedSel(); stop();
      }
      else if (ok) { this.toggleReady(); stop(); }
      else if (c === 'Escape') { this.leave(); stop(); }
    }
    if (c === 'KeyF' && this.phase !== 'joinInput') this.scale.toggleFullscreen();
  }

  chooseMenu(i) {
    this.sfx('sword_slash');
    if (i === 0) this.hostNow();
    else { this.phase = 'joinInput'; this.codeInput = ''; this.render(); }
  }

  changedSel() {
    if (this.myReady) this.myReady = false;      // changing hero cancels the ready state
    this.sfx('pickup'); this.sendSel(); this.render();
  }

  toggleReady() {
    this.myReady = !this.myReady;
    this.sfx(this.myReady ? 'heavy_impact' : 'throw');
    this.sendSel(); this.render(); this.checkStart();
  }

  copyLink() {
    const url = window.location.origin + window.location.pathname + '?room=' + Net.code;
    const done = () => this.flashMsg('Invite link copied!');
    try { navigator.clipboard.writeText(url).then(done, () => this.flashMsg(url)); } catch (e) { this.flashMsg(url); }
  }

  flashMsg(t) {
    this.flash = t; this.render();
    this.time.delayedCall(2500, () => { if (this.flash === t) { this.flash = ''; if (this.sys.isActive()) this.render(); } });
  }

  hit(p) { return (this.zones || []).find((z) => p.x >= z.x - z.w / 2 && p.x <= z.x + z.w / 2 && p.y >= z.y - z.h / 2 && p.y <= z.y + z.h / 2); }

  onHover(p) {
    if (this.phase !== 'menu') return;
    const z = this.hit(p);
    if (z && z.kind === 'menu' && z.i !== this.cursor) { this.cursor = z.i; this.render(); }
  }

  onClick(p) {
    if (this.starting) return;
    const z = this.hit(p);
    if (!z) return;
    if (z.kind === 'menu') { this.cursor = z.i; this.chooseMenu(z.i); }
    else if (z.kind === 'card') { if (this.myChar !== z.i) { this.myChar = z.i; this.changedSel(); } else this.toggleReady(); }
    else if (z.kind === 'ready') this.toggleReady();
    else if (z.kind === 'map' && Net.role === 'host') { this.mapIdx = (this.mapIdx + 1) % (this.mapIds.length + 1); this.changedSel(); }
    else if (z.kind === 'copy') this.copyLink();
    else if (z.kind === 'back') { if (this.phase === 'menu') this.leave(); else if (this.phase === 'select') this.leave(); else { Net.reset(); this.phase = 'menu'; this.render(); } }
  }

  sfx(key) { if (typeof AudioMgr !== 'undefined') { try { AudioMgr.play(key); } catch (e) {} } }

  // ------------------------------------------------------------------ drawing
  render() {
    UI.clear(this);
    this.zones = [];
    const w = this.scale.width, h = this.scale.height;
    this.W = w; this.H = h;
    const S = Math.max(0.55, Math.min(w / 960, h / 640, 1.2));
    this.S = S;
    UI.backdrop(this, w, h, this.mapIds[0]);

    if (this.phase === 'menu') this.drawMenu(w, h, S);
    else if (this.phase === 'hosting') this.drawHosting(w, h, S);
    else if (this.phase === 'joinInput' || this.phase === 'joining') this.drawJoin(w, h, S);
    else if (this.phase === 'error') this.drawError(w, h, S);
    else if (this.phase === 'select') this.drawSelect(w, h, S);

    if (this.flash) {
      UI.glass(this, w / 2, h * 0.9, Math.min(w * 0.8, 520), 44, { accent: UI.c.gold, selected: true, radius: 22, depth: 30 });
      UI.text(this, w / 2, h * 0.9, this.flash, 16, UI.c.warn, true).setDepth(31);
    }
    // back button (top-left)
    const bx = 22 + 56, by = 34;
    UI.glass(this, bx, by, 112, 34, { radius: 17, alpha: 0.7 });
    UI.text(this, bx, by, '‹  BACK', 13, UI.c.muted, true);
    this.zones.push({ kind: 'back', x: bx, y: by, w: 112, h: 34 });
  }

  tile(x, y, S, ch, col, active, filled) {
    UI.glass(this, x, y, 74 * S, 96 * S, { accent: col, selected: active, radius: 14, alpha: 0.9 });
    return UI.text(this, x, y, ch, 58 * S, filled ? '#ffffff' : UI.c.dim, true).setStroke('#0a1230', 5);
  }

  drawMenu(w, h, S) {
    UI.title(this, w / 2, h * 0.16, 'PLAY ONLINE', Math.round(Math.min(60, w / 13)), '1 vs 1 over the internet — free, no account needed');
    const defs = [
      { title: 'HOST A ROOM', desc: 'Get a 4-letter code and send it to your friend', color: UI.c.p1, icon: 'host' },
      { title: 'JOIN A ROOM', desc: 'Type the code your friend gave you', color: UI.c.p2, icon: 'join' },
    ];
    const bw = Math.min(640, w * 0.9), bh = Math.min(96, h * 0.14), gap = bh * 0.24;
    const y0 = h * 0.52;
    defs.forEach((d, i) => {
      const y = y0 + i * (bh + gap);
      UI.card(this, w / 2, y, bw, bh, Object.assign({}, d, { selected: i === this.cursor }));
      this.zones.push({ kind: 'menu', i, x: w / 2, y, w: bw, h: bh });
    });
    if (!Net.available()) UI.text(this, w / 2, h * 0.8, 'The online library did not load (no internet?). Online play needs a connection.', 14, UI.c.bad);
    UI.footer(this, w, h, '↑ / ↓  choose      ENTER  confirm      ESC  back');
  }

  drawHosting(w, h, S) {
    UI.title(this, w / 2, h * 0.16, 'YOUR ROOM', Math.round(Math.min(56, w / 14)), 'Send this code to your friend');
    const code = this.peerReady() ? Net.code : '····';
    const step = 88 * S, y = h * 0.43;
    for (let i = 0; i < 4; i++) this.tile(w / 2 + (i - 1.5) * step, y, S, code[i], UI.c.p1, true, true);
    const st = UI.text(this, w / 2, h * 0.6, 'Waiting for your friend to join…', 18 * Math.max(S, 0.8), UI.c.muted);
    this.tweens.add({ targets: st, alpha: 0.45, duration: 800, yoyo: true, repeat: -1 });
    const bw = Math.min(360 * S + 40, w * 0.9), by = h * 0.72;
    UI.glass(this, w / 2, by, bw, 52 * S + 8, { accent: UI.c.mint, selected: true, radius: 26 });
    UI.text(this, w / 2, by, 'COPY INVITE LINK  (C)', 17 * Math.max(S, 0.8), UI.css(UI.c.mint), true);
    this.zones.push({ kind: 'copy', x: w / 2, y: by, w: bw, h: 60 });
    UI.text(this, w / 2, h * 0.82, 'The link opens the game and joins automatically.\nKeep this screen open until your friend joins.', 13, UI.c.dim);
  }

  peerReady() { return !!(Net.peer && Net.peer.open); }

  drawJoin(w, h, S) {
    UI.title(this, w / 2, h * 0.16, 'JOIN A ROOM', Math.round(Math.min(56, w / 14)), this.phase === 'joining' ? 'Connecting…' : 'Type the 4-letter code, then press ENTER   (Ctrl+V to paste)');
    const step = 88 * S, y = h * 0.43;
    for (let i = 0; i < 4; i++) {
      const filled = !!this.codeInput[i];
      this.tile(w / 2 + (i - 1.5) * step, y, S, filled ? this.codeInput[i] : '_', UI.c.p2, this.phase === 'joinInput' && i === this.codeInput.length, filled);
    }
    if (this.phase === 'joining') {
      const t = UI.text(this, w / 2, h * 0.62, 'Connecting to room ' + Net.code + '…', 18 * Math.max(S, 0.8), UI.c.muted);
      this.tweens.add({ targets: t, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    } else if (this.codeInput.length === 4) {
      UI.text(this, w / 2, h * 0.62, 'Press ENTER to join', 18 * Math.max(S, 0.8), UI.css(UI.c.mint), true);
    }
  }

  drawError(w, h, S) {
    UI.title(this, w / 2, h * 0.16, 'OOPS', Math.round(Math.min(56, w / 14)), 'Could not connect');
    const bw = Math.min(640, w * 0.9), bh = 130;
    UI.glass(this, w / 2, h * 0.47, bw, bh, { accent: UI.c.red, selected: true, bar: true });
    UI.text(this, w / 2 + 10, h * 0.47, this.errorMsg, 17, UI.c.bad, false, { wordWrap: { width: bw - 90 } });
    UI.text(this, w / 2, h * 0.64, 'Press ENTER or ESC to go back', 16, UI.c.muted);
  }

  drawSelect(w, h, S) {
    const host = Net.role === 'host';
    const myCol = host ? UI.c.p1 : UI.c.p2, opCol = host ? UI.c.p2 : UI.c.p1;
    UI.title(this, w / 2, h * 0.095, 'CHOOSE YOUR LEGEND', Math.round(Math.min(46, w / 16)), host ? 'You are P1 (host) — pick a hero, then press ENTER to ready up' : 'You are P2 — pick a hero, then press ENTER to ready up');

    // roster
    const n = this.charIds.length, opp = Net.remoteSel;
    const size = Math.max(54, Math.min(96 * S + 8, (w * 0.9) / (n * 1.12)));
    const gap = size * 0.14, rowW = n * size + (n - 1) * gap, y = h * 0.345;
    this.charIds.forEach((id, i) => {
      const x = w / 2 - rowW / 2 + size / 2 + i * (size + gap);
      const mine = i === this.myChar, theirs = !!(opp && opp.char === id);
      UI.glass(this, x, y, size, size, { accent: mine ? myCol : (theirs ? opCol : UI.c.line), selected: mine || theirs, radius: size * 0.14, alpha: 0.92 });
      const c = CHARACTERS[id];
      if (this.textures.exists(c.sheetKey)) {
        const im = this.add.image(x, y - size * 0.06, c.sheetKey, 0).setDepth(6);
        im.setCrop(46, 32, 68, 66);
        const s = (size - 10) / 68; im.setScale(s); im.y = y - size * 0.06 - s;
      }
      this.add.graphics().setDepth(7).fillStyle(0x040a22, 0.82).fillRoundedRect(x - size / 2 + 3, y + size * 0.27, size - 6, size * 0.2, 6);
      UI.text(this, x, y + size * 0.37, c.name.toUpperCase(), Math.min(size * 0.115, 13), '#ffffff', true).setDepth(8);
      if (mine) UI.chip(this, x, y - size / 2 - 11, 'YOU', myCol, 11, '#08102a');
      if (theirs && !mine) UI.chip(this, x, y - size / 2 - 11, 'OPP', opCol, 11, '#08102a');
      else if (theirs && mine) UI.chip(this, x + size * 0.28, y - size / 2 - 11, 'OPP', opCol, 11, '#08102a');
      this.zones.push({ kind: 'card', i, x, y, w: size, h: size });
    });

    // player panels + stage in the middle
    const sw = Math.min(w * 0.22, 230 * S), gapP = 14 * S, py = h * 0.665, ph = 134 * S;
    const pw = Math.min((w * 0.94 - sw - 2 * gapP) / 2, 360 * S);
    const lx = w / 2 - sw / 2 - gapP - pw / 2, rx = w / 2 + sw / 2 + gapP + pw / 2;
    const panel = (x, label, charId, ready, col, isYou) => {
      UI.glass(this, x, py, pw, ph, { accent: col, selected: isYou, bar: true });
      UI.text(this, x - pw / 2 + 34, py - ph * 0.30, label, 12 * Math.max(S, 0.85), isYou ? UI.css(col) : UI.c.muted, true).setOrigin(0, 0.5);
      UI.text(this, x - pw / 2 + 34, py + ph * 0.0, charId ? CHARACTERS[charId].name.toUpperCase() : 'CHOOSING…', 26 * Math.max(S, 0.8), charId ? '#ffffff' : UI.c.dim, true).setOrigin(0, 0.5).setStroke('#0a1230', 4);
      const cw = 112 * Math.max(S, 0.85), cy = py + ph * 0.29;
      this.add.graphics().setDepth(7).fillStyle(ready ? UI.c.mint : 0x26335f, ready ? 1 : 0.9).fillRoundedRect(x - pw / 2 + 34, cy - 13, cw, 26, 13);
      if (charId && this.textures.exists(CHARACTERS[charId].sheetKey)) {   // portrait
        const im = this.add.image(x + pw / 2 - ph * 0.5, py + ph * 0.02, CHARACTERS[charId].sheetKey, 0).setDepth(6);
        im.setCrop(46, 32, 68, 66);
        const sc = (ph * 0.8) / 68; im.setScale(sc); im.y = py + ph * 0.02 - sc;
      }
      UI.text(this, x - pw / 2 + 34 + cw / 2, cy, ready ? '✔ READY' : 'NOT READY', 11 * Math.max(S, 0.85), ready ? '#06210f' : UI.c.muted, true).setDepth(9);
    };
    const you = 'YOU · ' + (host ? 'P1' : 'P2'), them = 'OPPONENT · ' + (host ? 'P2' : 'P1');
    panel(host ? lx : rx, you, this.charIds[this.myChar], this.myReady, myCol, true);
    panel(host ? rx : lx, them, opp && opp.char, !!(opp && opp.ready), opCol, false);

    // stage card
    const mapId = host ? this.mapIdOf() : (opp && opp.map) || 'random';
    UI.glass(this, w / 2, py, sw, ph, { accent: UI.c.gold, selected: false });
    UI.text(this, w / 2, py - ph * 0.39, 'STAGE', 11, UI.c.dim, true);
    const ih = ph * 0.46, iw = Math.min(ih * 16 / 9, sw - 24), iy = py - ph * 0.04;
    if (mapId !== 'random' && this.textures.exists('thumb_' + mapId)) {
      this.add.image(w / 2, iy, 'thumb_' + mapId).setDisplaySize(iw, ih).setDepth(6);
      this.add.graphics().setDepth(7).lineStyle(1.5, UI.c.line, 1).strokeRoundedRect(w / 2 - iw / 2, iy - ih / 2, iw, ih, 6);
    } else {
      UI.text(this, w / 2, iy, '?', ih * 0.7, UI.c.dim, true);
    }
    const mapName = mapId === 'random' ? 'RANDOM' : (MAPS[mapId] ? MAPS[mapId].name.toUpperCase() : mapId);
    UI.text(this, w / 2, py + ph * 0.37, mapName, 10.5, '#ffffff', true, { wordWrap: { width: sw - 16 } });
    if (host) this.zones.push({ kind: 'map', x: w / 2, y: py, w: sw, h: ph });

    // ready button
    const by = h * 0.865, bw = Math.min(330 * S + 40, w * 0.9), bh = 52 * S + 6;
    const col = this.myReady ? UI.c.mint : UI.c.gold;
    UI.glass(this, w / 2, by, bw, bh, { accent: col, selected: true, radius: bh / 2 });
    UI.text(this, w / 2, by, this.myReady ? '✔  READY — waiting for opponent' : 'READY  (ENTER)', 17 * Math.max(S, 0.8), UI.css(col), true);
    this.zones.push({ kind: 'ready', x: w / 2, y: by, w: bw, h: bh });
    this.pingText = UI.text(this, w / 2, h - 20, this.pingLabel(), 12, UI.c.dim);
    UI.text(this, w / 2, h - 38, host ? 'A / D  hero      ↑ / ↓  stage      ENTER  ready / cancel' : 'A / D  hero      ENTER  ready / cancel', 12, UI.c.dim);
  }
}
