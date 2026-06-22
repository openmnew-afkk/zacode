/* ===== /api/catalog — каталог, поиск, детали из poiskkino.dev =====
 *
 * GET /api/catalog?q=...&page=...&sort=...&genre=...&year=... — список/поиск
 * GET /api/catalog?id=... (kinopoisk_id) — детали + similar
 * GET /api/catalog?meta=1 — жанры
 */

import { getToken, fetchPoiskkino, hasToken } from './_lib/poiskkino';
import { json, error, handleOptions, CORS_HEADERS, ResShape } from './_lib/common';

/* ===== Нормализация ===== */

interface KPMovieDoc {
  id: number;
  name: string;
  alternativeName: string;
  enName?: string;
  year: number;
  description: string;
  shortDescription: string;
  movieLength: number;
  ageRating: number;
  rating: { kp: number; imdb: number; filmCritics: number; russianFilmCritics: number; await: number };
  votes: { kp: number; imdb: number };
  poster: { url: string; previewUrl: string };
  backdrop: { url: string; previewUrl: string };
  genres: { name: string }[];
  countries: { name: string }[];
  persons: KPAPerson[];
  similarMovies: KPSimilarMovie[];
  seasonsInfo: KPSeasonInfo[];
  isSeries: boolean;
  type: string;
  externalId: { kpHD: string; imdb: string; tmdb: number };
}

interface KPAPerson {
  id: number;
  name: string;
  enName: string;
  photo: string;
  profession: string;
  enProfession: string;
}

interface KPSimilarMovie {
  id: number;
  name: string;
  alternativeName: string;
  poster: { url: string; previewUrl: string };
  year: number;
  rating: { kp: number; imdb: number };
}

interface KPSeasonInfo {
  number: number;
  episodesCount: number;
}

/** Нормализовать один фильм из poiskkino */
function normalizeMovie(doc: KPMovieDoc) {
  const ratingKp = doc.rating?.kp || 0;
  const imdbRating = doc.rating?.imdb || 0;
  const poster = doc.poster?.url || doc.poster?.previewUrl || '';
  const backdrop = doc.backdrop?.url || doc.backdrop?.previewUrl || poster;

  // Жанры с auto-id
  const genres = (doc.genres || []).map((g: { name: string }, i: number) => ({
    id: i + 1,
    name: g.name.charAt(0).toUpperCase() + g.name.slice(1),
  }));

  // Актёры + режиссёры
  const persons = doc.persons || [];
  const actors = persons
    .filter((p) => p.profession === 'актеры' || p.enProfession === 'actor')
    .slice(0, 20)
    .map((p) => p.name);

  const directors = persons
    .filter((p) => p.profession === 'режиссеры' || p.enProfession === 'director')
    .slice(0, 3)
    .map((p) => p.name);

  // Страны
  const countries = (doc.countries || []).map((c: { name: string }) => c.name);

  // Похожие
  const similar = (doc.similarMovies || []).map((s: KPSimilarMovie) => ({
    id: s.id,
    title: s.name || s.alternativeName || '',
    original_title: s.alternativeName || s.name || '',
    overview: '',
    poster_path: s.poster?.url || s.poster?.previewUrl || null,
    backdrop_path: null,
    release_date: String(s.year || ''),
    vote_average: s.rating?.kp || s.rating?.imdb || 0,
    kinopoisk_rating: s.rating?.kp || 0,
    imdb_rating: s.rating?.imdb || 0,
    runtime: null,
    genre_ids: [],
    genres: [],
    type: 'movie',
    is_serial: false,
    imdb_id: '',
    kinopoisk_id: String(s.id),
    quality: '',
    translator: '',
    iframe_url: '',
    countries: [],
    actors: [],
    directors: [],
    popularity: 0,
    adult: false,
  }));

  const isSerial = doc.isSeries || doc.type === 'tv-series' || doc.type === 'anime';

  return {
    id: doc.id,
    title: doc.name || doc.alternativeName || 'Без названия',
    original_title: doc.alternativeName || doc.enName || '',
    overview: doc.description || doc.shortDescription || '',
    poster_path: poster || null,
    backdrop_path: backdrop || null,
    release_date: String(doc.year || ''),
    vote_average: ratingKp || imdbRating || 0,
    kinopoisk_rating: ratingKp,
    imdb_rating: imdbRating,
    runtime: doc.movieLength || null,
    genre_ids: genres.map((g) => g.id),
    genres,
    type: doc.type || (isSerial ? 'serial' : 'movie'),
    is_serial: isSerial,
    imdb_id: doc.externalId?.imdb || '',
    kinopoisk_id: String(doc.id),
    quality: '',
    translator: '',
    iframe_url: '',
    countries,
    actors,
    directors,
    popularity: doc.votes?.kp || doc.votes?.imdb || 0,
    adult: false,
    seasons: (doc.seasonsInfo || []).map((s: KPSeasonInfo) => ({
      id: s.number,
      season_number: s.number,
      episodes_count: s.episodesCount,
      episodes: [],
    })),
    similar,
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
    const token = getToken(req);

    if (!hasToken(req)) {
      return error('API-ключ Кинопоиска не указан. Добавьте в Настройках или задайте KINOPOISK_API_KEY.', 401);
    }

    const url = new URL(req.url || '', 'http://localhost');
    const params = url.searchParams;

    // === Мета: жанры ===
    if (params.get('meta') === '1') {
      const data = await fetchPoiskkino('/genre', {}, token);
      const genres = (data || []).map((g: { name: string }, i: number) => ({
        id: i + 1,
        name: g.name.charAt(0).toUpperCase() + g.name.slice(1),
      }));
      return json({ ok: true, genres });
    }

    // === Детали одного фильма ===
    const id = params.get('id');
    if (id) {
      const doc = await fetchPoiskkino(`/movie/${id}`, {}, token);
      const movie = normalizeMovie(doc);
      const similar = movie.similar || [];
      return json({ ok: true, movie, similar });
    }

    // === Поиск или каталог ===
    const page = Math.max(1, parseInt(params.get('page') || '1') || 1);
    const limit = Math.min(40, Math.max(1, parseInt(params.get('limit') || '20') || 20));
    const query = params.get('q') || '';

    if (query) {
      const data = await fetchPoiskkino('/movie/search', { query, page, limit }, token);
      const items = (data?.docs || []).map(normalizeMovie);
      return json({
        ok: true,
        page,
        results: items,
        total_pages: data.pages || 1,
        total_results: data.total || items.length,
      });
    }

    // Каталог с фильтрами
    const sortField = params.get('sort') === 'year' ? 'year' : 'rating.kp';
    const sortType = params.get('sort') === 'year' ? '-1' : '-1';
    const genre = params.get('genre') || '';
    const year = params.get('year') || '';

    const kpParams: Record<string, any> = {
      page,
      limit,
      sortField,
      sortType,
    };
    if (genre) kpParams['genres.name'] = genre;
    if (year) kpParams.year = year;

    const data = await fetchPoiskkino('/movie', kpParams, token);
    const items = (data?.docs || []).map(normalizeMovie);

    return json({
      ok: true,
      page,
      results: items,
      total_pages: data.pages || 1,
      total_results: data.total || items.length,
    });
  } catch (e: any) {
    const msg = e?.message || 'CATALOG_ERROR';
    if (msg === 'BAD_TOKEN') return error('Неверный API-ключ Кинопоиска', 401);
    if (msg === 'NO_TOKEN') return error('API-ключ Кинопоиска не указан', 401);
    return error('Ошибка каталога: ' + msg, 502);
  }
}
