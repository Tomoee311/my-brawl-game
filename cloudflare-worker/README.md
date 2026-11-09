# Cloudflare TURN credential Worker

This Worker issues short-lived Cloudflare Realtime TURN credentials. It keeps the long-lived TURN key and API token on the server, not in the public game files.

## Setup

1. Create a Cloudflare account and enable Realtime TURN. Create a TURN key and an API token with permission to manage/generate Realtime TURN credentials.
2. Install Wrangler: `npm i -g wrangler`, then run `wrangler login` from this folder.
3. Set the secrets (never commit them):
   - `wrangler secret put TURN_KEY_ID`
   - `wrangler secret put TURN_API_TOKEN`
4. Edit `wrangler.toml` and set `ALLOWED_ORIGINS` to the exact Vercel site origin, e.g. `https://my-brawl-game.vercel.app`.
5. Deploy: `wrangler deploy`.
6. Copy the Worker URL, normally `https://my-brawl-turn-credentials.<your-subdomain>.workers.dev/api/turn-credentials`.
7. In the root `index.html`, set `window.TURN_CREDENTIALS_URL` to that URL and redeploy Vercel.

The game still prefers direct ICE candidate pairs. TURN is only selected by WebRTC when a direct route cannot be established. Cloudflare Realtime TURN currently documents a 1,000 GB/month free allowance, then $0.05/GB egress; check your Cloudflare dashboard and current pricing before enabling billing. STUN is free.

## Security

- Never put `TURN_KEY_ID`'s API token or a long-lived TURN secret in `index.html`, `net.js`, GitHub, or client-side environment variables.
- Rotate the old Metered TURN credentials that were previously embedded in the public `index.html`.
- The Worker only permits origins listed in `ALLOWED_ORIGINS` and sends `Cache-Control: no-store`.
