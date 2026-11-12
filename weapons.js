// Brawlhalla-style Weapon Drop, Pickup, Throw & Alternate Weapon Swap System.

const MAP_WEAPON_POOL = ['spear', 'sword', 'axe', 'gun'];
const FIRST_SPAWN_DELAY = 30;   // first weapon drops immediately within 0.5 seconds (Brawlhalla style)
const RE_SPAWN_INTERVAL = 240;  // the next weapon drops about 4 seconds after one is thrown
const MAX_WORLD_PICKUPS = 2;    // at most 2 on the field at a time
const AUTO_PICKUP = false;       // false = weapons are only picked up when the player presses the throw/pickup key (E / Q / C / U) next to them
const PICKUP_REACH = 26;         // extra px around the player's body that counts as "near" a weapon for the manual pickup
const THROW_SPEED = 780;
const THROW_LIFE = 600; // Grounded weapon drops stay visible for 10 seconds unless picked up.
const PICKUP_DESPAWN_TIME = 1200; // a pickup left uncollected on the platform for a long time is removed (1200 frames = 20 s)

function wpnAtk(kind, extra) {
  const base = kind === 'heavy'
    ? { kind: 'heavy', startup: 14, active: 5, recovery: 26, cooldown: 10, width: 85, height: 55, ox: 1, oy: 0, moveMult: 0.2, damage: 12, baseKb: 340, growth: 9, angle: 45 }
    : { kind: 'light', startup: 5, active: 4, recovery: 12, cooldown: 8, width: 55, height: 40, ox: 1, oy: 0, moveMult: 0.4, damage: 5, baseKb: 220, growth: 5, angle: 35 };
  return Object.assign({}, base, extra);
}

// ---------- 8-direction: diagonal attacks (UF / UB / DF / DB) ----------
// ID format: ${kind}_${dir}_${stance}  e.g. light_uf_g (ground) / heavy_db_a (air)
// Hitboxes are a line of small squares laid out along a 45-degree angle (diag: true)
//   len = reach, size = side length of each square (spear = long and thin, axe = short and thick)
// Ground vs Air:
//   Ground = slow startup, high damage, planted (moveMult 0.1), downward diagonals launch the target upward
//   Air    = fast startup, low damage, can move in the air (moveMult 0.6), downward diagonals spike the target down
const DIAG_DIRS = {
  uf: { vy: -1, back: false },
  ub: { vy: -1, back: true },
  df: { vy: 1, back: false },
  db: { vy: 1, back: true },
};

function diagAttacks(kind, d) {
  d = d || {};
  const o = (kind === 'heavy' ? d.heavy : d.light) || {};
  const out = {};
  Object.keys(DIAG_DIRS).forEach((k) => {
    const dir = DIAG_DIRS[k];
    ['g', 'a'].forEach((stance) => {
      const air = stance === 'a';
      const a = wpnAtk(kind, o);
      const upward = dir.vy < 0;
      Object.assign(a, {
        diag: true, vy: dir.vy, back: dir.back,
        len: d.len || 64, size: d.size || 30,
        width: d.size || 30, height: d.size || 30,
        startup: a.startup + (air ? -1 : 1),
        recovery: a.recovery + (air ? -2 : 3),
        damage: Math.round(a.damage * (air ? 0.9 : 1.15)),
        baseKb: Math.round(a.baseKb * (air ? 0.95 : 1.1)),
        angle: upward ? (air ? 60 : 55) : (air ? -45 : 35),
        moveMult: air ? 0.6 : 0.1,
      });
      out[kind + '_' + k + '_' + stance] = a;
    });
  });
  return out;
}

function meleeKit(s) {
  const kit = {
    light_n:      wpnAtk('light', s.ln),
    light_s:      wpnAtk('light', s.ls),
    light_d:      wpnAtk('light', s.ld),
    light_u_tilt: wpnAtk('light', s.lu),
    light_u_air:  wpnAtk('light', Object.assign({ startup: 6 }, s.lu)),
    heavy_n:      wpnAtk('heavy', s.hn),
    heavy_s:      wpnAtk('heavy', s.hs),
    heavy_d:      wpnAtk('heavy', s.hd),
    heavy_u_tilt: wpnAtk('heavy', s.hu),
    heavy_u_air:  wpnAtk('heavy', Object.assign({ startup: 15 }, s.hu)),
  };
  Object.assign(kit, diagAttacks('light', s.d), diagAttacks('heavy', s.d));
  return kit;
}

function gunKit() {
  const shot = (extra) => wpnAtk('light', Object.assign({
    projectile: true, projSpeed: 840, projLife: 50, width: 28, height: 18, ox: 1.2, oy: 0,
    damage: 6, baseKb: 180, growth: 3, angle: 10, startup: 6, active: 3, recovery: 12,
  }, extra));
  const charged = (extra) => wpnAtk('heavy', Object.assign({
    projectile: true, projSpeed: 980, projLife: 55, width: 36, height: 22, ox: 1.2, oy: 0,
    damage: 11, baseKb: 290, growth: 6, angle: 22, startup: 12, active: 3, recovery: 20,
  }, extra));

  // Diagonal shots: 45 degrees up/down, back = shoot backward
  const diag = {};
  [['uf', 45, false], ['ub', 45, true], ['df', -45, false], ['db', -45, true]].forEach(([k, ang, back]) => {
    ['g', 'a'].forEach((st) => {
      const air = st === 'a';
      diag['light_' + k + '_' + st] = shot({ projAngle: ang, back, oy: ang > 0 ? -0.5 : 0.5, startup: 6 + (air ? -1 : 1) });
      diag['heavy_' + k + '_' + st] = charged({ projAngle: ang, back, oy: ang > 0 ? -0.5 : 0.5, startup: 12 + (air ? -1 : 1) });
    });
  });

  return Object.assign({
    light_n:      shot({ projAngle: 0 }),   // straight shot (previously tilted 6 degrees up, so past 250px the bullet flew over the enemy's head)
    light_s:      shot({ projAngle: 0, projSpeed: 920, damage: 6 }),
    light_d:      shot({ projAngle: -42, oy: 0.45, damage: 6 }),
    light_u_tilt: shot({ projAngle: 90, oy: -0.85, width: 20, height: 28 }),
    light_u_air:  shot({ projAngle: 90, oy: -0.9, startup: 7 }),
    heavy_n:      charged({ projAngle: 0 }),
    heavy_s:      charged({ projAngle: 0, projSpeed: 1040 }),
    heavy_d:      charged({ projAngle: -55, oy: 0.5 }),
    heavy_u_tilt: charged({ projAngle: 90, oy: -0.9 }),
    heavy_u_air:  charged({ projAngle: 90, oy: -1, startup: 13 }),
  }, diag);
}

const WEAPONS = {
  sword: {
    id: 'sword', name: 'Sword', kind: 'melee', color: 0xe2e8f0, sfx: 'sword_slash',
    attacks: meleeKit({
      ln: { width: 58, height: 38, damage: 5, angle: 35 },
      ls: { width: 74, height: 34, ox: 1.2, damage: 6, angle: 22 },
      ld: { width: 46, height: 52, ox: 0.4, oy: 0.7, angle: -48 },
      lu: { width: 40, height: 60, ox: 0.2, oy: -0.85, angle: 80 },
      hn: { width: 88, height: 52, damage: 13, angle: 42 },
      hs: { width: 108, height: 46, ox: 1.25, damage: 14, angle: 28 },
      hd: { width: 70, height: 72, ox: 0.3, oy: 0.75, angle: -58 },
      hu: { width: 52, height: 92, ox: 0.2, oy: -0.95, angle: 86 },
      d: { len: 70, size: 36 },  // wide slash arc
    }),
  },
  katana: {
    id: 'katana', name: 'Katana', kind: 'melee', color: 0x90caf9, sfx: 'katana_slash',
    attacks: meleeKit({
      ln: { startup: 3, active: 3, recovery: 8, cooldown: 5, width: 48, height: 32, damage: 4, baseKb: 180, angle: 28 },
      ls: { startup: 3, active: 3, recovery: 8, width: 62, height: 28, ox: 1.15, damage: 4, angle: 18 },
      ld: { startup: 4, width: 40, height: 44, ox: 0.35, oy: 0.65, angle: -40 },
      lu: { startup: 4, width: 34, height: 52, ox: 0.2, oy: -0.8, angle: 78 },
      hn: { startup: 10, recovery: 18, width: 72, height: 40, damage: 10, angle: 38 },
      hs: { startup: 10, width: 88, height: 36, ox: 1.2, damage: 11, angle: 24 },
      hd: { width: 56, height: 60, ox: 0.28, oy: 0.7, angle: -52 },
      hu: { width: 42, height: 78, ox: 0.18, oy: -0.9, angle: 84 },
      // Katana: fast startup, low damage
      d: { len: 58, size: 30, light: { startup: 3, active: 3, recovery: 8, damage: 4, baseKb: 180 }, heavy: { startup: 10, recovery: 18, damage: 10 } },
    }),
  },
  chakram: {
    id: 'chakram', name: 'Chakram', kind: 'melee', color: 0xb36cff, sfx: 'chakram_slash',
    attacks: meleeKit({
      ln: { startup: 4, width: 58, height: 38, damage: 5, angle: 30 },
      ls: { startup: 4, width: 76, height: 34, ox: 1.1, damage: 6, angle: 20 },
      ld: { width: 48, height: 52, ox: 0.35, oy: 0.7, angle: -45 },
      lu: { width: 42, height: 64, ox: 0.2, oy: -0.8, angle: 78 },
      hn: { startup: 11, recovery: 17, width: 86, height: 48, damage: 12, angle: 38 },
      hs: { startup: 11, width: 106, height: 42, ox: 1.2, damage: 13, angle: 25 },
      hd: { width: 68, height: 68, ox: 0.3, oy: 0.7, angle: -54 },
      hu: { width: 50, height: 90, ox: 0.2, oy: -0.9, angle: 82 },
      d: { len: 80, size: 34, light: { startup: 4, active: 4 }, heavy: { startup: 11, recovery: 17 } },
    }),
  },
  spear: {
    id: 'spear', name: 'Spear', kind: 'melee', color: 0xddb068, sfx: 'spear_thrust',
    attacks: meleeKit({
      ln: { startup: 7, width: 78, height: 28, ox: 1.35, damage: 6, angle: 18 },
      ls: { startup: 7, width: 96, height: 26, ox: 1.45, damage: 7, angle: 12 },
      ld: { width: 50, height: 64, ox: 0.5, oy: 0.75, angle: -42 },
      lu: { width: 36, height: 86, ox: 0.15, oy: -1, angle: 85 },
      hn: { startup: 16, width: 110, height: 32, ox: 1.4, damage: 14, angle: 22 },
      hs: { startup: 16, width: 128, height: 30, ox: 1.5, damage: 15, angle: 14 },
      hd: { width: 64, height: 80, ox: 0.35, oy: 0.8, angle: -55 },
      hu: { width: 40, height: 110, ox: 0.1, oy: -1.05, angle: 88 },
      // Spear: slow startup, long thin thrust
      d: { len: 98, size: 24, light: { startup: 7 }, heavy: { startup: 16, damage: 14 } },
    }),
  },
  axe: {
    id: 'axe', name: 'Axe', kind: 'melee', color: 0xadb5bd, sfx: 'axe_swing',
    attacks: meleeKit({
      ln: { startup: 8, recovery: 16, width: 64, height: 44, damage: 7, baseKb: 260, angle: 40 },
      ls: { startup: 9, width: 80, height: 42, ox: 1.2, damage: 8, angle: 30 },
      ld: { startup: 9, width: 54, height: 58, ox: 0.4, oy: 0.7, angle: -55 },
      lu: { width: 48, height: 70, ox: 0.25, oy: -0.85, angle: 82 },
      hn: { startup: 18, recovery: 30, width: 96, height: 60, damage: 16, baseKb: 400, angle: 48 },
      hs: { startup: 18, width: 118, height: 54, ox: 1.25, damage: 17, angle: 32 },
      hd: { width: 78, height: 78, ox: 0.3, oy: 0.75, damage: 16, angle: -62 },
      hu: { width: 58, height: 100, ox: 0.2, oy: -0.95, angle: 88 },
      d: { len: 66, size: 42, light: { startup: 8, recovery: 16, damage: 7, baseKb: 260 }, heavy: { startup: 18, recovery: 30, damage: 16, baseKb: 400 } },
    }),
  },
  gun: {
    id: 'gun', name: 'Gun', kind: 'ranged', color: 0x5a6578, sfx: 'gunshot',
    attacks: gunKit(),
  },
};

// Keep the legacy combat key and explicit audio/animation weapon alias synchronized.
function setEquippedWeapon(player, weaponId) {
  if (!player) return;
  player.weaponId = weaponId || null;
  player.equippedWeapon = weaponId || null;
}

const WeaponSystem = {
  pickups: [], // Brawlhalla-style flaming weapon pickups falling from the sky
  thrown: [],  // held weapons thrown by a player, including chakrams
  shots: [],   // gun bullets
  timer: 0,
};

function weaponTextureKey(id) {
  return 'wpn_' + id;
}

// Brawlhalla Iconic Flaming Sword Weapon Drop Pickup Texture
function makePickupTexture(scene) {
  const key = 'wpn_brawl_pickup';
  if (scene.textures.exists(key)) return key;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Glowing flame aura
  g.fillStyle(0xff7700, 0.45);
  g.fillCircle(16, 16, 15);
  g.fillStyle(0xffbb00, 0.75);
  g.fillCircle(16, 16, 11);

  // Golden Flaming Sword
  g.fillStyle(0xffffff, 1);
  g.fillRect(14, 4, 4, 17);
  g.fillTriangle(11, 4, 21, 4, 16, 0); // blade tip
  g.fillStyle(0xffea00, 1);
  g.fillRect(8, 21, 16, 4); // crossguard
  g.fillStyle(0x552200, 1);
  g.fillRect(14, 25, 4, 5); // handle
  g.fillStyle(0xffea00, 1);
  g.fillCircle(16, 30, 2.5); // pommel

  g.generateTexture(key, 32, 32);
  g.destroy();
  return key;
}

function makeWeaponTexture(scene, id) {
  const key = weaponTextureKey(id);
  if (scene.textures.exists(key)) return key;
  const w = WEAPONS[id];
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Large, bright, horizontal silhouettes stay visible after being thrown or dropped.
  g.fillStyle(0x17202b, 1);
  if (id === 'gun') {
    g.fillRoundedRect(7, 23, 48, 13, 3);
    g.fillRect(35, 18, 13, 7);
    g.fillRect(20, 34, 11, 19);
    g.fillStyle(0x9aa9bb, 1); g.fillRect(11, 26, 34, 3);
    g.fillStyle(0xffce4a, 1); g.fillRect(48, 26, 7, 7);
  } else if (id === 'spear') {
    g.fillStyle(0x684925, 1); g.fillRect(6, 29, 48, 6);
    g.fillStyle(0xe7c16c, 1); g.fillTriangle(57, 32, 46, 23, 46, 41);
    g.fillStyle(0xffffff, 1); g.fillTriangle(59, 32, 48, 28, 48, 36);
  } else if (id === 'axe') {
    g.fillStyle(0x684925, 1); g.fillRect(9, 29, 42, 6);
    g.fillStyle(w.color, 1); g.fillTriangle(35, 11, 61, 17, 53, 43);
    g.fillStyle(0xeaf1f7, 1); g.fillTriangle(41, 16, 58, 19, 52, 36);
  } else if (id === 'katana') {
    g.fillStyle(0x332a2a, 1); g.fillRect(6, 29, 17, 6);
    g.fillStyle(0xe3e8ed, 1); g.fillRect(19, 26, 38, 6);
    g.fillTriangle(57, 26, 63, 29, 57, 32);
    g.fillStyle(0x93d6ff, 1); g.fillRect(23, 27, 31, 2);
  } else if (id === 'chakram') {
    // Purple ring blade with a gold inner rim; rotation reads clearly when thrown.
    g.fillStyle(0x6f39a8, 1); g.fillCircle(32, 32, 21);
    g.fillStyle(0x21152e, 1); g.fillCircle(32, 32, 13);
    g.lineStyle(3, 0xe3c0ff, 1); g.strokeCircle(32, 32, 18);
    g.lineStyle(2, 0xf5d466, 1); g.strokeCircle(32, 32, 11);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const x = 32 + Math.cos(a) * 20, y = 32 + Math.sin(a) * 20;
      const tx = 32 + Math.cos(a) * 27, ty = 32 + Math.sin(a) * 27;
      g.fillStyle(0xd9b3ff, 1); g.fillTriangle(x, y, tx + Math.cos(a + 1.1) * 4, ty + Math.sin(a + 1.1) * 4, tx + Math.cos(a - 1.1) * 4, ty + Math.sin(a - 1.1) * 4);
    }
  } else {
    // Sword
    g.fillStyle(0x684925, 1); g.fillRect(7, 29, 17, 6);
    g.fillStyle(0xe3e8ed, 1); g.fillRect(21, 24, 37, 9);
    g.fillTriangle(58, 24, 64, 28, 58, 33);
    g.fillStyle(0x56baff, 1); g.fillRect(25, 25, 29, 2);
    g.fillStyle(0xf1c64e, 1); g.fillRect(18, 21, 4, 15);
  }
  g.generateTexture(key, 64, 64);
  g.destroy();
  return key;
}

function makeBulletTexture(scene) {
  const key = 'wpn_bullet';
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x4ccaff, 0.35); g.fillEllipse(16, 8, 32, 16);
  g.fillStyle(0xb9f3ff, 1); g.fillRoundedRect(3, 5, 25, 6, 3);
  g.fillStyle(0xffffff, 1); g.fillCircle(25, 8, 3);
  g.generateTexture(key, 32, 16);
  g.destroy();
  return key;
}

function setupWeapons(scene) {
  makePickupTexture(scene);
  Object.keys(WEAPONS).forEach((id) => makeWeaponTexture(scene, id));
  makeBulletTexture(scene);
  WeaponSystem.pickups = [];
  WeaponSystem.thrown = [];
  WeaponSystem.shots = [];
  // arranged so the first weapon drops immediately within 1 second of the game starting
  WeaponSystem.timer = RE_SPAWN_INTERVAL - FIRST_SPAWN_DELAY;
}

function addWorldObj(scene, obj) {
  if (scene.cameras && scene.cameras.main) scene.cameras.main.ignore(obj);
  if (typeof uiCam !== 'undefined' && uiCam) uiCam.ignore(obj);
}

// Brawlhalla-style flaming weapon drop falls slowly from the sky
function spawnBrawlhallaPickup(scene, x, y) {
  const sprite = scene.physics.add.sprite(x, y || 10, 'wpn_brawl_pickup');
  sprite.setBounce(0.25);
  sprite.setDepth(6);
  // falls gently like a parachute so it doesn't drop too fast (Brawlhalla float)
  sprite.body.setGravityY(-650);
  sprite.setMaxVelocity(180, 260);

  addWorldObj(scene, sprite);
  if (typeof stageParts !== 'undefined') {
    stageParts.forEach((part) => scene.physics.add.collider(sprite, part));
  }

  const pickup = {
    sprite,
    age: 0,
    bobOffset: rngInt(0, 100),   // changes the pickup's y (gameplay), so it must be the seeded random
  };
  WeaponSystem.pickups.push(pickup);
  return pickup;
}

// Spawner logic: when any player is empty-handed, a Brawlhalla flaming sword falls from the sky
function tickWeaponSpawner(scene) {
  if (typeof Tutorial !== 'undefined' && Tutorial.active && !Tutorial.allowSpawn) return;   // tutorial: weapons only fall when the lesson needs them
  const activePickups = WeaponSystem.pickups.filter((p) => p.sprite && p.sprite.active);

  // never more than 2 on the field (keeps the stage uncluttered)
  if (activePickups.length >= MAX_WORLD_PICKUPS) return;

  // check whether any player has no weapon yet
  const unarmedPlayers = (typeof players !== 'undefined') ? players.filter((p) => !p.dead && !p.weaponId) : [];

  // if every player holds a weapon and there is already 1 pickup on the field, don't drop another
  if (unarmedPlayers.length === 0 && activePickups.length >= 1) return;

  WeaponSystem.timer++;
  if (WeaponSystem.timer < RE_SPAWN_INTERVAL) return;
  WeaponSystem.timer = 0;

  // falls gently toward the middle of the platform or near a player
  let spawnX = WIDTH / 2 + rngInt(-180, 180);
  if (unarmedPlayers.length > 0) {
    const target = rngPick(unarmedPlayers);
    spawnX = Phaser.Math.Clamp(target.sprite.x + rngInt(-80, 80), 140, WIDTH - 140);
  }

  spawnBrawlhallaPickup(scene, spawnX, 10);
}

// when a player picks up a pickup, they receive their character's designated weapon
// specificId: a thrown weapon being picked back up. If it is one of the character's own weapons, that exact weapon is equipped
// (so a weapon you throw and pick up again is NOT swapped for the alternate one). Sky drops pass nothing and follow the swap rule.
function grantCharacterWeapon(p, specificId) {
  if (!p || !p.char || !p.char.weaponPool) return;
  const pool = p.char.weaponPool;
  const idx = specificId ? pool.indexOf(specificId) : -1;
  if (idx >= 0) {
    p.weaponIndex = idx;
    setEquippedWeapon(p, specificId);
  } else {
    // SWAP RULE: equip the alternate weapon according to the current weaponIndex
    setEquippedWeapon(p, pool[p.weaponIndex % pool.length]);
  }
  p.pickupLock = 20;
  AudioMgr.play('pickup');
  if (typeof VfxMgr !== 'undefined') {
    VfxMgr.burst(p.sprite.x, p.sprite.body.center.y - 12, false);
  }
}

function pickupTouching(p, body, pad) {
  const b = p.sprite.body;
  if (!b || !body) return false;
  return Phaser.Geom.Intersects.RectangleToRectangle(
    new Phaser.Geom.Rectangle(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2),
    new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height)
  );
}

// Housekeeping for weapons lying around (age, despawn, floating bob). Does NOT hand weapons to anyone.
function tickPickupHousekeeping() {
  for (let i = WeaponSystem.pickups.length - 1; i >= 0; i--) {
    const pk = WeaponSystem.pickups[i];
    if (!pk.sprite || !pk.sprite.active) {
      WeaponSystem.pickups.splice(i, 1);
      continue;
    }
    pk.age++;
    // remove it if it has been left uncollected for a long time
    if (pk.age > PICKUP_DESPAWN_TIME) {
      if (pk.sprite.destroy) pk.sprite.destroy();
      WeaponSystem.pickups.splice(i, 1);
      continue;
    }
    // after landing, a gentle floating bob effect
    if (pk.sprite.body && pk.sprite.body.blocked.down) {
      pk.sprite.y += Math.sin((pk.age + pk.bobOffset) * 0.1) * 0.3;
    }
  }
}

// Closest weapon on the ground that player p could pick up right now (or null). Does not change anything.
function findPickupFor(p, pad) {
  if (!p || p.dead || p.weaponId || p.spawnHold > 0 || p.pickupLock > 0) return null;
  let best = null, bestD = Infinity;
  const consider = (kind, idx, sprite, extra) => {
    if (!sprite || !sprite.active || !pickupTouching(p, sprite.body, pad)) return;
    const d = Math.abs(sprite.x - p.sprite.x) + Math.abs(sprite.y - p.sprite.y);
    if (d < bestD) { bestD = d; best = { kind, idx, sprite, weaponId: extra && extra.weaponId }; }
  };
  WeaponSystem.pickups.forEach((pk, idx) => consider('pickup', idx, pk.sprite));
  WeaponSystem.thrown.forEach((t, idx) => { if (t.grounded && (!t.ownerOnly || t.owner === p)) consider('thrown', idx, t.sprite, t); });
  return best;
}

// true if p is empty-handed and standing next to a weapon they can pick up (used so a mouse left click picks up instead of attacking)
function canPickupNearby(p) {
  return !!findPickupFor(p, PICKUP_REACH);
}

// Give player p the closest weapon that is lying on the ground next to them. Returns true if one was picked up.
function pickupNearestFor(p, pad) {
  const best = findPickupFor(p, pad);
  if (!best) return false;

  grantCharacterWeapon(p, best.kind === 'thrown' ? best.weaponId : null);
  if (best.sprite.destroy) best.sprite.destroy();
  if (best.kind === 'pickup') WeaponSystem.pickups.splice(best.idx, 1);
  else WeaponSystem.thrown.splice(best.idx, 1);
  return true;
}

// Called from the player's update when they press the throw/pickup key while empty-handed (manual pickup).
function tryPickupWeapons(p) {
  if (p) return pickupNearestFor(p, PICKUP_REACH);
  return false;
}

// Throw a weapon with Middle Mouse Button / Key E / Key Q (100% reliable throw)
// Aim: hold a direction while pressing throw. Nothing held = straight ahead (with a small lob), Up = straight up,
// Up + Forward/Back = 45 degrees up, Down = straight down, Down + side = 45 degrees down. Pressing a side turns the character that way.
function throwWeapon(p, input) {
  if (!p || !p.weaponId || p.dead || p.dodge.active || p.hitstun > 0) return;
  // so a freshly picked-up weapon isn't thrown right back by a single press (the bug where both pickup + throw vanish)
  if (p.pickupLock > 0) return;

  // throw takes priority in any attack state and cancels it immediately
  if (p.attack) {
    p.attack.state = 'none';
    p.attack.frame = 0;
    p.attack.hitList = [];
  }

  const thrownWeaponId = p.equippedWeapon || p.weaponId;
  setEquippedWeapon(p, null);
  p.pickupLock = 20; // right after throwing, prevents auto-picking up the nearby weapon and throwing it again

  // SWAP RULE: throwing a weapon increases weaponIndex by 1 (e.g. switches from Sword to Gun)
  if (p.char && p.char.weaponPool) {
    p.weaponIndex = (p.weaponIndex + 1) % p.char.weaponPool.length;
  }

  AudioMgr.play('throw');

  // ---- throw direction from the held keys ----
  const hx = input ? ((input.right ? 1 : 0) - (input.left ? 1 : 0)) : 0;
  const vy = input ? (input.up ? -1 : (input.downHeld ? 1 : 0)) : 0;
  let aimX = p.facing, aimY = 0;
  if (hx !== 0 || vy !== 0) { aimX = hx; aimY = vy; }
  if (hx !== 0) p.facing = hx;
  const aimLen = Math.hypot(aimX, aimY) || 1;
  const ux = aimX / aimLen, uy = aimY / aimLen;
  const throwDir = ux !== 0 ? (ux > 0 ? 1 : -1) : p.facing;   // which way a target is knocked when the weapon hits

  // the thrown weapon's visual (a sword or gun flying)
  const sprite = gameScene.physics.add.sprite(
    p.sprite.x + ux * 34,
    p.sprite.body.center.y - 10 + uy * 34,
    weaponTextureKey(thrownWeaponId)
  );
  sprite.setDisplaySize(thrownWeaponId === 'gun' ? 48 : 60, thrownWeaponId === 'gun' ? 36 : 28);
  sprite.body.setSize(56, 36);
  sprite.setBounce(0.2);
  sprite.setMaxVelocity(900, 900);
  sprite.setDepth(5);
  addWorldObj(gameScene, sprite);

  if (typeof stageParts !== 'undefined') {
    stageParts.forEach((part) => gameScene.physics.add.collider(sprite, part));
  }

  const drop = {
    sprite,
    weaponId: thrownWeaponId,
    owner: p,
    life: THROW_LIFE,
    airTime: 0,
    hitList: [],
    grounded: false,
    dir: throwDir,   // throw direction (on hit, knock the target the right way even if the thrower has turned around)
  };

  // flat throws keep the old small upward lob; aimed throws fly exactly along the aimed line
  sprite.setVelocity(ux * THROW_SPEED, aimY === 0 ? -220 : uy * THROW_SPEED);
  sprite.setAngularVelocity(throwDir * 540);
  if (typeof Tutorial !== 'undefined' && Tutorial.active) Tutorial.onThrow(p, aimX, aimY);
  WeaponSystem.thrown.push(drop);

  // since a weapon was thrown, push the timer forward so a new pickup drops from the sky quickly
  if (WeaponSystem.timer < RE_SPAWN_INTERVAL - 150) {
    WeaponSystem.timer = RE_SPAWN_INTERVAL - 150;
  }
}

function tickThrownWeapons() {
  if (typeof players === 'undefined') return;

  for (let i = WeaponSystem.thrown.length - 1; i >= 0; i--) {
    const item = WeaponSystem.thrown[i];
    if (!item.sprite || !item.sprite.active) {
      WeaponSystem.thrown.splice(i, 1);
      continue;
    }

    item.life--;
    item.airTime++;

    // landing on the ground
    if (!item.grounded && item.airTime > 8 && item.sprite.body && item.sprite.body.blocked.down) {
      item.grounded = true;
      item.sprite.setAngularVelocity(0);
      item.sprite.setVelocity(item.sprite.body.velocity.x * 0.15, 0);
    }

    if (item.life <= 0) {
      if (item.sprite.destroy) item.sprite.destroy();
      WeaponSystem.thrown.splice(i, 1);
      continue;
    }

    // check for hitting an enemy while flying through the air
    if (!item.grounded) {
      for (const t of players) {
        if (t === item.owner || t.dead || (typeof isInvulnerable === 'function' && isInvulnerable(t))) continue;
        if (item.hitList.indexOf(t) !== -1) continue;

        const b = t.sprite.body;
        const s = item.sprite.body;
        if (b && s && Phaser.Geom.Intersects.RectangleToRectangle(
          new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height),
          new Phaser.Geom.Rectangle(s.x, s.y, s.width, s.height)
        )) {
          item.hitList.push(t);
          const throwAtk = { kind: 'light', damage: 9, baseKb: 290, growth: 5, angle: 26, sfx: 'heavy_impact', thrown: true };
          if (typeof onHit === 'function') {
            onHit(item.owner || t, t, Object.assign({}, throwAtk, { dirSign: item.dir }));
          }
          // Brawlhalla-style: the weapon drops where it hit. The target never gets it - only the thrower can pick it back up.
          item.grounded = true;
          item.ownerOnly = true;
          item.sprite.setAngularVelocity(0);
          item.sprite.setVelocity(item.sprite.body.velocity.x * 0.2, 0);
          break;
        }
      }
    } else if (AUTO_PICKUP) {
      // optional: an empty-handed player touching a weapon on the ground picks it up automatically
      for (const p of players) {
        if (pickupNearestFor(p, 0)) break;
      }
    }
  }
}

// Gun projectile spawning
// One or several bullets per shot (moves.js: shots + spread = shotgun fan)
function spawnGunShot(attacker, atk) {
  const n = Math.max(1, (atk && atk.shots) || 1);
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * ((atk && atk.spread) || 10) : 0;
    spawnOneBullet(attacker, off === 0 ? atk : Object.assign({}, atk, { projAngle: ((atk && atk.projAngle) || 0) + off }));
  }
}

function spawnOneBullet(attacker, atk) {
  const key = 'wpn_bullet';
  // for a back attack (UB/DB), the bullet goes backward
  const back = !!(attacker.attack && attacker.attack.back);
  const dirSign = back ? -attacker.facing : attacker.facing;
  // make the bullet come out of the gun muzzle in the art: fired 27px along the firing angle from the shoulder (slightly below the body center)
  const shootRad = Phaser.Math.DegToRad((atk && atk.projAngle) || 0);
  const shoulderX = attacker.sprite.x + (back ? -8 : 8) * attacker.facing;
  const shoulderY = attacker.sprite.body.center.y - 8;
  const sprite = gameScene.physics.add.sprite(
    shoulderX + dirSign * Math.cos(shootRad) * 27,
    shoulderY - Math.sin(shootRad) * 27,
    key
  );
  sprite.setDisplaySize(32, 20);
  sprite.setSize(18, 10);
  sprite.body.setAllowGravity(false);
  sprite.setDepth(6);
  addWorldObj(gameScene, sprite);

  const ang = atk.projAngle || 0;
  const rad = Phaser.Math.DegToRad(ang);
  const spd = atk.projSpeed || 840;
  sprite.setVelocity(dirSign * Math.cos(rad) * spd, -Math.sin(rad) * spd);

  WeaponSystem.shots.push({
    sprite,
    owner: attacker,
    atk,
    dir: dirSign,
    life: atk.projLife || 50,
    hitList: [],
  });
}

function tickGunShots() {
  if (typeof players === 'undefined') return;
  for (let i = WeaponSystem.shots.length - 1; i >= 0; i--) {
    const shot = WeaponSystem.shots[i];
    shot.life--;
    if (!shot.sprite.active || shot.life <= 0 ||
        shot.sprite.x < -100 || shot.sprite.x > WIDTH + 100 ||
        shot.sprite.y < -100 || shot.sprite.y > HEIGHT + 100) {
      if (shot.sprite.active) shot.sprite.destroy();
      WeaponSystem.shots.splice(i, 1);
      continue;
    }

    let hit = false;
    players.forEach((t) => {
      if (hit || t === shot.owner || t.dead || (typeof isInvulnerable === 'function' && isInvulnerable(t))) return;
      if (shot.hitList.indexOf(t) !== -1) return;

      const b = t.sprite.body;
      const s = shot.sprite.body;
      if (b && s && Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height),
        new Phaser.Geom.Rectangle(s.x, s.y, s.width, s.height)
      )) {
        shot.hitList.push(t);
        if (typeof onHit === 'function') {
          onHit(shot.owner, t, Object.assign({}, shot.atk, { dirSign: shot.dir }));
        }
        hit = true;
      }
    });

    if (hit) {
      shot.sprite.destroy();
      WeaponSystem.shots.splice(i, 1);
    }
  }
}

function getEquippedAttack(p, type) {
  const id = type || (p.attack && p.attack.type);
  if (p.weaponId && WEAPONS[p.weaponId] && WEAPONS[p.weaponId].attacks[id]) {
    return WEAPONS[p.weaponId].attacks[id];
  }
  return null;
}

function clearWeapons() {
  WeaponSystem.pickups.forEach((d) => { if (d.sprite && d.sprite.destroy) d.sprite.destroy(); });
  WeaponSystem.thrown.forEach((d) => { if (d.sprite && d.sprite.destroy) d.sprite.destroy(); });
  WeaponSystem.shots.forEach((s) => { if (s.sprite && s.sprite.destroy) s.sprite.destroy(); });
  WeaponSystem.pickups = [];
  WeaponSystem.thrown = [];
  WeaponSystem.shots = [];
  WeaponSystem.timer = RE_SPAWN_INTERVAL - FIRST_SPAWN_DELAY;
}

function tickWeapons(scene) {
  if (typeof players !== 'undefined') players.forEach((p) => { if (p.pickupLock > 0) p.pickupLock--; });
  tickWeaponSpawner(scene);
  tickPickupHousekeeping();
  if (AUTO_PICKUP && typeof players !== 'undefined') players.forEach((p) => pickupNearestFor(p, 0));
  tickThrownWeapons();
  tickGunShots();
}

function applyHit(attacker, target, atk) {
  if (typeof onHit === 'function') {
    onHit(attacker, target, atk);
  }
}
