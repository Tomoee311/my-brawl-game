// ui.js - shared look & feel for all menu screens (dark "glass" panels, soft glow, floating embers, vector icons).
// Plain Phaser calls only (no WebGL-only features), so it also works with the Canvas renderer.

const UI = {
  font: 'Poppins, "Segoe UI", Arial, "Noto Sans Myanmar", "Myanmar Text", sans-serif',
  c: {
    bg: 0x070b1a, glass: 0x0d1430, line: 0x2c3c70,
    p1: 0xff6b5a, p2: 0x5ab8ff, mint: 0x57e389, gold: 0xffd54a, red: 0xff6b6b,
    text: '#ffffff', muted: '#a9bbe8', dim: '#6f82b5', warn: '#ffe27a', bad: '#ff9c9c', good: '#7dffb0',
  },
  css(n) { return '#' + (n >>> 0).toString(16).padStart(6, '0'); },

  // ---- text helper: centered by default ----
  text(scene, x, y, s, size, color, bold, extra) {
    return scene.add.text(x, y, s, Object.assign({
      fontFamily: UI.font, fontSize: Math.round(size) + 'px', color: color || UI.c.text,
      fontStyle: bold ? 'bold' : 'normal', align: 'center',
    }, extra || {})).setOrigin(0.5).setDepth(10);
  },

  // ---- remove everything from a scene except the persistent ember layer ----
  clear(scene) {
    scene.tweens.killAll();
    scene.children.list.slice().forEach((o) => { if (!o.__keep) o.destroy(); });
  },

  // ---- background: map art, dark tint, soft vignette, drifting embers ----
  backdrop(scene, w, h, mapId) {
    scene.add.rectangle(w / 2, h / 2, w, h, UI.c.bg).setDepth(-20);
    const def = mapId && MAPS[mapId];
    ((def && def.layers) || []).forEach((L, i) => {
      if (!scene.textures.exists(L.key)) return;
      const im = scene.add.image(w / 2, h / 2, L.key).setDepth(-19 + i);
      im.setScale(Math.max(w / im.width, h / im.height) * 1.08);
    });
    scene.add.rectangle(w / 2, h / 2, w, h, 0x050818, 0.66).setDepth(-8);
    // soft vignette: stacked translucent bands darkening the top and bottom edges
    for (let i = 0; i < 7; i++) {
      const bh = (h * 0.30) * (1 - i / 7);
      scene.add.rectangle(w / 2, 0, w, bh, 0x02040c, 0.07).setOrigin(0.5, 0).setDepth(-7);
      scene.add.rectangle(w / 2, h, w, bh * 1.1, 0x02040c, 0.07).setOrigin(0.5, 1).setDepth(-7);
    }
    UI.embers(scene, w, h);
  },

  embers(scene, w, h) {
    if (scene.__embers) { scene.__embers.forEach((e) => { e.o.setVisible(true); }); scene.__embersW = w; scene.__embersH = h; return; }
    scene.__embersW = w; scene.__embersH = h;
    scene.__embers = [];
    const cols = [0xffd9a0, 0xffb36b, 0xbcd4ff];
    for (let i = 0; i < 26; i++) {
      const r = 1 + Math.random() * 2.2;
      const o = scene.add.circle(Math.random() * w, Math.random() * h, r, cols[i % 3], 0.5).setDepth(-6);
      o.__keep = true;
      scene.__embers.push({ o, vy: 8 + Math.random() * 16, vx: (Math.random() - 0.5) * 8, ph: Math.random() * 6.28 });
    }
    scene.events.once('shutdown', () => { scene.__embers = null; });
  },

  // call from a scene's update(time, delta)
  tickEmbers(scene, delta) {
    if (!scene.__embers) return;
    const w = scene.__embersW || scene.scale.width, h = scene.__embersH || scene.scale.height, dt = Math.min(delta, 60) / 1000;
    scene.__embers.forEach((e) => {
      e.ph += dt * 1.5;
      e.o.x += (e.vx + Math.sin(e.ph) * 6) * dt;
      e.o.y -= e.vy * dt;
      e.o.setAlpha(0.25 + 0.3 * (0.5 + 0.5 * Math.sin(e.ph * 1.7)));
      if (e.o.y < -10) { e.o.y = h + 10; e.o.x = Math.random() * w; }
      if (e.o.x < -10) e.o.x = w + 10; else if (e.o.x > w + 10) e.o.x = -10;
    });
  },

  // ---- glass card ----
  // opts: accent (color), selected, radius, alpha, depth, bar (draw accent pill on the left)
  glass(scene, x, y, w, h, opts) {
    const o = Object.assign({ accent: UI.c.line, selected: false, radius: 16, alpha: 0.80, depth: 5, bar: false, dim: false }, opts || {});
    const g = scene.add.graphics().setDepth(o.depth);
    const L = x - w / 2, T = y - h / 2, r = o.radius;
    // drop shadow
    for (let k = 3; k >= 1; k--) g.fillStyle(0x000000, 0.10).fillRoundedRect(L - k * 2, T + 4 + k * 2, w + k * 4, h + k * 2, r + k * 2);
    // selected glow
    if (o.selected) for (let k = 4; k >= 1; k--) g.lineStyle(k * 3, o.accent, 0.07).strokeRoundedRect(L - k, T - k, w + k * 2, h + k * 2, r + k);
    g.fillStyle(UI.c.glass, o.dim ? 0.55 : o.alpha).fillRoundedRect(L, T, w, h, r);
    g.fillStyle(0xffffff, o.selected ? 0.07 : 0.035).fillRoundedRect(L + 1, T + 1, w - 2, h * 0.46, { tl: r - 1, tr: r - 1, bl: 4, br: 4 });
    g.lineStyle(o.selected ? 2.5 : 1.5, o.selected ? o.accent : UI.c.line, o.selected ? 1 : 0.9).strokeRoundedRect(L, T, w, h, r);
    if (o.bar) g.fillStyle(o.accent, o.dim ? 0.4 : 1).fillRoundedRect(L + 14, T + h * 0.2, 5, h * 0.6, 3);
    return g;
  },

  // pill / chip with text, returns width
  chip(scene, x, y, label, color, size, textColor) {
    const t = UI.text(scene, x, y, label, size || 12, textColor || '#0a1230', true).setDepth(8);
    const w = t.width + 18, h = t.height + 8;
    scene.add.graphics().setDepth(7).fillStyle(color, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    return w;
  },

  // heading with accent underline
  title(scene, x, y, s, size, sub) {
    const t = UI.text(scene, x, y, s, size, UI.c.text, true).setStroke('#0a1230', Math.max(4, size / 9)).setShadow(0, 4, '#000000', 10, true, true);
    const uy = y + size * 0.62;
    const g = scene.add.graphics().setDepth(9);
    g.fillStyle(UI.c.p1, 1).fillRoundedRect(x - 54, uy, 50, 4, 2);
    g.fillStyle(UI.c.p2, 1).fillRoundedRect(x + 4, uy, 50, 4, 2);
    if (sub) UI.text(scene, x, uy + 24, sub, Math.max(13, size * 0.30), UI.c.muted);
    return t;
  },

  // ---- vector icons (centered on x,y, fits in size x size) ----
  icon(scene, kind, x, y, size, color) {
    const g = scene.add.graphics().setDepth(9);
    const s = size, lw = Math.max(2, s * 0.09);
    g.lineStyle(lw, color, 1);
    if (kind === 'versus') {
      g.strokeCircle(x - s * 0.17, y, s * 0.27); g.strokeCircle(x + s * 0.17, y, s * 0.27);
    } else if (kind === 'bot') {
      g.strokeRoundedRect(x - s * 0.34, y - s * 0.22, s * 0.68, s * 0.5, s * 0.1);
      g.fillStyle(color, 1).fillCircle(x - s * 0.13, y + s * 0.03, s * 0.055).fillCircle(x + s * 0.13, y + s * 0.03, s * 0.055);
      g.lineBetween(x, y - s * 0.22, x, y - s * 0.36); g.fillCircle(x, y - s * 0.39, s * 0.05);
    } else if (kind === 'globe') {
      g.strokeCircle(x, y, s * 0.36); g.strokeEllipse(x, y, s * 0.36, s * 0.72); g.lineBetween(x - s * 0.36, y, x + s * 0.36, y);
    } else if (kind === 'host') {
      g.strokeCircle(x, y, s * 0.34); g.lineBetween(x - s * 0.15, y, x + s * 0.15, y); g.lineBetween(x, y - s * 0.15, x, y + s * 0.15);
    } else if (kind === 'gear') {
      g.strokeCircle(x, y, s * 0.17);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.lineBetween(x + Math.cos(a) * s * 0.27, y + Math.sin(a) * s * 0.27, x + Math.cos(a) * s * 0.37, y + Math.sin(a) * s * 0.37);
      }
      g.strokeCircle(x, y, s * 0.28);
    } else if (kind === 'book') {
      g.strokeRoundedRect(x - s * 0.36, y - s * 0.28, s * 0.72, s * 0.56, s * 0.06);
      g.lineBetween(x, y - s * 0.28, x, y + s * 0.28);
      g.lineBetween(x - s * 0.24, y - s * 0.1, x - s * 0.08, y - s * 0.1);
      g.lineBetween(x - s * 0.24, y + s * 0.06, x - s * 0.08, y + s * 0.06);
      g.lineBetween(x + s * 0.08, y - s * 0.1, x + s * 0.24, y - s * 0.1);
      g.lineBetween(x + s * 0.08, y + s * 0.06, x + s * 0.24, y + s * 0.06);
    } else if (kind === 'join') {
      g.strokeRoundedRect(x - s * 0.02, y - s * 0.34, s * 0.36, s * 0.68, s * 0.06);
      g.lineBetween(x - s * 0.36, y, x + s * 0.1, y); g.lineBetween(x - s * 0.06, y - s * 0.14, x + s * 0.1, y); g.lineBetween(x - s * 0.06, y + s * 0.14, x + s * 0.1, y);
    }
    return g;
  },

  // standard menu button card: icon + title + description, returns nothing (caller keeps hit zone)
  card(scene, x, y, w, h, o) {
    // o: { title, desc, color, icon, selected, locked }
    UI.glass(scene, x, y, w, h, { accent: o.color, selected: o.selected, bar: true, dim: o.locked });
    const ix = x - w / 2 + h * 0.62;
    scene.add.graphics().setDepth(8).fillStyle(o.color, o.selected ? 0.28 : 0.16).fillCircle(ix, y, h * 0.31);
    UI.icon(scene, o.icon, ix, y, h * 0.42, o.locked ? 0x7d8597 : 0xffffff);
    const tx = ix + h * 0.5;
    const t1 = UI.text(scene, tx, y - h * 0.15, o.title, h * 0.30, o.locked ? '#8b93a6' : '#ffffff', true).setOrigin(0, 0.5);
    UI.text(scene, tx, y + h * 0.2, o.desc, Math.max(12, Math.min(16, h * 0.18)), o.locked ? '#6f7788' : UI.c.muted).setOrigin(0, 0.5);
    if (o.selected && !o.locked) UI.text(scene, x + w / 2 - 28, y, '›', h * 0.5, UI.css(o.color), true);
    return t1;
  },

  footer(scene, w, h, s) {
    return UI.text(scene, w / 2, h - 22, s, Math.max(11, Math.min(14, w / 80)), UI.c.dim);
  },
};
