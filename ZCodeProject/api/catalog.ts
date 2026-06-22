/* ===== /api/catalog — поиск и детали через OMDb API (бесплатно) =====
 *
 * GET /api/catalog?q=Matrix&page=1 — поиск по названию
 * GET /api/catalog?id=tt0133093 — детали по IMDb ID
 * GET /api/catalog?meta=1 — жанры (хардкод)
 */

import { fetchOMDb, json, error, handleOptions, ResShape } from './_lib/omdb';

/* ===== Хардкодные жанры (OMDb не возвращает список жанров) ===== */
const GENRES = [
  { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
  { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Документальный' },
  { id: 16, name: 'Криминал' }, { id: 17, name: 'Биография' }, { id: 18, name: 'Спорт' },
  { id: 19, name: 'Вестерн' }, { id: 20, name: 'Мюзикл' },
];

/** Нормализовать один фильм из OMDb Search-ответа */
function normalizeSearchItem(item: any) {
  const imdbID = item.imdbID || '';
  const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : null;
  return {
    id: imdbID,
    title: item.Title || 'Без названия',
    original_title: '',
    overview: '',
    poster_path: poster,
    backdrop_path: poster,
    release_date: item.Year || '',
    vote_average: 0,
    kinopoisk_rating: 0,
    imdb_rating: 0,
    runtime: null,
    genre_ids: [],
    genres: [] as { id: number; name: string }[],
    type: item.Type === 'series' ? 'serial' : 'movie',
    is_serial: item.Type === 'series',
    imdb_id: imdbID,
    kinopoisk_id: imdbID,
    quality: '',
    translator: '',
    iframe_url: '',
    countries: [] as string[],
    actors: [] as string[],
    directors: [] as string[],
    popularity: 0,
    adult: false,
  };
}

/** Нормализовать детальный фильм (из ?i= или ?t= запроса) */
function normalizeDetail(item: any) {
  const base = normalizeSearchItem(item);
  const genreNames = item.Genre?.split(', ')?.filter(Boolean) || [];
  const actors = item.Actors?.split(', ')?.filter(Boolean) || [];
  const directors = item.Director?.split(', ')?.filter(Boolean) || [];
  const countries = item.Country?.split(', ')?.filter(Boolean) || [];

  // Извлекаем рейтинг IMDb
  const imdbRating = parseFloat(item.imdbRating) || 0;

  // runtime: "148 min" -> 148
  const runtimeMatch = item.Runtime?.match(/(\d+)/);
  const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : null;

  return {
    ...base,
    overview: item.Plot && item.Plot !== 'N/A' ? item.Plot : '',
    vote_average: imdbRating,
    imdb_rating: imdbRating,
    runtime,
    genre_ids: genreNames.map((_: string, i: number) => i + 1),
    genres: genreNames.map((name: string, i: number) => ({ id: i + 1, name })),
    actors,
    directors,
    countries,
    // Используем постер из детального ответа (он может быть больше)
    poster_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    backdrop_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    is_serial: item.Type === 'series',
    type: item.Type === 'series' ? 'serial' : 'movie',
  };
}

/* ===== Хендлер ===== */

export default async function handler(req: {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}): Promise<ResShape> {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const params = url.searchParams;

    // === Мета: жанры ===
    if (params.get('meta') === '1') {
      return json({ ok: true, genres: GENRES });
    }

    // === Детали одного фильма по IMDb ID ===
    const id = params.get('id');
    if (id) {
      const data = await fetchOMDb({ i: id, plot: 'full' });
      if (!data || data.Response === 'False') {
        return error('Фильм не найден', 404);
      }
      const movie = normalizeDetail(data);
      return json({ ok: true, movie, similar: [] });
    }

    // === Поиск ===
    const page = Math.max(1, parseInt(params.get('page') || '1') || 1);
    const query = params.get('q') || '';

    if (query) {
      const data = await fetchOMDb({ s: query, page, type: 'movie' });
      const items = (data?.Search || []).map(normalizeSearchItem);

      // Для первых 5 результатов подгружаем детали (чтобы был рейтинг, описание)
      const enriched = await Promise.all(
        items.map(async (item: any, i: number) => {
          if (i < 5 && item.imdb_id) {
            try {
              const detail = await fetchOMDb({ i: item.imdb_id });
              if (detail && detail.Response !== 'False') {
                return normalizeDetail(detail);
              }
            } catch { /* fallback to basic */ }
          }
          return item;
        })
      );

      return json({
        ok: true,
        page,
        results: enriched,
        total_pages: Math.min(10, Math.ceil((parseInt(data?.totalResults || '0') || 0) / 10)),
        total_results: parseInt(data?.totalResults || '0') || 0,
      });
    }

    // === Главная (популярные) — поиск годовыми запросами ===
    const currentYear = new Date().getFullYear();
    // Ищем фильмы текущего года (свежие)
    let popular: any[] = [];
    for (const searchTerm of ['2026', '2025', '2024']) {
      if (popular.length >= 20) break;
      try {
        const data = await fetchOMDb({
          s: searchTerm,
          type: 'movie',
          page: 1,
          y: searchTerm,
        });
        if (data?.Search) {
          popular = [...popular, ...data.Search.slice(0, 6)];
        }
      } catch { /* skip */ }
    }

    // Убираем дубликаты по imdbID
    const seen = new Set<string>();
    const unique = popular.filter((m: any) => {
      if (seen.has(m.imdbID)) return false;
      seen.add(m.imdbID);
      return true;
    });

    // Обогащаем первые 6
    const enriched = await Promise.all(
      unique.slice(0, 20).map(async (item: any) => {
        try {
          const detail = await fetchOMDb({ i: item.imdbID });
          if (detail && detail.Response !== 'False') {
            return normalizeDetail(detail);
          }
        } catch { /* fallback */ }
        return normalizeSearchItem(item);
      })
    );

    return json({
      ok: true,
      page: 1,
      results: enriched,
      total_pages: 1,
      total_results: enriched.length,
    });
  } catch (e: any) {
    const msg = e?.message || 'CATALOG_ERROR';
    return error('Ошибка каталога: ' + msg, 502);
  }
}
