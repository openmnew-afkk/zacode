/* ===== /api/player — ссылка на плеер VideoCDN по id ===== */
import { getToken, fetchVCdn, json, error, CORS_HEADERS, ResShape } from './_lib/videocdn';
import { pickId } from './_lib/normalize';

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

    if (!id) return error('Не указан id', 400);

    const raw = await fetchVCdn(
      {
        kinopoisk_id: /^\d+$/.test(id) ? id : undefined,
        imdb_id: !/^\d+$/.test(id) ? id : undefined,
        limit: 1,
      },
      token
    );

    const data = raw?.data;
    if (!Array.isArray(data) || data.length === 0 || !data[0].iframe_url) {
      return error('Плеер не найден', 404);
    }

    const item = data[0];
    let link: string = item.iframe_url;
    if (link.startsWith('//')) link = `https:${link}`;

    return json({
      ok: true,
      url: link,
      id: pickId(item),
      quality: item.quality || '',
      translator: item.translator || '',
    });
  } catch (e: any) {
    const msg = e?.message || 'PLAYER_ERROR';
    if (msg === 'NO_TOKEN') return error('Токен VideoCDN не указан', 401);
    if (msg === 'BAD_TOKEN') return error('Неверный токен VideoCDN', 401);
    if (msg === 'UPSTREAM_404') return error('Плеер не найден', 404);
    return error(msg, 502);
  }
}
