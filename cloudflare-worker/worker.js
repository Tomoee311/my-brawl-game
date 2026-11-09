/**
 * My Brawl Game - Cloudflare Realtime TURN credential broker.
 * Secrets are stored with `wrangler secret put`, never in index.html/GitHub.
 */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
    const corsOrigin = allowed.includes(origin) ? origin : '';
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Vary': 'Origin',
      ...(corsOrigin ? {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      } : {})
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (url.pathname !== '/api/turn-credentials') return new Response('Not found', { status: 404 });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers });
    if (!corsOrigin) return new Response('Origin not allowed', { status: 403, headers });
    if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) return new Response('TURN service is not configured', { status: 503, headers });

    const upstream = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.TURN_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ttl: 86400 })
      }
    );
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
};
