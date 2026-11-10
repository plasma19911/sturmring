// Sturmring-Bestenliste als Cloudflare Worker mit KV-Speicher (Binding-Name: LB)
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/top' && req.method === 'GET') {
      const list = (await env.LB.get('top', 'json')) || [];
      return json(list.slice(0, 50));
    }

    if (url.pathname === '/score' && req.method === 'POST') {
      let b;
      try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const id = String(b.id || '').replace(/[^0-9a-f]/g, '').slice(0, 24);
      const name = String(b.name || 'Bot').replace(/[<>]/g, '').trim().slice(0, 16) || 'Bot';
      const place = Math.max(1, Math.min(1000, b.place | 0));
      const kills = Math.max(0, Math.min(200, b.kills | 0));
      const win = b.win ? 1 : 0;
      const level = Math.max(1, Math.min(999, b.level | 0));
      if (id.length < 16) return json({ error: 'bad id' }, 400);

      const list = (await env.LB.get('top', 'json')) || [];
      let p = list.find(x => x.id === id);
      if (!p) { p = { id, name, games: 0, wins: 0, kills: 0, best: 1000, level }; list.push(p); }
      p.name = name; p.level = Math.max(p.level, level);
      p.games++; p.wins += win; p.kills += kills; p.best = Math.min(p.best, place);
      // Sortierung: Siege, dann Kills, dann beste Platzierung
      list.sort((a, c) => c.wins - a.wins || c.kills - a.kills || a.best - c.best);
      await env.LB.put('top', JSON.stringify(list.slice(0, 500)));
      return json({ ok: true, rank: list.findIndex(x => x.id === id) + 1 });
    }
    return json({ error: 'not found' }, 404);
  },
};
