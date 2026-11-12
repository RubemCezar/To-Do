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


// ---------- MCP (Alexa+) ----------
// Servidor MCP mínimo (Streamable HTTP, JSON-RPC 2.0) com uma ferramenta: add_task.
// A Alexa+ não manda cabeçalho de autorização configurável, então a chave vai no caminho: POST /mcp/<APP_KEY>
const MCP_TOOL = {
  name: 'add_task',
  description: 'Adiciona uma tarefa ou item à lista de tarefas pessoal do usuário (app Pendências). ' +
    'Use quando o usuário pedir para anotar, adicionar ou incluir algo que precisa fazer, lembrar ou comprar. ' +
    'Não use para lembretes com alarme nem para a lista de compras nativa da Alexa.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'O que fazer, curto. Ex.: "comprar pão", "ligar para o dentista".' },
      list: { type: 'string', description: 'Nome da lista, se o usuário citar uma. Ex.: "Compras" (também vale "mercado").' },
      when: { type: 'string', description: 'Quando, se citado, em português. Ex.: "amanhã", "sexta às 14h", "todo dia".' },
    },
    required: ['title'],
  },
};

function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }

async function mcpCall(msg, env) {
  const { id, method, params } = msg || {};
  if (method === 'initialize') {
    const v = (params && params.protocolVersion) || '2025-11-25';
    return rpcResult(id, { protocolVersion: v, capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'pendencias', version: '1.0.0' } });
  }
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: [MCP_TOOL] });
  if (method === 'tools/call') {
    if (!params || params.name !== 'add_task') return rpcError(id, -32602, 'ferramenta desconhecida');
    const a = params.arguments || {};
    const title = String(a.title || '').replace(/\s+/g, ' ').trim();
    const list = String(a.list || '').replace(/\s+/g, ' ').trim();
    const when = String(a.when || '').replace(/\s+/g, ' ').trim();
    if (!title) return rpcResult(id, { isError: true, content: [{ type: 'text', text: 'Faltou dizer o que anotar.' }] });
    const text = [title, when, list ? 'na lista ' + list : ''].filter(Boolean).join(' ').slice(0, MAX_TEXT);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM inbox').first('n');
    if (n >= MAX_ITEMS) return rpcResult(id, { isError: true, content: [{ type: 'text', text: 'A caixa de entrada está cheia. Abra o app para sincronizar.' }] });
    await env.DB.prepare('INSERT INTO inbox (id, text, at) VALUES (?, ?, ?)').bind(crypto.randomUUID(), text, Date.now()).run();
    return rpcResult(id, { content: [{ type: 'text', text: 'Anotado: ' + text }] });
  }
  return rpcError(id, -32601, 'método não suportado');
}

async function handleMcp(req, env, key) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (!env.APP_KEY || env.APP_KEY.length < 16 || !(await sameSecret(key, env.APP_KEY))) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401, headers: h });
  }
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  let body;
  try { body = await req.json(); } catch (e) { return new Response(JSON.stringify(rpcError(null, -32700, 'JSON inválido')), { status: 400, headers: h }); }
  try {
    if (Array.isArray(body)) {
      const out = [];
      for (const m of body) { if (m && m.id !== undefined) out.push(await mcpCall(m, env)); }
      return out.length ? new Response(JSON.stringify(out), { status: 200, headers: h }) : new Response(null, { status: 202 });
    }
    if (!body || body.id === undefined) return new Response(null, { status: 202 }); // notificações (ex.: notifications/initialized)
    return new Response(JSON.stringify(await mcpCall(body, env)), { status: 200, headers: h });
  } catch (e) {
    return new Response(JSON.stringify(rpcError(body && body.id, -32603, 'erro interno')), { status: 200, headers: h });
  }
}

export default {
  async fetch(req, env) {
    const mm = /^\/mcp\/([^/]+)\/?$/.exec(new URL(req.url).pathname);
    if (mm) return handleMcp(req, env, decodeURIComponent(mm[1]));
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
