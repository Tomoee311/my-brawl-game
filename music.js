// music.js - menu music: plays in Lobby / hero select / online screens, fades out when a match starts.
// Put your track at assets/music/lobby.mp3 (own or royalty-free music). If the file is missing, the game stays silent - no errors.
const Music = {
  srcs: ['assets/music/lobby.mp3', 'assets/lobby.mp3'],   // first one that exists is used
  srcIdx: 0,
  volume: 0.15,   // 0 (silent) .. 1 (full)
  el: null, fade: null, unlocked: false, wanted: false,

  _make() {
    if (this.el) return this.el;
    try {
      this.el = new Audio(this.srcs[this.srcIdx]); this.el.loop = true; this.el.volume = 0; this.el.preload = 'auto';
      this.el.addEventListener('error', () => {   // file not found at this path: try the next one
        if (this.srcIdx < this.srcs.length - 1) { this.srcIdx++; this.el.src = this.srcs[this.srcIdx]; this.el.load(); if (this.wanted) this.play(); }
      });
    } catch (e) { this.el = null; }
    return this.el;
  },

  // call from every menu scene; safe to call repeatedly
  play() {
    this.wanted = true;
    const a = this._make(); if (!a) return;
    clearInterval(this.fade);
    const start = () => { a.play().then(() => { this.unlocked = true; this._ramp(this.volume); }).catch(() => {}); };
    if (!a.paused) { this._ramp(this.volume); return; }
    start();   // browsers block this until the first click/key; the listener below retries then
  },

  stop() {      // match starts: fade out
    this.wanted = false;
    if (!this.el) return;
    this._ramp(0, () => { try { this.el.pause(); this.el.currentTime = 0; } catch (e) {} });
  },

  _ramp(target, done) {
    const a = this.el; clearInterval(this.fade);
    this.fade = setInterval(() => {
      const d = target - a.volume;
      if (Math.abs(d) < 0.03) { a.volume = target; clearInterval(this.fade); if (done) done(); return; }
      a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.03));
    }, 50);
  },
};

// autoplay policy: start the music on the first click / key press
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (Music.wanted && !Music.unlocked) Music.play(); }, { passive: true }));
