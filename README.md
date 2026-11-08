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
