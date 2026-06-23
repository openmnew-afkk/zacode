/* ===== TMDB + OMDb fallback =====
 * Первичный источник: TMDB (русский язык, полные данные, постеры)
 * Фолбэк: OMDb (если TMDB ключ не задан)
 */

import type { Movie, CatalogResponse, MovieDetail, Genre, Season, Episode } from '../types';

/* ===== TMDB ===== */
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const TMDB_KEY_KEY = 'tc_tmdb_key';

export const getTmdbKey = (): string => {
  try { return localStorage.getItem(TMDB_KEY_KEY) || ''; } catch { return ''; }
};
export const setTmdbKey = (key: string) => {
  try { localStorage.setItem(TMDB_KEY_KEY, key); } catch { /* ignore */ }
};
export const hasTmdbKey = () => !!getTmdbKey();

/* ===== OMDb (запасной) ===== */
const OMDB_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';

/* ===== Плеер-паттерн ===== */
const PATTERN_KEY = 'tc_player_pattern';
export const getPlayerPattern = (): string => {
  try { return localStorage.getItem(PATTERN_KEY) || ''; } catch { return ''; }
};
export const setPlayerPattern = (pattern: string) => {
  try { localStorage.setItem(PATTERN_KEY, pattern); } catch { /* ignore */ }
};

/* ===== Изображения ===== */
export const posterUrl = (path: string | null, _size?: string): string => {
  if (!path) return '/no-poster.svg';
  if (path.startsWith('http')) return path;
  if (path.startsWith('//')) return `https:${path}`;
  if (path.startsWith('/')) return `${IMG_BASE}${path}`;
  return `/no-poster.svg`;
};
export const backdropUrl = (path: string | null, _size?: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('//')) return `https:${path}`;
  if (path.startsWith('/')) return `${IMG_BASE}${path}`;
  return '';
};

/* ===== TMDB запросы ===== */

async function tmdbFetch(path: string, params: Record<string, any> = {}): Promise<any> {
  const key = getTmdbKey();
  if (!key) throw new Error('NO_TMDB_KEY');
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB_${res.status}`);
  return res.json();
}

/** TMDB movie → Movie */
function tmdbToMovie(item: any, mediaType?: string): Movie {
  const title = item.title || item.name || 'Без названия';
  const orig = item.original_title || item.original_name || '';
  const date = item.release_date || item.first_air_date || '';
  const poster = item.poster_path ? `/t/p/w500${item.poster_path}` : null;
  const backdrop = item.backdrop_path ? `/t/p/w500${item.backdrop_path}` : poster;
  const vote = item.vote_average || 0;
  const type = mediaType || item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const isSerial = type === 'tv' || type === 'series';

  return {
    id: item.id,
    title, original_title: orig,
    overview: item.overview || '',
    poster_path: poster, backdrop_path: backdrop,
    release_date: date,
    vote_average: vote, kinopoisk_rating: 0, imdb_rating: 0,
    runtime: null, genre_ids: item.genre_ids || [],
    genres: (item.genres || []).map((g: any, i: number) => ({ id: g.id || i + 1, name: g.name })),
    type, is_serial: isSerial,
    imdb_id: item.imdb_id || '', kinopoisk_id: String(item.id),
    quality: '', translator: '', iframe_url: '',
    countries: (item.production_countries || []).map((c: any) => c.name || c.iso_3166_1),
    actors: [], directors: [],
    popularity: item.popularity || 0, adult: item.adult || false,
  };
}

/** TMDB movie detail → MovieDetail */
async function tmdbToDetail(id: number, isTV: boolean): Promise<MovieDetail> {
  const path = isTV ? `/tv/${id}` : `/movie/${id}`;
  const d = await tmdbFetch(path, { append_to_response: 'credits,similar,videos,external_ids' });
  const base = tmdbToMovie(d);

  const actors = (d.credits?.cast || []).slice(0, 20).map((p: any) => p.name);
  const directors = (d.credits?.crew || [])
    .filter((p: any) => p.job === 'Director')
    .slice(0, 3).map((p: any) => p.name);

  let seasons: Season[] = [];
  if (isTV && d.seasons) {
    seasons = d.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => ({
        id: s.id || s.season_number,
        season_number: s.season_number,
        episodes_count: s.episode_count || 0,
        episodes: [] as Episode[],
      }));
  }

  const similar = (d.similar?.results || []).slice(0, 8).map((s: any) => tmdbToMovie(s));

  return {
    ...base,
    runtime: d.runtime || null,
    genres: (d.genres || []).map((g: any) => ({ id: g.id, name: g.name })),
    countries: (d.production_countries || []).map((c: any) => c.name || ''),
    actors, directors,
    imdb_id: d.external_ids?.imdb_id || d.imdb_id || '',
    seasons,
    similar,
  };
}

/* ===== OMDb запросы (фолбэк) ===== */
async function omdbFetch(params: Record<string, any>): Promise<any> {
  if (hasTmdbKey()) throw new Error('USE_TMDB'); // не вызывать если есть TMDB
  const url = new URL(OMDB_BASE);
  url.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDB_${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error('NOT_FOUND');
  return data;
}

function omdbToMovie(item: any): Movie {
  const imdbID = item.imdbID || '';
  const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : null;
  return {
    id: imdbID, title: item.Title || 'Без названия', original_title: '',
    overview: '', poster_path: poster, backdrop_path: poster,
    release_date: item.Year || '', vote_average: 0,
    kinopoisk_rating: 0, imdb_rating: 0, runtime: null,
    genre_ids: [], genres: [],
    type: item.Type === 'series' ? 'serial' : 'movie',
    is_serial: item.Type === 'series',
    imdb_id: imdbID, kinopoisk_id: imdbID,
    quality: '', translator: '', iframe_url: '',
    countries: [], actors: [], directors: [],
    popularity: 0, adult: false,
  };
}

function omdbToDetail(item: any): MovieDetail {
  const base = omdbToMovie(item);
  const gn = item.Genre?.split(', ')?.filter(Boolean) || [];
  const rt = item.Runtime?.match(/(\d+)/);
  const rating = parseFloat(item.imdbRating) || 0;
  return {
    ...base,
    overview: item.Plot && item.Plot !== 'N/A' ? item.Plot : '',
    vote_average: rating, imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: gn.map((_: string, i: number) => i + 1),
    genres: gn.map((name: string, i: number) => ({ id: i + 1, name })),
    actors: item.Actors?.split(', ')?.filter(Boolean) || [],
    directors: item.Director?.split(', ')?.filter(Boolean) || [],
    countries: item.Country?.split(', ')?.filter(Boolean) || [],
    poster_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    backdrop_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    seasons: [], similar: [],
  };
}

/* ===== Публичные функции ===== */

export const getCatalog = async (params: {
  page?: number; q?: string; genre?: string; year?: string; sort?: string; limit?: number;
}): Promise<CatalogResponse> => {
  if (hasTmdbKey()) {
    try {
      const page = params.page || 1;
      // Поиск
      if (params.q) {
        const data = await tmdbFetch('/search/multi', { query: params.q, page });
        const items = (data.results || [])
          .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
          .map((r: any) => tmdbToMovie(r));
        return { ok: true, page, results: items, total_pages: data.total_pages || 1, total_results: data.total_results || 0 };
      }
      // Тренды
      const trendData = await tmdbFetch('/trending/movie/week', { page });
      const items = (trendData.results || []).map((r: any) => tmdbToMovie(r));
      return { ok: true, page, results: items, total_pages: trendData.total_pages || 1, total_results: trendData.total_results || 0 };
    } catch (e) {
      console.error('TMDB error:', e);
      return { ok: true, page: 1, results: [], total_pages: 0, total_results: 0 };
    }
  }

  // OMDb фолбэк
  throw new Error('NO_TMDB_KEY');
};

export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> =>
  getCatalog({ q: query, page });

export const getNovelty = async (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'trending' });

export const getTop = async (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'trending' });

export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  if (hasTmdbKey()) {
    const numId = typeof id === 'string' && id.startsWith('tt') ? NaN : Number(id);
    if (!isNaN(numId)) {
      // Сначала пробуем movie, потом tv
      try { return await tmdbToDetail(numId, false); }
      catch { return await tmdbToDetail(numId, true); }
    }
    // Если tt-шный ID — используем OMDb
  }
  // OMDb
  const d = await omdbFetch({ i: id, plot: 'full' });
  return omdbToDetail(d);
};

/* ===== Плеер ===== */
export interface PlayerSource { label: string; url: string; type: string; }

export const getPlayerUrl = async (id: string | number, title: string): Promise<PlayerSource[]> => {
  const sources: PlayerSource[] = [];
  const strId = String(id);

  const pattern = getPlayerPattern();
  if (pattern) {
    sources.push({ label: 'Мой плеер', url: pattern.replace(/\{ID\}/g, strId), type: 'embed' });
  }

  sources.push({ label: 'VidSrc', url: `https://vidsrc.me/embed/${strId}`, type: 'embed' });

  sources.push({
    label: 'YouTube',
    url: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' фильм')}`,
    type: 'youtube',
  });

  return sources;
};

/* ===== Жанры ===== */
export const getGenres = async (): Promise<Genre[]> => {
  if (hasTmdbKey()) {
    try {
      const movieGenres = await tmdbFetch('/genre/movie/list');
      const tvGenres = await tmdbFetch('/genre/tv/list');
      const all = [...(movieGenres.genres || []), ...(tvGenres.genres || [])];
      const unique = new Map(all.map((g: any) => [g.id, { id: g.id, name: g.name }]));
      return Array.from(unique.values());
    } catch { /* fallback */ }
  }
  return [
    { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
    { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
    { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
    { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
    { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
  ];
};

/* ===== Проверка соединения ===== */
export const checkTmdb = async (): Promise<{ ok: boolean; message: string }> => {
  if (!hasTmdbKey()) return { ok: false, message: 'Ключ TMDB не указан' };
  try {
    const data = await tmdbFetch('/configuration');
    if (data.images) return { ok: true, message: 'Соединение установлено' };
    return { ok: false, message: 'Ошибка ключа' };
  } catch {
    return { ok: false, message: 'Ошибка соединения' };
  }
};
