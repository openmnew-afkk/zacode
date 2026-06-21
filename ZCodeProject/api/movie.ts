/* ===== /api/movie — детали фильма/сериала из VideoCDN ===== */
import { getToken, fetchVCdn, json, error, CORS_HEADERS, ResShape } from './_lib/videocdn';
import { normalizeItem, normalizeSeasons } from './_lib/normalize';

export default async function handler(req: {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}): Promise<ResShape> {
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    const token = getToken(req);
    const url = new URL(req.url || '', 'http://localhost');
    const params = url.searchParams;
    const id = params.get('id') || '';
    const type = params.get('type') || '';

    if (!id) return error('Не указан id', 400);

    // Поиск по kinopoisk_id (основной), fallback на imdb_id
    const raw = await fetchVCdn(
      {
        kinopoisk_id: /^\d+$/.test(id) ? id : undefined,
        imdb_id: !/^\d+$/.test(id) ? id : undefined,
        type: type || undefined,
        limit: 5,
      },
      token
    );

    const data = raw?.data;
    if (!Array.isArray(data) || data.length === 0) {
      return error('Фильм не найден', 404);
    }

    // Берём элемент с richest material_data (есть seasons)
    const best =
      data.find((d: any) => Array.isArray(d.seasons) && d.seasons.length > 0) || data[0];

    const item = normalizeItem(best);
    const seasons = normalizeSeasons(best.seasons || []);

    // Подобные: другой запрос не делаем — отдаём пусто, клиент не отрисует
    return json({
      ok: true,
      movie: { ...item, seasons },
      similar: [],
    });
  } catch (e: any) {
    const msg = e?.message || 'MOVIE_ERROR';
    if (msg === 'NO_TOKEN') return error('Токен VideoCDN не указан', 401);
    if (msg === 'BAD_TOKEN') return error('Неверный токен VideoCDN', 401);
    if (msg === 'UPSTREAM_404') return error('Фильм не найден', 404);
    return error(msg, 502);
  }
}
