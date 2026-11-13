// ledge.js - ledge grabbing, pure maths (no Phaser) so it can be unit-tested. game.js does the actual state handling.
//
// A fighter that is falling next to the edge of a SOLID stage piece (not a one-way platform) grabs the ledge and hangs there:
//   - invulnerable for a moment, jumps / air dash / recovery refreshed
//   - jump = get up with a jump, attack = get-up attack, dodge = invulnerable get-up roll, toward the stage = climb up,
//     down / away from the stage = let go.  Max hang time LEDGE.MAX_FRAMES.

const LEDGE = {
  GRAB_X: 34,        // how far outside the edge (px) the fighter's centre may be
  GRAB_IN: 6,        // ...and how far inside it
  TOP_MIN: -14,      // the fighter's top may be this far above the platform top
  TOP_MAX: 44,       // ...or this far below it
  MIN_FALL_VY: -40,  // must not be rising faster than this
  MAX_FRAMES: 240,   // 4 seconds, then the fighter lets go
  INVULN: 40,        // frames of invulnerability after grabbing
  GRACE: 6,          // frames before any input is accepted (a held key from the fall must not trigger it)
  REGRAB: 80,        // frames before the same ledge can be grabbed again (until you land)
};

// parts: [{ id, left, right, top, oneWay }]   body: { cx, top, vy }
// taken: [{ id, side }] ledges somebody else is hanging on      blocked: { id, side } | null  (the ledge we just left)
function findLedge(parts, body, taken, blocked) {
  if (body.vy < LEDGE.MIN_FALL_VY) return null;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.oneWay) continue;
    for (let s = -1; s <= 1; s += 2) {
      const edge = s < 0 ? p.left : p.right;
      const outside = (body.cx - edge) * s;               // > 0 = beyond the edge, away from the stage
      const dy = body.top - p.top;
      if (outside < -LEDGE.GRAB_IN || outside > LEDGE.GRAB_X) continue;
      if (dy < LEDGE.TOP_MIN || dy > LEDGE.TOP_MAX) continue;
      if (blocked && blocked.id === p.id && blocked.side === s) continue;
      if ((taken || []).some((t) => t.id === p.id && t.side === s)) continue;
      return { part: p, side: s };
    }
  }
  return null;
}

// centre of the body while hanging: just outside the edge, hands at the platform top
function ledgeHangCenter(part, side, bodyW, bodyH) {
  const edge = side < 0 ? part.left : part.right;
  return { x: edge + side * (bodyW / 2 + 3), y: part.top + 2 };
}

// centre of the body when standing on the platform again (a little inside the edge)
function ledgeGetUpCenter(part, side, bodyW, bodyH) {
  const edge = side < 0 ? part.left : part.right;
  return { x: edge - side * (bodyW / 2 + 8), y: part.top - bodyH / 2 - 1 };
}
