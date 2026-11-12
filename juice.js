// Game Juice: Audio Manager & Visual Effects (VFX) Manager for Platform Fighter.
// Provides impactful hit effects, directional slashes, spark explosions, camera shake,
// and audio playback with automatic Web Audio synthesizer fallback.

const SFX = {
  sword_slash:  'assets/sfx/sword_slash.wav',
  sword_heavy:  'assets/sfx/sword_heavy.wav',
  katana_slash: 'assets/sfx/katana_slash.wav',
  spear_thrust: 'assets/sfx/spear_thrust.wav',
  axe_swing:    'assets/sfx/axe_swing.wav',
  gunshot:      'assets/sfx/gunshot.wav',
  heavy_impact: 'assets/sfx/heavy_impact.wav',
  light_impact: 'assets/sfx/light_impact.wav',
  pickup:       'assets/sfx/pickup.wav',
  throw:        'assets/sfx/throw.wav',
  dodge:        'assets/sfx/dodge.wav',
  jump:         'assets/sfx/jump.wav',
  land:         'assets/sfx/land.wav',
  ko:           'assets/sfx/ko.wav',
  // Fist (before holding a weapon) and hit sounds
  fist_light:   'assets/sfx/fist_light.wav',
  fist_heavy:   'assets/sfx/fist_heavy.wav',
  fist_hit:     'assets/sfx/fist_hit.wav',
  blade_hit:    'assets/sfx/blade_hit.wav',
  bullet_hit:   'assets/sfx/bullet_hit.wav',
};

// Each profile has its own pitch band, noise color, filter sweep and envelope.
const SYNTH_PROFILES = {
  jump: { tones: [{ from: 920, to: 1850, duration: 0.16, wave: 'sine', gain: 0.12, attack: 0.008 }], noises: [{ color: 'pink', filter: 'highpass', from: 9200, to: 11800, duration: 0.12, gain: 0.025 }] },
  land: { tones: [{ from: 112, to: 38, duration: 0.27, wave: 'sine', gain: 0.34, attack: 0.002 }], noises: [{ color: 'brown', filter: 'lowpass', from: 310, to: 105, duration: 0.22, gain: 0.21 }] },
  sword_slash: { tones: [{ from: 2650, to: 1480, duration: 0.075, wave: 'triangle', gain: 0.075, attack: 0.001 }], noises: [{ color: 'metal', filter: 'bandpass', from: 5400, to: 7600, duration: 0.095, gain: 0.16, q: 1.4 }] },
  sword_heavy: { tones: [{ from: 1750, to: 720, duration: 0.16, wave: 'triangle', gain: 0.11, attack: 0.003 }], noises: [{ color: 'metal', filter: 'bandpass', from: 3200, to: 5200, duration: 0.21, gain: 0.2, q: 1.1 }] },
  katana_slash: { tones: [{ from: 4150, to: 2850, duration: 0.065, wave: 'triangle', gain: 0.07, attack: 0.001 }], noises: [{ color: 'metal', filter: 'highpass', from: 8800, to: 12500, duration: 0.075, gain: 0.13 }] },
  spear_thrust: { tones: [{ from: 560, to: 235, duration: 0.22, wave: 'triangle', gain: 0.105, attack: 0.012 }], noises: [{ color: 'violet', filter: 'bandpass', from: 680, to: 1320, duration: 0.24, gain: 0.19, q: 0.8 }] },
  axe_swing: { tones: [{ from: 260, to: 92, duration: 0.29, wave: 'sawtooth', gain: 0.12, attack: 0.015 }], noises: [{ color: 'brown', filter: 'lowpass', from: 720, to: 180, duration: 0.3, gain: 0.2 }] },
  gunshot: { tones: [{ from: 158, to: 34, duration: 0.18, wave: 'sine', gain: 0.38, attack: 0.001, drive: 0.16 }], noises: [{ color: 'white', filter: 'highpass', from: 3200, to: 4900, duration: 0.095, gain: 0.3, attack: 0.001, drive: 0.3 }] },
  heavy_impact: { tones: [{ from: 82, to: 31, duration: 0.32, wave: 'sine', gain: 0.37, attack: 0.001 }], noises: [{ color: 'brown', filter: 'lowpass', from: 250, to: 75, duration: 0.28, gain: 0.24 }] },
  light_impact: { tones: [{ from: 420, to: 165, duration: 0.095, wave: 'triangle', gain: 0.12, attack: 0.001 }], noises: [{ color: 'white', filter: 'bandpass', from: 1450, to: 880, duration: 0.08, gain: 0.1 }] },
  pickup: { tones: [{ from: 660, to: 990, duration: 0.11, wave: 'sine', gain: 0.1 }, { from: 990, to: 1480, duration: 0.16, wave: 'sine', gain: 0.08, delay: 0.07 }] },
  throw: { tones: [{ from: 330, to: 190, duration: 0.12, wave: 'triangle', gain: 0.07 }], noises: [{ color: 'pink', filter: 'bandpass', from: 1800, to: 950, duration: 0.17, gain: 0.1 }] },
  dodge: { noises: [{ color: 'white', filter: 'highpass', from: 7400, to: 5200, duration: 0.1, gain: 0.08 }] },
  ko: { tones: [{ from: 100, to: 28, duration: 0.42, wave: 'sine', gain: 0.35, attack: 0.008 }], noises: [{ color: 'brown', filter: 'lowpass', from: 280, to: 60, duration: 0.36, gain: 0.23 }] },
  // Fist: soft whoosh + thud (light = short and high, heavy = long and low)
  fist_light: {
    tones: [{ from: 170, to: 70, duration: 0.1, wave: 'sine', gain: 0.22, attack: 0.002, delay: 0.025 }],
    noises: [{ color: 'pink', filter: 'bandpass', from: 1700, to: 800, duration: 0.09, gain: 0.13, q: 0.9 }],
  },
  fist_heavy: {
    tones: [{ from: 125, to: 46, duration: 0.22, wave: 'sine', gain: 0.32, attack: 0.003, delay: 0.045 }],
    noises: [
      { color: 'pink', filter: 'bandpass', from: 950, to: 380, duration: 0.17, gain: 0.19, q: 0.8 },
      { color: 'brown', filter: 'lowpass', from: 420, to: 120, duration: 0.15, gain: 0.2, delay: 0.05 },
    ],
  },
  // hit sound
  fist_hit: {
    tones: [{ from: 200, to: 58, duration: 0.13, wave: 'sine', gain: 0.34, attack: 0.001 }],
    noises: [
      { color: 'brown', filter: 'lowpass', from: 650, to: 150, duration: 0.11, gain: 0.22 },
      { color: 'white', filter: 'bandpass', from: 1200, to: 700, duration: 0.05, gain: 0.08 },
    ],
  },
  blade_hit: {
    tones: [{ from: 2100, to: 950, duration: 0.1, wave: 'triangle', gain: 0.075, attack: 0.001 }, { from: 230, to: 85, duration: 0.09, wave: 'sine', gain: 0.17, attack: 0.001 }],
    noises: [{ color: 'metal', filter: 'bandpass', from: 4400, to: 2600, duration: 0.11, gain: 0.17, q: 1.2 }],
  },
  bullet_hit: {
    tones: [{ from: 620, to: 190, duration: 0.09, wave: 'square', gain: 0.085, attack: 0.001 }],
    noises: [{ color: 'white', filter: 'bandpass', from: 2600, to: 1200, duration: 0.07, gain: 0.15, q: 1.0 }],
  },
};


// ====== SOUND DESIGN v2: separate sounds per weapon / light-heavy (swing = whoosh, hit = impact) ======
const N = (color, filter, from, to, duration, gain, q, delay) => ({ color, filter, from, to, duration, gain, q: q || 0.9, delay: delay || 0 });
const T = (wave, from, to, duration, gain, delay, drive) => ({ wave, from, to, duration, gain, attack: 0.002, delay: delay || 0, drive });
Object.assign(SYNTH_PROFILES, {
  // ---- swing ----
  sword_slash:  { tones: [T('triangle', 1900, 900, 0.09, 0.04)], noises: [N('white', 'bandpass', 1800, 700, 0.12, 0.17, 1.1), N('pink', 'highpass', 3500, 1800, 0.08, 0.06)] },
  sword_heavy:  { tones: [T('sawtooth', 420, 110, 0.22, 0.06), T('triangle', 1500, 500, 0.2, 0.05)], noises: [N('pink', 'bandpass', 1200, 300, 0.26, 0.24, 0.9), N('brown', 'lowpass', 500, 120, 0.24, 0.18, 0.8, 0.03)] },
  katana_slash: { tones: [T('sine', 4200, 2600, 0.07, 0.035)], noises: [N('white', 'highpass', 5200, 2200, 0.1, 0.13), N('white', 'bandpass', 3600, 1800, 0.09, 0.12, 1.6)] },
  katana_heavy: { tones: [T('triangle', 3800, 1200, 0.18, 0.05)], noises: [N('white', 'bandpass', 2800, 700, 0.2, 0.2, 1.3), N('white', 'highpass', 6000, 2500, 0.14, 0.09), N('brown', 'lowpass', 300, 90, 0.18, 0.12, 0.8, 0.04)] },
  chakram_slash: { tones: [T('sine', 2800, 1500, 0.11, 0.045)], noises: [N('white', 'highpass', 6800, 3100, 0.12, 0.14), N('violet', 'bandpass', 900, 2400, 0.1, 0.1)] },
  chakram_heavy: { tones: [T('triangle', 1800, 520, 0.23, 0.07), T('sine', 780, 220, 0.2, 0.08, 0.04)], noises: [N('white', 'highpass', 5400, 1800, 0.21, 0.2), N('pink', 'bandpass', 700, 2100, 0.2, 0.16)] },
  spear_thrust: { tones: [T('sine', 220, 520, 0.08, 0.06)], noises: [N('white', 'bandpass', 900, 2600, 0.09, 0.16, 1.2), N('white', 'highpass', 7000, 5000, 0.04, 0.06, 0.8, 0.06)] },
  spear_heavy:  { tones: [T('sawtooth', 160, 420, 0.18, 0.07)], noises: [N('pink', 'bandpass', 500, 2800, 0.2, 0.22, 1.0), N('brown', 'lowpass', 400, 100, 0.16, 0.15, 0.8, 0.05), N('white', 'highpass', 6500, 5000, 0.05, 0.08, 0.8, 0.13)] },
  axe_swing:    { tones: [T('sawtooth', 200, 70, 0.26, 0.08)], noises: [N('brown', 'lowpass', 700, 140, 0.3, 0.26, 0.8), N('pink', 'bandpass', 600, 250, 0.28, 0.16, 0.7)] },
  axe_heavy:    { tones: [T('sawtooth', 150, 45, 0.38, 0.1), T('sine', 90, 35, 0.2, 0.2, 0.2)], noises: [N('brown', 'lowpass', 900, 90, 0.42, 0.32, 0.8), N('pink', 'bandpass', 800, 200, 0.38, 0.2, 0.7)] },
  // ---- hit ----
  hit_sword:    { tones: [T('triangle', 2100, 950, 0.1, 0.06), T('sine', 200, 70, 0.09, 0.22)], noises: [N('metal', 'bandpass', 4400, 2200, 0.1, 0.15, 1.2), N('brown', 'lowpass', 900, 200, 0.08, 0.2, 0.8)] },
  hit_sword_h:  { tones: [T('triangle', 2400, 900, 0.14, 0.07), T('sine', 150, 45, 0.18, 0.34), T('sine', 1400, 1300, 0.25, 0.035)], noises: [N('metal', 'bandpass', 4800, 1800, 0.14, 0.2, 1.2), N('brown', 'lowpass', 800, 120, 0.14, 0.28, 0.8)] },
  hit_katana:   { tones: [T('sine', 3200, 2800, 0.18, 0.05), T('sine', 160, 60, 0.08, 0.18)], noises: [N('white', 'highpass', 6000, 3000, 0.09, 0.18, 0.9)] },
  hit_katana_h: { tones: [T('sine', 3400, 2600, 0.3, 0.06), T('sine', 130, 40, 0.15, 0.3)], noises: [N('white', 'highpass', 6500, 2500, 0.14, 0.22, 0.9), N('brown', 'lowpass', 700, 110, 0.12, 0.22, 0.8)] },
  hit_chakram:   { tones: [T('triangle', 2500, 1050, 0.13, 0.07), T('sine', 210, 75, 0.09, 0.18)], noises: [N('metal', 'highpass', 6100, 2600, 0.12, 0.19), N('violet', 'bandpass', 900, 2800, 0.1, 0.12)] },
  hit_chakram_h: { tones: [T('triangle', 2900, 740, 0.19, 0.08), T('sine', 125, 38, 0.2, 0.32)], noises: [N('metal', 'highpass', 6600, 2100, 0.17, 0.22), N('brown', 'lowpass', 760, 100, 0.2, 0.25)] },
  hit_spear:    { tones: [T('sine', 150, 50, 0.12, 0.3)], noises: [N('white', 'bandpass', 1800, 700, 0.07, 0.18, 1.0), N('white', 'highpass', 6000, 4000, 0.03, 0.1)] },
  hit_spear_h:  { tones: [T('sine', 120, 38, 0.2, 0.4), T('triangle', 900, 300, 0.1, 0.06)], noises: [N('white', 'bandpass', 2000, 600, 0.1, 0.22, 1.0), N('brown', 'lowpass', 600, 90, 0.16, 0.25, 0.8)] },
  hit_axe:      { tones: [T('sine', 110, 40, 0.2, 0.36)], noises: [N('brown', 'lowpass', 600, 90, 0.18, 0.3, 0.8), N('metal', 'bandpass', 2500, 1000, 0.07, 0.1, 1.0)] },
  hit_axe_h:    { tones: [T('sine', 90, 28, 0.32, 0.5), T('sawtooth', 220, 60, 0.12, 0.08)], noises: [N('brown', 'lowpass', 800, 70, 0.3, 0.4, 0.8), N('metal', 'bandpass', 2800, 900, 0.1, 0.14, 1.0), N('white', 'lowpass', 1200, 300, 0.12, 0.15, 0.8)] },
  hit_fist:     { tones: [T('sine', 200, 58, 0.13, 0.34)], noises: [N('brown', 'lowpass', 650, 150, 0.11, 0.22, 0.8), N('white', 'bandpass', 1200, 700, 0.05, 0.08, 0.9)] },
  hit_fist_h:   { tones: [T('sine', 140, 40, 0.22, 0.46)], noises: [N('brown', 'lowpass', 500, 90, 0.18, 0.3, 0.8), N('white', 'bandpass', 1500, 600, 0.05, 0.1, 0.9)] },
  // ---- heavy wind-up (charge sound) ----
  charge:       { tones: [T('sine', 200, 720, 0.26, 0.04)], noises: [N('pink', 'bandpass', 400, 1800, 0.26, 0.05, 1.0)] },
});

const AudioMgr = {
  scene: null,
  ctx: null,
  master: null,        // master gain node: every synthesized effect goes through it (volume from Settings)
  sfxVolume: 1,        // 0..1, set by Controls.applyAudio() (controls.js / Settings screen)
  useSynthProfiles: true,
  preload(scene) {
    this.scene = scene;
    Object.keys(SFX).forEach((key) => {
      scene.load.audio(key, SFX[key]);
    });
  },
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  // output node for synthesized sounds (applies the sound-effect volume)
  out() {
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.master.gain.value = this.sfxVolume;
    return this.master;
  },
  play(key, options = {}) {
    // Unknown event names are intentionally silent; never substitute a sword sound.
    if (!Object.prototype.hasOwnProperty.call(SFX, key) && !SYNTH_PROFILES[key]) return;
    if (this.sfxVolume <= 0) return;   // sound effects turned off in Settings
    this.unlock();
    // Keep the distinct Web Audio profiles audible even when WAVs are available.
    if (this.useSynthProfiles && SYNTH_PROFILES[key]) {
      this.synthesize(key, options);
      return;
    }
    // 1) Try Phaser cached audio file
    if (this.scene && this.scene.cache && this.scene.cache.audio && this.scene.cache.audio.exists(key)) {
      try {
        // Phaser detune is measured in cents. ±85 cents is approximately ±5% pitch.
        const detune = (options.pitchVariation ? Phaser.Math.Between(-85, 85) : 0) + (options.pitch ? Math.round(1200 * Math.log2(options.pitch)) : 0);
        this.scene.sound.play(key, { volume: 0.5 * this.sfxVolume, detune });
        return;
      } catch (e) {}
    }
    // 2) Seamless Web Audio synthesizer fallback
    this.synthesize(key, options);
  },
  synthesize(key, options = {}) {
    if (!this.ctx) return;
    const profile = SYNTH_PROFILES[key];
    if (!profile) return;
    const now = this.ctx.currentTime;
    // Tiny per-play detuning keeps repeated blade swings from sounding identical.
    const pitch = (options.pitchVariation ? 0.95 + Math.random() * 0.1 : 1) * (options.pitch || 1);
    const makeDrive = (amount) => {
      const curve = new Float32Array(512);
      for (let i = 0; i < curve.length; i++) {
        const x = (i * 2) / (curve.length - 1) - 1;
        curve[i] = Math.tanh(x * (1 + amount * 18));
      }
      return curve;
    };
    const setEnvelope = (gain, start, duration, peak, attack) => {
      const attackTime = Math.min(attack || 0.003, duration * 0.6);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + attackTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    };

    (profile.tones || []).forEach((tone) => {
      try {
        const start = now + (tone.delay || 0);
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = tone.wave;
        osc.frequency.setValueAtTime(tone.from * pitch, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to * pitch), start + tone.duration);
        setEnvelope(amp, start, tone.duration, tone.gain, tone.attack);
        if (tone.drive) {
          const shaper = this.ctx.createWaveShaper();
          shaper.curve = makeDrive(tone.drive);
          shaper.oversample = '2x';
          osc.connect(shaper); shaper.connect(amp);
        } else osc.connect(amp);
        amp.connect(this.out());
        osc.start(start); osc.stop(start + tone.duration + 0.01);
      } catch (e) {}
    });

    (profile.noises || []).forEach((noiseSpec) => {
      try {
        const start = now + (noiseSpec.delay || 0);
        const length = Math.max(1, Math.floor(this.ctx.sampleRate * noiseSpec.duration));
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const samples = new Float32Array(length);
        let brown = 0, pink0 = 0, pink1 = 0, pink2 = 0, previousWhite = 0, peak = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          let value = white;
          if (noiseSpec.color === 'brown') {
            brown = (brown + 0.025 * white) / 1.025;
            value = brown;
          } else if (noiseSpec.color === 'pink') {
            pink0 = 0.99765 * pink0 + white * 0.099046;
            pink1 = 0.963 * pink1 + white * 0.2965164;
            pink2 = 0.57 * pink2 + white * 1.0526913;
            value = (pink0 + pink1 + pink2 + white * 0.1848) * 0.32;
          } else if (noiseSpec.color === 'violet') {
            value = white - previousWhite;
            previousWhite = white;
          } else if (noiseSpec.color === 'metal') {
            value = white * 0.55 + Math.sin(i * 0.29) * 0.3 + Math.sin(i * 0.47) * 0.15;
          }
          samples[i] = value;
          peak = Math.max(peak, Math.abs(value));
        }
        const data = buffer.getChannelData(0);
        const normalization = 0.8 / Math.max(0.001, peak);
        for (let i = 0; i < length; i++) data[i] = samples[i] * normalization;

        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const amp = this.ctx.createGain();
        src.buffer = buffer;
        filter.type = noiseSpec.filter;
        filter.Q.value = noiseSpec.q || 0.8;
        filter.frequency.setValueAtTime(noiseSpec.from * pitch, start);
        filter.frequency.exponentialRampToValueAtTime(Math.max(30, noiseSpec.to * pitch), start + noiseSpec.duration);
        setEnvelope(amp, start, noiseSpec.duration, noiseSpec.gain, noiseSpec.attack);
        if (noiseSpec.drive) {
          const shaper = this.ctx.createWaveShaper();
          shaper.curve = makeDrive(noiseSpec.drive);
          shaper.oversample = '2x';
          src.connect(filter); filter.connect(shaper); shaper.connect(amp);
        } else {
          src.connect(filter); filter.connect(amp);
        }
        amp.connect(this.out());
        src.start(start); src.stop(start + noiseSpec.duration + 0.01);
      } catch (e) {}
    });
  },
  movementTransition(player, nextState) {
    if (!player) return;
    const previous = player.movementState || 'grounded';
    if (nextState === 'jumping' && player.state === 'jumping') {
      this.play('jump');
    } else if (nextState === 'grounded' && player.state === 'grounded' &&
        (previous === 'jumping' || previous === 'falling')) {
      this.play('land');
    }
    player.movementState = nextState;
  },
  attackActive(player, attack) {
    // Combat audio is legal only on the attack -> active transition.
    if (!player || !attack || !player.attack || player.state !== 'attack_active' || player.attack.state !== 'active') return false;
    const weapon = player.equippedWeapon;
    const heavy = attack.kind === 'heavy';
    let key = null;
    if (weapon === 'gun') { if (attack.projectile) key = 'gunshot'; }
    else if (!attack.projectile) {
      if (weapon === 'sword') key = heavy ? 'sword_heavy' : 'sword_slash';
      else if (weapon === 'katana') key = heavy ? 'katana_heavy' : 'katana_slash';
      else if (weapon === 'chakram') key = heavy ? 'chakram_heavy' : 'chakram_slash';
      else if (weapon === 'spear') key = heavy ? 'spear_heavy' : 'spear_thrust';
      else if (weapon === 'axe') key = heavy ? 'axe_heavy' : 'axe_swing';
      else if (!weapon) key = heavy ? 'fist_heavy' : 'fist_light';   // unarmed = fist
    }
    if (!key) return false;
    this.play(key, { pitchVariation: weapon !== 'gun', pitch: heroFx(player).pitch });
    return true;
  },
};


// ====== HERO VFX STYLE: each hero has its own color / particle / pitch ======
const HERO_FX = {
  dante:      { main: 0x36d1ff, alt: 0xdfe9f7, soft: 0x8fe6ff, particle: 'ember', pitch: 1.0 },    // flames
  sekiro:     { main: 0xa99bff, alt: 0xe8c15a, soft: 0xd0c8ff, particle: 'frost', pitch: 1.12 },   // ice / frost
  zawgyi:     { main: 0x8a5fe0, alt: 0x7de0ff, soft: 0xc9aaff, particle: 'mist',  pitch: 0.92 },   // magical mist
  minsitthar: { main: 0xe0ad2c, alt: 0x2a4fa8, soft: 0xf4d27a, particle: 'leaf',  pitch: 0.85 },   // leaves / golden light
  aung_zeya:  { main: 0xff6a22, alt: 0xffd24a, soft: 0xffb347, particle: 'ember', pitch: 0.96 }, // dragon fire
  thazin:     { main: 0xb36cff, alt: 0xf5d8ff, soft: 0xd3a0ff, particle: 'mist',  pitch: 1.08 }, // violet lotus
  thaung:     { main: 0x2fb5ad, alt: 0xd99b35, soft: 0x8fe3dc, particle: 'leaf',  pitch: 0.8 },    // iron teal / bronze
  hla:        { main: 0xe87932, alt: 0xffd447, soft: 0xffc27a, particle: 'ember', pitch: 1.02 },   // storm bell / lightning
  kan:        { main: 0xb52c3b, alt: 0xf0e5d0, soft: 0xff8f9c, particle: 'ember', pitch: 1.06 },   // crimson ronin
};
const HERO_FX_DEFAULT = { main: 0xffffff, alt: 0xffe9a8, soft: 0xdddddd, particle: 'ember', pitch: 1 };
function heroFx(p) { return (p && p.char && HERO_FX[p.char.id]) || HERO_FX_DEFAULT; }
// y of the middle of the character's body (physics body) - sprite.y is the frame center, so with a bigger sheet it tends to sit higher
const bodyCY = (p) => p.sprite.body.center.y;
const easeOut = (q) => 1 - (1 - q) * (1 - q);
const WEAPON_ARC = { sword: { r: 56, w: 17 }, katana: { r: 70, w: 10 }, chakram: { r: 66, w: 18 }, axe: { r: 60, w: 27 } };
const rnd = (a, b) => a + Math.random() * (b - a);

const VFX = [];

const VfxMgr = {
  // Screen shake wrapper
  shake(duration = 140, intensity = 0.01) {
    if (typeof worldCam !== 'undefined' && worldCam) {
      worldCam.shake(duration, intensity);
    }
  },

  // Slash arc visual effect (at weapon tip/hitbox center)
  slash(x, y, facing, heavy, dir, color) {
    VFX.push({
      type: 'slash',
      x, y, facing, heavy,
      dir: dir || 's',
      color: color || (heavy ? 0xffaa22 : 0xddf0ff),
      age: 0,
      life: 4,
    });
    if (heavy) {
      this.shake(100, 0.006); // Subtle startup rumble for heavy attacks
    }
  },

  danteDashTrail(x, y, color) {
    VFX.push({ type: 'afterimage', x, y, color: color || 0xe84654, age: 0, life: 8 });
  },

  spearDust(x, y) {
    for (let i = 0; i < 9; i++) {
      VFX.push({
        type: 'dust', x, y,
        vx: Phaser.Math.Between(-110, 110),
        vy: Phaser.Math.Between(-150, -35),
        age: 0, life: Phaser.Math.Between(12, 20),
      });
    }
  },

  // Hit burst / explosion effect when attack connects
  // hitSfx = hit sound key (defaults to heavy_impact / light_impact if not given)
  burst(x, y, heavy, hitSfx) {
    VFX.push({
      type: 'burst',
      x, y, heavy,
      age: 0,
      life: heavy ? 22 : 12,
    });

    // Spawn sparks
    const count = heavy ? 12 : 5;
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.Between(0, 360);
      const speed = heavy ? Phaser.Math.Between(180, 420) : Phaser.Math.Between(100, 240);
      const rad = Phaser.Math.DegToRad(angle);
      VFX.push({
        type: 'spark',
        x, y,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        color: heavy ? 0xffbb33 : 0xffffff,
        age: 0,
        life: heavy ? Phaser.Math.Between(14, 24) : Phaser.Math.Between(8, 14),
      });
    }

    // Impact screen shake
    if (heavy) {
      this.shake(220, 0.016);
      if (hitSfx) AudioMgr.play(hitSfx);
      AudioMgr.play('heavy_impact');
    } else {
      this.shake(80, 0.006);
      AudioMgr.play(hitSfx || 'light_impact');
    }
  },


  // ---------- Brawlhalla-style attack effects ----------
  // swing: a trail that follows the character as soon as the attack becomes active (style differs by weapon / hero / light-heavy)
  swing(p, atk) {
    const heavy = atk.kind === 'heavy';
    const w = p.equippedWeapon || p.weaponId || 'fist';
    const fx = heroFx(p);
    const sgn = p.facing * (p.attack.back ? -1 : 1);
    const tok = ((p.attack.type || '').split('_')[1]) || 'n';
    const up = tok.indexOf('u') !== -1, down = tok.indexOf('d') !== -1;
    const base = { owner: p, sgn, heavy, color: fx.main, alt: fx.alt, age: 0 };
    // movement moves (lunge / rise / dive / hook) get afterimages and rings for every fighter; then each fighter's own look (HERO_SWING below)
    const cc = { base, sgn, heavy, w, tok, up, down, fx, stage: p.attack.stage || 0 };
    if (typeof commonMoveFx === 'function') commonMoveFx(p, atk, cc);
    const own = typeof HERO_SWING !== 'undefined' && p.char && HERO_SWING[p.char.id];
    if (own && own(p, atk, cc)) return;
    if (w === 'spear' || w === 'fist') {
      const ang = up ? (tok.length > 1 ? -45 : -80) : down ? (tok.length > 1 ? 45 : 70) : 0;
      VFX.push(Object.assign(base, { type: 'streak', ang, len: w === 'fist' ? (heavy ? 62 : 42) : (heavy ? 120 : 86), short: w === 'fist', life: heavy ? 10 : 7 }));
      if (w === 'spear' && heavy && p.char && p.char.id === 'aung_zeya') {
        // His heavy spear strike leaves a broad, fiery dragon-like sweep.
        VFX.push(Object.assign({}, base, { type: 'arc', a0: -72, a1: 68, r: 94, w: 30, life: 15, hasEdge: false }));
        VFX.push({ type: 'ring', x: p.sprite.x + sgn * 78, y: bodyCY(p) - 6, r0: 8, r1: 48, life: 13, width: 4, color: fx.alt, age: 0 });
        if (tok.indexOf('u') === 0) {
          for (let i = 0; i < 7; i++) VFX.push({ type: 'spark', x: p.sprite.x + sgn * (28 + i * 15), y: p.sprite.body.top - 72 - (i % 3) * 15, vx: rnd(-10, 10), vy: rnd(330, 520), color: i % 2 ? fx.alt : 0xfff2c0, size: 4, age: 0, life: 18 });
        }
      }
      if (w === 'spear' && heavy) VFX.push({ type: 'ring', x: p.sprite.x + sgn * 70, y: bodyCY(p) - 6, r0: 6, r1: 40, life: 10, width: 3, color: fx.alt, age: 0 });
      return;
    }
    if (w === 'chakram') {
      const center = up ? -90 : down ? 90 : 0;
      const spread = heavy ? 155 : 108;
      VFX.push(Object.assign({}, base, { type: 'arc', a0: center - spread / 2, a1: center + spread / 2, r: 66, w: heavy ? 27 : 18, life: heavy ? 15 : 10, hasEdge: true }));
      if (heavy) {
        VFX.push(Object.assign({}, base, { type: 'arc', a0: center + spread / 2, a1: center - spread / 2, r: 49, w: 11, life: 13, hasEdge: true }));
        VFX.push({ type: 'ring', x: p.sprite.x + sgn * 45, y: bodyCY(p) - 7, r0: 7, r1: 38, life: 13, width: 3, color: fx.alt, age: 0 });
      }
      return;
    }
    const cfg = WEAPON_ARC[w] || WEAPON_ARC.sword;
    const c = up ? (tok.length > 1 ? -45 : -90) : down ? (tok.length > 1 ? 45 : 90) : 0;
    const S = (tok === 'n' ? 80 : 105) + (heavy ? 55 : 0);
    const a0 = up ? c + S / 2 : c - S / 2, a1 = up ? c - S / 2 : c + S / 2;
    VFX.push(Object.assign(base, { type: 'arc', a0, a1, r: cfg.r * (heavy ? 1.28 : 1), w: cfg.w * (heavy ? 1.5 : 1), life: heavy ? 12 : 8, hasEdge: w === 'katana' }));
    if (w === 'sword' && heavy && p.char && p.char.id === 'aung_zeya') {
      // Oak Soe's dha heavy swings keep the red-and-gold dragon trail from his spear style.
      VFX.push(Object.assign({}, base, { type: 'arc', a0: -86, a1: 82, r: 98, w: 29, life: 15, hasEdge: false }));
      VFX.push({ type: 'ring', x: p.sprite.x + sgn * 80, y: bodyCY(p) - 6, r0: 8, r1: 46, life: 13, width: 4, color: fx.alt, age: 0 });
      if (tok.indexOf('u') === 0) {
        for (let i = 0; i < 7; i++) VFX.push({ type: 'spark', x: p.sprite.x + sgn * (28 + i * 15), y: p.sprite.body.top - 72 - (i % 3) * 15, vx: rnd(-10, 10), vy: rnd(330, 520), color: i % 2 ? fx.alt : 0xfff2c0, size: 4, age: 0, life: 18 });
      }
    }
    if (heavy && w === 'axe' && p.sprite.body.blocked.down) this.spearDust(p.sprite.x + sgn * 40, p.sprite.body.bottom - 4);
    if (heavy && w === 'katana') this.ghost(p, fx.main);
  },

  // glow that charges up when a heavy attack starts (startup)
  charge(p, frames) {
    VFX.push({ type: 'charge', owner: p, sgn: p.facing, color: heroFx(p).main, alt: heroFx(p).alt, age: 0, life: Math.max(6, frames) });
    AudioMgr.play('charge', { pitch: heroFx(p).pitch });
  },

  muzzle(p, atk) {
    const sgn = p.facing * (p.attack.back ? -1 : 1);
    const ang = (atk && atk.projAngle) || 0;
    const rad = Phaser.Math.DegToRad(ang);
    const x = p.sprite.x + sgn * (Math.cos(rad) * 30 + 8), y = bodyCY(p) - 8 - Math.sin(rad) * 30;
    VFX.push({ type: 'muzzle', x, y, sgn, ang, heavy: atk && atk.kind === 'heavy', age: 0, life: 5, color: heroFx(p).main });
    for (let i = 0; i < 4; i++) {
      VFX.push({ type: 'spark', x, y, vx: sgn * rnd(220, 520) * Math.cos(rad), vy: -Math.sin(rad) * rnd(220, 520) + rnd(-60, 60), color: i % 2 ? 0xffe9a8 : heroFx(p).alt, size: 2, age: 0, life: rnd(6, 10) });
    }
    // shell casing drops
    VFX.push({ type: 'spark', x: p.sprite.x - sgn * 4, y: bodyCY(p) - 6, vx: -sgn * rnd(60, 120), vy: -rnd(120, 200), color: 0xd8b04a, size: 3, age: 0, life: 26 });
  },

  // after-image (copies the real character art and fades out)
  ghost(p, color) {
    if (typeof FxGhosts !== 'undefined') FxGhosts.spawn(p, color || heroFx(p).main);
  },

  // On hit: star flash + shockwave + hero particle + weapon-specific hit sound
  hit(att, tgt, atk, dirSign, wOverride) {
    const heavy = atk.kind === 'heavy';
    const fx = heroFx(att);
    const w = wOverride || att.equippedWeapon || att.weaponId || 'fist';
    const x = tgt.sprite.x - dirSign * 6, y = bodyCY(tgt) - 4;
    VFX.push({ type: 'star', x, y, size: heavy ? 58 : 32, rays: heavy ? 8 : 6, rot: rnd(0, 1), color: fx.alt, age: 0, life: heavy ? 10 : 6 });
    if (w === 'sword' || w === 'katana' || w === 'chakram' || w === 'axe') {
      VFX.push({ type: 'hitline', x, y, ang: rnd(-40, 40) + (Math.random() < 0.5 ? 0 : 180), len: heavy ? 110 : 70, color: fx.main, age: 0, life: heavy ? 9 : 6 });
    }
    if (w === 'spear') VFX.push({ type: 'hitline', x, y, ang: dirSign > 0 ? 0 : 180, len: heavy ? 110 : 70, color: fx.main, age: 0, life: heavy ? 9 : 6 });
    VFX.push({ type: 'ring', x, y, r0: 8, r1: heavy ? 86 : 30, life: heavy ? 16 : 8, width: heavy ? 5 : 2.5, color: heavy ? fx.main : 0xffffff, age: 0 });
    if (heavy) VFX.push({ type: 'ring', x, y, r0: 4, r1: 54, life: 11, width: 3, color: fx.alt, age: 0 });

    const sparkN = heavy ? 18 : 8;
    const base = dirSign > 0 ? 0 : 180;
    for (let i = 0; i < sparkN; i++) {
      const a = Phaser.Math.DegToRad(base + rnd(-60, 60));
      const sp = heavy ? rnd(260, 560) : rnd(140, 320);
      VFX.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: [fx.main, fx.alt, 0xffffff][i % 3], size: heavy ? 3 : 2, age: 0, life: heavy ? rnd(14, 24) : rnd(8, 14) });
    }
    const wispN = heavy ? 9 : 3;
    for (let i = 0; i < wispN; i++) {
      VFX.push({
        type: 'wisp', kind: fx.particle, x: x + rnd(-14, 14), y: y + rnd(-18, 10),
        vx: rnd(-50, 50) + dirSign * 30, vy: rnd(-130, -45), size: heavy ? rnd(5, 9) : rnd(3, 6),
        color: Math.random() < 0.5 ? fx.soft : fx.main, rot: rnd(0, 6.28), vr: rnd(-6, 6), age: 0, life: Math.round(heavy ? rnd(26, 42) : rnd(16, 24)),
      });
    }
    if (w === 'axe' && heavy) this.spearDust(tgt.sprite.x, tgt.sprite.body.bottom - 4);

    this.shake(heavy ? (w === 'axe' ? 260 : 210) : 80, heavy ? (w === 'axe' ? 0.022 : 0.015) : 0.005);
    const key = w === 'gun' ? 'bullet_hit' : 'hit_' + w + (heavy ? '_h' : '');
    AudioMgr.play(key, { pitch: fx.pitch, pitchVariation: true });
    if (heavy) AudioMgr.play('heavy_impact', { pitch: fx.pitch });
  },

  tick() {
    for (let i = VFX.length - 1; i >= 0; i--) {
      const e = VFX[i];
      e.age++;
      if (e.type === 'spark') {
        e.x += (e.vx * 1) / 60;
        e.y += (e.vy * 1) / 60;
        e.vy += 300 / 60; // gravity on sparks
      } else if (e.type === 'wisp') {
        e.x += e.vx / 60; e.y += e.vy / 60;
        e.vx *= 0.97; e.vy *= (e.kind === 'ember' ? 0.99 : 0.96);
        if (e.kind === 'frost') e.vy += 2.5; else if (e.kind === 'leaf') { e.vy += 3; e.vx += Math.sin(e.age * 0.3) * 4; }
        e.rot += e.vr / 60;
      } else if (e.type === 'dust') {
        e.x += e.vx / 60;
        e.y += e.vy / 60;
        e.vx *= 0.96;
        e.vy += 220 / 60;
      }
      if (e.age > e.life) {
        VFX.splice(i, 1);
      }
    }
  },

  draw(g) {
    VFX.forEach((e) => {
      const t = 1 - e.age / e.life;

      const pt = (th, rad) => {
        const a = th * Math.PI / 180;
        return [e.owner.sprite.x + e.sgn * Math.cos(a) * rad, bodyCY(e.owner) - 6 + Math.sin(a) * rad];
      };
      if (e.type === 'arc') {
        const q = (e.age + 1) / e.life;
        const head = Math.min(1, q / 0.55);
        const tail = Math.min(head, Math.max(0, (q - 0.25) / 0.75));
        const fade = 1 - Math.max(0, (q - 0.5) / 0.5);
        const th = (u) => e.a0 + (e.a1 - e.a0) * easeOut(u);
        const N = 14;
        const band = (widthMul, color, alpha) => {
          const outer = [], inner = [];
          for (let i = 0; i <= N; i++) {
            const u = tail + (head - tail) * (i / N);
            const wd = e.w * widthMul * (0.12 + 0.88 * (i / N));
            outer.push(pt(th(u), e.r + wd / 2));
            inner.push(pt(th(u), e.r - wd / 2));
          }
          g.fillStyle(color, alpha);
          g.beginPath();
          g.moveTo(outer[0][0], outer[0][1]);
          outer.forEach((o) => g.lineTo(o[0], o[1]));
          for (let i = inner.length - 1; i >= 0; i--) g.lineTo(inner[i][0], inner[i][1]);
          g.closePath(); g.fillPath();
        };
        band(1.9, e.color, 0.22 * fade);
        band(1.0, e.color, 0.62 * fade);
        band(0.45, e.alt, 0.7 * fade);
        // white light edge
        g.lineStyle(e.heavy ? 3 : 2, 0xffffff, 0.9 * fade);
        g.beginPath();
        for (let i = 0; i <= N; i++) {
          const u = tail + (head - tail) * (i / N);
          const p0 = pt(th(u), e.r + e.w * 0.5 * (0.12 + 0.88 * (i / N)));
          if (i === 0) g.moveTo(p0[0], p0[1]); else g.lineTo(p0[0], p0[1]);
        }
        g.strokePath();
        if (e.hasEdge) { // katana: glint highlight
          const tip = pt(th(head), e.r + 2);
          g.fillStyle(0xffffff, 0.9 * fade); g.fillCircle(tip[0], tip[1], 3.5);
        }
        return;
      }
      if (e.type === 'streak') {
        const q = (e.age + 1) / e.life;
        const fade = 1 - Math.max(0, (q - 0.4) / 0.6);
        const a = e.ang * Math.PI / 180;
        const ux = e.sgn * Math.cos(a), uy = Math.sin(a);
        const cx = e.owner.sprite.x + ux * 14, cy = bodyCY(e.owner) - 6 + uy * 14 + (e.ang === 0 ? 4 : 0);
        const L = e.len * easeOut(Math.min(1, q / 0.5));
        [-1, 0, 1].forEach((k, idx) => {
          const off = k * (e.heavy ? 9 : 6) * (e.short ? 0.7 : 1);
          const l = L * (k === 0 ? 1 : 0.7);
          const sx = cx - uy * off, sy = cy + ux * off;
          g.lineStyle(k === 0 ? (e.heavy ? 6 : 4) : 2, k === 0 ? e.color : e.alt, (k === 0 ? 0.7 : 0.5) * fade);
          g.beginPath(); g.moveTo(sx + ux * L * 0.15, sy + uy * L * 0.15); g.lineTo(sx + ux * l, sy + uy * l); g.strokePath();
        });
        g.lineStyle(2, 0xffffff, 0.9 * fade);
        g.beginPath(); g.moveTo(cx + ux * L * 0.2, cy + uy * L * 0.2); g.lineTo(cx + ux * L, cy + uy * L); g.strokePath();
        if (!e.short) { g.lineStyle(2, e.alt, 0.7 * fade); g.strokeCircle(cx + ux * L, cy + uy * L, 5 + q * 10); }
        return;
      }
      if (e.type === 'charge') {
        const q = e.age / e.life;
        const cx = e.owner.sprite.x + e.sgn * 12, cy = bodyCY(e.owner) - 4;
        g.fillStyle(e.color, 0.12 + 0.22 * q); g.fillCircle(cx, cy, 10 + q * 12);
        g.fillStyle(e.alt, 0.25 * q); g.fillCircle(cx, cy, 4 + q * 5);
        for (let i = 0; i < 3; i++) {
          const ph = (q * 1.6 + i / 3) % 1;
          g.lineStyle(2, i % 2 ? e.alt : e.color, 0.8 * ph);
          g.strokeCircle(cx, cy, 42 * (1 - ph) + 6);
        }
        return;
      }
      if (e.type === 'muzzle') {
        const a = e.ang * Math.PI / 180;
        const ux = e.sgn * Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux;
        const L = (e.heavy ? 46 : 32) * (0.6 + 0.4 * t), W = (e.heavy ? 12 : 8) * t;
        g.fillStyle(e.color, 0.55 * t); g.fillTriangle(e.x + nx * W * 1.5, e.y + ny * W * 1.5, e.x - nx * W * 1.5, e.y - ny * W * 1.5, e.x + ux * L * 1.3, e.y + uy * L * 1.3);
        g.fillStyle(0xfff2c0, 0.95 * t); g.fillTriangle(e.x + nx * W, e.y + ny * W, e.x - nx * W, e.y - ny * W, e.x + ux * L, e.y + uy * L);
        g.fillStyle(0xffffff, t); g.fillCircle(e.x, e.y, 6 * t + 2);
        return;
      }
      if (e.type === 'star') {
        const q = e.age / e.life;
        const len = e.size * (0.45 + 0.7 * easeOut(q));
        g.lineStyle(e.size > 40 ? 4 : 3, e.color, t);
        for (let i = 0; i < e.rays; i++) {
          const a = e.rot + (i / e.rays) * Math.PI * 2;
          const l = len * (i % 2 ? 0.6 : 1);
          g.beginPath(); g.moveTo(e.x + Math.cos(a) * l * 0.25, e.y + Math.sin(a) * l * 0.25); g.lineTo(e.x + Math.cos(a) * l, e.y + Math.sin(a) * l); g.strokePath();
        }
        g.fillStyle(0xffffff, t); g.fillCircle(e.x, e.y, e.size * 0.16 * t + 2);
        return;
      }
      if (e.type === 'ring') {
        const q = e.age / e.life;
        g.lineStyle(e.width * t + 0.5, e.color, 0.9 * t);
        g.strokeCircle(e.x, e.y, e.r0 + (e.r1 - e.r0) * easeOut(q));
        return;
      }
      if (e.type === 'hitline') {
        const q = e.age / e.life;
        const a = e.ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
        const L = e.len * (0.4 + 0.6 * easeOut(q)) / 2;
        g.lineStyle(7 * t + 1, e.color, 0.55 * t);
        g.beginPath(); g.moveTo(e.x - ux * L, e.y - uy * L); g.lineTo(e.x + ux * L, e.y + uy * L); g.strokePath();
        g.lineStyle(3 * t + 0.5, 0xffffff, 0.95 * t);
        g.beginPath(); g.moveTo(e.x - ux * L, e.y - uy * L); g.lineTo(e.x + ux * L, e.y + uy * L); g.strokePath();
        return;
      }
      if (e.type === 'wisp') {
        const s = e.size * (e.kind === 'mist' ? 1.8 - t : (0.4 + 0.6 * t));
        if (e.kind === 'ember') {
          g.fillStyle(e.color, 0.85 * t); g.fillCircle(e.x, e.y, s * 0.6);
          g.fillStyle(0xfff2c0, 0.8 * t); g.fillCircle(e.x, e.y, s * 0.28);
        } else if (e.kind === 'frost') {
          g.lineStyle(1.6, e.color, 0.9 * t);
          for (let i = 0; i < 3; i++) { const a = e.rot + i * Math.PI / 3; g.beginPath(); g.moveTo(e.x - Math.cos(a) * s * 0.7, e.y - Math.sin(a) * s * 0.7); g.lineTo(e.x + Math.cos(a) * s * 0.7, e.y + Math.sin(a) * s * 0.7); g.strokePath(); }
        } else if (e.kind === 'mist') {
          g.fillStyle(e.color, 0.28 * t); g.fillCircle(e.x, e.y, s);
          g.fillStyle(0xffffff, 0.1 * t); g.fillCircle(e.x - s * 0.2, e.y - s * 0.2, s * 0.55);
        } else { // leaf
          const a = e.rot, cx = Math.cos(a) * s, cy = Math.sin(a) * s;
          g.fillStyle(e.color, 0.9 * t);
          g.fillTriangle(e.x + cx, e.y + cy, e.x - cy * 0.5, e.y + cx * 0.5, e.x + cy * 0.5, e.y - cx * 0.5);
          g.fillTriangle(e.x - cx, e.y - cy, e.x - cy * 0.5, e.y + cx * 0.5, e.x + cy * 0.5, e.y - cx * 0.5);
        }
        return;
      }
      if (e.type === 'slash') {
        // Short curved smear, sampled as a quadratic Bezier and faded over four frames.
        const direction = e.dir === 'u' ? -1 : e.dir === 'd' ? 1 : 0;
        const startX = e.x - e.facing * 18;
        const endX = e.x + e.facing * (e.heavy ? 42 : 30);
        const startY = e.y + direction * 14;
        const endY = e.y - direction * 14;
        const controlX = e.x + e.facing * (e.heavy ? 14 : 10);
        const controlY = e.y + (direction === 0 ? -22 : 0) + e.age * 2;
        const drawCurve = (offset, width, alpha, color) => {
          g.lineStyle(width, color, alpha);
          g.beginPath();
          for (let i = 0; i <= 12; i++) {
            const q = i / 12;
            const inv = 1 - q;
            const px = inv * inv * startX + 2 * inv * q * controlX + q * q * endX;
            const py = inv * inv * startY + 2 * inv * q * controlY + q * q * endY + offset;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        };
        drawCurve(0, e.heavy ? 11 : 7, t * 0.32, e.color);
        drawCurve(0, e.heavy ? 4 : 2.5, t * 0.9, 0xffffff);
        // Second narrow edge gives the smear a bright, clean stylized silhouette.
        drawCurve(e.heavy ? 3 : 2, 1.5, t * 0.55, e.color);
      } else if (e.type === 'afterimage') {
        g.fillStyle(e.color, t * 0.2);
        g.fillRoundedRect(e.x - 10, e.y - 10, 20, 29, 5);
        g.fillCircle(e.x, e.y - 19, 8);
        g.fillStyle(0xffffff, t * 0.13);
        g.fillRect(e.x - 6, e.y + 4, 12, 3);
      } else if (e.type === 'dust') {
        g.fillStyle(0xc9b99b, t * 0.55);
        g.fillEllipse(e.x, e.y, 5 + e.age * 0.35, 2.5 + e.age * 0.12);
      } else if (e.type === 'burst') {
        const r = (e.heavy ? 20 : 10) + e.age * (e.heavy ? 5 : 2.5);
        g.lineStyle(e.heavy ? 4 : 2, e.heavy ? 0xff7722 : 0xffffff, t);
        g.strokeCircle(e.x, e.y, r);

        if (e.heavy) {
          g.fillStyle(0xffaa00, t * 0.4);
          g.fillCircle(e.x, e.y, r * 0.5);
          g.lineStyle(1.5, 0xffffff, t * 0.7);
          g.strokeCircle(e.x, e.y, r * 0.75);
        }
      } else if (e.type === 'spark') {
        g.lineStyle(e.size || 2, e.color, t);
        g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x - e.vx * 0.035, e.y - e.vy * 0.035); g.strokePath();
      }
    });
  },

  clear() {
    VFX.length = 0;
    if (typeof FxGhosts !== 'undefined') FxGhosts.clear();
  },
};

function attackDirFromType(type) {
  if (!type) return 'n';
  if (type.indexOf('_u') !== -1) return 'u';
  if (type.indexOf('_d') !== -1) return 'd';
  if (type.indexOf('_s') !== -1) return 's';
  return 'n';
}


// ====== Per-fighter attack effects ======
// Called from VfxMgr.swing at the moment a hit becomes active (and again at every multi-hit stage).
// Built from the same effect pieces as the default trails: arc / streak / ring / spark / dust. Return true = "I drew everything".
const fxArc = (c, o) => VFX.push(Object.assign({}, c.base, { type: 'arc', hasEdge: false }, o));
const fxStreak = (c, o) => VFX.push(Object.assign({}, c.base, { type: 'streak', short: false }, o));
const fxRing = (p, c, dist, r0, r1, o) => VFX.push(Object.assign({ type: 'ring', x: p.sprite.x + c.sgn * dist, y: bodyCY(p) - 6, r0, r1, life: 12, width: 3, color: c.fx.alt, age: 0 }, o || {}));
const fxSparks = (p, c, n, o) => {
  o = o || {};
  for (let i = 0; i < n; i++) {
    VFX.push({ type: 'spark', x: p.sprite.x + c.sgn * (o.dx == null ? 40 : o.dx) + rnd(-12, 12), y: bodyCY(p) + (o.dy || 0) + rnd(-12, 12),
      vx: (o.vx == null ? c.sgn * rnd(60, 260) : o.vx + rnd(-60, 60)), vy: (o.vy == null ? rnd(-160, 60) : o.vy + rnd(-60, 60)),
      color: i % 2 ? (o.c1 || c.fx.alt) : (o.c2 || c.fx.main), size: o.size || 3, age: 0, life: rnd(10, 18) });
  }
};
const centerAng = (c) => (c.up ? (c.tok.length > 1 ? -45 : -90) : c.down ? (c.tok.length > 1 ? 45 : 90) : 0);

function commonMoveFx(p, atk, c) {
  if (c.stage !== 0) return;
  const x = p.sprite.x, y = bodyCY(p), foot = p.sprite.body.bottom;
  if (atk.lunge) {                                         // dash-in: a trail of after-images behind the fighter
    for (let i = 0; i < 4; i++) VfxMgr.danteDashTrail(x - c.sgn * i * 22, y, c.fx.main);
  }
  if (atk.boost) {                                         // heavy-up boost: after-images below, a burst at the feet
    for (let i = 0; i < 4; i++) VfxMgr.danteDashTrail(x, y + i * 24, c.fx.main);
    VFX.push({ type: 'ring', x, y: foot - 4, r0: 8, r1: 54, life: 12, width: 4, color: c.fx.alt, age: 0 });
    fxSparks(p, c, 6, { dx: 0, dy: 20, vx: 0, vy: 180, size: 3 });
  }
  if (atk.dive) {                                          // dive: after-images above and a falling streak
    for (let i = 0; i < 4; i++) VfxMgr.danteDashTrail(x, y - i * 24, c.fx.main);
    fxStreak(Object.assign({}, c, { base: Object.assign({}, c.base) }), { ang: 90, len: 120, life: 10, color: c.fx.alt });
  }
  if (atk.pull) {                                          // hook: the line out to the tip and a ring where it catches
    fxStreak(c, { ang: 0, len: 150, life: 9, color: c.fx.alt });
    fxRing(p, c, 140, 6, 36, { life: 12, width: 4, color: c.fx.main });
  }
}

const HERO_SWING = {
  // Zayar - cyan iaido: crossing thin cuts; the heavy is a long dash-slash that leaves after-images
  dante(p, atk, c) {
    if (c.w !== 'katana') return false;
    const m = centerAng(c);
    if (!c.heavy) {
      fxArc(c, { a0: m - 52 + c.stage * 20, a1: m + 52 - c.stage * 20, r: 70, w: 8, life: 7, hasEdge: true });
      if (c.stage === 0) fxArc(c, { a0: m + 46, a1: m - 46, r: 52, w: 5, life: 6, hasEdge: true, color: c.fx.alt });
    } else {
      fxStreak(c, { ang: m, len: 175, life: 13, color: c.fx.main });
      fxStreak(c, { ang: m + 4, len: 130, life: 10, color: 0xffffff });
      for (let i = 0; i < 4; i++) VfxMgr.danteDashTrail(p.sprite.x - c.sgn * (i * 22), bodyCY(p), c.fx.main);
      fxRing(p, c, 135, 6, 40, { life: 11 });
    }
    return true;
  },
  // Sandar - moon sweeps: wide crescents; the heavy spins and hits both sides
  sekiro(p, atk, c) {
    if (c.w !== 'katana' && c.w !== 'spear') return false;
    const m = centerAng(c);
    if (!c.heavy) {
      if (c.w === 'katana') { fxArc(c, { a0: m - 78, a1: m + 78, r: 82, w: 15, life: 10, hasEdge: true }); return true; }
      return false;
    }
    [1, -1].forEach((s) => fxArc(Object.assign({}, c, { base: Object.assign({}, c.base, { sgn: c.sgn * s }) }),
      { a0: -80 + c.stage * 20, a1: 80 + c.stage * 20, r: c.w === 'spear' ? 100 : 86, w: c.stage ? 22 : 14, life: 12, hasEdge: true }));
    fxRing(p, c, 0, 10, c.stage ? 96 : 70, { life: 13, width: 4, color: c.fx.main });
    fxSparks(p, c, 4, { dx: 0, vx: 0, vy: 0, c1: 0xffffff });
    return true;
  },
  // Weikza - mist alchemist: normal pokes, then a cyan mist burst further ahead on the second stage
  zawgyi(p, atk, c) {
    if (c.w !== 'spear') return false;
    if (c.stage > 0) {
      fxRing(p, c, c.heavy ? 118 : 100, 6, c.heavy ? 54 : 38, { life: 14, width: 4, color: c.fx.alt });
      fxSparks(p, c, 7, { dx: c.heavy ? 118 : 100, vx: 0, vy: 0, size: 3 });
      return true;
    }
    return false;
  },
  // Sithu - royal strikes: gold overhead arcs with a ground shockwave on heavies
  minsitthar(p, atk, c) {
    if (c.w !== 'sword' && c.w !== 'axe') return false;
    const m = centerAng(c);
    if (!c.heavy) {
      fxArc(c, { a0: m - 70, a1: m + 70, r: c.w === 'axe' ? 66 : 60, w: c.w === 'axe' ? 26 : 17, life: 9 });
      return true;
    }
    fxArc(c, { a0: m - 125, a1: m + 62, r: 94, w: c.w === 'axe' ? 36 : 28, life: 14 });
    fxArc(c, { a0: m - 100, a1: m + 40, r: 70, w: 10, life: 11, color: 0xffffff, hasEdge: true });
    if (p.sprite.body.blocked.down) { VfxMgr.spearDust(p.sprite.x + c.sgn * 48, p.sprite.body.bottom - 4); fxRing(p, c, 52, 8, 56, { y: p.sprite.body.bottom - 6, life: 12, width: 4 }); }
    VfxMgr.shake(120, 0.008);
    return true;
  },
  // Thura - dragonfire: fast fiery flurry; the heavy is a rising dragon uppercut; spear heavy sweeps
  aung_zeya(p, atk, c) {
    if (c.w === 'sword') {
      if (!c.heavy) {
        const ang = [-24, 20, -4][c.stage % 3];
        fxStreak(c, { ang, len: 74 + c.stage * 12, life: 6, color: c.stage === 2 ? c.fx.alt : c.fx.main });
        fxSparks(p, c, 3, { dx: 56, vx: c.sgn * 140, vy: -80 });
        return true;
      }
      fxArc(c, { a0: 55, a1: -112, r: 98, w: 31, life: 15 });
      fxRing(p, c, 70, 8, 48, { life: 13, width: 4 });
      fxSparks(p, c, 9, { dx: 54, vx: c.sgn * 30, vy: -330, size: 4, c1: 0xfff2c0 });
      return true;
    }
    if (c.w === 'spear' && !c.heavy) {
      [1, -1].forEach((s) => fxStreak(Object.assign({}, c, { base: Object.assign({}, c.base, { sgn: c.sgn * s }) }), { ang: 0, len: 96, life: 8 }));
      fxRing(p, c, 0, 8, 62, { life: 10, width: 3 });
      return true;
    }
    return false;
  },
  // Padamya - lotus dance: orbiting rings and pink petals; the heavy ring flies out and comes back
  thazin(p, atk, c) {
    if (c.w !== 'chakram') return false;
    if (!c.heavy) {
      fxRing(p, c, 14 + c.stage * 6, 14, 60 + c.stage * 8, { life: 9, width: 4, color: c.fx.main });
      fxArc(c, { a0: -150 + c.stage * 70, a1: -30 + c.stage * 70, r: 58, w: 12, life: 8, hasEdge: true });
      fxSparks(p, c, 4, { dx: 24, vx: 0, vy: -60, c1: 0xff9ed6, c2: 0xffffff });
      return true;
    }
    if (c.stage === 0) fxArc(c, { a0: -60, a1: 60, r: 70, w: 20, life: 10, hasEdge: true });
    else if (c.stage === 1) { fxRing(p, c, 120, 10, 52, { life: 14, width: 5, color: c.fx.main }); fxSparks(p, c, 6, { dx: 120, vx: c.sgn * 40, vy: -90, c1: 0xff9ed6 }); }
    else { fxArc(c, { a0: 70, a1: -90, r: 74, w: 24, life: 13, hasEdge: true }); fxRing(p, c, 30, 8, 60, { life: 12, width: 4 }); fxSparks(p, c, 8, { dx: 40, vy: -120, c1: 0xff9ed6, c2: 0xffffff }); }
    return true;
  },
  // Thaung - iron elephant: shoulder charge dust; the heavy is a ground slam with shockwaves on both sides
  thaung(p, atk, c) {
    if (c.w !== 'axe') return false;
    const onGround = p.sprite.body.blocked.down;
    if (!c.heavy) {
      fxStreak(c, { ang: 0, len: 60, life: 8, short: true, color: c.fx.alt });
      if (onGround) VfxMgr.spearDust(p.sprite.x - c.sgn * 10, p.sprite.body.bottom - 4);
      return true;
    }
    fxArc(c, { a0: -118, a1: 72, r: 90, w: 38, life: 15 });
    if (onGround) {
      [1, -1].forEach((s) => {
        VfxMgr.spearDust(p.sprite.x + s * 60, p.sprite.body.bottom - 4);
        VFX.push({ type: 'ring', x: p.sprite.x + s * 70, y: p.sprite.body.bottom - 6, r0: 10, r1: 90, life: 16, width: 5, color: c.fx.alt, age: 0 });
      });
    }
    VfxMgr.shake(190, 0.014);
    return true;
  },
  // Hla - storm bell: thin lightning jabs; the heavy is a long thunder thrust with crackling sparks
  hla(p, atk, c) {
    if (c.w !== 'spear') return false;
    if (!c.heavy) {
      fxStreak(c, { ang: centerAng(c), len: 112, life: 5, color: c.fx.alt });
      fxSparks(p, c, 2, { dx: 90, c1: 0xffffff });
      return true;
    }
    [-9, 0, 9].forEach((d, i) => fxStreak(c, { ang: centerAng(c) + d, len: 178 - Math.abs(d) * 4, life: 11 - i % 2, color: d ? c.fx.main : 0xffffff }));
    fxRing(p, c, 150, 6, 44, { life: 10, color: c.fx.alt });
    fxSparks(p, c, 8, { dx: 140, vx: 0, vy: 0, c1: 0xffffff, size: 2 });
    VfxMgr.shake(90, 0.006);
    return true;
  },
  // Kan - crimson rush: quick alternating cuts; the heavy is a spinning cog (three rotating arcs)
  kan(p, atk, c) {
    if (c.w !== 'axe') return false;
    const m = centerAng(c);
    if (!c.heavy) {
      fxArc(c, { a0: m - 60 + c.stage * 110, a1: m + 60 - c.stage * 110 + (c.stage ? 0 : 0), r: 66, w: 22, life: 8, hasEdge: true });
      fxSparks(p, c, 3, { dx: 54, c1: 0xffffff });
      return true;
    }
    const start = [-30, 100, 230][c.stage % 3];
    fxArc(c, { a0: start, a1: start + 150, r: 84, w: 26, life: 11, hasEdge: true });
    fxRing(p, c, 0, 12, 74, { life: 10, width: 3, color: c.fx.main });
    fxSparks(p, c, 4, { dx: 30, c1: 0xffffff });
    return true;
  },
};

// Hook called when attack hitbox becomes active
function playAttackJuice(p, atk) {
  AudioMgr.attackActive(p, atk);          // swing sound (weapon + light/heavy + hero pitch)
  if (atk.projectile) VfxMgr.muzzle(p, atk);   // gun: muzzle flash + shell casing
  else VfxMgr.swing(p, atk);                   // trail (arc / streak / fist)
}

// when a heavy attack starts (startup) - charge glow
function playAttackStart(p, atk) {
  if (atk && atk.kind === 'heavy') VfxMgr.charge(p, atk.startup);
}

// Called each active frame: heavy attacks leave a ghost afterimage
function playSlashTrail(p, atk) {
  if (atk.kind === 'heavy' && !atk.projectile && p.attack.frame % 2 === 0) VfxMgr.ghost(p);
}

// ====== Ghost afterimage pool (copies the real sprite) ======
const FxGhosts = {
  pool: [], next: 0,
  init(scene, depth) {
    this.pool = [];
    for (let i = 0; i < 8; i++) this.pool.push(scene.add.sprite(0, 0, '__DEFAULT').setVisible(false).setDepth(depth || 5));
    return this.pool;
  },
  spawn(p, color) {
    const skin = p.skin;
    if (!skin || !this.pool.length || !skin.visible) return;
    const s = this.pool[this.next++ % this.pool.length];
    s.setTexture(skin.texture.key, skin.frame.name).setOrigin(skin.originX, skin.originY)
      .setPosition(skin.x, skin.y).setFlipX(skin.flipX).setScale(skin.scaleX, skin.scaleY).setAngle(skin.angle)
      .setTint(color).setAlpha(0.5).setVisible(true);
    s.fxLife = 9; s.fxAge = 0;
  },
  tick() {
    this.pool.forEach((s) => {
      if (!s.visible) return;
      s.fxAge++;
      s.setAlpha(0.5 * (1 - s.fxAge / s.fxLife));
      if (s.fxAge >= s.fxLife) s.setVisible(false);
    });
  },
  clear() { this.pool.forEach((s) => s.setVisible(false)); },
};
