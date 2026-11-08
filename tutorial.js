// tutorial.js - TUTORIAL mode (Lobby > TUTORIAL).
// P2 is a training dummy: bot.js gives it no input, so it just stands there and never hits back.
// The lessons below run one after another; each one waits until you really do the move (detected from the real game state),
// shows the CURRENT key names (read from your Settings, so rebinding is reflected), and has an English line + a Burmese line.
//   N = skip the current lesson     ESC = back to the Lobby (handled in game.js)

const Tutorial = {
  active: false,
  allowSpawn: false,        // weapons only fall from the sky when a lesson needs them (checked in weapons.js)
  step: 0,
  count: 0,
  flash: 0,
  finished: false,
  scene: null,
  el: null,
  supplyCd: 0,
  _skip: false,
  _onKey: null,
  prev: null,

  // ------------------------------------------------------------------ key name helpers (always the player's real bindings)
  K(a) { return '[' + Controls.label('p1', a) + ']'; },
  pickupKeys() {
    // left mouse button can pick up too when it is bound to the light attack
    return this.K('throw');
  },

  // ------------------------------------------------------------------ lessons
  // goal = how many times; hit(att, tgt, custom, air) / throw(p, ax, ay) / poll(p, d) call this.inc() when the lesson's move happened
  steps() {
    const T = this;
    const isMelee = (c) => !c;
    const type = (a) => (a && a.attack && a.attack.type) || '';
    return [
      { title: 'MOVE', goal: 100, unit: '%',
        en: () => `Walk left and right with ${T.K('left')} and ${T.K('right')}.`,
        my: () => `${T.K('left')} နဲ့ ${T.K('right')} ကိုနှိပ်ပြီး ဘယ်ညာ လျှောက်ကြည့်ပါ။`,
        poll(p) {
          const x = p.sprite.x;
          if (T.prev && T.prev.x != null) T.st.dist = (T.st.dist || 0) + Math.abs(x - T.prev.x);
          T.count = Math.min(100, Math.round(((T.st.dist || 0) / 320) * 100));
        } },
      { title: 'JUMP', goal: 3,
        en: () => `Press ${T.K('jump')} to jump. You can jump 3 times in total: keep pressing it in the air until all 3 jump bars (top of the screen) are used.`,
        my: () => `${T.K('jump')} နှိပ်ပြီး ခုန်ပါ။ လေထဲမှာ ထပ်ခုန်လို့ရပါတယ် (စုစုပေါင်း ၃ ခါ)။ အပေါ်က jump bar ၃ ခုလုံး သုံးပြီးအောင် ခုန်ကြည့်ပါ။`,
        poll(p) {
          if (T.prev && p.jumpsLeft < T.prev.jumps) T.count = Math.min(3, MAX_JUMPS - p.jumpsLeft);
          if (p.jumpsLeft === MAX_JUMPS && T.count < 3) T.count = 0;   // landed too early: start the count again
        } },
      { title: 'DASH', goal: 2,
        en: () => `Hold ${T.K('left')} or ${T.K('right')} and press ${T.K('dodge')} to DASH. You cannot be hit during the first part of a dash. Do it 2 times.`,
        my: () => `${T.K('left')} (သို့) ${T.K('right')} ကိုင်ထားပြီး ${T.K('dodge')} နှိပ်ရင် dash ဖြစ်ပါတယ်။ Dash အစပိုင်းမှာ ထိမခံရပါဘူး။ ၂ ခါလုပ်ပါ။`,
        poll(p) { if (p.dodge.active && p.dodge.kind === 'roll' && !(T.prev && T.prev.dodgeActive)) T.inc(); } },
      { title: 'SPOT DODGE', goal: 1,
        en: () => `Press ${T.K('dodge')} WITHOUT holding a direction: you dodge on the spot (it has a longer cooldown).`,
        my: () => `ဘယ်ညာမကိုင်ဘဲ ${T.K('dodge')} ကိုပဲ နှိပ်ကြည့်ပါ။ နေရာမရွှေ့ဘဲ ရှောင်ပါတယ် (cooldown ပိုကြာပါတယ်)။`,
        poll(p) { if (p.dodge.active && p.dodge.kind === 'spot' && !(T.prev && T.prev.dodgeActive)) T.inc(); } },
      { title: 'LIGHT ATTACK', goal: 3,
        en: () => `Walk up to the dummy and hit it 3 times with a light attack ${T.K('light')}. Light attacks have a short cooldown, so mashing the button will not make them faster.`,
        my: () => `ရန်သူနားသွားပြီး light attack ${T.K('light')} နဲ့ ၃ ချက်ထိပါ။ Light attack မှာ cooldown ရှိလို့ ခလုတ်ကို အရမ်းဖိနှိပ်လည်း မမြန်ပါဘူး။`,
        hit(a, t, c) { if (a === T.p && isMelee(c) && type(a).startsWith('light')) T.inc(); } },
      { title: 'HEAVY ATTACK', goal: 2,
        en: () => `Heavy attack ${T.K('heavy')}: slower, but it hits harder and sends the enemy farther. Hit the dummy 2 times.`,
        my: () => `Heavy attack ${T.K('heavy')} က နှေးပေမယ့် ပိုအားကောင်းပြီး ရန်သူကို ပိုလွင့်စေပါတယ်။ ၂ ချက်ထိပါ။`,
        hit(a, t, c) { if (a === T.p && isMelee(c) && type(a).startsWith('heavy')) T.inc(); } },
      { title: 'UP ATTACK', goal: 1,
        en: () => `Hold ${T.K('up')} and press an attack to strike upward. Hit the dummy with an up attack.`,
        my: () => `${T.K('up')} ကိုင်ပြီး attack နှိပ်ရင် အပေါ်ကိုထိုးပါတယ်။ အပေါ်ထိုး attack နဲ့ ရန်သူကိုထိပါ။`,
        hit(a, t, c) { if (a === T.p && isMelee(c) && /_u_/.test(type(a))) T.inc(); } },
      { title: 'DOWN ATTACK', goal: 1,
        en: () => `Hold ${T.K('down')} and press an attack to strike downward. Hit the dummy with a down attack.`,
        my: () => `${T.K('down')} ကိုင်ပြီး attack နှိပ်ရင် အောက်ကိုထိုးပါတယ်။ အောက်ထိုး attack နဲ့ ရန်သူကိုထိပါ။`,
        hit(a, t, c) { if (a === T.p && isMelee(c) && /_d$/.test(type(a))) T.inc(); } },
      { title: 'DIAGONAL ATTACK', goal: 1,
        en: () => `Hold ${T.K('up')} or ${T.K('down')} TOGETHER with ${T.K('left')} / ${T.K('right')} and press an attack for a 45° diagonal strike. Hit the dummy with one.`,
        my: () => `${T.K('up')} (သို့) ${T.K('down')} ကို ${T.K('left')} / ${T.K('right')} နဲ့ တွဲကိုင်ပြီး attack နှိပ်ရင် ထောင့်ဖြတ် (45°) attack ဖြစ်ပါတယ်။ တစ်ချက်ထိပါ။`,
        hit(a, t, c) { if (a === T.p && isMelee(c) && /_(uf|ub|df|db)_/.test(type(a))) T.inc(); } },
      { title: 'AIR HIT BONUS', goal: 1,
        en: () => `Jump and hit the dummy while YOU are in the air. Every hit you land in the air gives you +1 jump and +1 dash back (dash up to 3), so you can keep a combo going!`,
        my: () => `ခုန်ပြီး ကိုယ်က လေထဲမှာရှိနေစဉ် ရန်သူကိုထိပါ။ လေထဲမှာ တစ်ချက်ထိတိုင်း jump +1 နဲ့ dash +1 ပြန်ရပါတယ် (dash အများဆုံး ၃ ခု)။`,
        hit(a, t, c, air) { if (a === T.p && air && !(c && c.thrown)) T.inc(); } },
      { title: 'PICK UP A WEAPON', goal: 1, needsPickup: true, spawn: true,
        en: () => `A weapon falls from the sky. Stand next to it and press ${T.pickupKeys()}${T.mouseLight() ? ' or ' + T.mouseLight() : ''} to pick it up. Weapons are never picked up automatically.`,
        my: () => `ကောင်းကင်ကနေ လက်နက်ကျလာပါမယ်။ လက်နက်ဘေးမှာရပ်ပြီး ${T.pickupKeys()}${T.mouseLight() ? ' (သို့) ' + T.mouseLight() : ''} နှိပ်ပါ။ အလိုလို မကောက်ပါဘူး။`,
        poll(p) { if (p.weaponId) { T.st.weapon = p.weaponId; T.inc(); } } },
      { title: 'WEAPON ATTACKS', goal: 2, needsWeapon: true,
        en: () => `Attack the dummy 2 times with your weapon. Each weapon has its own speed, reach and damage (a gun shoots bullets!).`,
        my: () => `လက်နက်နဲ့ ရန်သူကို ၂ ချက်ထိပါ။ လက်နက်တစ်မျိုးစီမှာ မြန်နှုန်း၊ ရောက်ဝေးမှု၊ damage မတူပါဘူး (gun က ကျည်ဆန်ပစ်ပါတယ်)။`,
        hit(a, t, c) { if (a === T.p && T.p.weaponId && !(c && c.thrown)) T.inc(); } },
      { title: 'THROW YOUR WEAPON', goal: 1, needsWeapon: true,
        en: () => `Press ${T.K('throw')} to THROW your weapon at the dummy and hit it. A thrown weapon only deals damage - it drops to the floor and the dummy can never pick it up.`,
        my: () => `${T.K('throw')} နှိပ်ပြီး လက်နက်ကို ရန်သူဆီပစ်ပါ၊ ထိအောင်ပစ်ပါ။ ပစ်လက်နက်က damage ပဲပေးပြီး မြေပေါ်ကျပါတယ်၊ ရန်သူက ကောက်လို့မရပါဘူး။`,
        hit(a, t, c) { if (a === T.p && c && c.thrown) T.inc(); } },
      { title: 'GET IT BACK', goal: 1, needsPickup: true,
        en: () => `Your weapon is lying where it hit. Only YOU can pick it up again: stand next to it and press ${T.K('throw')}${T.mouseLight() ? ' or ' + T.mouseLight() : ''}. You get the SAME weapon back.`,
        my: () => `ပစ်လိုက်တဲ့ လက်နက်က ထိတဲ့နေရာမှာ ကျနေပါတယ်။ ကိုယ်ပဲ ပြန်ကောက်လို့ရပါတယ် - ဘေးမှာရပ်ပြီး ${T.K('throw')}${T.mouseLight() ? ' (သို့) ' + T.mouseLight() : ''} နှိပ်ပါ။ ပစ်ခဲ့တဲ့ လက်နက်ပဲ ပြန်ရပါတယ်။`,
        poll(p) { if (p.weaponId) T.inc(); } },
      { title: 'AIMED THROW', goal: 1, needsWeapon: true,
        en: () => `Aim your throw: hold ${T.K('up')} (or ${T.K('up')} + ${T.K('right')} / ${T.K('left')} for a diagonal, or ${T.K('down')} for straight down) and press ${T.K('throw')}. Do one aimed throw.`,
        my: () => `ပစ်ရင် ဦးတည်ချက်ရွေးလို့ရပါတယ်: ${T.K('up')} (သို့) ${T.K('up')} + ${T.K('right')} / ${T.K('left')} ကိုင်ပြီး ${T.K('throw')} နှိပ်ရင် အပေါ်/ထောင့်ဖြတ်ပစ်ပါတယ်။ ${T.K('down')} ကိုင်ရင် အောက်ကိုပစ်ပါတယ်။`,
        throw(p, ax, ay) { if (ay !== 0) T.inc(); } },
    ];
  },

  mouseLight() {
    // is a mouse button bound to the light attack? then it picks up too (e.g. "Left Click")
    const l = (Controls.bindings.p1.light || []).map((b) => Controls.parse(b)).find((b) => b && b.mouse);
    return l ? l.label : '';
  },

  // ------------------------------------------------------------------ lifecycle
  start(scene) {
    this.stop();
    this.scene = scene;
    this.p = players[0];
    this.dummy = players[1];
    this.list = this.steps();
    this.step = 0;
    this.count = 0;
    this.st = {};
    this.flash = 0;
    this.finished = false;
    this.allowSpawn = false;
    this.supplyCd = 0;
    this.prev = null;
    this.active = true;
    this._skip = false;
    this._onKey = (e) => { if (e.code === 'KeyN' && !e.repeat) this._skip = true; };
    window.addEventListener('keydown', this._onKey);
    this.buildPanel();
    this.enter();
  },

  stop() {
    this.active = false;
    this.allowSpawn = false;
    if (this._onKey) window.removeEventListener('keydown', this._onKey);
    this._onKey = null;
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
  },

  enter() {
    const s = this.list[this.step];
    this.count = 0;
    this.st = {};
    if (!s) return;
    if (s.spawn) this.allowSpawn = true;
    if (s.spawn || s.needsWeapon || s.needsPickup) this.supplyCd = 0;
    this.render();
  },

  inc() { this.count++; },

  // ------------------------------------------------------------------ hooks called from game.js / weapons.js
  onHit(attacker, target, custom, air) {
    if (!this.active || this.finished || this.flash > 0) return;
    const s = this.list[this.step];
    if (s && s.hit) { s.hit(attacker, target, custom, air); this.render(); }
  },

  onThrow(p, ax, ay) {
    if (!this.active || this.finished || this.flash > 0) return;
    const s = this.list[this.step];
    if (s && s.throw) { s.throw(p, ax, ay); this.render(); }
  },

  // ------------------------------------------------------------------ per frame (called from simulate)
  tick() {
    const p = this.p, d = this.dummy;
    if (!p || !d) return;

    // keep the dummy practice-friendly: damage % never grows too high
    if (!d.dead && d.damage > 140) d.damage = 0;

    if (!p.dead) {
      // supply a weapon on the field whenever a lesson needs one and there is none
      const s = this.list[this.step];
      const wantWeapon = this.finished || (s && (s.spawn || s.needsWeapon || s.needsPickup));
      if (wantWeapon && !p.weaponId && this.supplyCd-- <= 0) {
        const onField = WeaponSystem.pickups.filter((k) => k.sprite && k.sprite.active).length +
          WeaponSystem.thrown.filter((t) => t.grounded && t.sprite && t.sprite.active && (!t.ownerOnly || t.owner === p)).length;
        if (onField === 0) {
          const x = Phaser.Math.Clamp(p.sprite.x + (Math.random() < 0.5 ? -110 : 110), 160, WIDTH - 160);
          spawnBrawlhallaPickup(this.scene, x, 10);
        }
        this.supplyCd = 90;
      }

      if (this.flash > 0) {
        if (--this.flash === 0) { this.step++; this.finished = this.step >= this.list.length; if (this.finished) this.allowSpawn = true; this.enter(); }
      } else if (!this.finished && s) {
        if (s.poll) s.poll(p, d);
        if (this._skip) { this._skip = false; this.count = s.goal; }
        if (this.count >= s.goal) { this.flash = 80; this.sfx(); }
        this.render();
      }
      this.prev = { x: p.sprite.x, jumps: p.jumpsLeft, dodgeActive: p.dodge.active };
    }
    this._skip = false;
  },

  sfx() { if (typeof AudioMgr !== 'undefined') { try { AudioMgr.play('pickup'); } catch (e) {} } },

  // ------------------------------------------------------------------ DOM panel
  buildPanel() {
    if (!document.getElementById('tut-style')) {
      const st = document.createElement('style');
      st.id = 'tut-style';
      st.textContent = `
        #tut { position: fixed; top: 92px; left: 50%; transform: translateX(-50%); width: min(600px, 92vw); z-index: 50;
               background: rgba(8,12,30,0.80); border: 1px solid rgba(255,255,255,0.18); border-radius: 14px; padding: 10px 16px 12px;
               color: #e6ecff; font-family: Poppins, "Segoe UI", Arial, "Noto Sans Myanmar", "Myanmar Text", sans-serif;
               backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); pointer-events: none; box-shadow: 0 6px 24px rgba(0,0,0,0.45); }
        #tut .h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 4px; }
        #tut .t { font-weight: 800; font-size: 15px; letter-spacing: 0.5px; color: #ffd54a; }
        #tut .n { font-size: 12px; color: #9fb0e6; }
        #tut .en { font-size: 14px; line-height: 1.45; font-weight: 600; }
        #tut .my { font-size: 13px; line-height: 1.7; color: #b9c6ee; margin-top: 4px; }
        #tut .bar { height: 7px; border-radius: 4px; background: #1a2448; margin-top: 8px; overflow: hidden; }
        #tut .bar i { display: block; height: 100%; width: 0; background: #57e389; transition: width 0.12s; }
        #tut .f { font-size: 11px; color: #7f92c9; margin-top: 6px; }
        #tut.ok { border-color: #57e389; }
        #tut.ok .t { color: #7dffb0; }
      `;
      document.head.appendChild(st);
    }
    const el = document.createElement('div');
    el.id = 'tut';
    el.innerHTML = '<div class="h"><span class="t"></span><span class="n"></span></div><div class="en"></div><div class="my"></div><div class="bar"><i></i></div><div class="f"></div>';
    document.body.appendChild(el);
    this.el = el;
  },

  render() {
    const el = this.el;
    if (!el) return;
    const q = (c) => el.querySelector(c);
    if (this.finished) {
      el.classList.add('ok');
      q('.t').textContent = 'TUTORIAL COMPLETE ✔';
      q('.n').textContent = '';
      q('.en').textContent = 'You know everything now. Keep practising on the dummy - weapons keep falling. Press ESC to go back to the Lobby.';
      q('.my').textContent = 'Tutorial ပြီးပါပြီ! Dummy ကို လွတ်လွတ်လပ်လပ် ဆက်လေ့ကျင့်နိုင်ပါတယ် (လက်နက်တွေ ဆက်ကျပါမယ်)။ ESC နှိပ်ရင် Lobby ပြန်ရောက်ပါမယ်။';
      q('.bar i').style.width = '100%';
      q('.f').textContent = 'Controls can be changed in Lobby > Settings';
      return;
    }
    const s = this.list[this.step];
    if (!s) return;
    const done = this.flash > 0;
    el.classList.toggle('ok', done);
    q('.t').textContent = done ? '✔ NICE!  ' + s.title : s.title;
    q('.n').textContent = `Lesson ${this.step + 1} / ${this.list.length}`;
    q('.en').textContent = s.en();
    q('.my').textContent = s.my();
    const pct = s.unit === '%' ? this.count : Math.min(100, Math.round((this.count / s.goal) * 100));
    q('.bar i').style.width = (done ? 100 : pct) + '%';
    q('.f').textContent = (s.unit === '%' ? '' : `${Math.min(this.count, s.goal)} / ${s.goal}     `) + 'N = skip this lesson     ESC = back to Lobby';
  },
};
