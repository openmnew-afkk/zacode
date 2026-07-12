/* ===== TeleCinema — TMDB API (миллионы фильмов) ===== */

import type { Movie, MovieDetail, CatalogResponse, Season, Genre } from '../types';

/* ── Конфиг ── */
const TMDB_KEY = 'b6f5c3d1a2e4f7g8h9i0j1k2l3m4n5o6p7q8r9s0'; // публичный ключ TMDB
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const FALLBACK_POSTER = 'https://via.placeholder.com/300x450?text=No+Poster';

/* ── Кеш ── */
const cache = new Map<string, any>();
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.time < CACHE_TTL) return item.data;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, time: Date.now() });
}

/* ── Запрос к TMDB ── */
async function tmdb<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${res.statusText}`);
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

/* ── Конвертация TMDB -> Movie ── */
function toMovie(item: any): Movie {
  const isSerial = item.media_type === 'tv' || !!item.first_air_date;
  const title = isSerial ? (item.name || item.original_name || 'Без названия') : (item.title || item.original_title || 'Без названия');
  const origTitle = isSerial ? (item.original_name || '') : (item.original_title || '');
  const date = isSerial ? (item.first_air_date || '') : (item.release_date || '');

  return {
    id: String(item.id),
    imdbID: `tt${item.id}`, // условный imdbID
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

/* ── Получение деталей ── */
async function getDetail(id: string, isSerial: boolean): Promise<any> {
  const type = isSerial ? 'tv' : 'movie';
  const data = await tmdb<any>(`/${type}/${id}`, { append_to_response: 'credits,seasons,external_ids,similar' });
  return data;
}

function toMovieDetail(item: any, isSerial: boolean): MovieDetail {
  const movie = toMovie(item);
  const credits = item.credits || {};
  const seasons: Season[] = (item.seasons || []).map((s: any) => ({
    id: s.id,
    season_number: s.season_number,
    episodes_count: s.episode_count || 0,
    episodes: [],
  }));

  return {
    ...movie,
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

/* ── Экспортируемые функции ── */

/** Поиск фильмов */
export async function searchMovies(
  query: string,
  page = 1,
  type?: 'movie' | 'series'
): Promise<CatalogResponse> {
  try {
    const isSerial = type === 'series';
    const mediaType = isSerial ? 'tv' : 'movie';
    const data = await tmdb<any>(`/search/${mediaType}`, { query, page, include_adult: false });

    const results: Movie[] = (data.results || []).map((item: any) => {
      const m = toMovie({ ...item, media_type: isSerial ? 'tv' : 'movie' });
      return m;
    });

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

/** Детали фильма/сериала */
export async function getMovieDetail(imdbIdOrTmdbId: string): Promise<MovieDetail | null> {
  try {
    // Пробуем как TMDB id
    const id = imdbIdOrTmdbId.replace('tt', '');
    
    // Сначала пробуем movie
    try {
      const data = await getDetail(id, false);
      return toMovieDetail(data, false);
    } catch {
      // Если не фильм, пробуем сериал
      const data = await getDetail(id, true);
      return toMovieDetail(data, true);
    }
  } catch (error) {
    console.error('Detail error:', error);
    return null;
  }
}

/** Популярные */
export async function getTrendingMovies(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/trending/movie/week', {});
    return (data.results || []).slice(0, 20).map((item: any) => toMovie({ ...item, media_type: 'movie' }));
  } catch {
    return [];
  }
}

/** Популярные сериалы */
export async function getTrendingSeries(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/trending/tv/week', {});
    return (data.results || []).slice(0, 20).map((item: any) => toMovie({ ...item, media_type: 'tv' }));
  } catch {
    return [];
  }
}

/** Сейчас в тренде (фильмы + сериалы) */
export async function getAllTrending(): Promise<Movie[]> {
  try {
    const [movies, series] = await Promise.all([
      getTrendingMovies(),
      getTrendingSeries(),
    ]);
    // Чередуем
    const result: Movie[] = [];
    const maxLen = Math.max(movies.length, series.length);
    for (let i = 0; i < maxLen; i++) {
      if (movies[i]) result.push(movies[i]);
      if (series[i]) result.push(series[i]);
    }
    return result.slice(0, 30);
  } catch {
    return [];
  }
}

/** Сейчас в топе */
export async function getTopRated(type: 'movie' | 'series' = 'movie'): Promise<Movie[]> {
  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const data = await tmdb<any>(`/${mediaType}/top_rated`, {});
    return (data.results || []).slice(0, 20).map((item: any) => toMovie({ ...item, media_type: mediaType }));
  } catch {
    return [];
  }
}

/** Сейчас в кино */
export async function getNowPlaying(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/movie/now_playing', { region: 'RU' });
    return (data.results || []).slice(0, 20).map((item: any) => toMovie({ ...item, media_type: 'movie' }));
  } catch {
    return [];
  }
}

/** Сейчас выходят (сериалы) */
export async function getOnTheAir(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/tv/on_the_air', {});
    return (data.results || []).slice(0, 20).map((item: any) => toMovie({ ...item, media_type: 'tv' }));
  } catch {
    return [];
  }
}

/** Жанры */
export async function getGenres(type: 'movie' | 'series' = 'movie'): Promise<Genre[]> {
  try {
    const mediaType = type === 'series' ? 'tv' : 'movie';
    const data = await tmdb<any>(`/genre/${mediaType}/list`, {});
    return (data.genres || []).map((g: any) => ({ id: g.id, name: g.name }));
  } catch {
    return [];
  }
}

/** Фильмы по жанру */
export async function getMoviesByGenre(genreId: number, page = 1): Promise<CatalogResponse> {
  try {
    const data = await tmdb<any>('/discover/movie', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc',
    });
    const results: Movie[] = (data.results || []).map((item: any) => toMovie({ ...item, media_type: 'movie' }));
    return { ok: true, page, results, total_pages: data.total_pages || 1, total_results: data.total_results || 0 };
  } catch {
    return { ok: false, page, results: [], total_pages: 0, total_results: 0 };
  }
}

/** Поиск по IMDb ID (трансляция) */
export async function findByImdbId(imdbId: string): Promise<{ tmdbId: string; isSerial: boolean } | null> {
  try {
    const data = await tmdb<any>(`/find/${imdbId}`, { external_source: 'imdb_id' });
    if (data.movie_results?.length > 0) return { tmdbId: String(data.movie_results[0].id), isSerial: false };
    if (data.tv_results?.length > 0) return { tmdbId: String(data.tv_results[0].id), isSerial: true };
    return null;
  } catch {
    return null;
  }
}