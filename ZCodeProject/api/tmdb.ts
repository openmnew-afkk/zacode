/* ===== /api/tmdb — Vercel serverless прокси к TMDB API =====
 * Решает проблему CORS: TMDB не отдаёт Access-Control-Allow-Origin.
 * Ключ читается из VITE_TMDB_KEY (на проде) или из заголовка x-tmdb-key.
 */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_KEY = 'dc003aabe0e60ef32360bfdf70deac32';

export default async function handler(req: { url?: string; method?: string; headers?: Record<string, string | string[] | undefined> }) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const path = url.searchParams.get('path') || '';
    const query = url.searchParams.get('query') || '{}';

    if (!path) {
      return json({ error: 'path required' }, 400);
    }

    // Ключ: env → заголовок → дефолтный
    const key = process.env.VITE_TMDB_KEY || (typeof req.headers?.['x-tmdb-key'] === 'string' ? req.headers['x-tmdb-key'] : null) || DEFAULT_KEY;

    // Собираем URL к TMDB
    const tmdbUrl = new URL(`${TMDB_BASE}${path}`);
    tmdbUrl.searchParams.set('api_key', key);
    tmdbUrl.searchParams.set('language', 'ru-RU');

    // Доп. параметры из query JSON
    try {
      const extra = JSON.parse(query);
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== null && v !== '') tmdbUrl.searchParams.set(k, String(v));
      }
    } catch {}

    const res = await fetch(tmdbUrl.toString());
    const data = await res.json();

    return json(data, res.status);
  } catch (e: any) {
    return json({ error: e?.message || 'TMDB_PROXY_ERROR' }, 502);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tmdb-key',
    'Cache-Control': 'public, max-age=120, s-maxage=300',
  };
}

function json(data: any, status = 200) {
  return {
    statusCode: status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data),
  };
}
