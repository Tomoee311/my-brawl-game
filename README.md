# My Brawl Game

Phaser 3 platform fighter (Brawlhalla style). Modes: **Friends** (same PC), **Bot**, **Online 1v1** (room code, peer-to-peer) and a **Tutorial** against a training dummy.

## Run locally
    python3 -m http.server 8000     # then open http://localhost:8000
(needs internet: Phaser and PeerJS load from a CDN)

## Roster (9 fighters)
| Fighter | Weapons | Style |
|---|---|---|
| Zayar - The Night Duelist | katana + gun | fast, flashy |
| Sandar - The Moon Reaper | katana + spear | balanced |
| Weikza - The Mist Alchemist | spear + gun | ranged / tricky |
| Sithu - The Golden Guard | sword + axe | sturdy fighter |
| Thura - The Dragonfire Monk | sword + spear | aggressive |
| Padamya - The Violet Lotus Dancer | chakram | aerial |
| Thaung - The Iron Elephant | axe | heavy tank |
| Hla - The Storm Bell | spear | mid-range zoner |
| Kan - The Crimson Ronin | axe + gun | rushdown |

## Attack styles (every fighter fights differently)
The weapon tables in `weapons.js` give the base numbers; each fighter's own style is in `moves` inside `characters.js` and is merged on top by `moves.js`
(multi-hit stages, lunges, super armor, spins, shotgun fans, double taps). The sprite poses (`tools/fighters*.py`) and effects (`HERO_SWING` in `juice.js`) match.

| Fighter | Light | Heavy |
|---|---|---|
| Zayar | katana: quick 2-hit slash, gun: double tap | katana: dash-draw slash (lunge), gun: fast strong shot |
| Sandar | katana: wide crescent sweep | katana / spear: spinning 2-hit sweep (hits both sides) |
| Weikza | spear: poke + mist burst further ahead | spear: poke + big burst, gun: 3-pellet fan |
| Sithu | deliberate sword / axe strikes | overhead royal strike with super armor |
| Thura | sword: 3-hit flurry, spear: staff spin | sword: rising dragon uppercut, spear: flame thrust |
| Padamya | orbiting ring, 3 hits | boomerang ring, hits going out and coming back |
| Thaung | shoulder charge (lunge) | ground slam shockwave on both sides, super armor |
| Hla | very fast long jabs | long lunging thunder thrust |
| Kan | forward 2-hit axe chain, shotgun pair | spinning cog (3 hits), 4-pellet close-range burst |

**Brawlhalla-style signatures** (every fighter has their own version): side heavy = dash-in strike (`lunge`) or a hook that drags the enemy in (`pull`: Sandar's and Weikza's spears);
heavy up = a rising strike that boosts the fighter upward (`boost`; in the air it works once per airtime until you land or hit someone: a recovery);
heavy down = a dive / ground pound (`dive`); heavy neutral = the fighter's signature (spin, boomerang ring, ground slam, mist burst...).

**Movement like Brawlhalla**
- **Ledge grab** - fall next to the edge of the main stage (not the one-way platforms) and you grab the ledge: safe for a moment, jumps / dash / recovery refresh.
  Get up with jump (full jump), light/heavy (get-up attack), dodge (get-up roll), hold toward the stage (climb), or let go with down / away. Max hang time 4 s. Logic in `ledge.js` + `game.js`.
- **Fast fall** - hold down while falling.
- **Gravity cancel** - hitting an enemy in the air freezes your fall for a moment (once per airtime) so you can follow up.
- **3-hit light combo** - press neutral / side light again quickly: hit 1, hit 2, then a strong finisher. Defaults in `moves.js` (`COMBO_DEFAULT`), per fighter `combo: [hit2, hit3]` in `characters.js`.

Run all checks: `node tests/load.test.js`, `moves.test.js`, `ledge.test.js`, `fighters.test.js`, `effects.test.js`, `net.test.js`, `peer-flow.test.js`.

## Controls (default - all rebindable in Lobby > Settings, keyboard and mouse)
| | Player 1 | Player 2 |
|---|---|---|
| Move | A / D | Left / Right arrows |
| Up / Down | W / S | Up / Down arrows |
| Jump (3 jumps) | Space | Enter |
| Dash / dodge | Shift | Numpad 0 |
| Light attack | J or left click | Numpad 1 |
| Heavy attack | K or right click | Numpad 2 |
| Pick up / throw weapon | E, Q or middle click | Numpad 3, M |

- Weapons are picked up only when you press the pick up / throw key (or left click) next to them. Holding a direction while throwing aims the throw (up, diagonal, down).
- A thrown weapon that hits an enemy drops to the floor and only the thrower can pick it up again (the same weapon comes back).
- Hitting an enemy while you are in the air gives +1 jump and +1 dash (up to 3 dashes).
- Light attacks have a minimum cycle time so they cannot be spammed.
- Settings (volume + controls) are saved in the browser (localStorage).

## Online mode
- PLAY ONLINE -> HOST A ROOM gives a 4-letter code (or press C to copy an invite link).
- Friend: PLAY ONLINE -> JOIN A ROOM, type the code (or open the invite link).
- Peer-to-peer WebRTC through the free PeerJS cloud (signalling only). No server of your own, no cost.
- Deterministic lockstep: only button presses are sent; input delay adapts to ping + jitter during the match (2-12 frames). The top of the match screen shows ping, input delay and DIRECT / RELAY (relay = slower).
- Stage select: both players vote. Same pick = that stage, different picks = random one of the two.
- After a match: R = rematch, M = re-pick hero/stage (both players go back to select), L = leave (the opponent returns to the lobby automatically).
- Keep the game tab visible while playing (browsers pause hidden tabs, which makes the opponent wait).
- Same browser family on both sides (Chrome/Edge) is safest; a hash check shows "GAME OUT OF SYNC" if the games diverge.

## Maps (4)
| Map | Look | Layout |
|---|---|---|
| Golden Pagoda Skies | golden pagodas, balloons, evening cloud sea | wide main stage + 2 side platforms |
| Moonlit Lotus Lake | lotus pond under a full moon | wide main stage + 2 side platforms |
| Mount Popa Embers | volcanic dusk, lava rivers, drifting embers | narrow main stage + 3 platforms (one high in the middle) |
| Frostpeak Aurora | snow peaks under an aurora, ice pagodas | extra-wide main stage + 2 far side platforms |

Maps are defined in `MAPS` in `game.js` (colliders, background layers, stage art). The art of the two newest maps is painted by code:
`python3 tools/make_maps.py` (or `popa` / `aurora`). Replace the PNGs in `assets/maps/<id>/` with hand-painted art any time.

## Character art
Sprite sheets are in `assets/chars/<name>_<weapon>.png` (8 columns x 11 rows of 160x128 frames, facing right).
The art of all nine fighters is drawn by code, so it can be redrawn at any time:

    pip install pillow numpy
    python3 tools/make_chibi.py            # redraw everybody
    python3 tools/make_chibi.py kan hla    # only some fighters

Colours, hats, hair and so on are in `tools/fighters.py` / `tools/fighters2.py`. When you have hand-drawn art, replace the PNGs and stop running the script.
Names and stats live in `characters.js`. `tools/generate_sfx.py` creates the sound effects.

## Look & feel
Shared UI kit in `ui.js` (glass panels, icons, embers). Font: Poppins from Google Fonts (falls back to Segoe UI/Arial if offline).

## Deploy
GitHub repo root = this folder. Vercel: Framework "Other", no build command, no output directory.

## Tests (Node)
    node tests/net.test.js && node tests/peer-flow.test.js && node tests/load.test.js
