/* ===== Локальный dev-сервер для API-прокси =====
 * Запускать: node server.mjs (порт 3001)
 * Vite проксирует /api/* на этот сервер.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const BUILTIN_KEY = 'dc003aabe0e60ef32360bfdf70deac32';

import http from 'http';
import { URL } from 'url';

const server = http.createServer(async (req, res) => {
  // CORS для Vite
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tmdb-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.searchParams.get('path');
    const queryRaw = url.searchParams.get('query') || '{}';

    if (!path) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path required' }));
      return;
    }

    // Ключ: заголовок → env → встроенный
    const key = (typeof req.headers['x-tmdb-key'] === 'string' ? req.headers['x-tmdb-key'] : null) || process.env.TMDB_API_KEY || BUILTIN_KEY;

    const tmdbUrl = new URL(`${TMDB_BASE}${path}`);
    tmdbUrl.searchParams.set('api_key', key);
    tmdbUrl.searchParams.set('language', 'ru-RU');

    try {
      const extra = JSON.parse(queryRaw);
      for (const [k, v] of Object.entries(extra)) {
        if (v != null && v !== '') tmdbUrl.searchParams.set(k, String(v));
      }
    } catch {}

    const apiRes = await fetch(tmdbUrl.toString());
    const data = await apiRes.json();

    res.writeHead(apiRes.status, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' });
    res.end(JSON.stringify(data));
  } catch (e: any) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e?.message || 'PROXY_ERROR' }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ API proxy running on http://localhost:${PORT}`);
});
