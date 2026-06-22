/* ===== Клиентский слой — OMDb API напрямую (CORS разрешён) =====
 * Использует бесплатный demo-ключ 'trilogy'. Работает без серверного прокси.
 */

import type { Movie, CatalogResponse, MovieDetail, Genre } from '../types';

const OMDB_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';

/* ===== Плеер-паттерн (localStorage) ===== */
const PATTERN_KEY = 'tc_player_pattern';
export const getPlayerPattern = (): string => {
  try { return localStorage.getItem(PATTERN_KEY) || ''; } catch { return ''; }
};
export const setPlayerPattern = (pattern: string) => {
  try { localStorage.setItem(PATTERN_KEY, pattern); } catch { /* ignore */ }
};

/* ===== Изображения ===== */
export const posterUrl = (path: string | null, _size?: string): string => {
  if (path && (path.startsWith('http') || path.startsWith('//'))) {
    return path.startsWith('//') ? `https:${path}` : path;
  }
  return '/no-poster.svg';
};
export const backdropUrl = (path: string | null, _size?: string): string =>
  path ? (path.startsWith('http') ? path : `https:${path}`) : '';

/* ===== Вспомогательные ===== */

/** Привести OMDb-фильм (из Search) к Movie */
function omdbToMovie(item: any): Movie {
  const imdbID = item.imdbID || '';
  const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : null;
  const type = item.Type === 'series' ? 'serial' : 'movie';
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
    genres: [],
    type,
    is_serial: item.Type === 'series',
    imdb_id: imdbID,
    kinopoisk_id: imdbID,
    quality: '', translator: '', iframe_url: '',
    countries: [], actors: [], directors: [],
    popularity: 0, adult: false,
  };
}

/** Обогатить деталями (из ?i= или ?t=) */
function omdbToDetail(item: any): MovieDetail {
  const base = omdbToMovie(item);
  const genreNames = item.Genre?.split(', ')?.filter(Boolean) || [];
  const actors = item.Actors?.split(', ')?.filter(Boolean) || [];
  const directors = item.Director?.split(', ')?.filter(Boolean) || [];
  const countries = item.Country?.split(', ')?.filter(Boolean) || [];
  const rt = item.Runtime?.match(/(\d+)/);
  const rating = parseFloat(item.imdbRating) || 0;

  return {
    ...base,
    overview: item.Plot && item.Plot !== 'N/A' ? item.Plot : '',
    vote_average: rating,
    imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: genreNames.map((_: string, i: number) => i + 1),
    genres: genreNames.map((name: string, i: number) => ({ id: i + 1, name })),
    actors, directors, countries,
    poster_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    backdrop_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    seasons: [],
    similar: [],
  };
}

/* ===== Запросы к OMDb ===== */

async function omdbFetch(params: Record<string, string | number | undefined>): Promise<any> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Выполнить поиск + обогатить первые 5 деталями */
async function searchAndEnrich(query: string, page = 1): Promise<CatalogResponse> {
  const data = await omdbFetch({ s: query, page, type: 'movie' });
  if (data.Response === 'False' || !data.Search) {
    return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  }
  const items = data.Search.map(omdbToMovie);
  // Обогащаем первые 5
  const enriched = await Promise.all(
    items.map(async (m: Movie, i: number) => {
      if (i < 5 && m.imdb_id) {
        try {
          const d = await omdbFetch({ i: m.imdb_id, plot: 'short' });
          if (d && d.Response !== 'False') return omdbToDetail(d);
        } catch { /* ok */ }
      }
      return m;
    })
  );
  return {
    ok: true,
    page,
    results: enriched,
    total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
    total_results: parseInt(data.totalResults || '0') || 0,
  };
}

/* ===== Публичные функции ===== */

/** Поиск по названию */
export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> => {
  return searchAndEnrich(query, page);
};

/** Каталог (с поиском или без) */
export const getCatalog = async (params: {
  page?: number; q?: string; genre?: string; year?: string; sort?: string; limit?: number;
}): Promise<CatalogResponse> => {
  if (params.q) return searchAndEnrich(params.q, params.page || 1);
  return getNovelty(params.page);
};

/** Новинки — поиск 'movie' + фильтр по текущему году */
export const getNovelty = async (page = 1): Promise<CatalogResponse> => {
  const year = new Date().getFullYear();
  try {
    const data = await omdbFetch({ s: 'movie', type: 'movie', y: year, page });
    if (data.Response === 'False' || !data.Search) throw new Error('empty');
    const items = data.Search.map(omdbToMovie);
    const enriched = await Promise.all(
      items.slice(0, 6).map(async (m: Movie) => {
        try {
          const d = await omdbFetch({ i: m.imdb_id, plot: 'short' });
          return d && d.Response !== 'False' ? omdbToDetail(d) : m;
        } catch { return m; }
      })
    );
    return {
      ok: true, page,
      results: [...enriched, ...items.slice(6)],
      total_pages: 1, total_results: enriched.length,
    };
  } catch {
    // Fallback: известные популярные фильмы
    return getPopularFallback();
  }
};

/** Топ — то же что новинки */
export const getTop = (page = 1): Promise<CatalogResponse> => getNovelty(page);

/** Предопределённый список популярных фильмов (гарантированный контент) */
const FALLBACK_IDS = [
  'tt0133093', 'tt1375666', 'tt0816692', 'tt0109830', 'tt0468569',
  'tt0111161', 'tt0068646', 'tt0071562', 'tt0167260', 'tt0167261',
  'tt0120737', 'tt0108052', 'tt0253474', 'tt0910970', 'tt0317248',
];

async function getPopularFallback(): Promise<CatalogResponse> {
  const movies: Movie[] = [];
  for (const id of FALLBACK_IDS) {
    try {
      const d = await omdbFetch({ i: id, plot: 'short' });
      if (d && d.Response !== 'False') movies.push(omdbToDetail(d));
    } catch { /* skip */ }
    if (movies.length >= 10) break;
  }
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
}

/** Детали фильма */
export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const d = await omdbFetch({ i: id, plot: 'full' });
  if (!d || d.Response === 'False') throw new Error('Movie not found');
  return omdbToDetail(d);
};

/** Плеер-источники */
export interface PlayerSource { label: string; url: string; type: string; }

export const getPlayerUrl = async (id: string | number, title: string): Promise<PlayerSource[]> => {
  const sources: PlayerSource[] = [];
  const pattern = getPlayerPattern();
  if (pattern) {
    sources.push({
      label: 'Мой плеер',
      url: pattern.replace(/\{ID\}/g, String(id)),
      type: 'embed',
    });
  }
  // YouTube фолбэк
  const q = encodeURIComponent(`${title} фильм`);
  sources.push({
    label: 'YouTube',
    url: `https://www.youtube.com/embed?listType=search&list=${q}`,
    type: 'youtube',
  });
  return sources;
};

/* ===== Жанры (хардкод) ===== */
const GENRES_LIST: Genre[] = [
  { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
  { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
];
export const getGenres = async (): Promise<Genre[]> => GENRES_LIST;
