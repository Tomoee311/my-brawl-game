// ===== Step 3: Damage % + Knockback + Hitstun =====

// WIDTH/HEIGHT = size of the world; used only for maps, sprites and physics. Unrelated to the screen size.
const WIDTH = 1067;
const HEIGHT = 600;

// ---------- Camera (follows both characters like Brawlhalla, zooming in/out) ----------
// CAM_VIEW_W/H = world width visible at the closest zoom. Smaller value = bigger stage.
const CAM_VIEW_W = 900;
const CAM_VIEW_H = 506;
const CAM_ZOOM_OUT = 0.6;   // farthest zoom = closest zoom x this value (smaller = see a wider area)
const CAM_PAD_X = 260;      // distance from the characters to the screen edge
const CAM_PAD_Y = 200;
const CAM_LERP = 0.12;      // camera smoothing (smaller = slower)
const CAM_LIMIT_X = 450;    // farthest the camera can move left/right from the stage center
const CAM_MIN_Y = 150, CAM_MAX_Y = 470;

// ---------- Match (stocks) ----------
const STOCKS = 3;            // number of lives (stocks)
const RESPAWN_DELAY = 90;    // frames to wait after a KO before respawning
const RESPAWN_HOLD = 150;    // max frames a respawned player can stand on the platform (any input drops them immediately)
const RESPAWN_INVULN = 60;   // frames of invincibility after leaving the platform
const SPAWN_Y = 120;         // respawn height
const SPAWN_XS = [-240, -120, 0, 120, 240];  // possible respawn positions relative to the stage center (right = +)
const SPAWN_MIN_DIST = 140;  // avoid spawn spots closer than this to the enemy

// ---------- Map (add new maps here later) ----------
// bg    = background image path (if missing, a plain hand-drawn background is used)
// dim   = how much to darken the background (0 = unchanged, 0.5 = fairly dark) so characters stand out
// parts = stage pieces: x = offset left/right from the stage center (right = +), y = distance from the top
// layers = background layers (farthest to nearest). parallax: 0 = static, 1 = moves with the stage. drift = slow sideways drift of the image (px/sec, for seamlessly tiling images only)
// parts[].art = image drawn over the stage piece (the collider is unchanged). scale = shrink factor of the image, surfaceY = pixel y of the walkable surface inside the image
const MAPS = {
  pagoda: {
    name: 'Golden Pagoda Skies',
    desc: 'Golden Pagoda Skies — golden pagodas, palm trees, balloons and an evening sea of clouds',
    thumb: 'assets/maps/pagoda/thumb.png',
    layers: [
      { key: 'pagoda_sky',        file: 'assets/maps/pagoda/sky.png',        parallax: 0.10 },
      { key: 'pagoda_far',        file: 'assets/maps/pagoda/far.png',        parallax: 0.25 },
      { key: 'pagoda_mid',        file: 'assets/maps/pagoda/mid.png',        parallax: 0.50 },
      { key: 'pagoda_cloud_high', file: 'assets/maps/pagoda/cloud_high.png', parallax: 0.62, drift: 12 },
      { key: 'pagoda_cloud_low',  file: 'assets/maps/pagoda/cloud_low.png',  parallax: 0.80 },
    ],
    dim: 0,
    parts: [
      { x: 0,    y: 440, w: 640, h: 30, oneWay: false, color: 0x4a5a7a,
        art: { key: 'pagoda_stage_main', file: 'assets/maps/pagoda/stage_main.png', scale: 1 / 3, surfaceY: 300 } },
      { x: -170, y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'pagoda_stage_plat', file: 'assets/maps/pagoda/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
      { x: 170,  y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'pagoda_stage_plat', file: 'assets/maps/pagoda/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
    ],
  },
  moonlake: {
    name: 'Moonlit Lotus Lake',
    desc: 'Moonlit Lotus Lake — a lotus pond under the full moon, a monastery, Bagan-style brick pagodas and lanterns',
    thumb: 'assets/maps/moonlake/thumb.png',
    layers: [
      { key: 'moon_sky',        file: 'assets/maps/moonlake/sky.png',        parallax: 0.10 },
      { key: 'moon_far',        file: 'assets/maps/moonlake/far.png',        parallax: 0.25 },
      { key: 'moon_mid',        file: 'assets/maps/moonlake/mid.png',        parallax: 0.50 },
      { key: 'moon_cloud_high', file: 'assets/maps/moonlake/cloud_high.png', parallax: 0.62, drift: 10 },
      { key: 'moon_cloud_low',  file: 'assets/maps/moonlake/cloud_low.png',  parallax: 0.80 },
    ],
    dim: 0,
    parts: [
      { x: 0,    y: 440, w: 640, h: 30, oneWay: false, color: 0x4a5a7a,
        art: { key: 'moon_stage_main', file: 'assets/maps/moonlake/stage_main.png', scale: 1 / 3, surfaceY: 300 } },
      { x: -170, y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'moon_stage_plat', file: 'assets/maps/moonlake/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
      { x: 170,  y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'moon_stage_plat', file: 'assets/maps/moonlake/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
    ],
  },
  popa: {
    name: 'Mount Popa Embers',
    desc: 'Mount Popa Embers — a volcanic dusk: lava rivers, basalt islands, bronze shrines and drifting embers. Narrow main stage + a high middle platform',
    thumb: 'assets/maps/popa/thumb.png',
    layers: [
      { key: 'popa_sky',        file: 'assets/maps/popa/sky.png',        parallax: 0.10 },
      { key: 'popa_far',        file: 'assets/maps/popa/far.png',        parallax: 0.25 },
      { key: 'popa_mid',        file: 'assets/maps/popa/mid.png',        parallax: 0.50 },
      { key: 'popa_cloud_high', file: 'assets/maps/popa/cloud_high.png', parallax: 0.62, drift: 12 },
      { key: 'popa_cloud_low',  file: 'assets/maps/popa/cloud_low.png',  parallax: 0.80 },
    ],
    dim: 0,
    parts: [
      { x: 0,    y: 440, w: 560, h: 30, oneWay: false, color: 0x4a5a7a,
        art: { key: 'popa_stage_main', file: 'assets/maps/popa/stage_main.png', scale: 1 / 3, surfaceY: 300 } },
      { x: -215, y: 335, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'popa_stage_plat', file: 'assets/maps/popa/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
      { x: 215, y: 335, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'popa_stage_plat', file: 'assets/maps/popa/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
      { x: 0, y: 225, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'popa_stage_plat', file: 'assets/maps/popa/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
    ],
  },
  aurora: {
    name: 'Frostpeak Aurora',
    desc: 'Frostpeak Aurora — snow peaks under a glowing aurora, floating ice pagodas and cyan crystals. Wide main stage + two far side platforms',
    thumb: 'assets/maps/aurora/thumb.png',
    layers: [
      { key: 'aurora_sky',        file: 'assets/maps/aurora/sky.png',        parallax: 0.10 },
      { key: 'aurora_far',        file: 'assets/maps/aurora/far.png',        parallax: 0.25 },
      { key: 'aurora_mid',        file: 'assets/maps/aurora/mid.png',        parallax: 0.50 },
      { key: 'aurora_cloud_high', file: 'assets/maps/aurora/cloud_high.png', parallax: 0.62, drift: 12 },
      { key: 'aurora_cloud_low',  file: 'assets/maps/aurora/cloud_low.png',  parallax: 0.80 },
    ],
    dim: 0,
    parts: [
      { x: 0,    y: 440, w: 700, h: 30, oneWay: false, color: 0x4a5a7a,
        art: { key: 'aurora_stage_main', file: 'assets/maps/aurora/stage_main.png', scale: 1 / 3, surfaceY: 300 } },
      { x: -250, y: 330, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'aurora_stage_plat', file: 'assets/maps/aurora/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
      { x: 250, y: 330, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8,
        art: { key: 'aurora_stage_plat', file: 'assets/maps/aurora/stage_plat.png', scale: 1 / 3, surfaceY: 102 } },
    ],
  },
  default: {
    bg: null,             // to add an image, change this to e.g. 'assets/bg.jpg'
    dim: 0.25,
    // oneWay: false = solid collider (cannot drop through). true = jump-through / S drop-through.
    parts: [
      { x: 0,    y: 440, w: 640, h: 30, oneWay: false, color: 0x4a5a7a },
      { x: -170, y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8 },
      { x: 170,  y: 320, w: 170, h: 14, oneWay: true,  color: 0x6b7fa8 },
    ],
  },
};
let CURRENT_MAP = 'pagoda';   // the map chosen in the Menu is set via SELECTION.map ('default' = plain map with no art)
// Selections made in the Menu (menu.js). If you launch directly without the Menu, these defaults are used
const PLAYER_COLORS = [0xff5a4a, 0x4aa8ff];            // P1 red / P2 blue (marker + HUD)
const SAME_HERO_TINT = [0xffffff, 0x78aaff];            // if both players pick the same hero, tint P2 blue
const SELECTION = { p1: 'dante', p2: 'sekiro', map: 'pagoda', mode: 'friends', botLevel: 'medium' };   // mode: 'friends' | 'bot' | 'online' | 'tutorial' (chosen in the Lobby)

// Tunable values (edit here to change the game feel)
const MOVE_SPEED = 300;
const JUMP_SPEED = 520;
const DROP_TIME = 250;
const DROP_SPEED = 380;
const DROP_BUFFER = 12;

// true  = two players on one PC (local test mode)
//   P1: A/D move, SPACE jump, S drop, left mouse = light, right mouse = heavy (J / K also work)
//   P2: Left/Right move, ENTER jump, Down drop, Numpad1 = light, Numpad2 = heavy
// false = online mode
const LOCAL_TEST = true;

// In online play, the opponent's input arrives over the network and is written into this
const remoteInput = { left: false, right: false, up: false, down: false, downHeld: false, jump: false, attack: null, dodge: false };

// ---------- Online mode (see net.js) ----------
// Both browsers run this same simulation and exchange only button presses (lockstep). That only works if the
// simulation is deterministic, so in online mode: (1) physics is stepped by hand exactly once per simulate() step,
// (2) every random choice that affects gameplay uses simRng (same seed on both machines).
const isOnline = () => SELECTION.mode === 'online';
let netMasks = [0, 0];                 // this frame's button masks for P1 and P2 (from the lockstep)
let simRng = null;                     // seeded random in online mode, null (= Math.random) otherwise
let rematchVote = [false, false];
let rematchCount = 0;
let netStallSince = 0;
let netClosedAt = 0;                   // when the connection was lost (we return to the lobby a moment later)
let netExiting = false;                // already leaving the match scene
let escArmedUntil = 0;
let netMsgText = null, netPingText = null;
function rngNext() { return simRng ? simRng() : Math.random(); }
function rngInt(a, b) { return a + Math.floor(rngNext() * (b - a + 1)); }
function rngPick(arr) { return arr[Math.floor(rngNext() * arr.length)]; }

// ---------- Jump ----------
// No stamina anymore. Total jumps are capped at MAX_JUMPS (the initial jump from the ground counts too).
// Jumps refill on touching the ground. There is no cooldown between jumps -
// once animation is added, only the animation length will cause a delay.
const MAX_JUMPS = 3;

// ---------- Input buffer / drop-through ----------
// If an attack is pressed early during recovery/cooldown, it is remembered and fired on the first frame it can be.
// (0 = off, 5 = about 0.08 seconds)
const ATTACK_BUFFER = 5;
const DROP_FRAMES = 20;   // max frames the player may pass through when dropping off a platform

// ---------- Dodge (frames, 60 = 1 second) ----------
// Hold LEFT/RIGHT while pressing dodge = directional dodge; no direction = spot dodge.
// Gravity is paused while dodging. Air: ONE dodge per airtime (p.airDashes), +1 for every hit landed while airborne.
const DODGE_ROLL = {
  duration: 16,  // short recovery — can attack or dodge again the frame this ends
  invuln: 12,
  cooldown: 0,
  speed: 520,
};
const DODGE_SPOT = {
  duration: 36,  // longer recovery animation
  invuln: 16,    // frames 17–36 are punishable
  cooldown: 72,  // extra lockout so in-place dodge cannot be spammed
  speed: 0,
};
const DODGE_SPEED = DODGE_ROLL.speed;

// ---------- Air dash count ----------
// You start every airtime with AIR_DASHES_BASE air dash(es) (refilled on landing).
// Landing a hit on an enemy WHILE YOU ARE IN THE AIR gives you +1 extra air dash, and every further air hit adds another one (up to AIR_DASHES_MAX).
const AIR_DASHES_BASE = 1;
const AIR_DASHES_MAX = 3;

// ---------- Light attack anti-spam ----------
// A light attack can never be repeated faster than this many frames (startup + active + recovery + cooldown). 60 frames = 1 second.
// Fast weapons (katana) get extra cooldown so they can't be mashed.
const LIGHT_MIN_CYCLE = 32;

// ---------- Brawlhalla-style movement ----------
const FAST_FALL_SPEED = 680;        // hold down while falling (kept below ~720 px/s: faster could tunnel through a platform)
const GRAVITY_CANCEL_FRAMES = 12;   // an air hit freezes your fall for this long (once per airtime - land to get it back)
const COMBO_WINDOW = 30;            // frames after a light attack in which pressing light again continues the 3-hit combo
const COMBO_MIN_CYCLE = 17;         // combo hits 2 and 3 follow up faster than a fresh light attack (LIGHT_MIN_CYCLE)
const COMBO_FINISH_CYCLE = 40;      // ...but after the finisher you wait a bit
const COMBO_BUFFER = 12;            // a light press this early before the next hit is remembered

// ---------- Knockback / Hitstun ----------
// Knockback force is calculated with this formula:
//   kb = baseKb + (target.damage % * growth)
// the higher the damage %, the farther the target flies (Brawlhalla / Smash style)
const MAX_VELOCITY = 1400;      // raised so knockback velocity isn't clipped
const HITSTUN_BASE = 8;         // minimum frames of lost control when hit
const HITSTUN_PER_KB = 0.03;    // more knockback = longer stun (frames per px/s)
const HITSTUN_MAX = 40;         // max stun frames
const MAX_DAMAGE_SHOWN = 300;   // only used for the HUD color change (damage itself is not capped)

// ---------- Fixed timestep ----------
const STEP_MS = 1000 / 60;
const STEP_S = 1 / 60;
let acc = 0;
let hitStopFrames = 0;

// ---------- Attacks (measured in frames, 60 frames = 1 second) ----------
// ox: hitbox along facing (1 = fully in front). oy: +down / -up, relative to body+hitbox half-heights.
const LIGHT_BASE = {
  kind: 'light', startup: 5, active: 4, recovery: 12, cooldown: 8,
  width: 55, height: 40, ox: 1, oy: 0,
  moveMult: 0.4, damage: 5, baseKb: 220, growth: 5, angle: 35,
};
const HEAVY_BASE = {
  kind: 'heavy', startup: 14, active: 5, recovery: 26, cooldown: 10,
  width: 85, height: 55, ox: 1, oy: 0,
  moveMult: 0.2, damage: 12, baseKb: 340, growth: 9, angle: 45,
};
function defineAttack(base, extra) {
  return Object.assign({}, base, extra);
}
const ATTACKS = {
  light_n:      defineAttack(LIGHT_BASE, { dir: 'n' }),
  light_s:      defineAttack(LIGHT_BASE, { dir: 's', width: 70, height: 36, ox: 1.15, damage: 6, baseKb: 250, angle: 25 }),
  light_d:      defineAttack(LIGHT_BASE, { dir: 'd', width: 48, height: 50, ox: 0.35, oy: 0.7, baseKb: 200, angle: -50, growth: 4 }),
  light_u_tilt: defineAttack(LIGHT_BASE, { dir: 'u', width: 42, height: 58, ox: 0.25, oy: -0.85, damage: 6, baseKb: 240, angle: 80 }),
  light_u_air:  defineAttack(LIGHT_BASE, { dir: 'u', width: 44, height: 56, ox: 0.2, oy: -0.9, damage: 6, baseKb: 230, angle: 85, startup: 6 }),
  heavy_n:      defineAttack(HEAVY_BASE, { dir: 'n' }),
  heavy_s:      defineAttack(HEAVY_BASE, { dir: 's', width: 100, height: 48, ox: 1.2, damage: 14, baseKb: 380, angle: 30 }),
  heavy_d:      defineAttack(HEAVY_BASE, { dir: 'd', width: 70, height: 70, ox: 0.3, oy: 0.75, damage: 13, baseKb: 320, angle: -60 }),
  heavy_u_tilt: defineAttack(HEAVY_BASE, { dir: 'u', width: 55, height: 90, ox: 0.2, oy: -0.95, damage: 13, baseKb: 360, angle: 85 }),
  heavy_u_air:  defineAttack(HEAVY_BASE, { dir: 'u', width: 58, height: 88, ox: 0.15, oy: -1, damage: 13, baseKb: 350, angle: 90, startup: 15 }),
};

// Unarmed diagonal attacks: light_uf_g, heavy_db_a ... (uses diagAttacks from weapons.js)
Object.assign(ATTACKS, diagAttacks('light'), diagAttacks('heavy'));

// Maps held movement keys on the attack-press frame -> ATTACKS id (Brawlhalla 8-direction).
//   n = neutral, s = side, u = up, d = down
//   uf / ub / df / db = diagonal (W/S pressed together with left/right)
// Priority: diagonal (two keys) > single (one key). e.g. W+A gives 'uf' or 'ub', not 'u'
// forward / back = relative to the character's previous facing (facingBefore). Same side as facing = forward, opposite = back
const AttackRouter = {
  readDirection(input, facing) {
    const v = input.up ? 'u' : (input.downHeld ? 'd' : '');
    const h = (input.right ? 1 : 0) - (input.left ? 1 : 0); // pressing both sides gives 0
    if (v && h) return v + (h === facing ? 'f' : 'b'); // diagonal takes priority
    if (v) return v;
    if (h) return 's';
    return 'n';
  },
  resolve(input, onFloor, facing) {
    if (!input.attack) return null;
    const dir = this.readDirection(input, facing);
    let variant;
    if (dir === 'u') variant = onFloor ? 'u_tilt' : 'u_air';
    else if (dir.length === 2) variant = dir + (onFloor ? '_g' : '_a'); // diagonal: split into ground / air
    else variant = dir;
    return input.attack + '_' + variant;
  },
  // stage = multi-hit stage (0 = first hit). The fighter's own attack style (char.moves, see moves.js) is applied on top of the weapon table.
  getAttackData(p, type, stage) {
    const weaponId = p && (p.equippedWeapon || p.weaponId);
    let atk = weaponId && typeof WEAPONS !== 'undefined' && WEAPONS[weaponId] && WEAPONS[weaponId].attacks[type];
    if (!atk) atk = ATTACKS[type] || ATTACKS.light_n;
    // light combo: the running neutral / side light may be hit 2 or 3 of the chain (moves.js COMBO_DEFAULT + per-fighter `combo`)
    const combo = (p && p.attack && p.attack.type === type && p.attack.state !== 'none') ? (p.attack.combo | 0) : 0;
    if (p && p.char && typeof applyMoves === 'function') atk = applyMoves(p.char, weaponId, type, atk, stage, combo);
    const stats = p && p.char && p.char.stats;
    if (!stats) return atk;

    // Return a per-player copy so character tuning never mutates shared weapon data.
    let tuned = null;
    if (weaponId === 'katana' && stats.katanaRecoveryMult) {
      tuned = Object.assign({}, atk, { recovery: Math.max(4, Math.round(atk.recovery * stats.katanaRecoveryMult)) });
    }
    if (weaponId === 'spear' && (stats.spearDamageMult || stats.spearRangeMult)) {
      tuned = Object.assign({}, tuned || atk);
      if (stats.spearDamageMult) tuned.damage = Math.round(tuned.damage * stats.spearDamageMult);
      if (stats.spearRangeMult) {
        if (tuned.diag) tuned.len = Math.round(tuned.len * stats.spearRangeMult);
        else {
          tuned.width = Math.round(tuned.width * stats.spearRangeMult);
          tuned.ox = (tuned.ox == null ? 1 : tuned.ox) * 1.04;
        }
      }
    }
    // character-specific modifiers for sword/offensive weapons (swordDamageMult, axeDamageMult ...)
    const dm = weaponId !== 'spear' && stats[weaponId + 'DamageMult'];
    if (dm) {
      tuned = Object.assign({}, tuned || atk);
      tuned.damage = Math.round(tuned.damage * dm);
    }
    return tuned || atk;
  },
};
let SHOW_HITBOX = true; // debug: show hitboxes (toggle in game with B)

// Mouse clicks are collected here and consumed by the simulation when it reads input
const mouseQueue = { attack: null, throw: false };

// Captured directly at the window level to prevent missed clicks caused by the browser's middle-click auto-scroll
window.addEventListener('mousedown', (e) => {
  if (e.button === 1) {
    e.preventDefault();
    mouseQueue.throw = true;
  }
});
window.addEventListener('auxclick', (e) => {
  if (e.button === 1) {
    e.preventDefault();
    mouseQueue.throw = true;
  }
});

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#070b1a',
  scale: {
    mode: Phaser.Scale.RESIZE,              // canvas fills the window (no borders)
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1200 }, debug: false },
  },
  scene: [
    {
      key: 'Boot',
      preload() {
        const bw = this.scale.width, bh = this.scale.height, barW = Math.min(360, bw * 0.7), fam = 'Poppins, Arial, sans-serif';
        this.add.text(bw / 2, bh / 2 - 46, 'MY BRAWL GAME', { fontFamily: fam, fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
        this.add.graphics().fillStyle(0x16224f, 1).fillRoundedRect(bw / 2 - barW / 2, bh / 2, barW, 10, 5);
        const bar = this.add.graphics();
        const t = this.add.text(bw / 2, bh / 2 + 32, 'LOADING 0%', { fontFamily: fam, fontSize: '13px', color: '#a9bbe8', fontStyle: 'bold' }).setOrigin(0.5);
        this.load.on('progress', (v) => {
          bar.clear().fillStyle(0x57e389, 1).fillRoundedRect(bw / 2 - barW / 2, bh / 2, Math.max(10, barW * v), 10, 5);
          t.setText('LOADING ' + Math.round(v * 100) + '%');
        });
        preload.call(this);
      },
      create() {
        const invite = typeof OnlineScene !== 'undefined' && /^[A-Za-z]{4}$/.test(new URLSearchParams(window.location.search).get('room') || '');
        if (invite) { SELECTION.mode = 'online'; this.scene.start('Online'); return; }
        this.scene.start(typeof LobbyScene !== 'undefined' ? 'Lobby' : 'Menu');
      },
    },
    (typeof LobbyScene !== 'undefined' ? LobbyScene : { key: 'Lobby', create() { this.scene.start('Menu'); } }),
    (typeof MenuScene !== 'undefined' ? MenuScene : { key: 'Menu', create() { this.scene.start('Game'); } }),
    (typeof OnlineScene !== 'undefined' ? OnlineScene : { key: 'Online', create() { this.scene.start('Lobby'); } }),
    (typeof SettingsScene !== 'undefined' ? SettingsScene : { key: 'Settings', create() { this.scene.start('Lobby'); } }),
    { key: 'Game', create, update },
  ],
};

let players = [];
let stageParts = [];
let hud;
let overlay;
let vfxGfx;
let damageTexts = [];

function preload() {
  // If an image file is missing, don't throw an error; use a fallback background / placeholder character
  // If a file is missing or unreadable the game keeps running with a placeholder, but the console (F12) shows which file failed
  this.load.on('loaderror', (file) => {
    console.warn('[load failed] ' + file.src + '  -> using placeholder. If you opened the page via file://, use a local server.');
  });
  if (typeof AudioMgr !== 'undefined') AudioMgr.preload(this);
  const artDone = {};
  Object.keys(MAPS).forEach((id) => {
    const m = MAPS[id];
    if (m.bg) this.load.image('bg', m.bg);
    (m.layers || []).forEach((L) => this.load.image(L.key, L.file));
    if (m.thumb) this.load.image('thumb_' + id, m.thumb);
    m.parts.forEach((d) => {
      if (d.art && !artDone[d.art.key]) { artDone[d.art.key] = true; this.load.image(d.art.key, d.art.file); }
    });
  });
  // 8-frame transparent SVG sheets; procedural player art remains the fallback.
  this.load.spritesheet('weapon_sheet_sword', 'assets/chars/sword_weapon_sheet.svg', { frameWidth: 64, frameHeight: 64 });
  this.load.spritesheet('weapon_sheet_gun', 'assets/chars/gun_weapon_sheet.svg', { frameWidth: 64, frameHeight: 64 });
  // Per-weapon character sheets (charart.js). c.sheetKey/sheetPath point to the unarmed sheet, so this must be called before the loop below
  if (typeof preloadCharacterArt === 'function') preloadCharacterArt(this);
  Object.keys(CHARACTERS).forEach((id) => {
    const c = CHARACTERS[id];
    if (c.sheetPath) {
      this.load.spritesheet(c.sheetKey, c.sheetPath, {
        frameWidth: c.frameWidth || CHAR_FRAME_W,
        frameHeight: c.frameHeight || CHAR_FRAME_H,
      });
    }
  });
}

// background always fills the screen (independent of camera zoom)
const bgLayer = { img: null, dim: null, gfx: null, layers: [] };

function buildBackground(scene) {
  const map = MAPS[CURRENT_MAP];
  bgLayer.layers = [];
  const objs = [];
  // layers (parallax)
  (map.layers || []).forEach((L) => {
    if (!scene.textures.exists(L.key)) return;
    const n = L.drift ? 3 : 1;           // with drift, 3 adjacent images are tiled so they scroll seamlessly
    const imgs = [];
    for (let k = 0; k < n; k++) imgs.push(scene.add.image(0, 0, L.key).setDepth(-10 + bgLayer.layers.length));
    bgLayer.layers.push({ def: L, imgs });
    objs.push(...imgs);
  });
  if (bgLayer.layers.length) {
    if (map.dim) {
      bgLayer.dim = scene.add.rectangle(0, 0, 10, 10, 0x000000, map.dim).setDepth(-4);
      objs.push(bgLayer.dim);
    }
  } else if (scene.textures.exists('bg')) {
    bgLayer.img = scene.add.image(0, 0, 'bg').setDepth(-10);
    bgLayer.dim = scene.add.rectangle(0, 0, 10, 10, 0x000000, map.dim || 0).setDepth(-9);
    objs.push(bgLayer.img, bgLayer.dim);
  } else {
    bgLayer.gfx = scene.add.graphics().setDepth(-10);
    objs.push(bgLayer.gfx);
  }
  layoutBackground(scene.scale.width, scene.scale.height);
  return objs;
}

function layoutBackground(w, h) {
  if (bgLayer.layers.length) {
    if (bgLayer.dim) bgLayer.dim.setPosition(w / 2, h / 2).setSize(w, h);
    return;                              // layers are positioned together with the camera by updateBackground
  }
  if (bgLayer.img) {
    // "cover": scale to fill the screen keeping the aspect ratio (crop the overflow)
    bgLayer.img.setPosition(w / 2, h / 2);
    bgLayer.img.setScale(Math.max(w / bgLayer.img.width, h / bgLayer.img.height));
    bgLayer.dim.setPosition(w / 2, h / 2).setSize(w, h);
  } else if (bgLayer.gfx) {
    const g = bgLayer.gfx;
    const k = w / WIDTH;
    g.clear();
    g.fillGradientStyle(0x2a3550, 0x2a3550, 0x141a29, 0x141a29, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x4a5a7a, 0.12);
    g.fillEllipse(w * 0.17, h * 0.25, 230 * k, 50 * k);
    g.fillEllipse(w * 0.81, h * 0.18, 280 * k, 60 * k);
    g.fillEllipse(w * 0.55, h * 0.38, 170 * k, 40 * k);
  }
}

// Parallax: as the camera moves/zooms, each layer moves at its own speed (farther = slower).
// nx, ny = camera position (-1..1), zn = zoom (0 = farthest, 1 = closest)
// images are scaled larger than the screen (slack) so their edges never show
function updateBackground(w, h, nx, ny, zn) {
  if (!bgLayer.layers.length) return;
  const t = gameScene.time.now / 1000;
  bgLayer.layers.forEach(({ def, imgs }) => {
    const iw = imgs[0].width, ih = imgs[0].height, p = def.parallax;
    const S = Math.max(w / iw, h / ih) * (1.10 + 0.22 * p) * (1 + 0.06 * p * zn);
    const sw = iw * S, sh = ih * S;
    const cx = w / 2 - nx * ((sw - w) / 2) * 0.95;
    const cy = h / 2 - ny * ((sh - h) / 2) * 0.95;
    const d = def.drift ? (t * def.drift * S) % sw : 0;
    imgs.forEach((im, i) => {
      const k = imgs.length === 1 ? 0 : i - 1;
      im.setScale(S).setPosition(cx + k * sw - d, cy);
    });
  });
}

// Cover the stage with art (collider unchanged, the rectangle is hidden)
function buildStageArt(scene, map) {
  const out = [];
  map.parts.forEach((d, i) => {
    const a = d.art;
    if (!a || !scene.textures.exists(a.key)) return;
    const srcH = scene.textures.get(a.key).getSourceImage().height;
    const img = scene.add.image(WIDTH / 2 + d.x, d.y - d.h / 2, a.key)
      .setOrigin(0.5, a.surfaceY / srcH).setScale(a.scale || 1).setDepth(2);
    stageParts[i].setVisible(false);
    out.push(img);
  });
  return out;
}

// ---------- Camera ----------
let worldCam, uiCam, gameScene;
let camX = WIDTH / 2, camY = 380;
let uiLabels = [];

function updateCamera(snap) {
  const w = gameScene.scale.width, h = gameScene.scale.height;
  const alive = players.filter((p) => !p.dead).map((p) => p.sprite);
  const pts = alive.length ? alive : players.map((p) => p.sprite);
  const a = pts[0], b = pts[1] || pts[0];
  const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);

  const zClose = Math.min(w / CAM_VIEW_W, h / CAM_VIEW_H);
  const zFar = zClose * CAM_ZOOM_OUT;
  const zWant = Math.min(w / (dx + CAM_PAD_X * 2), h / (dy + CAM_PAD_Y * 2));
  const z = Phaser.Math.Clamp(zWant, zFar, zClose);

  const tx = Phaser.Math.Clamp((a.x + b.x) / 2, WIDTH / 2 - CAM_LIMIT_X, WIDTH / 2 + CAM_LIMIT_X);
  const ty = Phaser.Math.Clamp((a.y + b.y) / 2, CAM_MIN_Y, CAM_MAX_Y);

  const k = snap ? 1 : CAM_LERP;
  worldCam.setZoom(worldCam.zoom + (z - worldCam.zoom) * k);
  camX += (tx - camX) * k;
  camY += (ty - camY) * k;
  worldCam.centerOn(camX, camY);

  const nx = Phaser.Math.Clamp((camX - WIDTH / 2) / CAM_LIMIT_X, -1, 1);
  const ny = Phaser.Math.Clamp((camY - (CAM_MIN_Y + CAM_MAX_Y) / 2) / ((CAM_MAX_Y - CAM_MIN_Y) / 2), -1, 1);
  const zn = Phaser.Math.Clamp((worldCam.zoom - zFar) / (zClose - zFar), 0, 1);
  updateBackground(w, h, nx, ny, zn);
}

// ---------- HUD cards (top-left / top-right) ----------
const HUD_W = 296, HUD_H = 98, HUD_M = 16, HUD_Y = 10;
function hudX(i, w) { return i === 0 ? HUD_M : w - HUD_M - HUD_W; }
function layoutHud(w) {
  [0, 1].forEach((i) => {
    const x = hudX(i, w);
    if (uiLabels[i]) uiLabels[i].setPosition(x + 24, HUD_Y + 11);
    if (uiSubs[i]) uiSubs[i].setPosition(x + 24, HUD_Y + 31);
    if (uiWpn[i]) uiWpn[i].setPosition(x + HUD_W - 16, HUD_Y + 79);
    if (damageTexts[i]) damageTexts[i].setPosition(x + HUD_W - 16, HUD_Y + 7);
  });
}

function onResize(w, h) {
  gameScene.cameras.main.setSize(w, h);
  worldCam.setSize(w, h);
  uiCam.setSize(w, h);
  layoutBackground(w, h);
  layoutHud(w);
  layoutWinUi(w, h);
  updateCamera(true);
}

const match = { over: false, winner: null };
const koEffects = [];
let winUi = [];
let uiSubs = [];
let uiWpn = [];

function layoutWinUi(w, h) {
  winUi[0].setPosition(w / 2, h / 2).setSize(w, h);
  winUi[1].setPosition(w / 2, h / 2 - 16);
  winUi[2].setPosition(w / 2, h / 2 + 52);
  // glass card behind the text
  const pw = Math.min(600, w * 0.92), ph = 184, cx = w / 2, cy = h / 2 + 8, L = cx - pw / 2, T = cy - ph / 2;
  const g = winUi[3];
  g.clear();
  for (let k = 3; k >= 1; k--) g.fillStyle(0x000000, 0.12).fillRoundedRect(L - k * 3, T + 4 + k * 3, pw + k * 6, ph + k * 3, 24 + k * 3);
  g.fillStyle(0x0b1230, 0.9).fillRoundedRect(L, T, pw, ph, 24);
  g.fillStyle(0xffffff, 0.05).fillRoundedRect(L + 1, T + 1, pw - 2, ph * 0.42, { tl: 23, tr: 23, bl: 6, br: 6 });
  g.lineStyle(2, 0x3a4a86, 1).strokeRoundedRect(L, T, pw, ph, 24);
  g.fillStyle(0xff6b5a, 1).fillRoundedRect(cx - 54, T + 20, 50, 4, 2);
  g.fillStyle(0x5ab8ff, 1).fillRoundedRect(cx + 4, T + 20, 50, 4, 2);
}

function resetPlayerState(p) {
  endDodge(p, false);
  p.jumpsLeft = MAX_JUMPS;
  p.airDashes = AIR_DASHES_BASE;
  p.recoveryUsed = false;
  if (p.ledge && p.sprite && p.sprite.body) p.sprite.body.setAllowGravity(true);
  p.ledge = null; p.ledgeLast = null; p.ledgeCooldown = 0; p.ledgeClimb = 0;
  p.gcFrames = 0; p.gcUsed = false; p.fastFalling = false; p.comboIdx = 0; p.comboWindow = 0;
  p.attack = newAttackState();
  p.cooldown = 0;
  p.dropBuffer = 0;
  p.dropThrough = null;
  p.dropTimer = 0;
  p.attackBuffer = null;
  p.damage = 0;
  p.hitstun = 0;
  p.hitFlash = 0;
  p.wasAirborne = false;
  p.movementState = 'grounded';
  p.state = 'idle';
  p.landAnimFrames = 0;
  p.dodgeCooldown = 0;
  // On KO the weapon is lost too - when you respawn you are empty-handed (like Brawlhalla)
  if (typeof setEquippedWeapon === 'function') setEquippedWeapon(p, null);
  p.weaponIndex = 0;
  p.pickupLock = 0;
}

function knockOut(p) {
  if (match.over || p.dead) return;   // if both players die on the same frame, don't count twice
  if (typeof AudioMgr !== 'undefined') AudioMgr.play('ko');
  if (p.ledge) { p.ledge = null; p.sprite.body.setAllowGravity(true); }   // died while hanging on a ledge
  if (p.useMouse) { mouseQueue.attack = null; mouseQueue.throw = false; }
  koEffects.push({
    x: Phaser.Math.Clamp(p.sprite.x, 0, WIDTH),
    y: Phaser.Math.Clamp(p.sprite.y, 0, HEIGHT),
    color: p.color, age: 0,
  });
  worldCam.shake(220, 0.012);
  p.stocks--;
  p.dead = true;
  p.respawn = RESPAWN_DELAY;
  resetPlayerState(p);
  p.sprite.setVelocity(0, 0);
  p.sprite.disableBody(true, true);   // hide + disable physics
  if (SELECTION.mode === 'tutorial') p.stocks = STOCKS;   // practice: never lose the match
  if (p.stocks <= 0) endMatch(players.find((o) => o !== p));
}

function pickSpawnX(p) {
  const other = players.find((o) => o !== p);
  let xs = SPAWN_XS.map((d) => WIDTH / 2 + d);
  if (other && !other.dead) {
    const far = xs.filter((x) => Math.abs(x - other.sprite.x) >= SPAWN_MIN_DIST);
    if (far.length) xs = far;
  }
  return rngPick(xs);
}

function respawnPlayer(p) {
  p.dead = false;
  const sx = pickSpawnX(p);
  p.sprite.enableBody(true, sx, SPAWN_Y, true, true);
  p.sprite.setVisible(false);   // hidden because enableBody tends to show it again (the art is drawn by p.skin / p.visual; otherwise it would show twice)
  if (p.useMouse) { mouseQueue.attack = null; mouseQueue.throw = false; }   // so stale held input doesn't remain while dead
  p.sprite.setVelocity(0, 0);
  p.sprite.body.setAllowGravity(false);   // hold in place on the platform
  p.facing = sx < WIDTH / 2 ? 1 : -1;
  p.spawnHold = RESPAWN_HOLD;
}

function releaseSpawn(p) {
  p.spawnHold = 0;
  p.spawnInvuln = RESPAWN_INVULN;
  p.sprite.body.setAllowGravity(true);
}

function endMatch(winner) {
  match.over = true;
  match.winner = winner;
  const idx = players.indexOf(winner);
  winUi[1].setText('P' + (idx + 1) + ' WINS!');
  winUi[1].setColor(idx === 0 ? '#ff9c8f' : '#8cc8ff');
  winUi.forEach((o) => o.setVisible(true));
  gameScene.physics.world.pause();
}

function resetMatch() {
  match.over = false;
  match.winner = null;
  hitStopFrames = 0;
  koEffects.length = 0;
  if (typeof clearWeapons === 'function') clearWeapons();
  if (typeof VfxMgr !== 'undefined') VfxMgr.clear();
  gameScene.physics.world.resume();
  winUi.forEach((o) => o.setVisible(false));
  players.forEach((p) => {
    resetPlayerState(p);
    p.stocks = STOCKS;
    p.dead = false;
    p.spawnHold = 0;
    p.spawnInvuln = 0;
    if (typeof setEquippedWeapon === 'function') setEquippedWeapon(p, null);
    p.weaponIndex = 0;
    p.sprite.enableBody(true, p.startX, p.startY, true, true);
    p.sprite.setVisible(false);
    p.sprite.setVelocity(0, 0);
    p.sprite.body.setAllowGravity(true);
  });
  mouseQueue.attack = null;
  mouseQueue.throw = false;
  updateCamera(true);
}

function updateKoEffects() {
  for (let i = koEffects.length - 1; i >= 0; i--) {
    if (++koEffects[i].age > 30) koEffects.splice(i, 1);
  }
}

function create() {
  if (typeof Music !== 'undefined') Music.stop();   // menu music ends when the match starts
  // ---------- Every time we come back/re-enter from the Menu, start from a fresh state ----------
  CURRENT_MAP = MAPS[SELECTION.map] ? SELECTION.map : 'pagoda';
  acc = 0; hitStopFrames = 0;
  match.over = false; match.winner = null;
  koEffects.length = 0;
  winUi = []; uiLabels = []; damageTexts = [];
  camX = WIDTH / 2; camY = 380;
  mouseQueue.attack = null; mouseQueue.throw = false;
  if (typeof clearWeapons === 'function') clearWeapons();
  if (typeof VfxMgr !== 'undefined') VfxMgr.clear();

  if (window.setHelpVisible) window.setHelpVisible(true);

  // ---------- Background ----------
  gameScene = this;
  if (isOnline()) {
    // take over physics stepping so it runs exactly once per simulation step, identically on both machines
    const pw = this.physics.world;
    this.events.off(Phaser.Scenes.Events.UPDATE, pw.update, pw);
    this.events.off(Phaser.Scenes.Events.POST_UPDATE, pw.postUpdate, pw);
    simRng = netMulberry32(Net.seed);
    rematchVote = [false, false]; rematchCount = 0; netMasks = [0, 0]; netStallSince = 0; netClosedAt = 0; netExiting = false; escArmedUntil = 0;
    Net.beginMatch();
  } else {
    simRng = null;
  }
  setupCharacters(this);
  if (typeof setupCharacterArt === 'function') setupCharacterArt(this);   // so hasRealSheet is set before makePlayer is called
  if (typeof setupWeapons === 'function') setupWeapons(this);
  vfxGfx = this.add.graphics().setDepth(15);
  const bgObjs = buildBackground(this);

  // ---------- Stage (built from the parts in MAPS) ----------
  const map = MAPS[CURRENT_MAP];
  // oneWay: false = solid (S does nothing). true = jump-through + drop-through with S.
  stageParts = map.parts.map((d) => {
    const part = this.add.rectangle(WIDTH / 2 + d.x, d.y, d.w, d.h, d.color);
    this.physics.add.existing(part, true);
    part.body.checkCollision.down = !d.oneWay;
    part.body.checkCollision.left = !d.oneWay;
    part.body.checkCollision.right = !d.oneWay;
    part.oneWay = !!d.oneWay;
    return part;
  });

  const stageArt = buildStageArt(this, map);

  // F = fullscreen, B = toggle hitbox, M = back to menu after the match, R = replay after the match (uses native key events)
  bindDomKeys(this, {
    KeyF: () => this.scale.toggleFullscreen(),
    KeyB: () => { SHOW_HITBOX = !SHOW_HITBOX; },
    KeyR: () => { if (match.over) { if (isOnline()) Net.wantRematch = true; else resetMatch(); } },
    Escape: () => {
      if (SELECTION.mode === 'bot' || SELECTION.mode === 'tutorial') this.scene.start('Lobby');
      else if (isOnline()) {
        if (Net.state === 'closed' || Date.now() < escArmedUntil) leaveOnline(this); else escArmedUntil = Date.now() + 2000;   // press twice so it is not accidental
      }
    },   // Only in Bot (offline) mode ESC returns to the Lobby (not mid-match in online/friends)
    KeyM: () => { if (match.over) { if (isOnline()) repickOnline(this); else this.scene.start('Menu'); } },   // online: both players go back to hero + stage select
    KeyL: () => { if (match.over) { if (isOnline()) leaveOnline(this); else this.scene.start('Lobby'); } },   // back to the Lobby (only after the match)
  });

  // ---------- Mouse ----------
  this.input.mouse.disableContextMenu();
  this.input.on('pointerdown', (pointer) => {
    const b = (pointer.button !== undefined) ? pointer.button : (pointer.event ? pointer.event.button : 0);
    if (b === 0) {
      mouseQueue.attack = 'light';
    } else if (b === 2) {
      mouseQueue.attack = 'heavy';
    } else if (b === 1) {
      if (pointer.event && pointer.event.preventDefault) pointer.event.preventDefault();
      mouseQueue.throw = true;
    }
  });

  // ---------- Players ----------
  // Keys come from controls.js (rebindable in Settings; keyboard keys and mouse buttons)
  Controls.clearMouse();
  const p1Keys = Controls.makeKeys(this, 'p1');
  const p2Keys = Controls.makeKeys(this, 'p2');

  const online = isOnline();
  const li = online ? Net.localIdx : 0;      // online: which player is on THIS computer (host = P1, guest = P2)
  players = [
    makePlayer(this, WIDTH / 2 - 120, 300, CHARACTERS[SELECTION.p1] || CHARACTERS.dante, (!online || li === 0) ? p1Keys : null, !online || li === 0),
    makePlayer(this, WIDTH / 2 + 120, 300, CHARACTERS[SELECTION.p2] || CHARACTERS.sekiro, online ? (li === 1 ? p1Keys : null) : ((LOCAL_TEST && SELECTION.mode !== 'bot' && SELECTION.mode !== 'tutorial') ? p2Keys : null), online && li === 1),
  ];
  // Bot mode: P2 is controlled by the Bot AI (bot.js)
  players[1].isBot = SELECTION.mode === 'bot' || SELECTION.mode === 'tutorial';   // tutorial: P2 is a training dummy (bot.js returns no input)
  players[1].bot = null;

  // ---------- Collisions ----------
  players.forEach((p) => {
    stageParts.forEach((part) => {
      this.physics.add.collider(p.sprite, part, null, (sprite, platform) => {
        if (!platform.oneWay) return true;
        // Drop-through: ignore this platform until the player falls below its top.
        if (p.dropThrough === platform) {
          if (sprite.body.top > platform.body.top) p.dropThrough = null;
          else return false;
        }
        const b = sprite.body;
        if (b.velocity.y < 0) return false;   // allow passing through while moving upward
        // Check "was the player above the platform on the previous step". Previously only the current feet position was checked, so
        // falling fast (> ~720 px/s) could go more than 12px in one step and fall through the platform.
        const wasAbove = b.prev.y + b.height <= platform.body.top + 6;
        const justBelowTop = b.bottom <= platform.body.top + 12;   // if slightly sunk in, still allow standing on top
        return wasAbove || justBelowTop;
      }, this);
    });
  });

  // ---------- HUD + overlay ----------
  if (typeof Tutorial !== 'undefined') Tutorial.stop();
  hud = this.add.graphics();
  overlay = this.add.graphics().setDepth(10);
  const sw = this.scale.width;
  // To tell P1/P2 apart: index + marker color; tint P2 when heroes are the same
  players.forEach((p, i) => { p.index = i; p.markColor = PLAYER_COLORS[i]; p.markerText.setText('P' + (i + 1) + ((online && i === li) ? ' (YOU)' : '')).setColor(i ? '#9cc8ff' : '#ff9c9c'); });
  players[1].tint = players[0].char.id === players[1].char.id ? SAME_HERO_TINT[1] : 0xffffff;
  const HF = (typeof UI !== 'undefined') ? UI.font : 'Arial, sans-serif';
  uiLabels = [
    this.add.text(0, 0, 'P1 ' + players[0].char.name.toUpperCase(), { fontFamily: HF, fontSize: '15px', fontStyle: 'bold', color: '#ffb3a8' }),
    this.add.text(0, 0, 'P2 ' + players[1].char.name.toUpperCase(), { fontFamily: HF, fontSize: '15px', fontStyle: 'bold', color: '#a9d4ff' }),
  ];
  uiSubs = [
    this.add.text(0, 0, '', { fontFamily: HF, fontSize: '11px', color: '#8fa3d6' }),
    this.add.text(0, 0, '', { fontFamily: HF, fontSize: '11px', color: '#8fa3d6' }),
  ];
  uiWpn = [
    this.add.text(0, 0, '', { fontFamily: HF, fontSize: '11px', fontStyle: 'bold', color: '#c9d6ff' }).setOrigin(1, 0.5),
    this.add.text(0, 0, '', { fontFamily: HF, fontSize: '11px', fontStyle: 'bold', color: '#c9d6ff' }).setOrigin(1, 0.5),
  ];

  // Damage % text (big number on the right of each card)
  damageTexts = [
    this.add.text(0, 0, '0%', { fontFamily: HF, fontSize: '34px', fontStyle: 'bold', color: '#ffffff', stroke: '#050818', strokeThickness: 5 }).setOrigin(1, 0),
    this.add.text(0, 0, '0%', { fontFamily: HF, fontSize: '34px', fontStyle: 'bold', color: '#ffffff', stroke: '#050818', strokeThickness: 5 }).setOrigin(1, 0),
  ];
  layoutHud(sw);

  // ---------- Cameras ----------
  //  main   = background (no zoom, fills the screen)
  //  worldCam = stage + characters (zooms to follow the characters)
  //  uiCam  = HUD (no zoom, pinned to screen corners)
  const w = this.scale.width, h = this.scale.height;
  worldCam = this.cameras.add(0, 0, w, h);
  uiCam = this.cameras.add(0, 0, w, h);
  const ghostObjs = (typeof FxGhosts !== 'undefined') ? FxGhosts.init(this, 5) : [];
  const worldObjs = [...ghostObjs, ...stageParts, ...stageArt, ...players.flatMap((p) => [p.sprite, p.skin, p.visual, p.weaponVisual, p.marker, p.markerText].filter(Boolean)), overlay, vfxGfx];
  winUi = [
    this.add.rectangle(0, 0, 10, 10, 0x000000, 0.55).setDepth(20),
    this.add.text(0, 0, '', { fontFamily: HF, fontSize: '74px', fontStyle: 'bold', color: '#ffffff', stroke: '#050818', strokeThickness: 8 }).setOrigin(0.5).setDepth(21).setShadow(0, 5, '#000000', 10, true, true),
    this.add.text(0, 0, online ? 'R  Rematch        M  Re-pick hero        L  Leave' : 'R  Rematch        M  Re-pick hero        L  Lobby', { fontFamily: HF, fontSize: '18px', fontStyle: '600', color: '#a9bbe8' }).setOrigin(0.5).setDepth(21),
    this.add.graphics().setDepth(20.5),
  ];
  netMsgText = this.add.text(0, 0, '', { fontFamily: HF, fontSize: '28px', fontStyle: 'bold', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5).setDepth(30).setVisible(false);
  netPingText = this.add.text(0, 0, '', { fontFamily: HF, fontSize: '11px', color: '#a9bbe8', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(30).setVisible(online);
  winUi.forEach((o) => o.setVisible(false));
  layoutWinUi(w, h);
  const uiObjs = [hud, ...uiLabels, ...uiSubs, ...uiWpn, ...damageTexts, ...winUi, netMsgText, netPingText];
  this.cameras.main.ignore([...worldObjs, ...uiObjs]);
  worldCam.ignore([...bgObjs, ...uiObjs]);
  uiCam.ignore([...bgObjs, ...worldObjs]);
  updateCamera(true);
  if (SELECTION.mode === 'tutorial' && typeof Tutorial !== 'undefined') {
    Tutorial.start(this);
    this.events.once('shutdown', () => Tutorial.stop());
  }
  if (window.refreshHelp) window.refreshHelp();
  const resizeHandler = (gs) => onResize(gs.width, gs.height);
  this.scale.on('resize', resizeHandler);
  this.events.once('shutdown', () => this.scale.off('resize', resizeHandler));
}

function makePlayer(scene, x, y, char, keys, useMouse) {
  const sprite = scene.physics.add.sprite(x, y, char.sheetKey);
  // The invisible Arcade sprite owns physics; procedural graphics provide visible art.
  sprite.setVisible(false);
  sprite.setMaxVelocity(MAX_VELOCITY, MAX_VELOCITY);
  sprite.setSize(char.bodyW || 40, char.bodyH || 60);
  const fw = char.frameWidth || CHAR_FRAME_W;
  const fh = char.frameHeight || CHAR_FRAME_H;
  sprite.setOffset((fw - (char.bodyW || 40)) / 2, fh - (char.bodyH || 60));

  const stats = char.stats || {};
  if (stats.gravityBonus) sprite.body.setGravityY(stats.gravityBonus);
  const visual = scene.add.graphics().setDepth(6);
  // If a real art sheet loaded, use the skin sprite (the physics sprite is invisible and only provides the body).
  // origin = bottom of the feet, so squash/stretch keeps the feet planted on the ground
  const skin = char.hasRealSheet
    ? scene.add.sprite(x, y, char.sheetKey, 0).setOrigin(0.5, 1).setDepth(6)
    : null;
  const weaponVisual = scene.textures.exists('weapon_sheet_sword') && scene.textures.exists('weapon_sheet_gun')
    ? scene.add.sprite(x, y, 'weapon_sheet_sword', 7).setDepth(7).setVisible(false)
    : null;
  const marker = scene.add.graphics().setDepth(9);
  const markerText = scene.add.text(0, 0, '', { fontSize: '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(10);
  return {
    sprite, skin, visual, weaponVisual, marker, markerText, tint: 0xffffff, keys, char, color: char.color, useMouse,
    dropUntil: 0, dropBuffer: 0, dropThrough: null, dropTimer: 0, downHeld: false, facing: 1,
    attackBuffer: null, animKey: 'idle',
    jumpsLeft: MAX_JUMPS,
    airDashes: AIR_DASHES_BASE,
    recoveryUsed: false,       // heavy-up boost (moves.js airOnce) already used in this airtime
    ledge: null,               // { part, side, frames } while hanging on a stage edge (ledge.js)
    ledgeLast: null, ledgeCooldown: 0, ledgeClimb: 0,
    gcFrames: 0, gcUsed: false,   // gravity cancel after an air hit
    fastFalling: false,
    comboIdx: 0, comboWindow: 0,   // light attack 3-hit combo
    attack: newAttackState(),
    cooldown: 0,
    hitFlash: 0,
    dodge: newDodgeState(),
    dodgeCooldown: 0,
    dodgeCooldownMax: DODGE_ROLL.cooldown,
    damage: 0,   // % (higher = flies farther)
    hitstun: 0,  // remaining stun frames (>0 means no control)
    stocks: STOCKS,
    dead: false, respawn: 0, spawnHold: 0, spawnInvuln: 0,
    startX: x, startY: y,
    // Weapon mechanics & The Swap Rule tracking
    weaponId: null,
    equippedWeapon: null,
    weaponIndex: 0,
    state: 'idle',
    movementState: 'grounded',
    landAnimFrames: 0,
    weaponPool: [...(char.weaponPool || ['sword', 'gun'])],
    // Movement feel stats per character
    moveSpeed: stats.moveSpeed || MOVE_SPEED,
    jumpSpeed: stats.jumpSpeed || JUMP_SPEED,
    airControl: stats.airControl || 1,
    weight: stats.weight || 1.0,
  };
}

// ---------- Dodge helpers ----------
function newDodgeState() {
  return { active: false, frame: 0, dir: 0, air: false, kind: 'roll', duration: 0, invuln: 0, speed: 0 };
}

// true while the player can't be hit
function isInvulnerable(p) {
  return p.spawnHold > 0 || p.spawnInvuln > 0 || (p.dodge.active && p.dodge.frame <= p.dodge.invuln) ||
    (p.ledge && p.ledge.frames < LEDGE.INVULN);
}

function canDodge(p, stunned, onFloor) {
  const airOk = onFloor || p.airDashes > 0;
  return !stunned && !p.dodge.active && p.dodgeCooldown <= 0 && p.attack.state === 'none' && airOk;
}

function startDodge(p, input, onFloor) {
  const dir = input.left ? -1 : input.right ? 1 : 0; // 0 = spot dodge
  const spec = dir === 0 ? DODGE_SPOT : DODGE_ROLL;
  p.dodge = {
    active: true, frame: 0, dir, air: !onFloor,
    kind: dir === 0 ? 'spot' : 'roll',
    duration: spec.duration, invuln: spec.invuln, speed: spec.speed,
  };
  if (!onFloor) p.airDashes = Math.max(0, p.airDashes - 1);
  if (dir !== 0) p.facing = dir;
  if (typeof AudioMgr !== 'undefined') AudioMgr.play('dodge');
  p.sprite.body.setAllowGravity(false);
  p.sprite.setVelocityY(0);
}

function updateDodge(p) {
  const d = p.dodge;
  d.frame++;
  if (p.char && p.char.id === 'dante' && d.dir !== 0 && d.frame % 3 === 0 && typeof VfxMgr !== 'undefined') {
    VfxMgr.danteDashTrail(p.sprite.x - d.dir * 12, p.sprite.body.center.y, p.color);
  }
  if (d.frame >= d.duration) {
    endDodge(p, true);
    return;
  }
  const t = d.frame / d.duration;
  const fade = 1 - t * t;
  p.sprite.setVelocityX(d.dir * d.speed * fade);
  p.sprite.setVelocityY(0);
}

function endDodge(p, withCooldown) {
  const wasActive = p.dodge.active;
  const kind = p.dodge.kind;
  if (wasActive) {
    p.sprite.body.setAllowGravity(true);
    p.sprite.setVelocityX(p.sprite.body.velocity.x * 0.3);
  }
  p.dodge = newDodgeState();
  if (withCooldown && wasActive) {
    const spec = kind === 'spot' ? DODGE_SPOT : DODGE_ROLL;
    p.dodgeCooldownMax = spec.cooldown;
    p.dodgeCooldown = spec.cooldown;
  }
}

function newAttackState() {
  return { state: 'none', type: 'light_n', frame: 0, hitList: [], back: false, stage: 0, refunded: false, boosting: false, diving: false, combo: 0 };
}

function readInput(p) {
  if (isOnline()) return netDecodeInput(netMasks[p.index] | 0);   // both machines feed the same masks
  if (p.isBot && typeof botInput === 'function') return botInput(p);
  return readKeys(p);
}

// Raw keyboard/mouse state of a locally controlled player
function readKeys(p) {
  if (!p.keys) {
    const copy = { ...remoteInput };
    remoteInput.jump = false;
    remoteInput.down = false;
    remoteInput.attack = null;
    remoteInput.throwWeapon = false;
    remoteInput.dodge = false;
    return copy;
  }
  const held = (list) => list && list.some((k) => k.isDown);
  // true if any key / mouse button of the list was pressed this frame (returns that key so we can tell mouse from keyboard)
  const tapAny = (list) => {
    let hit = null;
    (list || []).forEach((k) => { if (Controls.tapped(k) && !hit) hit = k; });
    return hit;
  };
  const tapped = (list) => !!tapAny(list);

  let attack = null;
  let mousePickup = false;
  const lightHit = tapAny(p.keys.light);
  if (lightHit) {
    // empty-handed and standing next to a weapon: a MOUSE light-attack click picks it up instead of attacking
    if (lightHit.mouse && typeof canPickupNearby === 'function' && canPickupNearby(p)) mousePickup = true;
    else attack = 'light';
  }
  if (tapped(p.keys.heavy)) attack = 'heavy';
  const throwWeapon = tapped(p.keys.throw) || mousePickup;

  return {
    left: held(p.keys.left),
    right: held(p.keys.right),
    up: held(p.keys.up),
    down: tapped(p.keys.down),
    downHeld: held(p.keys.down),
    jump: tapped(p.keys.jump),
    attack,
    throwWeapon,
    dodge: tapped(p.keys.dodge),
  };
}

function getStandingPlatform(p) {
  const b = p.sprite.body;
  for (let i = 0; i < stageParts.length; i++) {
    const plat = stageParts[i];
    const pb = plat.body;
    const overlapX = b.right > pb.left + 2 && b.left < pb.right - 2;
    const onTop = b.bottom <= pb.top + 14 && b.bottom >= pb.top - 4;
    if (overlapX && onTop) return plat;
  }
  return null;
}

// ---------- Online helpers ----------
// One physics step per simulation step (instead of Phaser's own clock), then copy body positions to the sprites.
function stepPhysicsOnce() {
  const w = gameScene.physics.world;
  w.isPaused = false;
  if (typeof w._elapsed === 'number') w._elapsed = 0;
  w.update(0, (w._frameTimeMS || STEP_MS) * (w.timeScale || 1));
  w.postUpdate();
}

function sampleLocalMask() {
  const m = netEncodeInput(readKeys(players[Net.localIdx]), Net.wantRematch && match.over);
  Net.wantRematch = false;
  return m;
}

// both players pressed R -> restart the match on the same frame on both machines
function onlineRematchTick() {
  for (let i = 0; i < 2; i++) if (netMasks[i] & NET_BIT.rematch) rematchVote[i] = true;
  if (rematchVote[0] && rematchVote[1]) {
    rematchVote = [false, false];
    rematchCount++;
    simRng = netMulberry32((Net.seed + rematchCount * 7919) >>> 0);
    resetMatch();
  }
}

// fingerprint of the gameplay state; compared between the two machines every 30 frames to catch desyncs
function stateHash() {
  let h = 2166136261 >>> 0;
  const mix = (v) => { h = Math.imul(h ^ (Math.round((+v || 0) * 8) | 0), 16777619) >>> 0; };
  players.forEach((p) => {
    const b = p.sprite.body;
    mix(b.x); mix(b.y); mix(b.velocity.x); mix(b.velocity.y);
    mix(p.damage); mix(p.stocks); mix(p.hitstun); mix(p.attack.frame); mix(p.jumpsLeft); mix(p.dead ? 1 : 0);
  });
  mix(hitStopFrames);
  if (typeof WeaponSystem !== 'undefined') { mix(WeaponSystem.pickups.length); mix(WeaponSystem.thrown.length); mix(WeaponSystem.shots.length); }
  return h;
}

function leaveOnline(scene) {
  if (netExiting) return;
  netExiting = true;
  Net.reset();                        // tells the opponent we left; their game returns to the lobby by itself
  scene.scene.start('Lobby');
}

// go back to hero + stage select with the same opponent (the other side follows when the 'repick' message arrives)
function repickOnline(scene) {
  if (netExiting || Net.state !== 'connected') return;
  netExiting = true;
  Net.requestRepick();
  scene.scene.start('Online', { resume: true });
}

function updateNetText() {
  if (!netMsgText || !netPingText) return;
  const sw = gameScene.scale.width, sh = gameScene.scale.height;
  netPingText.setPosition(sw / 2, 6).setText(Net.state === 'connected' ? 'ONLINE  ping ' + (Net.rtt ? Math.round(Net.rtt) : '…') + ' ms  ·  input delay ' + (Net.lock ? Net.lock.delay : '?') + ' f' + (Net.route ? '  ·  ' + Net.route : '') + (Net.route === 'RELAY' && Net.routeInfo ? '\n[' + Net.routeInfo + (Net.noStun ? '  -> your network blocks STUN/NAT' : '') + ']' : '') : '');
  let msg = '', color = '#ffffff';
  if (Net.state === 'closed') { msg = (Net.error || 'Opponent disconnected.') + '\n\nReturning to the lobby…  (ESC = now)'; color = '#ff9c9c'; }
  else if (Net.lock && Net.lock.desync) { msg = 'GAME OUT OF SYNC\n(the two games no longer match — press ESC twice and rejoin)'; color = '#ff9c9c'; }
  else if (match.over && rematchVote[Net.localIdx] && !rematchVote[1 - Net.localIdx]) msg = 'Waiting for opponent to accept rematch…';
  else if (match.over && rematchVote[1 - Net.localIdx]) { msg = 'Opponent wants a rematch — press R'; color = '#ffe27a'; }
  else if (netStallSince && Date.now() - netStallSince > 400) { msg = 'Waiting for opponent…'; color = '#ffe27a'; }
  else if (Date.now() < escArmedUntil) { msg = 'Press ESC again to leave the match'; color = '#ffe27a'; }
  netMsgText.setText(msg).setColor(color).setPosition(sw / 2, sh * (match.over ? 0.72 : 0.4)).setVisible(!!msg);
}

function update(time, delta) {
  acc += Math.min(delta, 100);
  if (isOnline()) {
    if (netExiting) return;
    if (Net.repickFlag) {                                   // the opponent went back to hero select: follow them
      netExiting = true; Net.endMatch(); this.scene.start('Online', { resume: true }); return;
    }
    if (Net.state === 'closed') {                           // opponent left / connection lost: show why, then go to the lobby
      if (!netClosedAt) netClosedAt = Date.now();
      else if (Date.now() - netClosedAt > 2500) { leaveOnline(this); return; }
    }
    acc = Math.min(acc, STEP_MS * 6);
    while (acc >= STEP_MS) {
      if (Net.state === 'closed' || !Net.lock) break;
      const masks = Net.lock.advance(sampleLocalMask);
      if (!masks) { if (!netStallSince) netStallSince = Date.now(); break; }   // opponent's input not here yet: wait
      netStallSince = 0;
      netMasks = masks;
      simulate(time, STEP_S);
      if (Net.lock.frame % 30 === 0) Net.lock.reportHash(stateHash());
      acc -= STEP_MS;
    }
    if (Net.state === 'closed' || !Net.lock) acc = 0;
    updateNetText();
  } else {
    while (acc >= STEP_MS) {
      simulate(time, STEP_S);
      acc -= STEP_MS;
    }
  }
  // Hit stop / end of match: also pause physics. If only simulate stopped, characters would keep flying and the freeze effect wouldn't show
  const freeze = hitStopFrames > 0 || match.over;
  if (gameScene.physics.world.isPaused !== freeze) {
    if (freeze) gameScene.physics.world.pause(); else gameScene.physics.world.resume();
  }
  updateCamera(false);
  players.forEach((p) => {
    drawPlayerMarker(p);
    // If a per-weapon sheet (charart.js) exists it draws itself; otherwise use the original method (characters.js)
    if (typeof renderCharacterArt === 'function' && renderCharacterArt(p)) return;
    syncCharacterAnim(p);
    if (typeof renderProceduralPlayer === 'function') renderProceduralPlayer(p);
  });
  if (vfxGfx && typeof VfxMgr !== 'undefined') {
    vfxGfx.clear();
    VfxMgr.draw(vfxGfx);
  }
  if (typeof FxGhosts !== 'undefined') FxGhosts.tick();
  drawHud();
  drawOverlay();
}

function simulate(time, dt) {
  if (isOnline() && match.over) { onlineRematchTick(); return; }
  // Freeze all gameplay state briefly on a heavy sword hit, while rendering continues.
  if (hitStopFrames > 0) {
    hitStopFrames--;
    return;
  }
  if (match.over) return;
  if (isOnline()) stepPhysicsOnce();
  updateKoEffects();
  if (typeof tickWeapons === 'function') tickWeapons(gameScene);
  if (typeof Tutorial !== 'undefined' && Tutorial.active) Tutorial.tick();
  if (typeof VfxMgr !== 'undefined') VfxMgr.tick();

  players.forEach((p) => {
    if (p.dead) {
      if (--p.respawn <= 0) respawnPlayer(p);
      return;
    }
    if (p.spawnInvuln > 0 && p.spawnHold <= 0) p.spawnInvuln--;
    const body = p.sprite.body;
    // gravity is paused during a ground dash, so count that as "on the floor" too
    const onFloor = body.blocked.down || body.touching.down || (p.dodge.active && !p.dodge.air);
    const input = readInput(p);
    // facing before this frame's movement (to split diagonal forward/back)
    const facingBefore = p.facing;

    // ---- After respawn, while standing on the platform: any input drops you ----
    if (p.spawnHold > 0) {
      const any = input.left || input.right || input.jump || input.attack || input.throwWeapon || input.dodge || input.down;
      p.spawnHold--;
      if (any || p.spawnHold <= 0) {
        releaseSpawn(p);
      } else {
        p.sprite.setVelocity(0, 0);
        return;
      }
    }
    const stunned = p.hitstun > 0;

    // ---- Touching the ground refills jumps and air dash ----
    if (onFloor && body.velocity.y >= 0) {
      p.jumpsLeft = MAX_JUMPS;
      p.airDashes = AIR_DASHES_BASE;
      p.recoveryUsed = false;
      p.gcUsed = false;
      p.ledgeLast = null;
    }
    if (p.ledgeCooldown > 0) p.ledgeCooldown--;
    if (p.ledgeClimb > 0) p.ledgeClimb--;

    // ---- Hanging on a ledge: only ledge actions are possible ----
    if (p.ledge) {
      if (updateLedge(p, input)) return;
    }

    // ---- Hitstun: can't jump/attack/move while stunned ----
    if (stunned) {
      input.jump = false;
      input.attack = null;
      input.throwWeapon = false;
      p.attackBuffer = null;
      p.hitstun--;
    }

    // ---- Dodge (finish current dodge first so a directional dodge can act/chain the same frame it ends) ----
    if (p.dodge.active) updateDodge(p);
    else if (p.dodgeCooldown > 0) p.dodgeCooldown--;
    if (input.dodge && canDodge(p, stunned, onFloor)) startDodge(p, input, onFloor);
    const dodging = p.dodge.active;
    if (dodging) {
      input.jump = false;
      input.attack = null;
      input.throwWeapon = false;
      input.down = false;
      input.downHeld = false;
    }

    // ---- Weapon Throw / Pickup (Middle Mouse / Key E / Q / Throw Key) ----
    if (input.throwWeapon && !stunned && !dodging) {
      if (p.weaponId) {
        if (typeof throwWeapon === 'function') throwWeapon(p, input);
      } else {
        // Pressing E or Middle Click while empty-handed also picks up a nearby weapon
        if (typeof tryPickupWeapons === 'function') tryPickupWeapons(p);
      }
    }

    const attacking = p.attack.state !== 'none';
    const atk = AttackRouter.getAttackData(p, p.attack.type);

    // ---- Move left/right (moveSpeed per character stat) ----
    const baseSpeed = p.moveSpeed || MOVE_SPEED;
    if (stunned) {
      // keep knockback velocity; only slow down with ground friction when on the ground
      if (onFloor) p.sprite.setVelocityX(body.velocity.x * 0.92);
    } else if (dodging) {
      // velocity is controlled by updateDodge
    } else {
      const speed = baseSpeed * (onFloor ? 1 : p.airControl) * (attacking ? (atk ? atk.moveMult : 0.3) : 1);
      if (input.left) {
        p.sprite.setVelocityX(-speed);
        if (!attacking) p.facing = -1;
      } else if (input.right) {
        p.sprite.setVelocityX(speed);
        if (!attacking) p.facing = 1;
      } else {
        p.sprite.setVelocityX(body.velocity.x * 0.8);
        if (Math.abs(body.velocity.x) < 10) p.sprite.setVelocityX(0);
      }
    }

    // ---- Lunge (moves.js `lunge`): dash strikes / shoulder charges move the fighter forward while the hit is active ----
    if (attacking && !stunned && !dodging && atk && atk.lunge && p.attack.state === 'active') {
      p.sprite.setVelocityX(p.facing * (p.attack.back ? -1 : 1) * atk.lunge);
    }

    // ---- Fast fall: hold DOWN while falling ----
    p.fastFalling = false;
    if (!onFloor && !stunned && !dodging && p.attack.state === 'none' && input.downHeld && body.velocity.y > 0 && p.gcFrames <= 0) {
      p.sprite.setVelocityY(Math.max(body.velocity.y, FAST_FALL_SPEED));
      p.fastFalling = true;
    }

    // ---- Gravity cancel: after an air hit the fall is frozen for a moment, so you can follow up ----
    if (p.gcFrames > 0) {
      p.gcFrames--;
      if (!onFloor && !stunned && !dodging && !p.attack.diving) p.sprite.setVelocityY(Math.min(body.velocity.y, 0));
    }

    // ---- Dropping through a platform (one-way only; solid platforms ignore S) ----
    p.downHeld = input.downHeld;
    if (input.down) p.dropBuffer = DROP_BUFFER;
    const standPlat = getStandingPlatform(p);
    if (p.dropTimer > 0 && --p.dropTimer === 0) p.dropThrough = null;   // dropped through; don't leave a stale "can't drop again" state
    // holding S while attacking / with an attack buffered doesn't drop (so down-attacks work on platforms)
    if (onFloor && !stunned && !dodging && !input.attack && !p.attackBuffer && p.attack.state === 'none' &&
        standPlat && standPlat.oneWay && (p.dropBuffer > 0 || input.downHeld)) {
      p.dropThrough = standPlat;
      p.dropTimer = DROP_FRAMES;
      p.dropBuffer = 0;
      p.sprite.setVelocityY(DROP_SPEED);
    } else if (p.dropBuffer > 0) {
      p.dropBuffer--;
    }

    // ---- Jump (jumpSpeed per character stat) ----
    let justJumped = false;
    if (input.jump && p.jumpsLeft > 0) {
      p.sprite.setVelocityY(-(p.jumpSpeed || JUMP_SPEED));
      p.jumpsLeft--;
      p.state = 'jumping';
      if (typeof AudioMgr !== 'undefined') AudioMgr.movementTransition(p, 'jumping');
      p.wasAirborne = true;
      justJumped = true;
    }

    if (p.landAnimFrames > 0) p.landAnimFrames--;
    if (!justJumped && onFloor && body.velocity.y >= 0) {
      const cameFromAir = p.movementState === 'jumping' || p.movementState === 'falling';
      p.state = 'grounded';
      if (cameFromAir) {
        p.landAnimFrames = 6;
        if (typeof AudioMgr !== 'undefined') AudioMgr.movementTransition(p, 'grounded');
      } else {
        p.movementState = 'grounded';
      }
      p.wasAirborne = false;
    } else if (!onFloor) {
      p.movementState = body.velocity.y < -40 ? 'jumping' : 'falling';
      if (p.attack.state === 'none' && !p.dodge.active) p.state = p.movementState;
      p.wasAirborne = true;
    }

    // ---- Ledge grab: falling next to the edge of the main stage ----
    if (!onFloor && !p.ledge && !stunned && !dodging && p.attack.state === 'none' && p.ledgeCooldown <= 0 && !input.downHeld) {
      tryLedgeGrab(p);
      if (p.ledge) return;
    }

    // ---- Attacking ----
    updateAttack(p, input, onFloor, facingBefore);

    // ---- Hit flash (white flash / fade) is handled by characters.js where the art is drawn.
    //      Previously it only affected the invisible physics sprite, so nothing showed) ----
    if (p.hitFlash > 0) p.hitFlash--;

    // ---- Blast zone: flying outside the world = KO (lose one stock) ----
    if (p.sprite.y > HEIGHT + 150 || p.sprite.y < -300 ||
        p.sprite.x < -300 || p.sprite.x > WIDTH + 300) {
      knockOut(p);
    }
  });
}

// ---------- Ledge (see ledge.js for the maths) ----------
function ledgeParts() {
  return stageParts.map((s, i) => ({ id: i, left: s.body.left, right: s.body.right, top: s.body.top, oneWay: !!s.oneWay, obj: s }));
}

function moveBodyCenterTo(p, x, y) {
  const b = p.sprite.body;
  p.sprite.body.reset(p.sprite.x + (x - b.center.x), p.sprite.y + (y - b.center.y));
}

function tryLedgeGrab(p) {
  const b = p.sprite.body;
  const taken = [];
  players.forEach((o) => { if (o !== p && o.ledge) taken.push({ id: o.ledge.part.id, side: o.ledge.side }); });
  const blocked = p.ledgeLast && p.ledgeCooldown > 0 ? p.ledgeLast : null;
  const hit = findLedge(ledgeParts(), { cx: b.center.x, top: b.top, vy: b.velocity.y }, taken, blocked);
  if (!hit) return;
  p.ledge = { part: hit.part, side: hit.side, frames: 0 };
  const c = ledgeHangCenter(hit.part, hit.side, b.width, b.height);
  moveBodyCenterTo(p, c.x, c.y);
  b.setAllowGravity(false);
  p.sprite.setVelocity(0, 0);
  p.facing = -hit.side;
  p.state = 'ledge';
  p.attackBuffer = null;
  // grabbing a ledge counts like touching the ground: everything refreshes
  p.jumpsLeft = MAX_JUMPS;
  p.airDashes = AIR_DASHES_BASE;
  p.recoveryUsed = false;
  p.gcUsed = false;
  p.gcFrames = 0;
  if (typeof AudioMgr !== 'undefined') AudioMgr.play('pickup');
  if (typeof VFX !== 'undefined') VFX.push({ type: 'ring', x: b.center.x + hit.side * 14, y: hit.part.top, r0: 6, r1: 40, life: 12, width: 3, color: p.color, age: 0 });
}

function releaseLedge(p, drop) {
  const L = p.ledge;
  if (!L) return;
  p.ledgeLast = { id: L.part.id, side: L.side };
  p.ledgeCooldown = LEDGE.REGRAB;
  p.ledge = null;
  p.sprite.body.setAllowGravity(true);
  if (drop) p.sprite.setVelocity(-L.side * 40, 140);
}

function ledgeGetUp(p, how, atkInput) {
  const L = p.ledge;
  const b = p.sprite.body;
  const inward = -L.side;
  const c = ledgeGetUpCenter(L.part, L.side, b.width, b.height);
  releaseLedge(p, false);
  moveBodyCenterTo(p, c.x, c.y);
  p.facing = inward;
  p.ledgeClimb = 10;
  if (how === 'jump') {                                   // get up with a full jump
    p.sprite.setVelocity(inward * 90, -(p.jumpSpeed || JUMP_SPEED));
    p.jumpsLeft = Math.max(0, MAX_JUMPS - 1);
    p.state = 'jumping';
  } else if (how === 'attack') {                          // get-up attack: a side attack toward the stage as soon as you stand
    p.sprite.setVelocity(0, 0);
    p.cooldown = 0;
    p.attackBuffer = { attack: atkInput, left: inward < 0, right: inward > 0, up: false, downHeld: false, t: 8 };
  } else if (how === 'dodge') {                           // get-up roll (invulnerable)
    p.sprite.setVelocity(0, 0);
    p.dodgeCooldown = 0;
    startDodge(p, { left: inward < 0, right: inward > 0 }, true);
  } else {                                                // plain climb
    p.sprite.setVelocity(inward * 60, -80);
    p.spawnInvuln = Math.max(p.spawnInvuln, 16);
  }
}

// returns true while the fighter is still hanging (the normal update is skipped), false if they let go / climbed this frame
function updateLedge(p, input) {
  const L = p.ledge;
  L.frames++;
  p.facing = -L.side;
  p.sprite.setVelocity(0, 0);
  p.state = 'ledge';
  p.attackBuffer = null;
  if (L.frames <= LEDGE.GRACE) return true;
  const inward = -L.side;
  const toward = inward > 0 ? input.right : input.left;
  const away = inward > 0 ? input.left : input.right;
  if (input.jump) { input.jump = false; ledgeGetUp(p, 'jump'); return false; }
  if (input.attack) { const a = input.attack; input.attack = null; ledgeGetUp(p, 'attack', a); return false; }
  if (input.dodge) { input.dodge = false; ledgeGetUp(p, 'dodge'); return false; }
  if (input.down || input.downHeld || away) { releaseLedge(p, true); return false; }
  if (toward && L.frames > LEDGE.GRACE + 6) { ledgeGetUp(p, 'climb'); return false; }
  if (L.frames >= LEDGE.MAX_FRAMES) { releaseLedge(p, true); return false; }
  return true;
}

// Attack state machine: none -> startup -> active -> recovery -> none
// Motion that belongs to an attack: heavy-up boost (the fighter rises), dive (driven downward), see moves.js
function applyAttackMotion(p, a, atk) {
  const body = p.sprite.body;
  if (a.boosting) {
    const k = Math.max(0.35, 1 - a.frame / (atk.active * 1.5));
    p.sprite.setVelocityY(Math.min(body.velocity.y, -atk.boost * k));
    // a diagonal (W+A / W+D) recovery also drifts sideways: toward the held side (back attacks drift backward)
    const bx = (atk.boostX || 0) + (atk.diag ? 230 : 0);
    if (bx) p.sprite.setVelocityX(p.facing * (a.back ? -1 : 1) * bx);
  }
  if (a.diving) {
    p.sprite.setVelocityY(Math.max(body.velocity.y, atk.dive));
    p.sprite.setVelocityX(atk.diag ? p.facing * (a.back ? -1 : 1) * 260 : body.velocity.x * 0.7);   // a diagonal dive travels toward the held side
  }
}

// can the next light press continue a combo? (the attack that is running / just ended was a neutral or side light that is not the finisher)
function comboChainable(p) {
  const a = p.attack;
  if (a.state !== 'none') return (a.type === 'light_n' || a.type === 'light_s') && (a.combo | 0) < 2;
  return p.comboWindow > 0;
}

function updateAttack(p, input, onFloor, facingBefore) {
  const a = p.attack;
  const prevFacing = facingBefore || p.facing;

  // Attack buffer: remember presses for up to ATTACK_BUFFER frames (with the direction held at press time)
  if (p.attackBuffer && --p.attackBuffer.t < 0) p.attackBuffer = null;
  if (input.attack && ATTACK_BUFFER > 0) {
    p.attackBuffer = {
      attack: input.attack, left: input.left, right: input.right,
      up: input.up, downHeld: input.downHeld, t: (input.attack === 'light' && comboChainable(p)) ? COMBO_BUFFER : ATTACK_BUFFER,
    };
  }
  // if the buffer is off (0), only use a press made on this frame
  const req = ATTACK_BUFFER > 0 ? p.attackBuffer : (input.attack ? input : null);

  if (a.state === 'none') {
    if (p.comboWindow > 0) p.comboWindow--;
    if (p.cooldown > 0) {
      p.cooldown--;
    } else if (req) {
      p.attackBuffer = null;
      const dir = AttackRouter.readDirection(req, prevFacing);
      const id = AttackRouter.resolve(req, onFloor, prevFacing);
      if (dir === 's') {
        if (req.left) p.facing = -1;
        else if (req.right) p.facing = 1;
      } else if (dir.length === 2) {
        // diagonal: the character doesn't turn (a back attack hits behind them)
        p.facing = prevFacing;
      }
      // combo: pressing light again within the window after a neutral / side light = the next hit of the 3-hit string
      let combo = 0;
      if ((id === 'light_n' || id === 'light_s') && p.comboWindow > 0 && p.comboIdx < 2) combo = p.comboIdx + 1;
      p.comboIdx = combo;
      p.comboWindow = 0;
      a.combo = combo;
      a.state = 'startup';
      a.type = id;
      a.frame = 0;
      a.hitList = [];
      a.stage = 0;
      a.refunded = false;
      a.boosting = false;
      a.diving = false;
      a.back = !!AttackRouter.getAttackData(p, id).back;
    }
    return;
  }

  const atk = AttackRouter.getAttackData(p, a.type);
  a.frame++;
  if (a.state === 'active') applyAttackMotion(p, a, atk);

  if (a.state === 'startup' && a.frame >= atk.startup) {
    a.state = 'active';
    a.frame = 0;

    // JUICE: Play sound and VFX at exact frame hitbox becomes active
    p.state = 'attack_active';
    if (typeof playAttackJuice === 'function') {
      playAttackJuice(p, atk);
    }
    if (onFloor && p.char.id === 'sekiro' && p.equippedWeapon === 'spear' && atk.kind === 'heavy' && typeof VfxMgr !== 'undefined') {
      VfxMgr.spearDust(p.sprite.x + p.facing * 28, p.sprite.body.bottom - 4);
    }

    // heavy-up boost / dive (moves.js): from the ground a boost is always allowed, in the air only once until you land or hit someone
    if (atk.boost && (onFloor || !atk.airOnce || !p.recoveryUsed)) {
      a.boosting = true;
      if (!onFloor && atk.airOnce) p.recoveryUsed = true;
    }
    if (atk.dive && !onFloor) a.diving = true;
    applyAttackMotion(p, a, atk);

    // Gun projectile spawn
    if (atk.projectile && typeof spawnGunShot === 'function') {
      spawnGunShot(p, atk);
    }
  } else if (a.state === 'active') {
    if (!atk.projectile) {
      // multi-hit: at each stage frame the hit list resets so the same enemy can be hit again (see moves.js `stages`)
      let cur = atk;
      if (atk.stageCount && typeof stageAtFrame === 'function') {
        const idx = stageAtFrame(atk, p.char, p.equippedWeapon || p.weaponId, a.type, a.frame, a.combo);
        if (idx !== a.stage) {
          a.stage = idx;
          a.hitList = [];
          if (typeof playAttackJuice === 'function') playAttackJuice(p, AttackRouter.getAttackData(p, a.type, idx));
        }
        cur = AttackRouter.getAttackData(p, a.type, a.stage);
      }
      if (typeof playSlashTrail === 'function') playSlashTrail(p, cur);
      checkHits(p);
    } else if (atk.burst && atk.burstGap && a.frame % atk.burstGap === 0 && a.frame / atk.burstGap < atk.burst) {
      // gun double-tap / burst: another shot every burstGap frames
      if (typeof playAttackJuice === 'function') playAttackJuice(p, atk);
      if (typeof spawnGunShot === 'function') spawnGunShot(p, atk);
    }
    if (a.frame >= atk.active) {
      a.state = 'recovery';
      a.frame = 0;
    }
  } else if (a.state === 'recovery' && a.frame >= atk.recovery) {
    a.state = 'none';
    a.frame = 0;
    p.cooldown = atk.cooldown;
    if (atk.kind === 'light') {
      // anti-spam: pad the cooldown so the whole light attack cycle is never shorter than LIGHT_MIN_CYCLE frames
      const used = atk.startup + atk.active + atk.recovery;
      const chain = (a.type === 'light_n' || a.type === 'light_s');
      let minCycle = LIGHT_MIN_CYCLE;
      if (chain) {
        // 3-hit combo: hits 1 and 2 can be followed up quickly, the finisher makes you wait a little
        if ((a.combo | 0) < 2) { minCycle = COMBO_MIN_CYCLE; p.comboWindow = COMBO_WINDOW; p.comboIdx = a.combo | 0; }
        else { minCycle = COMBO_FINISH_CYCLE; p.comboIdx = 0; }
      }
      p.cooldown = Math.max(Math.min(p.cooldown, minCycle), minCycle - used);
    }
  }
}

// Hitboxes (array): normally one rectangle; for diagonals (atk.diag) a row of small squares along a 45-degree line
// (Arcade physics only supports AABB, so a long 45-degree box is approximated with a chain of squares)
// sign = attack direction (for a back attack, behind the character)
function getHitboxes(p) {
  const atk = AttackRouter.getAttackData(p, p.attack.type, p.attack.stage);
  // compute the hitbox from the middle of the body: sprite.y is the frame center, so with a large sheet it sat 30px+ too high and missed enemies
  const s = { x: p.sprite.body.center.x, y: p.sprite.body.center.y, body: p.sprite.body };
  const sign = p.facing * (p.attack.back ? -1 : 1);

  if (atk.diag) {
    const size = atk.size;
    const step = size * 0.7;
    const n = Math.max(2, Math.ceil(atk.len / step));
    const start = s.body.width * 0.2 + size / 2; // start from the edge of the body
    const boxes = [];
    for (let i = 0; i < n; i++) {
      const dist = start + i * step;
      const cx = s.x + sign * dist * Math.SQRT1_2;
      const cy = s.y + atk.vy * dist * Math.SQRT1_2;
      boxes.push(new Phaser.Geom.Rectangle(cx - size / 2, cy - size / 2, size, size));
    }
    return boxes;
  }

  const ox = atk.ox == null ? 1 : atk.ox;
  const oy = atk.oy || 0;
  const cx = s.x + sign * (s.body.width / 2 + atk.width / 2) * ox;
  const cy = s.y + oy * (s.body.height / 2 + atk.height / 2);
  let left = cx - atk.width / 2, right = cx + atk.width / 2;
  let top = cy - atk.height / 2, bottom = cy + atk.height / 2;
  // Fix for the point-blank dead zone: extend the hitbox to the middle of the body
  // (previously with ox>1 there was a gap in front, so a touching enemy was missed)
  if (Math.abs(oy) < 0.4) {
    if (sign > 0) left = Math.min(left, s.x - 6); else right = Math.max(right, s.x + 6);
  } else if (oy < 0) {
    bottom = Math.max(bottom, s.y);
    left = Math.min(left, s.x - 12); right = Math.max(right, s.x + 12);
  } else {
    top = Math.min(top, s.y);
  }
  return [new Phaser.Geom.Rectangle(left, top, right - left, bottom - top)];
}

// One rectangle covering all boxes (used to place VFX)
function getHitbox(p) {
  const boxes = getHitboxes(p);
  const u = Phaser.Geom.Rectangle.Clone(boxes[0]);
  for (let i = 1; i < boxes.length; i++) Phaser.Geom.Rectangle.Union(u, boxes[i], u);
  return u;
}

function checkHits(attacker) {
  const hitboxes = getHitboxes(attacker);
  players.forEach((target) => {
    if (target === attacker || target.dead) return;
    if (attacker.attack.hitList.includes(target)) return;
    if (isInvulnerable(target)) return; // dodged!

    const b = target.sprite.body;
    const targetRect = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    if (hitboxes.some((hb) => Phaser.Geom.Intersects.RectangleToRectangle(hb, targetRect))) {
      attacker.attack.hitList.push(target);
      onHit(attacker, target);
    }
  });
}

// true while the player is off the ground (a ground dash does not count as airborne)
function isAirborne(p) {
  const b = p.sprite.body;
  if (!b) return false;
  if (p.dodge.active && !p.dodge.air) return false;
  return !(b.blocked.down || b.touching.down);
}

// On hit: increase damage % -> compute knockback -> apply hitstun
function onHit(attacker, target, customAtk) {
  const atk = customAtk || AttackRouter.getAttackData(attacker, attacker.attack.type, attacker.attack.stage);
  if (!atk) return;

  // super armor (moves.js `armor`): a target in the startup / active frames of an armored attack takes reduced damage but is not launched
  let absorb = 0;
  const ta = target.attack;
  if (ta && (ta.state === 'startup' || ta.state === 'active') && !(customAtk && customAtk.thrown)) {
    const td = AttackRouter.getAttackData(target, ta.type, ta.stage);
    if (td && td.armor) absorb = td.armor;
  }

  // 1) increase damage %
  target.damage += absorb ? Math.max(1, Math.round(atk.damage * absorb)) : atk.damage;

  if (typeof Tutorial !== 'undefined' && Tutorial.active) Tutorial.onHit(attacker, target, customAtk, isAirborne(attacker));

  // 1b) hitting an enemy while the attacker is in the air refunds one air dash AND one jump per hit (thrown weapons don't count)
  // (a multi-hit attack gives the bonus once, not once per hit)
  if (!(customAtk && customAtk.thrown) && isAirborne(attacker) && !(!customAtk && attacker.attack.refunded)) {
    attacker.airDashes = Math.min(AIR_DASHES_MAX, attacker.airDashes + 1);
    attacker.jumpsLeft = Math.min(MAX_JUMPS, attacker.jumpsLeft + 1);   // an air hit also gives one jump back
    attacker.recoveryUsed = false;                                       // ...and the heavy-up boost again
    if (!customAtk) attacker.attack.refunded = true;
  }
  // gravity cancel: an air hit freezes the attacker's fall for a moment (once per airtime)
  if (!customAtk && isAirborne(attacker) && !attacker.gcUsed) {
    attacker.gcUsed = true;
    attacker.gcFrames = GRAVITY_CANCEL_FRAMES;
    attacker.sprite.setVelocityY(Math.min(attacker.sprite.body.velocity.y, 0));
    if (typeof VFX !== 'undefined') VFX.push({ type: 'ring', x: attacker.sprite.x, y: attacker.sprite.body.center.y, r0: 6, r1: 34, life: 9, width: 2, color: 0xffffff, age: 0 });
  }

  // a hit breaks the target's combo and knocks them off a ledge
  target.comboIdx = 0;
  target.comboWindow = 0;
  if (target.ledge) releaseLedge(target, false);

  if (absorb) {   // armored: no knockback, no hitstun, the target keeps attacking
    target.hitFlash = 4;
    if (typeof VfxMgr !== 'undefined') {
      VfxMgr.burst(target.sprite.x, target.sprite.body.center.y - 4, false, null);
    }
    return;
  }

  // 2) knockback force (accounts for target weight)
  const kb = (atk.baseKb + target.damage * atk.growth) / (target.weight || 1.0);

  // 3) split velocity by angle
  // launch direction: for a projectile, the bullet's direction (dirSign); for a back attack (UB/DB), behind the attacker's facing
  let sign = attacker.facing;
  if (customAtk) {
    if (customAtk.dirSign) sign = customAtk.dirSign;
  } else if (attacker.attack.back) {
    sign = -attacker.facing;
  }
  if (atk.radial && !customAtk) sign = target.sprite.x >= attacker.sprite.x ? 1 : -1;   // spins / slams push away from the attacker
  const rad = Phaser.Math.DegToRad(atk.angle);
  if (atk.pull) {
    // hook: drag the enemy TOWARD the attacker (a little lift so they slide across the floor)
    const toward = attacker.sprite.x >= target.sprite.x ? 1 : -1;
    target.sprite.setVelocity(toward * atk.pull, -(atk.pullLift || 120));
  } else {
    target.sprite.setVelocity(
      sign * Math.cos(rad) * kb,
      -Math.sin(rad) * kb
    );
  }

  // 4) hitstun
  target.hitstun = atk.pull ? 16 : Math.min(HITSTUN_MAX, Math.round(HITSTUN_BASE + kb * HITSTUN_PER_KB));

  // 5) the victim's attack is interrupted
  endDodge(target, true);
  target.attack = newAttackState();
  target.attackBuffer = null;
  target.cooldown = 0;
  target.dropBuffer = 0;

  // 6) flash
  target.hitFlash = atk.kind === 'heavy' ? 12 : 6;

  // 7) JUICE: Impact effect (burst particles + sparks + camera shake)
  if (typeof VfxMgr !== 'undefined') {
    // hit art/sound: by weapon + light/heavy + hero (VfxMgr.hit). For thrown weapons, the original burst
    if (customAtk && !customAtk.projectile) {
      VfxMgr.burst(target.sprite.x, target.sprite.body.center.y - 4, atk.kind === 'heavy', null);
    } else {
      VfxMgr.hit(attacker, target, atk, sign, customAtk ? 'gun' : null);
    }
  }
  // 2–3 fixed simulation frames of hit stop for heavy sword/katana connections.
  if (atk.kind === 'heavy' && !atk.projectile &&
      (attacker.weaponId === 'sword' || attacker.weaponId === 'katana' || attacker.weaponId === 'chakram')) {
    hitStopFrames = 3;
  }
}

function drawOverlay() {
  overlay.clear();

  // KO ring effect
  koEffects.forEach((e) => {
    overlay.lineStyle(5, e.color, 1 - e.age / 30);
    overlay.strokeCircle(e.x, e.y, 20 + e.age * 6);
  });

  players.forEach((p) => {
    if (p.dead) return;
    const s = p.sprite;

    // platform to stand on briefly after respawn
    if (p.spawnHold > 0) {
      overlay.fillStyle(0xffffff, 0.55);
      overlay.fillRect(s.x - 45, s.y + 30, 90, 6);
    }

    if (!SHOW_HITBOX) return;
    const a = p.attack;
    const atk = AttackRouter.getAttackData(p, a.type);
    const heavy = atk && atk.kind === 'heavy';
    if (a.state === 'startup') {
      overlay.lineStyle(1, heavy ? 0xffaa33 : 0xffff66, 0.6);
      getHitboxes(p).forEach((h) => overlay.strokeRect(h.x, h.y, h.width, h.height));
    } else if (a.state === 'active') {
      overlay.fillStyle(heavy ? 0xff8800 : 0xff3333, 0.5);
      getHitboxes(p).forEach((h) => overlay.fillRect(h.x, h.y, h.width, h.height));
    }
  });
}

// the higher the %, the color goes white -> yellow -> red
function damageColor(d) {
  const t = Math.min(1, d / MAX_DAMAGE_SHOWN);
  const from = Phaser.Display.Color.ValueToColor(0xffffff);
  const to = Phaser.Display.Color.ValueToColor(0xff2222);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t * 100);
  return Phaser.Display.Color.RGBToString(
    Math.round(c.r), Math.round(c.g), Math.round(c.b), 0, '#'
  );
}

// The next weapon to pick up. When holding a weapon, weaponIndex increases only after throwing it, so we show the one "ahead".
// When empty-handed, the current weaponIndex is the one to pick up.
function nextWeaponName(p) {
  const pool = p && p.char && p.char.weaponPool;
  if (!pool || !pool.length) return '';
  const holding = !!(p.equippedWeapon || p.weaponId);
  const idx = holding ? (p.weaponIndex + 1) % pool.length : p.weaponIndex % pool.length;
  return String(pool[idx]).toUpperCase();
}

function drawHud() {
  hud.clear();
  const sw = gameScene.scale.width;
  [0, 1].forEach((i) => {
    const p = players[i];
    if (!p || !p.char) return;
    const x = hudX(i, sw), y = HUD_Y;
    const accent = PLAYER_COLORS[i];
    const mine = isOnline() && i === Net.localIdx;
    const wpnName = p.weaponId ? p.weaponId.toUpperCase() : 'UNARMED';

    // ---- card ----
    for (let k = 3; k >= 1; k--) hud.fillStyle(0x000000, 0.10).fillRoundedRect(x - k * 2, y + 3 + k * 2, HUD_W + k * 4, HUD_H + k * 2, 16 + k * 2);
    hud.fillStyle(0x0b1230, 0.84).fillRoundedRect(x, y, HUD_W, HUD_H, 16);
    hud.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 1, y + 1, HUD_W - 2, HUD_H * 0.42, { tl: 15, tr: 15, bl: 4, br: 4 });
    hud.lineStyle(mine ? 2.5 : 1.5, accent, mine ? 1 : 0.7).strokeRoundedRect(x, y, HUD_W, HUD_H, 16);
    hud.fillStyle(accent, 1).fillRoundedRect(x + 10, y + 12, 5, HUD_H - 24, 2.5);

    if (uiLabels[i]) uiLabels[i].setText(p.char.name.toUpperCase());
    const botTag = p.isBot ? (SELECTION.mode === 'tutorial' ? ' · TRAINING DUMMY' : ' · BOT ' + ((BOT_LEVELS[SELECTION.botLevel] || {}).label || '').toUpperCase()) : '';
    if (uiSubs[i]) uiSubs[i].setText(`P${i + 1}${mine ? ' · YOU' : ''}${botTag}`);
    if (uiWpn[i]) uiWpn[i].setText(`${wpnName}  ›  ${nextWeaponName(p)}`);

    // ---- jump pips (mint = jumps left) + dash bar ----
    const ry = y + 58;
    for (let j = 0; j < MAX_JUMPS; j++) {
      hud.fillStyle(j < p.jumpsLeft ? 0x66e08a : 0x1a2448, 1).fillRoundedRect(x + 24 + j * 26, ry, 21, 8, 4);
    }
    let fill = 1;
    if (p.dodge.active || p.airDashes <= 0) fill = 0;
    else if (p.dodgeCooldown > 0 && p.dodgeCooldownMax > 0) fill = 1 - p.dodgeCooldown / p.dodgeCooldownMax;
    const dx = x + 24 + MAX_JUMPS * 26 + 10;
    hud.fillStyle(0x1a2448, 1).fillRoundedRect(dx, ry, 52, 8, 4);
    if (fill > 0.02) hud.fillStyle(p.airDashes >= 2 ? 0xffd24a : (fill >= 1 ? 0x66b3ff : 0x3d5f8c), 1).fillRoundedRect(dx, ry, Math.max(8, 52 * fill), 8, 4);

    // ---- stocks (remaining lives) ----
    for (let j = 0; j < STOCKS; j++) {
      const cx = x + 31 + j * 22, cy = y + 79;
      if (j < p.stocks) hud.fillStyle(p.color, 1).fillCircle(cx, cy, 7).lineStyle(1.5, 0xffffff, 0.55).strokeCircle(cx, cy, 7);
      else hud.lineStyle(1.5, 0x3a4a86, 1).strokeCircle(cx, cy, 6);
    }

    damageTexts[i].setText(Math.floor(p.damage) + '%');
    damageTexts[i].setColor(damageColor(p.damage));
  });
}

// The Game is started at the end of the file, after all the let/const above (match, bgLayer, winUi ...) are defined,
// so the scene opens afterward (previously it started early and could throw a "before initialization" error when assets were missing)
// Start once the web font is ready (max 2.5 s) so the first screens already use it
const startGame = () => { window.__game = new Phaser.Game(config); };   // (debug: inspect __game.scene from the F12 console)
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  Promise.race([
    Promise.all(['500', '600', '700', '800'].map((wt) => document.fonts.load(wt + ' 20px Poppins'))),
    new Promise((r) => setTimeout(r, 2500)),
  ]).then(startGame, startGame);
} else startGame();


// P1/P2 marker above the head (with the red/blue shape beside it) + a glow ring under the feet
function drawPlayerMarker(p) {
  const g = p.marker, t = p.markerText;
  if (!g || !t) return;
  g.clear();
  if (p.dead || !p.sprite.active) { t.setVisible(false); return; }
  const b = p.sprite.body, x = Math.round(b.center.x), col = p.markColor || 0xffffff;
  const bob = Math.sin(gameScene.time.now / 160) * 2;
  const top = b.top - (p.char.hasRealSheet ? 46 : 14) + bob;
  g.fillStyle(col, 1).lineStyle(2, 0x000000, 0.8);
  g.fillTriangle(x - 7, top - 8, x + 7, top - 8, x, top + 2).strokeTriangle(x - 7, top - 8, x + 7, top - 8, x, top + 2);
  g.lineStyle(3, col, 0.85).strokeEllipse(x, b.bottom - 1, 46, 10);
  t.setVisible(true).setPosition(x, top - 9);
}

// skin color: hit flash = white, normal = p.tint (P2 blue when heroes are the same)
function applySkinTint(p, skin) {
  if (p.hitFlash > 0) skin.setTintFill(0xffffff);
  else if (p.tint !== 0xffffff) skin.setTint(p.tint);
  else skin.clearTint();
}
