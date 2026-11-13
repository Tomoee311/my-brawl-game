// charart.js - character art (per-weapon sprite sheets)
//
// Must be loaded after characters.js (after characters.js in index.html).
// Does not modify characters.js; reads stats / weaponPool as they are.
//
// Each weapon has its own sheet:  assets/chars/<art>_<weapon>.png
//   <art>    = art name (set in ART_NAME below), <weapon> = unarmed / katana / sword / spear / axe / gun
// Unarmed uses 'unarmed' (fists); when a weapon is picked up, the sheet for that weapon is switched in automatically.
//
// game.js calls these 3 functions:
//   preloadCharacterArt(scene)  - inside preload()
//   setupCharacterArt(scene)    - inside create(), after setupCharacters
//   renderCharacterArt(p)       - every frame (returns true if it drew the art; false means use the original method from characters.js)

const ART_FRAME_W = 160;
const ART_FRAME_H = 128;
const ART_FEET_MARGIN = 28;      // space below the feet (pixels between the bottom of the frame and the feet)
const ART_TOTAL_FRAMES = 96;     // 8 cols x 12 rows: 88 base frames + light combo hit 2 / 3 (88-93) + ledge hang / climb (94, 95); expanded sheets declare 104

// character id in game -> art name (file name under assets/chars/)
// If you draw new art and want to rename it, change it here.
const ART_NAME = { dante: 'kyaw', sekiro: 'thiri' };

// frame positions inside the sheet
const ART_FRAMES = {
  idle: 0,      // 0-3
  run: 8,       // 8-13
  jump: 16,
  fall: 17,
  hurt: 18,
  land: 19,
  dodgeSpot: 24, // 24-27
  dodgeRoll: 32, // 32-35
  attack: 40,   // 40 + 3*k + phase   (phase 0 = wind-up, 1 = strike, 2 = recover)
  combo: 88,    // light combo hit 2 = 88-90, hit 3 (finisher) = 91-93   (same 3 phases)
  ledge: 94,    // 94 = hanging on a ledge, 95 = climbing up
};
const ART_ATTACK_ORDER = [
  'nlight', 'slight', 'dlight', 'ulight', 'nheavy', 'sheavy', 'dheavy', 'uheavy',
  'uf_light', 'ub_light', 'df_light', 'db_light', 'uf_heavy', 'ub_heavy', 'df_heavy', 'db_heavy',
];

function artNameOf(char) {
  return (char && (ART_NAME[char.id] || char.id)) || 'unknown';
}

function artKey(char, weaponId) {
  return 'art_' + artNameOf(char) + '_' + (weaponId || 'unarmed');
}

// list of weapon sheets a character needs (unarmed + weaponPool)
function artWeaponsFor(char) {
  const pool = (char && char.weaponPool) || [];
  return ['unarmed'].concat(pool.filter((w, i) => w && pool.indexOf(w) === i && w !== 'unarmed'));
}

function preloadCharacterArt(scene) {
  Object.keys(CHARACTERS).forEach((id) => {
    const c = CHARACTERS[id];
    const art = artNameOf(c);
    c.frameWidth = ART_FRAME_W;
    c.frameHeight = ART_FRAME_H;
    // game.js's original loop loads c.sheetKey / c.sheetPath (for the physics sprite) -> point them at unarmed
    c.sheetKey = artKey(c, 'unarmed');
    c.sheetPath = 'assets/chars/' + art + '_unarmed.png';
    artWeaponsFor(c).forEach((w) => {
      if (w === 'unarmed') return;
      scene.load.spritesheet(artKey(c, w), 'assets/chars/' + art + '_' + w + '.png', {
        frameWidth: ART_FRAME_W,
        frameHeight: ART_FRAME_H,
      });
    });
  });
}

function artTextureReady(scene, key, requiredFrames) {
  if (!scene.textures.exists(key)) return false;
  const t = scene.textures.get(key);
  return t && t.frameTotal > (requiredFrames || ART_TOTAL_FRAMES); // frame count + __BASE
}

function setupCharacterArt(scene) {
  Object.keys(CHARACTERS).forEach((id) => {
    const c = CHARACTERS[id];
    const need = artWeaponsFor(c);
    const requiredFrames = c.artAttackFrames === 4 ? 104 : ART_TOTAL_FRAMES;
    const missing = need.filter((w) => !artTextureReady(scene, artKey(c, w), requiredFrames));
    c.artReady = missing.length === 0;
    c.artWeapons = need.filter((w) => artTextureReady(scene, artKey(c, w), requiredFrames));
    if (c.artReady) {
      c.hasRealSheet = true;   // game.js checks this flag to build the skin sprite
    } else {
      console.warn('[charart] ' + id + ': sheet missing, using the default art -> ' + missing.map((w) => artNameOf(c) + '_' + w + '.png').join(', ') +
        '  (check that they exist in assets/chars/ and that you are using a local server)');
    }
  });
}

// 'light_n' -> 'nlight',  'heavy_u_tilt' -> 'uheavy',  'light_uf_g' -> 'uf_light'
function artAttackSuffix(type) {
  const parts = String(type || 'light_n').split('_');
  const kind = parts[0] === 'heavy' ? 'heavy' : 'light';
  const d = parts[1] || 'n';
  if (d.length === 2) return d + '_' + kind;   // uf / ub / df / db
  return d.charAt(0) + kind;                  // n / s / d / u
}

function artAttackFrame(p) {
  let k = ART_ATTACK_ORDER.indexOf(artAttackSuffix(p.attack.type));
  if (k < 0) k = 0;
  const st = p.attack.state;
  if (p.char && p.char.artAttackFrames === 4) {
    const f = st === 'startup' ? 0 : st === 'active' ? 1 + (Math.floor(p.attack.frame / 2) % 2) : 3;
    return ART_FRAMES.attack + k * 4 + f;
  }
  const phase = st === 'startup' ? 0 : (st === 'active' ? 1 : 2);
  const t = String(p.attack.type);
  if ((p.attack.combo | 0) > 0 && (t === 'light_n' || t === 'light_s')) return ART_FRAMES.combo + (p.attack.combo - 1) * 3 + phase;   // 3-hit combo
  return ART_FRAMES.attack + k * 3 + phase;
}

function artFrameFor(p, now) {
  const body = p.sprite.body;
  const onFloor = body.blocked.down || body.touching.down || (p.dodge.active && !p.dodge.air);
  if (p.hitstun > 0) return ART_FRAMES.hurt;
  if (p.dodge.active) {
    const prog = p.dodge.frame / Math.max(1, p.dodge.duration);
    const step = Math.min(3, Math.floor(prog * 4));
    return (p.dodge.kind === 'spot' ? ART_FRAMES.dodgeSpot : ART_FRAMES.dodgeRoll) + step;
  }
  if (p.ledge) return ART_FRAMES.ledge;
  if (p.ledgeClimb > 0 && p.attack.state === 'none') return ART_FRAMES.ledge + 1;
  if (p.attack.state !== 'none') return artAttackFrame(p);
  if (!onFloor) return body.velocity.y < -40 ? ART_FRAMES.jump : ART_FRAMES.fall;
  if (p.landAnimFrames > 0) return ART_FRAMES.land;
  if (Math.abs(body.velocity.x) > 40) return ART_FRAMES.run + (Math.floor(now / 83) % 6);
  return ART_FRAMES.idle + (Math.floor(now / 160) % 4);
}

// the sheet for the currently held weapon if it exists, otherwise unarmed
function artSheetKeyFor(p) {
  const c = p.char;
  const w = p.equippedWeapon || p.weaponId || 'unarmed';
  if (c.artWeapons && c.artWeapons.indexOf(w) >= 0) return artKey(c, w);
  return artKey(c, 'unarmed');
}

// true = art was drawn (game.js no longer calls the original syncCharacterAnim)
function renderCharacterArt(p) {
  const c = p.char;
  if (!c || !c.artReady || !p.skin) return false;

  const skin = p.skin;
  if (p.visual) p.visual.clear();
  if (p.weaponVisual) p.weaponVisual.setVisible(false);   // the weapon is already part of the sheet

  if (p.dead || !p.sprite.active) {
    skin.setVisible(false);
    return true;
  }
  skin.setVisible(true);

  const body = p.sprite.body;
  const scene = p.sprite.scene;
  const key = artSheetKeyFor(p);
  const frame = artFrameFor(p, scene.time.now);
  if (skin.texture.key !== key) skin.setTexture(key, frame);
  else if (skin.frame.name !== frame) skin.setFrame(frame);

  // Attack pose (no full set of frames, so filled in with code): body pose by direction + light/heavy + phase
  //   startup = wind-up/charge (pull back, crouch), active = strike (forward lunge, stretch), recovery = settle back
  let offX = 0, offY = 0, lean = 0, sx = 1, sy = 1;
  if (p.attack.state !== 'none' && typeof AttackRouter !== 'undefined') {
    const atk = AttackRouter.getAttackData(p, p.attack.type);
    const heavy = atk && atk.kind === 'heavy';
    const f = p.facing * (p.attack.back ? -1 : 1);
    const K = heavy ? 1.6 : 1;
    const tok = (String(p.attack.type).split('_')[1]) || 'n';
    const up = tok.indexOf('u') !== -1, down = tok.indexOf('d') !== -1, diag = tok.length === 2;
    const side = tok === 's' ? 1.3 : (tok === 'n' ? 0.6 : 0.8);
    const st = p.attack.state, fr = p.attack.frame;
    // pose strength 0..1, computed per phase
    let u, mode;
    if (st === 'startup') { u = Math.min(1, fr / Math.max(1, atk.startup)); mode = 0; }
    else if (st === 'active') { u = 1; mode = 1; }
    else { u = 1 - Math.min(1, fr / Math.max(1, atk.recovery)); mode = 2; }
    if (mode === 0) {
      offX = -4 * K * u * f * side; lean = -7 * K * u * f; sx = 1 - 0.04 * K * u; sy = 1 + 0.03 * K * u;
      if (down) { sy -= 0.07 * u; offY = 2 * u; }               // down attack: crouch
      if (up) { sy -= 0.05 * u; offY = 2 * u; }                  // up attack: knees bent (preparing to jump)
    } else {
      offX = 8 * K * u * f * side; lean = 9 * K * u * f; sx = 1 + 0.08 * K * u; sy = 1 - 0.04 * K * u;
      if (up) { sy = 1 + 0.1 * K * u; sx = 1 - 0.04 * u; offY = -5 * K * u; lean *= diag ? 0.6 : 0.2; offX *= 0.4; }   // stretch up
      if (down) { sy = 1 - 0.08 * K * u; sx = 1 + 0.1 * K * u; offY = 1 * u; lean *= diag ? 1.1 : 0.4; }                  // press down
    }
  }
  const big = c.artScale || 1;   // some fighters (Thaung) are drawn bigger; the feet margin scales with the art
  skin.setPosition(Math.round(body.center.x + offX), Math.round(body.bottom + ART_FEET_MARGIN * big + offY));
  skin.setAngle(lean).setScale(sx * big, sy * big);
  skin.setFlipX(p.facing < 0);
  skin.setAlpha(typeof isInvulnerable === 'function' && isInvulnerable(p) ? 0.35 : 1);
  applySkinTint(p, skin);
  return true;
}
