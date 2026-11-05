// bot.js - Bot AI (Play with Bot). Produces input for the player with player.isBot = true.
// It emits exactly the same inputs as a human player (left/right/up/down/jump/attack/dodge/throw), so it never bypasses the game rules.
//
// 3 levels (even EASY is tuned to play at a "mid-level" - it can get back onto the stage, pick up weapons and dodge):
//   easy   = plays competently but reacts slowly and sometimes makes mistakes
//   medium = fast reactions, good dodge/punish, times its heavy attacks
//   hard   = fastest reactions, good at edge-guarding / recovering, chains combos, dodges consistently
//
// react        = frames needed to react after seeing the enemy's movement (60 = 1 second)
// dodge        = chance of deciding to dodge an incoming attack
// attack       = chance of actually attacking when it can (per frame)
// heavy        = chance of choosing heavy (otherwise light)
// mistake      = chance of a wrong decision (idling lazily, a bad swing)
// punish       = chance of hitting with heavy while the enemy is in recovery/hitstun
const BOT_LEVELS = {
  easy:   { label: 'EASY',   react: 9, dodge: 0.50, attack: 0.55, heavy: 0.22, mistake: 0.07, punish: 0.55, recover: 0.92, itemRange: 380 },
  medium: { label: 'MEDIUM', react: 6, dodge: 0.68, attack: 0.72, heavy: 0.32, mistake: 0.035, punish: 0.78, recover: 0.97, itemRange: 480 },
  hard:   { label: 'HARD',   react: 3, dodge: 0.88, attack: 0.9, heavy: 0.4, mistake: 0.01, punish: 0.95, recover: 1.0, itemRange: 620 },
};

function botState(p) {
  if (!p.bot) {
    p.bot = {
      hist: [],            // enemy snapshot history (for reaction delay)
      jumpCd: 0, dodgeAt: -1, dodgeDir: 0, lastEnemyState: 'none', decided: false,
      idle: 0, strafe: 0, strafeT: 0, lastDown: 0,
    };
  }
  return p.bot;
}

function botNeutral() {
  return { left: false, right: false, up: false, down: false, downHeld: false, jump: false, attack: null, throwWeapon: false, dodge: false };
}

// would this hitbox hit the enemy? (uses the game's real hitbox formula)
function botWouldHit(p, enemy, id) {
  const saved = { type: p.attack.type, back: p.attack.back };
  p.attack.type = id;
  const atk = AttackRouter.getAttackData(p, id);
  p.attack.back = !!atk.back;
  let hit = false;
  try {
    const e = enemy.sprite.body;
    const rect = new Phaser.Geom.Rectangle(e.x - 4, e.y - 4, e.width + 8, e.height + 8);
    hit = getHitboxes(p).some((hb) => Phaser.Geom.Intersects.RectangleToRectangle(hb, rect));
  } catch (err) { hit = false; }
  p.attack.type = saved.type;
  p.attack.back = saved.back;
  return hit;
}

function botMainStage() {
  let best = null;
  stageParts.forEach((s) => { if (!s.oneWay && (!best || s.body.width > best.body.width)) best = s; });
  return best || stageParts[0];
}

function botInput(p) {
  const out = botNeutral();
  const L = BOT_LEVELS[p.botLevel || SELECTION.botLevel] || BOT_LEVELS.medium;
  const st = botState(p);
  const enemy = players.find((q) => q !== p);
  if (!enemy || p.dead || match.over || p.spawnHold > 0) return out;

  const body = p.sprite.body, eb = enemy.sprite.body;
  const onFloor = body.blocked.down || body.touching.down;
  const stage = botMainStage();
  const sb = stage.body;

  // ---- enemy snapshot (reaction delay) ----
  st.hist.push({
    x: eb.center.x, y: eb.center.y, vx: eb.velocity.x, vy: eb.velocity.y,
    state: enemy.attack.state, frame: enemy.attack.frame, type: enemy.attack.type, stun: enemy.hitstun, dodge: enemy.dodge.active, dead: enemy.dead,
  });
  if (st.hist.length > 40) st.hist.shift();
  const seen = st.hist[Math.max(0, st.hist.length - 1 - L.react)];
  if (st.jumpCd > 0) st.jumpCd--;
  if (st.idle > 0) { st.idle--; }

  const px = body.center.x, py = body.center.y;
  const dx = seen.x - px, dy = seen.y - py;          // relationship to the enemy (seen with a delay)
  const adx = Math.abs(dx);
  const toEnemy = dx >= 0 ? 1 : -1;
  const setMove = (dir) => { if (dir < 0) out.left = true; else if (dir > 0) out.right = true; };

  // ---- 1) Hitstun: no control ----
  if (p.hitstun > 0) return out;

  // ---- 2) Return to stage (Recovery) ----
  const stageL = sb.left, stageR = sb.right, top = sb.top;
  const offSide = px < stageL - 6 || px > stageR + 6;
  const below = py > top + 10;
  if ((offSide || below) && !onFloor) {
    const center = (stageL + stageR) / 2;
    const dir = px < center ? 1 : -1;
    if (Math.random() < L.recover) setMove(dir);
    // only jump once already falling (vy>0) - to avoid wasting jumps
    if (p.jumpsLeft > 0 && st.jumpCd === 0 && body.velocity.y > 60 && (py > top - 30 || offSide)) {
      out.jump = true; st.jumpCd = 14;
    }
    // when out of jumps, extend sideways with an air dodge
    if (p.jumpsLeft === 0 && canDodge(p, false, false) && (offSide || py > top + 60)) {
      out.dodge = true; out.left = dir < 0; out.right = dir > 0;
    }
    return out;
  }

  const attacking = p.attack.state !== 'none';
  const myStanding = onFloor ? getStandingPlatform(p) : null;

  // ---- 3) Look for and pick up a weapon (if empty-handed and the enemy is not close) ----
  if (!p.weaponId && !attacking) {
    let best = null, bd = 1e9;
    const consider = (spr) => {
      if (!spr || !spr.active) return;
      const d = Math.abs(spr.x - px) + Math.abs(spr.y - py) * 0.6;
      if (d < bd) { bd = d; best = spr; }
    };
    WeaponSystem.pickups.forEach((k) => consider(k.sprite));
    WeaponSystem.thrown.forEach((t) => { if (t.grounded) consider(t.sprite); });
    if (best && bd < L.itemRange && (adx > 140 || Math.random() < 0.02 || bd < adx * 0.7)) {
      const ddx = best.x - px;
      if (Math.abs(ddx) > 10) setMove(ddx > 0 ? 1 : -1);
      if (best.y < py - 70 && onFloor && st.jumpCd === 0) { out.jump = true; st.jumpCd = 16; }
      // if a jump remains, jump again in the air (to reach the upper platform)
      if (!onFloor && best.y < py - 40 && p.jumpsLeft > 0 && body.velocity.y > -60 && st.jumpCd === 0) { out.jump = true; st.jumpCd = 14; }
      return botEdgeSafe(p, out, myStanding, stage);
    }
  }

  // ---- 4) Defend (Dodge) ----
  // decide whether to dodge when the enemy's attack startup is seen (once per attack)
  if (seen.state === 'startup' && st.lastEnemyState !== 'startup') {
    st.decided = Math.random() < L.dodge;
    st.dodgeDir = (Math.random() < 0.7) ? -toEnemy : 0;        // usually roll backward, sometimes a spot dodge
  }
  st.lastEnemyState = seen.state;
  if (st.decided && (seen.state === 'startup' || seen.state === 'active') && !attacking && canDodge(p, false, onFloor)) {
    const eatk = AttackRouter.getAttackData(enemy, seen.type);
    const reach = eatk ? (eatk.projectile ? 420 : (eatk.width || 60) * (eatk.ox == null ? 1 : eatk.ox) + 40) : 90;
    const lateEnough = eatk && seen.state === 'startup' ? (eatk.startup - seen.frame) <= 7 + (6 - Math.min(6, L.react)) : true;
    if (adx < reach + 10 && Math.abs(dy) < 90 && lateEnough) {
      st.decided = false;
      // don't roll toward the edge of the stage
      let dir = st.dodgeDir;
      const edgeDist = dir < 0 ? px - stageL : stageR - px;
      if (dir !== 0 && onFloor && edgeDist < 50) dir = -dir;
      out.dodge = true;
      if (dir < 0) out.left = true; else if (dir > 0) out.right = true;
      return out;
    }
  }

  // ---- 5) Attack (Offence) ----
  if (!attacking && p.cooldown <= 0 && st.idle === 0) {
    const gun = p.weaponId === 'gun';
    const dirFlags = (face) => ({ left: face < 0, right: face > 0 });
    // attack direction candidates: side / neutral / up / down
    const cands = [];
    const f = toEnemy;
    if (gun) {
      const lined = Math.abs(dy) < 38 && adx > 50 && adx < 520;
      if (lined) cands.push({ id: 'light_s', fl: dirFlags(f), shoot: true });
      if (lined && adx > 160) cands.push({ id: 'heavy_s', fl: dirFlags(f), shoot: true });
      if (dy < -60 && adx < 120) cands.push({ id: 'light_u_' + (onFloor ? 'tilt' : 'air'), up: true, shoot: true });
    } else {
      cands.push({ id: 'light_s', fl: dirFlags(f) }, { id: 'heavy_s', fl: dirFlags(f) });
      cands.push({ id: 'light_n', fl: {} }, { id: 'heavy_n', fl: {} });
      cands.push({ id: 'light_u_' + (onFloor ? 'tilt' : 'air'), up: true }, { id: 'heavy_u_' + (onFloor ? 'tilt' : 'air'), up: true });
      cands.push({ id: 'light_d', down: true }, { id: 'heavy_d', down: true });
    }
    // turn to face the enemy so the hitbox can be checked (for a side attack, as it will turn on this frame)
    const savedFacing = p.facing;
    const enemyStunned = seen.stun > 0 || seen.state === 'recovery';
    let chosen = null;
    const ok = cands.filter((c) => {
      if (c.shoot) return true;
      p.facing = c.fl && (c.fl.left || c.fl.right) ? f : savedFacing;
      return botWouldHit(p, enemy, c.id);
    });
    p.facing = savedFacing;
    if (ok.length) {
      const wantHeavy = enemyStunned ? Math.random() < L.punish : Math.random() < L.heavy;
      const pool = ok.filter((c) => c.id.startsWith(wantHeavy ? 'heavy' : 'light'));
      const list = pool.length ? pool : ok;
      // priority: side > up/down > neutral (up/down if the enemy is above/below)
      list.sort((a, b) => botScore(b, dy) - botScore(a, dy));
      chosen = list[0];
    }
    if (chosen && Math.random() < L.attack * (enemyStunned ? 1.15 : 1) && Math.random() > L.mistake) {
      out.attack = chosen.id.startsWith('heavy') ? 'heavy' : 'light';
      if (chosen.fl) { out.left = !!chosen.fl.left; out.right = !!chosen.fl.right; }
      if (chosen.up) out.up = true;
      if (chosen.down) out.downHeld = true;
      // don't use heavy while the enemy is dodging/attacking here (too dangerous)
      if (out.attack === 'heavy' && !enemyStunned && (seen.state === 'startup' || seen.state === 'active') && Math.random() < 0.7) { out.attack = null; out.left = out.right = out.up = out.downHeld = false; }
      else return out;
    }
  }

  // ---- 6) Movement (Spacing / Approach) ----
  if (Math.random() < L.mistake && st.idle === 0) { st.idle = 8 + Math.floor(Math.random() * 12); return out; }   // idle for a moment
  const gun = p.weaponId === 'gun';
  let want = gun ? 230 : (p.weaponId === 'spear' ? 95 : 60);
  if (p.weaponId === 'axe') want = 70;
  // if the enemy is above/below rather than beside
  if (dy < -90 && onFloor && st.jumpCd === 0 && adx < 220) {                // enemy on the upper platform -> jump up
    out.jump = true; st.jumpCd = 16; setMove(toEnemy);
  } else if (dy < -90 && !onFloor && p.jumpsLeft > 0 && body.velocity.y > -40 && st.jumpCd === 0 && adx < 220) {
    out.jump = true; st.jumpCd = 14; setMove(toEnemy);
  } else if (dy > 90 && myStanding && myStanding.oneWay && adx < 200 && Math.random() < 0.1) {
    out.down = true;                                                          // enemy below -> drop down from the platform
  } else if (attacking) {
    if (adx > want) setMove(toEnemy);
  } else if (adx > want + 12) {
    setMove(toEnemy);
  } else if (adx < want * 0.55 && !gun && seen.state === 'startup' && Math.random() < 0.25) {
    setMove(-toEnemy);                                                        // back off when the enemy is about to attack
  } else if (gun && adx < 150) {
    setMove(-toEnemy);                                                        // with a gun, keep distance
  } else {
    // sway side to side so it doesn't stand still
    if (--st.strafeT <= 0) { st.strafeT = 15 + Math.floor(Math.random() * 25); st.strafe = [-1, 0, 1][Math.floor(Math.random() * 3)]; }
    if (st.strafe && adx < want + 40) setMove(st.strafe);
  }
  return botEdgeSafe(p, out, myStanding, stage);
}

function botScore(c, dy) {
  let s = 0;
  if (c.id.indexOf('_s') !== -1) s += 3;
  if (c.up && dy < -35) s += 4;
  if (c.down && dy > 35) s += 4;
  if (c.id.indexOf('_n') !== -1) s += 1;
  return s + Math.random() * 0.9;
}

// don't walk off the stage edge (avoid falling by chasing the enemy)
function botEdgeSafe(p, out, standing, stage) {
  if (!standing || p.attack.state !== 'none') return out;
  const b = p.sprite.body, sb = standing.body;
  const margin = 14;
  if (out.left && b.left < sb.left + margin) out.left = false;
  if (out.right && b.right > sb.right - margin) out.right = false;
  return out;
}
