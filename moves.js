// moves.js - every fighter's own attack style.
//
// A weapon's attack table (weapons.js) gives the BASE numbers for e.g. "katana light_n". A fighter can override any of them with
// `moves` in characters.js:   moves: { katana: { light: {...}, heavy_s: {...} }, gun: {...}, unarmed: {...} }
// The override keys go from general to specific and are applied in this order:
//      light / heavy   ->   light_u / heavy_df ... (one direction: n s d u uf ub df db)   ->   the full attack id (light_u_tilt, heavy_uf_g ...)
//
// Fields an override can use
//   plain numbers  startup active recovery cooldown damage baseKb growth angle width height ox oy moveMult len size projSpeed projLife projAngle
//   multipliers    dmg (damage) | kb (knockback) | reach (hitbox length) | tall (hitbox height) | speed (<1 = faster startup + recovery)
//   new mechanics  lunge      forward speed (px/s) while the hit is active  -> a dash strike / shoulder charge
//                  stages     [{ at: frame, ...overrides }]  -> multi-hit: at each `at` frame of the active window the hit list resets,
//                             so the same enemy can be hit again (every stage can change damage / hitbox / angle)
//                  armor      0..1  damage multiplier taken while this attack is in startup/active: you are NOT knocked back (super armor)
//                  boost / boostX        the fighter rises with the attack (px/s up / forward): Brawlhalla-style recovery on heavy-up.
//                                        airOnce: true = in the air it works once until you land or hit an enemy (always works from the ground)
//                  dive       in the air the fighter is driven downward (px/s): dive slashes / ground pounds
//                  pull / pullLift       a hit drags the enemy TOWARD the attacker (px/s, + a little lift) instead of launching them away: hooks
//                  radial     true -> knockback pushes the enemy away from the attacker (spins / ground slams), not just forward
//                  shots / spread        gun: pellets per shot and the angle between them (degrees)
//                  burst / burstGap      gun: extra shots after the first one every burstGap frames (double tap)
//
// Everything is plain data + deterministic maths, so online matches stay in sync.

const MOVE_NUM_FIELDS = ['startup', 'active', 'recovery', 'cooldown', 'damage', 'baseKb', 'growth', 'angle', 'width', 'height', 'ox', 'oy',
  'moveMult', 'len', 'size', 'projSpeed', 'projLife', 'projAngle', 'lunge', 'armor', 'radial', 'shots', 'spread', 'burst', 'burstGap',
  'boost', 'boostX', 'airOnce', 'dive', 'pull', 'pullLift'];

function moveKeyChain(type) {
  const kind = type.indexOf('heavy') === 0 ? 'heavy' : 'light';
  const dir = (type.split('_')[1]) || 'n';
  const chain = [kind, kind + '_' + dir, type];
  return chain.filter((k, i) => chain.indexOf(k) === i);   // never apply the same key twice
}

// Diagonal attacks (up-forward / up-back / down-forward / down-back) inherit the MOVEMENT parts of the straight-up / straight-down move,
// so W+A / W+D + heavy in the air is a directional recovery boost, and S+A / S+D + heavy is a directional dive (Brawlhalla-style).
// They do NOT inherit the hitbox shape or knockback angle (a diagonal keeps its own 45-degree shape).
const DIAG_INHERIT = ['boost', 'boostX', 'airOnce', 'dive', 'armor', 'radial', 'lunge', 'pull', 'pullLift', 'startup', 'active', 'recovery', 'cooldown', 'dmg', 'kb', 'speed'];

function diagParent(type) {
  const kind = type.indexOf('heavy') === 0 ? 'heavy' : 'light';
  const dir = (type.split('_')[1]) || 'n';
  if (dir === 'uf' || dir === 'ub') return kind + '_u';
  if (dir === 'df' || dir === 'db') return kind + '_d';
  return null;
}

function inheritedMove(o) {
  const r = {};
  DIAG_INHERIT.forEach((k) => { if (o[k] !== undefined) r[k] = o[k]; });
  if (o.stages) {
    r.stages = o.stages.map((s) => {
      const c = {};
      Object.keys(s).forEach((k) => { if (k === 'at' || DIAG_INHERIT.indexOf(k) !== -1) c[k] = s[k]; });
      return c;
    });
  }
  return r;
}

// apply ONE override object on a copy of the attack
function mergeMove(atk, o) {
  const out = Object.assign({}, atk);
  Object.keys(o).forEach((k) => {
    if (MOVE_NUM_FIELDS.indexOf(k) !== -1) out[k] = o[k];
  });
  if (o.dmg) out.damage = Math.max(1, Math.round(out.damage * o.dmg));
  if (o.kb) { out.baseKb = Math.round(out.baseKb * o.kb); out.growth = Math.round(out.growth * o.kb * 10) / 10; }
  if (o.reach) {
    if (out.diag) out.len = Math.round(out.len * o.reach);
    else out.width = Math.round(out.width * o.reach);
  }
  if (o.tall) {
    if (out.diag) out.size = Math.round(out.size * o.tall);
    else out.height = Math.round(out.height * o.tall);
  }
  if (o.speed) {
    out.startup = Math.max(2, Math.round(out.startup * o.speed));
    out.recovery = Math.max(3, Math.round(out.recovery * o.speed));
  }
  return out;
}

// Global attack speed. Startup and recovery frames are multiplied (1 = the raw weapon table numbers, bigger = slower, easier to react to).
// The active frames (how long the hitbox is out) are not changed.
const ATTACK_SLOWDOWN = { light: 1.5, heavy: 1.25 };
const _slowCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

function slowAttack(atk) {
  if (!atk) return atk;
  const k = ATTACK_SLOWDOWN[atk.kind === 'heavy' ? 'heavy' : 'light'];
  if (!k || k === 1) return atk;
  let s = _slowCache && _slowCache.get(atk);
  if (!s) {
    s = Object.assign({}, atk, { startup: Math.max(2, Math.round(atk.startup * k)), recovery: Math.max(3, Math.round(atk.recovery * k)) });
    if (_slowCache) _slowCache.set(atk, s);
  }
  return s;
}

// Light-attack "heat" (anti-spam): every light attack adds LIGHT_HEAT.add frames of heat, heat drains 1 per frame. Above LIGHT_HEAT.free the
// recovery after each light attack gets longer, so mashing the light button gets slower and slower while a calm string stays quick.
const LIGHT_HEAT = { add: 55, free: 70, cap: 170, rate: 0.5, maxExtra: 45 };
function lightHeatExtra(heat) {
  return Math.min(LIGHT_HEAT.maxExtra, Math.max(0, Math.floor((heat - LIGHT_HEAT.free) * LIGHT_HEAT.rate)));
}

// Ordinary falling has a top speed; fast fall, dives, knockback and dodges are free to go faster.
function capFall(vy, cap, free) {
  return (!free && vy > cap) ? cap : vy;
}

// 3-hit light combo (Brawlhalla style): neutral / side light pressed again in time = hit 2, then hit 3 (the finisher).
// Defaults for every fighter; a fighter can change them per weapon with  moves: { katana: { combo: [ {hit 2 overrides}, {hit 3 overrides} ] } }
const COMBO_DEFAULT = [
  { speed: 0.9, kb: 0.9 },                                                   // hit 2: a bit quicker, small knockback
  { speed: 1.25, dmg: 1.7, kb: 1.55, reach: 1.12, tall: 1.1, angle: 38 },    // hit 3: finisher - slower, much stronger
];
const COMBO_TYPES = ['light_n', 'light_s'];

// Returns the attack data for this fighter + weapon + attack id (+ multi-hit stage, + combo hit 0..2). Cached: the inputs never change during a match.
function applyMoves(char, weaponId, type, atk, stage, combo) {
  combo = combo | 0;
  if (!combo || COMBO_TYPES.indexOf(type) === -1) combo = 0;
  const set = char && char.moves && char.moves[weaponId || 'unarmed'];
  if (!type || (!set && !combo)) return atk;
  const cache = char._moveCache || (char._moveCache = {});
  const key = (weaponId || 'unarmed') + '|' + type + '|c' + combo;
  let entry = cache[key];
  if (!entry || entry.base !== atk) {
    let out = atk;
    let stages = null;
    if (set) {
      const parent = diagParent(type);
      moveKeyChain(type).forEach((k, i) => {
        if (i === 1 && parent && set[parent]) {          // after the general kind key, before this diagonal's own keys
          const inh = inheritedMove(set[parent]);
          out = mergeMove(out, inh);
          if (inh.stages) stages = inh.stages;
        }
        if (set[k]) {
          out = mergeMove(out, set[k]);
          if (set[k].stages) stages = set[k].stages;
        }
      });
    }
    if (combo) {
      out = mergeMove(out, COMBO_DEFAULT[combo - 1]);
      const own = set && set.combo && set.combo[combo - 1];
      if (own) {
        out = mergeMove(out, own);
        if (own.stages) stages = own.stages;
      }
      out.combo = combo;
    }
    entry = { base: atk, atk: out, stageAt: [0], stageData: [out] };
    if (stages && stages.length) {
      entry.stageAt = stages.map((s) => s.at || 0);
      entry.stageData = stages.map((s) => mergeMove(out, s));
      entry.atk = entry.stageData[0];
      entry.stageData[0] = entry.atk;
      entry.atk.stageCount = stages.length;
      entry.stageData.forEach((d) => { d.stageCount = stages.length; });
    }
    cache[key] = entry;
  }
  if (stage && entry.stageData[stage]) return entry.stageData[stage];
  return entry.atk;
}

// which stage is active `frame` frames after the hit became active
function stageAtFrame(atk, char, weaponId, type, frame, combo) {
  if (!atk || !atk.stageCount) return 0;
  combo = combo | 0;
  if (COMBO_TYPES.indexOf(type) === -1) combo = 0;
  const entry = char && char._moveCache && char._moveCache[(weaponId || 'unarmed') + '|' + type + '|c' + combo];
  if (!entry) return 0;
  let idx = 0;
  for (let i = 0; i < entry.stageAt.length; i++) if (frame >= entry.stageAt[i]) idx = i;
  return idx;
}
