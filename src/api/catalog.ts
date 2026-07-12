/* ===== TeleCinema — TMDB API (миллионы фильмов на русском) ===== */

import type { Movie, MovieDetail, CatalogResponse, Season, Genre } from '../types';

/* ════════════ TMDB Config ════════════ */
const TMDB_KEY = 'dc003aabe0e60ef32360bfdf70deac32';
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYzAwM2FhYmUwZTYwZWYzMjM2MGJmZGY3MGRlYWMzMiIsIm5iZiI6MTc4MjI0OTkzNC4zODcsInN1YiI6IjZhM2FmOWNlMDg0YjFmMTVkMmU4YWQ2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.l7xTD-__fJ9o-gXPURwqUBfwIuWTDeYRolDBxPYAk8s';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const FALLBACK_POSTER = 'https://via.placeholder.com/300x450?text=No+Poster';

/* ════════════ Cache ════════════ */
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.time < CACHE_TTL) return item.data;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, time: Date.now() });
}

/* ════════════ TMDB Request ════════════ */
async function tmdb<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TMDB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

/* ════════════ Converter ════════════ */
function toMovie(item: any, mediaType?: string): Movie {
  const isSerial = mediaType === 'tv' || item.media_type === 'tv' || !!item.first_air_date;
  const title = isSerial ? (item.name || item.original_name || 'Без названия') : (item.title || item.original_title || 'Без названия');
  const origTitle = isSerial ? (item.original_name || '') : (item.original_title || '');
  const date = isSerial ? (item.first_air_date || '') : (item.release_date || '');

  return {
    id: String(item.id),          // TMDB numeric ID (реальный)
    imdbID: item.imdb_id || item.external_ids?.imdb_id || '', // реальный IMDB ID если есть
    title,
    original_title: origTitle,
    overview: item.overview || '',
    poster_path: item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : FALLBACK_POSTER,
    backdrop_path: item.backdrop_path ? `${IMG_BASE}/w1280${item.backdrop_path}` : FALLBACK_POSTER,
    release_date: date,
    vote_average: item.vote_average || 0,
    imdb_rating: item.vote_average || 0,
    runtime: null,
    type: isSerial ? 'series' : 'movie',
    genre_ids: item.genre_ids || [],
    genres: [],
    is_serial: isSerial,
    directors: [],
    actors: [],
    countries: [],
    popularity: item.popularity || 0,
    adult: item.adult || false,
    quality: 'HD',
  };
}

async function getDetail(id: string, isSerial: boolean): Promise<any> {
  const type = isSerial ? 'tv' : 'movie';
  const data = await tmdb<any>(`/${type}/${id}`, {
    append_to_response: 'credits,seasons,external_ids,similar,videos,recommendations',
  });
  return data;
}

function toMovieDetail(item: any, isSerial: boolean): MovieDetail {
  const movie = toMovie(item, isSerial ? 'tv' : 'movie');
  const credits = item.credits || {};
  const seasons: Season[] = (item.seasons || []).filter((s: any) => s.season_number > 0).map((s: any) => ({
    id: s.id,
    season_number: s.season_number,
    episodes_count: s.episode_count || 0,
    episodes: [],
  }));

  // Реальный IMDB ID из external_ids
  const realImdbId = item.external_ids?.imdb_id || movie.imdbID || '';

  return {
    ...movie,
    imdbID: realImdbId,          // ← реальный tt0468569 и т.д.
    plot: item.overview || '',
    overview: item.overview || '',
    runtime: item.runtime || null,
    genres: (item.genres || []).map((g: any) => g.name),
    genre_ids: (item.genres || []).map((g: any) => g.id),
    directors: (credits.crew || []).filter((c: any) => c.job === 'Director').map((c: any) => c.name),
    actors: (credits.cast || []).slice(0, 10).map((c: any) => c.name),
    countries: item.production_countries?.map((c: any) => c.name) || [],
    seasons: isSerial ? seasons : undefined,
    episodes: isSerial ? seasons.reduce((acc, s) => acc + s.episodes_count, 0) : undefined,
    imdb_rating: item.vote_average || 0,
    vote_average: item.vote_average || 0,
  };
}

/* ════════════ EXPORTS ════════════ */

export async function getAllTrending(): Promise<Movie[]> {
  try {
    const [movies, series] = await Promise.all([
      tmdb<any>('/trending/movie/week', {}),
      tmdb<any>('/trending/tv/week', {}),
    ]);
    const m = (movies.results || []).slice(0, 15).map((i: any) => toMovie(i, 'movie'));
    const s = (series.results || []).slice(0, 15).map((i: any) => toMovie(i, 'tv'));
    // Чередуем
    const result: Movie[] = [];
    const maxLen = Math.max(m.length, s.length);
    for (let i = 0; i < maxLen; i++) {
      if (m[i]) result.push(m[i]);
      if (s[i]) result.push(s[i]);
    }
    return result;
  } catch {
    return [];
  }
}

export async function searchMovies(query: string, page = 1, type?: 'movie' | 'series'): Promise<CatalogResponse> {
  try {
    const mediaType = type === 'series' ? 'tv' : 'multi';
    const data = await tmdb<any>(`/search/${mediaType}`, { query, page, include_adult: false });

    let results = (data.results || []).map((item: any) => toMovie(item));

    // Фильтруем по типу если нужно
    if (type === 'movie') results = results.filter((m: Movie) => !m.is_serial);
    if (type === 'series') results = results.filter((m: Movie) => m.is_serial);

    return {
      ok: true,
      page: data.page || page,
      results,
      total_pages: Math.min(data.total_pages || 1, 500),
      total_results: data.total_results || 0,
    };
  } catch (error) {
    console.error('Search error:', error);
    return { ok: false, page, results: [], total_pages: 0, total_results: 0 };
  }
}

export async function getMovieDetail(imdbIdOrId: string): Promise<MovieDetail | null> {
  try {
    const id = imdbIdOrId.replace('tt', '');
    // Пробуем movie
    try {
      const data = await getDetail(id, false);
      return toMovieDetail(data, false);
    } catch {
      // Пробуем tv
      const data = await getDetail(id, true);
      return toMovieDetail(data, true);
    }
  } catch (error) {
    console.error('Detail error:', error);
    return null;
  }
}

export async function getGenres(type: 'movie' | 'series' = 'movie'): Promise<Genre[]> {
  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const data = await tmdb<any>(`/genre/${mediaType}/list`, {});
    return (data.genres || []).map((g: any) => ({ id: g.id, name: g.name }));
  } catch {
    return [];
  }
}

export async function getTrendingMovies(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/trending/movie/week', {});
    return (data.results || []).slice(0, 20).map((i: any) => toMovie(i, 'movie'));
  } catch { return []; }
}

export async function getTrendingSeries(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/trending/tv/week', {});
    return (data.results || []).slice(0, 20).map((i: any) => toMovie(i, 'tv'));
  } catch { return []; }
}

export async function getTopRated(type: 'movie' | 'series' = 'movie'): Promise<Movie[]> {
  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const data = await tmdb<any>(`/${mediaType}/top_rated`, {});
    return (data.results || []).slice(0, 20).map((i: any) => toMovie(i, mediaType));
  } catch { return []; }
}

export async function getNowPlaying(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/movie/now_playing', { region: 'RU' });
    return (data.results || []).slice(0, 20).map((i: any) => toMovie(i, 'movie'));
  } catch { return []; }
}

export async function getPopularByGenre(genreId: number, page = 1): Promise<CatalogResponse> {
  try {
    const data = await tmdb<any>('/discover/movie', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
    });
    return {
      ok: true,
      page,
      results: (data.results || []).map((i: any) => toMovie(i, 'movie')),
      total_pages: data.total_pages || 1,
      total_results: data.total_results || 0,
    };
  } catch {
    return { ok: false, page, results: [], total_pages: 0, total_results: 0 };
  }
}
/* Discover: пейджинг фильмов */
export async function discoverMovies(opts: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  year?: string;
} = {}): Promise<CatalogResponse> {
  try {
    const data = await tmdb<any>('/discover/movie', {
      page: opts.page || 1,
      sort_by: opts.sort_by || 'popularity.desc',
      with_genres: opts.with_genres || '',
      primary_release_year: opts.year || '',
      'vote_count.gte': 50,
      include_adult: false,
    });
    return {
      ok: true,
      page: data.page || 1,
      results: (data.results || []).map((i: any) => toMovie(i, 'movie')),
      total_pages: Math.min(data.total_pages || 1, 500),
      total_results: data.total_results || 0,
    };
  } catch {
    return { ok: false, page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}

/* Discover: пейджинг сериалов */
export async function discoverSeries(opts: {
  page?: number;
  sort_by?: string;
  with_genres?: string;
} = {}): Promise<CatalogResponse> {
  try {
    const data = await tmdb<any>('/discover/tv', {
      page: opts.page || 1,
      sort_by: opts.sort_by || 'popularity.desc',
      with_genres: opts.with_genres || '',
      'vote_count.gte': 50,
    });
    return {
      ok: true,
      page: data.page || 1,
      results: (data.results || []).map((i: any) => toMovie(i, 'tv')),
      total_pages: Math.min(data.total_pages || 1, 500),
      total_results: data.total_results || 0,
    };
  } catch {
    return { ok: false, page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}
