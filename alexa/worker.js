// "Caderno na nuvem" das tarefas ditas à Alexa.
// Guarda numa caixa de entrada (D1) o que a Alexa anota; o app busca e confirma (ack).
// Segredo necessário (Settings > Variables and Secrets): APP_KEY
// Banco D1 ligado ao Worker com o nome de variável: DB

const ORIGINS = ['https://rubemcezar.github.io', 'http://localhost:8765'];
const MAX_TEXT = 300;
const MAX_ITEMS = 200;

function corsHeaders(req) {
  const o = req.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (o && ORIGINS.includes(o)) h['Access-Control-Allow-Origin'] = o;
  return h;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const A = new Uint8Array(x), B = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < A.length; i++) d |= A[i] ^ B[i];
  return d === 0;
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (!env.APP_KEY || env.APP_KEY.length < 16) return json({ error: 'servidor sem chave configurada' }, 500, cors);
    const auth = req.headers.get('Authorization') || '';
    if (!(await sameSecret(auth, 'Bearer ' + env.APP_KEY))) return json({ error: 'não autorizado' }, 401, cors);

    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/inbox' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, text, at FROM inbox ORDER BY at ASC LIMIT 100').all();
        return json({ items: results }, 200, cors);
      }

      if (path === '/add' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
        if (!text) return json({ error: 'texto vazio' }, 400, cors);
        const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM inbox').first('n');
        if (n >= MAX_ITEMS) return json({ error: 'caixa cheia' }, 429, cors);
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO inbox (id, text, at) VALUES (?, ?, ?)').bind(id, text, Date.now()).run();
        return json({ ok: true, id }, 200, cors);
      }

      if (path === '/ack' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const ids = (Array.isArray(body.ids) ? body.ids : []).filter(x => typeof x === 'string').slice(0, 100);
        if (ids.length) {
          await env.DB.batch(ids.map(id => env.DB.prepare('DELETE FROM inbox WHERE id = ?').bind(id)));
        }
        return json({ ok: true, removed: ids.length }, 200, cors);
      }

      return json({ error: 'não encontrado' }, 404, cors);
    } catch (e) {
      return json({ error: 'erro interno' }, 500, cors);
    }
  },
};
