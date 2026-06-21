/* ===== /api/catalog — список и поиск фильмов/сериалов из VideoCDN ===== */
import { getToken, fetchVCdn, json, error, CORS_HEADERS, ResShape } from './_lib/videocdn';
import { normalizeItem, normalizeList, GENRES } from './_lib/normalize';

export default async function handler(req: {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}): Promise<ResShape> {
  // Preflight
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    const token = getToken(req);
    const url = new URL(req.url || '', 'http://localhost');
    const params = url.searchParams;

    // Мета-запрос: список жанров
    if (params.get('meta') === '1') {
      return json({ ok: true, genres: GENRES });
    }

    const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    const limit = Math.min(40, Math.max(1, parseInt(params.get('limit') || '20', 10) || 20));
    const q = params.get('q') || '';
    const type = params.get('type') || params.get('category') || '';
    const genre = params.get('genre') || '';
    const year = params.get('year') || '';
    const sort = params.get('sort') || '';

    // Собираем параметры для VideoCDN
    const vcdnParams: Record<string, string | number | undefined> = {
      page,
      limit,
      query: q || undefined,
      type: type || undefined,
      year: year || undefined,
      genre_id: genre || undefined,
    };

    // Сортировка
    if (sort) {
      const map: Record<string, { field: string; dir: string }> = {
        novelty: { field: 'created_at', dir: 'desc' },
        top: { field: 'imdb_rating', dir: 'desc' },
        top_kp: { field: 'kp_rating', dir: 'desc' },
        year: { field: 'year', dir: 'desc' },
        views: { field: 'views', dir: 'desc' },
      };
      const s = map[sort] || map.novelty;
      vcdnParams.order_by = s.field;
      vcdnParams.direction = s.dir;
    } else {
      vcdnParams.order_by = 'created_at';
      vcdnParams.direction = 'desc';
    }

    const raw = await fetchVCdn(vcdnParams, token);
    const normalized = normalizeList(raw);

    return json({
      ok: true,
      page,
      results: normalized.items,
      total_pages: normalized.lastPage,
      total_results: normalized.total,
    });
  } catch (e: any) {
    const msg = e?.message || 'CATALOG_ERROR';
    if (msg === 'NO_TOKEN') return error('Токен VideoCDN не указан', 401);
    if (msg === 'BAD_TOKEN') return error('Неверный токен VideoCDN', 401);
    if (msg === 'UPSTREAM_404') return json({ ok: true, page: 1, results: [], total_pages: 0, total_results: 0 });
    return error(msg, 502);
  }
}
