# My Brawl Game

Phaser 3 brawler. Modes: Friends (same PC), Bot, and **Online 1v1** (room code, peer-to-peer).

## Run locally
    python3 -m http.server 8000     # then open http://localhost:8000
(needs internet: Phaser and PeerJS load from a CDN)

## Online mode
- PLAY ONLINE -> HOST A ROOM gives a 4-letter code (or press C to copy an invite link).
- Friend: PLAY ONLINE -> JOIN A ROOM, type the code (or open the invite link).
- Peer-to-peer WebRTC through the free PeerJS cloud (signalling only). No server of your own, no cost.
- Deterministic lockstep: only button presses are sent; input delay adapts to ping + jitter during the match (2-12 frames). The top of the match screen shows ping, input delay and DIRECT / RELAY (relay = slower).
- Stage select: both players vote. Same pick = that stage, different picks = random one of the two.
- After a match: R = rematch, M = re-pick hero/stage (both players go back to select), L = leave (the opponent returns to the lobby automatically).
- Keep the game tab visible while playing (browsers pause hidden tabs, which makes the opponent wait).
- Same browser family on both sides (Chrome/Edge) is safest; a hash check shows "GAME OUT OF SYNC" if the games diverge.

## Look & feel
Shared UI kit in `ui.js` (glass panels, icons, embers). Font: Poppins from Google Fonts (falls back to Segoe UI/Arial if offline).

## Deploy
GitHub repo root = this folder. Vercel: Framework "Other", no build command, no output directory.

## Tests (Node)
    node tests/net.test.js && node tests/peer-flow.test.js && node tests/load.test.js
