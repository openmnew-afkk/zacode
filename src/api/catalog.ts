/* ===== КиноЗал — TMDB API ===== */

import type { Movie, MovieDetail, CatalogResponse, Season, Genre } from '../types';

/* ════════════ TMDB Config ════════════ */
const TMDB_KEY = 'dc003aabe0e60ef32360bfdf70deac32';
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYzAwM2FhYmUwZTYwZWYzMjM2MGJmZGY3MGRlYWMzMiIsIm5iZiI6MTc4MjI0OTkzNC4zODcsInN1YiI6IjZhM2FmOWNlMDg0YjFmMTVkMmU4YWQ2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.l7xTD-__fJ9o-gXPURwqUBfwIuWTDeYRolDBxPYAk8s';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const FALLBACK_POSTER = 'https://via.placeholder.com/300x450/1a1612/e8b84a?text=%D0%9D%D0%B5%D1%82+%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D0%B0';

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

/* ════════════ TMDB Request — гонка прокси параллельно ════════════
 * TMDB заблокирован у части провайдеров РФ, поэтому запрашиваем
 * НАПРЯЖУЮ и через несколько CORS-прокси ОДНОВРЕМЕННО — кто первый
 * ответит, тот и победил. Плюс localStorage-кэш на 24 часа: если
 * сеть совсем не работает, показываем последний загруженный каталог.
 */
const PROXY_MAKERS: Array<(u: string) => { u: string; h: Record<string, string> }> = [
  // Напрямую: Bearer-токен (работает без блокировок)
  (u) => ({ u, h: { 'Authorization': `Bearer ${TMDB_TOKEN}`, 'Content-Type': 'application/json' } }),
  // CORS-прокси (api_key в URL, без Bearer)
  (u) => ({ u: `https://corsproxy.io/?url=${encodeURIComponent(u)}`, h: {} }),
  (u) => ({ u: `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, h: {} }),
  (u) => ({ u: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, h: {} }),
  (u) => ({ u: `https://cors.eu.org/${u}`, h: {} }),
];

function lsCacheGet<T>(key: string, maxAge: number): T | null {
  try {
    const raw = localStorage.getItem('tc_tmdb_' + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.d && Date.now() - parsed.t < maxAge) return parsed.d as T;
  } catch {}
  return null;
}
function lsCacheSet(key: string, data: unknown) {
  try { localStorage.setItem('tc_tmdb_' + key, JSON.stringify({ t: Date.now(), d: data })); } catch {}
}

async function tmdb<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  /* Офлайн-кэш на 24 часа — отдаём сразу, пока сеть не ответила */
  const stale = lsCacheGet<T>(cacheKey, 24 * 60 * 60 * 1000);
  if (stale) {
    setCache(cacheKey, stale);
    return stale;
  }

  const urlWithKey = new URL(url.toString());
  urlWithKey.searchParams.set('api_key', TMDB_KEY);

  try {
    const data = await Promise.any(
      PROXY_MAKERS.map((make) =>
        fetch(make(urlWithKey.toString()).u, {
          headers: make(urlWithKey.toString()).h,
          signal: AbortSignal.timeout(7000),
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
      )
    );
    setCache(cacheKey, data);
    lsCacheSet(cacheKey, data);
    return data as T;
  } catch {
    /* Всё недоступно — последний шанс: устаревший кэш (7 дней) */
    const older = lsCacheGet<T>(cacheKey, 7 * 24 * 60 * 60 * 1000);
    if (older) {
      setCache(cacheKey, older);
      return older;
    }
    throw new Error('TMDB unavailable');
  }
}

/* ════════════ Трейлеры (официальные YouTube-ролики) ════════════ */
export async function getTrailer(tmdbId: string, isSerial: boolean): Promise<string | null> {
  const type = isSerial ? 'tv' : 'movie';
  const pickKey = (data: any): string | null => {
    const vids: any[] = data?.results || [];
    const yt = vids.filter((v) => v.site === 'YouTube');
    const pick =
      yt.find((v) => v.type === 'Trailer' && v.official) ||
      yt.find((v) => v.type === 'Trailer') ||
      yt.find((v) => v.type === 'Teaser') ||
      yt[0];
    return pick ? `https://www.youtube.com/embed/${pick.key}?rel=0` : null;
  };
  try {
    const ru = await tmdb<any>(`/${type}/${tmdbId}/videos`, { language: 'ru-RU' });
    const key = pickKey(ru);
    if (key) return key;
  } catch {}
  try {
    const en = await tmdb<any>(`/${type}/${tmdbId}/videos`, { language: 'en-US' });
    return pickKey(en);
  } catch {}
  return null;
}

/* ════════════ Converter ════════════ */
function toMovie(item: any, mediaType?: string): Movie {
  const isSerial = mediaType === 'tv' || item.media_type === 'tv' || !!item.first_air_date;
  const title = isSerial ? (item.name || item.original_name || 'Без названия') : (item.title || item.original_title || 'Без названия');
  const origTitle = isSerial ? (item.original_name || '') : (item.original_title || '');
  const date = isSerial ? (item.first_air_date || '') : (item.release_date || '');

  const typePrefix = isSerial ? 'tv' : 'movie';
  return {
    id: `${typePrefix}-${item.id}`,   // tv-1396 или movie-278
    imdbID: item.imdb_id || item.external_ids?.imdb_id || '',
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
    quality: 'Full HD',
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

/* ═══════════ Хештег и жанровый маппинг TMDB ═══════════ */
interface HashtagParsed {
  genreIdsMovie: number[];
  genreIdsTv: number[];
  year?: number;
  sortBy?: string;
  minVotes?: number;
  origLang?: string;
  forceType?: 'movie' | 'series';
  keyword: string;
}

const HASHTAG_GENRE_MAP: Record<string, { movie: number[]; tv: number[] }> = {
  'боевик': { movie: [28], tv: [10759] },
  'боевики': { movie: [28], tv: [10759] },
  'action': { movie: [28], tv: [10759] },
  'экшн': { movie: [28], tv: [10759] },
  'комедия': { movie: [35], tv: [35] },
  'комедии': { movie: [35], tv: [35] },
  'comedy': { movie: [35], tv: [35] },
  'драма': { movie: [18], tv: [18] },
  'драмы': { movie: [18], tv: [18] },
  'drama': { movie: [18], tv: [18] },
  'ужасы': { movie: [27], tv: [9648] },
  'хоррор': { movie: [27], tv: [9648] },
  'хорроры': { movie: [27], tv: [9648] },
  'ужастик': { movie: [27], tv: [9648] },
  'horror': { movie: [27], tv: [9648] },
  'фантастика': { movie: [878], tv: [10765] },
  'scifi': { movie: [878], tv: [10765] },
  'sci-fi': { movie: [878], tv: [10765] },
  'фэнтези': { movie: [14], tv: [10765] },
  'фентези': { movie: [14], tv: [10765] },
  'fantasy': { movie: [14], tv: [10765] },
  'триллер': { movie: [53], tv: [9648] },
  'триллеры': { movie: [53], tv: [9648] },
  'thriller': { movie: [53], tv: [9648] },
  'криминал': { movie: [80], tv: [80] },
  'crime': { movie: [80], tv: [80] },
  'мультфильм': { movie: [16], tv: [16] },
  'мультфильмы': { movie: [16], tv: [16] },
  'мультики': { movie: [16], tv: [16] },
  'анимация': { movie: [16], tv: [16] },
  'animation': { movie: [16], tv: [16] },
  'аниме': { movie: [16], tv: [16] },
  'anime': { movie: [16], tv: [16] },
  'приключения': { movie: [12], tv: [10759] },
  'приключение': { movie: [12], tv: [10759] },
  'adventure': { movie: [12], tv: [10759] },
  'детектив': { movie: [9648], tv: [9648] },
  'детективы': { movie: [9648], tv: [9648] },
  'mystery': { movie: [9648], tv: [9648] },
  'мелодрама': { movie: [10749], tv: [10749] },
  'романтика': { movie: [10749], tv: [10749] },
  'romance': { movie: [10749], tv: [10749] },
  'семейный': { movie: [10751], tv: [10751] },
  'семья': { movie: [10751], tv: [10751] },
  'family': { movie: [10751], tv: [10751] },
  'история': { movie: [36], tv: [36] },
  'исторический': { movie: [36], tv: [36] },
  'history': { movie: [36], tv: [36] },
  'военный': { movie: [10752], tv: [10768] },
  'война': { movie: [10752], tv: [10768] },
  'war': { movie: [10752], tv: [10768] },
  'вестерн': { movie: [37], tv: [37] },
  'western': { movie: [37], tv: [37] },
  'документальный': { movie: [99], tv: [99] },
  'документалка': { movie: [99], tv: [99] },
  'доку': { movie: [99], tv: [99] },
  'doc': { movie: [99], tv: [99] },
};

function parseSearchHashtags(rawQuery: string): HashtagParsed {
  const result: HashtagParsed = {
    genreIdsMovie: [],
    genreIdsTv: [],
    sortBy: 'popularity.desc',
    keyword: '',
  };

  const tags = (rawQuery.match(/#([a-zA-Zа-яА-ЯёЁ0-9_-]+)/g) || []).map((t) =>
    t.replace(/^#/, '').toLowerCase().trim()
  );

  const residual = rawQuery.replace(/#([a-zA-Zа-яА-ЯёЁ0-9_-]+)/g, '').trim();
  result.keyword = residual;

  // Если нет явных символов #, проверим, не ввёл ли пользователь название жанра целиком
  if (tags.length === 0 && rawQuery.trim()) {
    const single = rawQuery.trim().toLowerCase();
    if (HASHTAG_GENRE_MAP[single]) {
      tags.push(single);
      result.keyword = '';
    }
  }

  for (const tag of tags) {
    if (/^\d{4}$/.test(tag)) {
      result.year = parseInt(tag, 10);
      continue;
    }
    if (tag.includes('2026') || tag.includes('новинк') || tag.includes('премьер')) {
      result.year = 2026;
      result.sortBy = 'popularity.desc';
    } else if (tag.includes('2025')) {
      result.year = 2025;
    } else if (tag.includes('2024')) {
      result.year = 2024;
    } else if (tag.includes('2023')) {
      result.year = 2023;
    }

    if (tag === 'топ' || tag === 'топ100' || tag === 'лучшее') {
      result.sortBy = 'vote_average.desc';
      result.minVotes = 300;
    }

    if (tag === 'сериал' || tag === 'сериалы' || tag === 'series') {
      result.forceType = 'series';
    } else if (tag === 'фильм' || tag === 'фильмы' || tag === 'movie') {
      result.forceType = 'movie';
    }

    if (tag === 'аниме' || tag === 'anime') {
      result.genreIdsMovie.push(16);
      result.genreIdsTv.push(16);
      result.origLang = 'ja';
    }

    const matched = HASHTAG_GENRE_MAP[tag];
    if (matched) {
      result.genreIdsMovie.push(...matched.movie);
      result.genreIdsTv.push(...matched.tv);
    }
  }

  result.genreIdsMovie = Array.from(new Set(result.genreIdsMovie));
  result.genreIdsTv = Array.from(new Set(result.genreIdsTv));
  return result;
}

export async function searchMovies(query: string, page = 1, type?: 'movie' | 'series'): Promise<CatalogResponse> {
  try {
    const trimmed = query.trim();
    const hasHashtag = trimmed.includes('#');
    const parsed = parseSearchHashtags(trimmed);
    const effectiveType = parsed.forceType || type;

    /* ── Сценарий 1: Чистый поиск по хештегу(ам) через TMDB Discover ── */
    if ((hasHashtag || parsed.genreIdsMovie.length > 0 || parsed.year) && !parsed.keyword) {
      if (effectiveType === 'movie') {
        const params: Record<string, any> = {
          page,
          sort_by: parsed.sortBy || 'popularity.desc',
          include_adult: false,
          'vote_count.gte': parsed.minVotes || 40,
        };
        if (parsed.genreIdsMovie.length > 0) params.with_genres = parsed.genreIdsMovie.join(',');
        if (parsed.year) params.primary_release_year = parsed.year;
        if (parsed.origLang) params.with_original_language = parsed.origLang;

        const data = await tmdb<any>('/discover/movie', params);
        return {
          ok: true,
          page: data.page || page,
          results: (data.results || []).map((i: any) => toMovie(i, 'movie')),
          total_pages: Math.min(data.total_pages || 1, 500),
          total_results: data.total_results || 0,
        };
      }

      if (effectiveType === 'series') {
        const params: Record<string, any> = {
          page,
          sort_by: parsed.sortBy || 'popularity.desc',
          include_adult: false,
          'vote_count.gte': parsed.minVotes || 30,
        };
        if (parsed.genreIdsTv.length > 0) params.with_genres = parsed.genreIdsTv.join(',');
        if (parsed.year) params.first_air_date_year = parsed.year;
        if (parsed.origLang) params.with_original_language = parsed.origLang;

        const data = await tmdb<any>('/discover/tv', params);
        return {
          ok: true,
          page: data.page || page,
          results: (data.results || []).map((i: any) => toMovie(i, 'tv')),
          total_pages: Math.min(data.total_pages || 1, 500),
          total_results: data.total_results || 0,
        };
      }

      /* Мульти-поиск по хештегу (фильмы + сериалы) */
      const movieParams: Record<string, any> = {
        page,
        sort_by: parsed.sortBy || 'popularity.desc',
        include_adult: false,
        'vote_count.gte': parsed.minVotes || 40,
      };
      if (parsed.genreIdsMovie.length > 0) movieParams.with_genres = parsed.genreIdsMovie.join(',');
      if (parsed.year) movieParams.primary_release_year = parsed.year;
      if (parsed.origLang) movieParams.with_original_language = parsed.origLang;

      const tvParams: Record<string, any> = {
        page,
        sort_by: parsed.sortBy || 'popularity.desc',
        include_adult: false,
        'vote_count.gte': parsed.minVotes || 30,
      };
      if (parsed.genreIdsTv.length > 0) tvParams.with_genres = parsed.genreIdsTv.join(',');
      if (parsed.year) tvParams.first_air_date_year = parsed.year;
      if (parsed.origLang) tvParams.with_original_language = parsed.origLang;

      const [movieData, tvData] = await Promise.all([
        tmdb<any>('/discover/movie', movieParams).catch(() => ({ results: [] })),
        tmdb<any>('/discover/tv', tvParams).catch(() => ({ results: [] })),
      ]);

      const m = (movieData.results || []).map((i: any) => toMovie(i, 'movie'));
      const s = (tvData.results || []).map((i: any) => toMovie(i, 'tv'));
      const merged: Movie[] = [];
      const maxL = Math.max(m.length, s.length);
      for (let i = 0; i < maxL; i++) {
        if (m[i]) merged.push(m[i]);
        if (s[i]) merged.push(s[i]);
      }

      return {
        ok: true,
        page,
        results: merged,
        total_pages: Math.min(Math.max(movieData.total_pages || 1, tvData.total_pages || 1), 500),
        total_results: (movieData.total_results || 0) + (tvData.total_results || 0),
      };
    }

    /* ── Сценарий 2: Поиск по ключевому слову (с фильтрацией по хештегам если указаны) ── */
    const searchQuery = parsed.keyword || trimmed;
    const mediaType = effectiveType === 'series' ? 'tv' : effectiveType === 'movie' ? 'movie' : 'multi';
    const data = await tmdb<any>(`/search/${mediaType}`, { query: searchQuery, page, include_adult: false });

    let results = (data.results || []).map((item: any) => toMovie(item));

    // Если был указан хештег вместе со словом (напр. "Бэтмен #боевик")
    if (parsed.genreIdsMovie.length > 0 || parsed.genreIdsTv.length > 0) {
      results = results.filter((m: Movie) =>
        m.genre_ids?.some((g) => parsed.genreIdsMovie.includes(g) || parsed.genreIdsTv.includes(g))
      );
    }
    if (parsed.year) {
      results = results.filter((m: Movie) => m.release_date?.startsWith(String(parsed.year)));
    }

    // Фильтруем по типу если нужно
    if (effectiveType === 'movie') results = results.filter((m: Movie) => !m.is_serial);
    if (effectiveType === 'series') results = results.filter((m: Movie) => m.is_serial);

    // Если текстовый поиск ничего не дал, но есть жанр — попробуем discover
    if (results.length === 0 && (parsed.genreIdsMovie.length > 0 || parsed.genreIdsTv.length > 0)) {
      const disc = await smartDiscover({
        mediaType: effectiveType === 'series' ? 'tv' : 'movie',
        genres: effectiveType === 'series' ? parsed.genreIdsTv : parsed.genreIdsMovie,
        page,
      });
      if (disc.length > 0) {
        return {
          ok: true,
          page,
          results: disc,
          total_pages: 10,
          total_results: disc.length,
        };
      }
    }

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

export async function getMovieDetail(compositeId: string): Promise<MovieDetail | null> {
  try {
    // ID формат: "tv-1396" или "movie-278" или просто "278"
    let type: 'movie' | 'tv' = 'movie';
    let numId = compositeId;

    if (compositeId.startsWith('tv-')) {
      type = 'tv';
      numId = compositeId.slice(3);
    } else if (compositeId.startsWith('movie-')) {
      type = 'movie';
      numId = compositeId.slice(6);
    } else {
      numId = compositeId.replace('tt', '');
    }

    const isSerial = type === 'tv';

    try {
      const data = await getDetail(numId, isSerial);
      return toMovieDetail(data, isSerial);
    } catch {
      // Если не нашли — пробуем другой тип
      const data = await getDetail(numId, !isSerial);
      return toMovieDetail(data, !isSerial);
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

/* ════════════ КиноИИ: умный подбор ════════════ */

export interface SmartDiscoverOpts {
  mediaType: 'movie' | 'tv';
  /** TMDB жанры */
  genres?: number[];
  minRuntime?: number;
  maxRuntime?: number;
  yearFrom?: number;
  yearTo?: number;
  /** Если не задан — случайная страница 1..3 для разнообразия подборок */
  page?: number;
}

export async function smartDiscover(opts: SmartDiscoverOpts): Promise<Movie[]> {
  try {
    const dateKey = opts.mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';
    const data = await tmdb<any>(`/discover/${opts.mediaType}`, {
      with_genres: (opts.genres || []).join(','),
      'vote_count.gte': opts.mediaType === 'movie' ? 300 : 200,
      'with_runtime.lte': opts.maxRuntime,
      'with_runtime.gte': opts.minRuntime,
      [`${dateKey}.gte`]: opts.yearFrom ? `${opts.yearFrom}-01-01` : '',
      [`${dateKey}.lte`]: opts.yearTo ? `${opts.yearTo}-12-31` : '',
      sort_by: 'popularity.desc',
      include_adult: false,
      page: opts.page ?? 1 + Math.floor(Math.random() * 3),
    });
    return (data.results || []).map((i: any) => toMovie(i, opts.mediaType));
  } catch { return []; }
}

/** Рекомендации TMDB по конкретному фильму/сериалу (для персонализации) */
export async function getRecommendations(id: string, mediaType: 'movie' | 'tv'): Promise<Movie[]> {
  try {
    const data = await tmdb<any>(`/${mediaType}/${id}/recommendations`, { page: 1 });
    return (data.results || []).map((i: any) => toMovie(i, mediaType));
  } catch { return []; }
}
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

/* ════════════ Российское кино и сериалы ════════════ */

export const CURATED_RUSSIAN_HITS: Movie[] = [
  {
    id: 'tv-237478',
    imdbID: 'tt30149074',
    title: 'Слово пацана. Кровь на асфальте',
    original_title: 'Slovo patsana. Krov na asfalte',
    overview: 'Конец 1980-х. Пока родители борются за выживание в меняющейся стране, подростки сбиваются в уличные стаи и бьются за асфальт.',
    poster_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&auto=format&fit=crop&q=80',
    release_date: '2023-11-09',
    vote_average: 8.5,
    imdb_rating: 8.5,
    runtime: null,
    type: 'series',
    genre_ids: [18, 80],
    genres: ['Драма', 'Криминал'],
    is_serial: true,
    directors: ['Жора Крыжовников'],
    actors: ['Иван Янковский', 'Рузиль Минекаев', 'Леон Кемстач'],
    countries: ['Россия'],
    popularity: 98.5,
    adult: false,
    quality: '4K Ultra HD',
    is_russian: true,
  },
  {
    id: 'movie-114479',
    imdbID: 'tt0118767',
    title: 'Брат',
    original_title: 'Brat',
    overview: 'Демобилизованный из армии Данила Багров приезжает в Санкт-Петербург к старшему брату, который оказывается наёмным убийцей.',
    poster_path: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&auto=format&fit=crop&q=80',
    release_date: '1997-12-12',
    vote_average: 8.2,
    imdb_rating: 8.2,
    runtime: 100,
    type: 'movie',
    genre_ids: [80, 18, 28],
    genres: ['Криминал', 'Драма', 'Боевик'],
    is_serial: false,
    directors: ['Алексей Балабанов'],
    actors: ['Сергей Бодров-мл.', 'Виктор Сухоруков', 'Светлана Письмиченко'],
    countries: ['Россия'],
    popularity: 88.2,
    adult: false,
    quality: 'Full HD',
    is_russian: true,
  },
  {
    id: 'movie-114480',
    imdbID: 'tt0238883',
    title: 'Брат 2',
    original_title: 'Brat 2',
    overview: 'Данила Багров отправляется в Америку, чтобы восстановить справедливость и вызволить брата сослуживца.',
    poster_path: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1280&auto=format&fit=crop&q=80',
    release_date: '2000-05-11',
    vote_average: 8.1,
    imdb_rating: 8.1,
    runtime: 122,
    type: 'movie',
    genre_ids: [80, 28],
    genres: ['Криминал', 'Боевик'],
    is_serial: false,
    directors: ['Алексей Балабанов'],
    actors: ['Сергей Бодров-мл.', 'Виктор Сухоруков', 'Сергей Маковецкий'],
    countries: ['Россия'],
    popularity: 85.0,
    adult: false,
    quality: 'Full HD',
    is_russian: true,
  },
  {
    id: 'movie-850165',
    imdbID: 'tt8550800',
    title: 'Мастер и Маргарита',
    original_title: 'Master i Margarita',
    overview: 'Москва, 1930-е годы. Известный писатель оказывается в центре литературного скандала. Вскоре в городе появляется загадочный Воланд со свитой.',
    poster_path: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1280&auto=format&fit=crop&q=80',
    release_date: '2024-01-25',
    vote_average: 7.9,
    imdb_rating: 7.9,
    runtime: 157,
    type: 'movie',
    genre_ids: [18, 14, 9648],
    genres: ['Драма', 'Фэнтези', 'Детектив'],
    is_serial: false,
    directors: ['Михаил Локшин'],
    actors: ['Аугуст Диль', 'Евгений Цыганов', 'Юлия Снигирь'],
    countries: ['Россия'],
    popularity: 94.0,
    adult: false,
    quality: '4K Ultra HD',
    is_russian: true,
  },
  {
    id: 'tv-121516',
    imdbID: 'tt13989182',
    title: 'Вампиры средней полосы',
    original_title: 'Vampiry sredney polosy',
    overview: 'Смоленск — обычный город, но в нём живут настоящие вампиры под предводительством деда Славы, которые никого не убивают.',
    poster_path: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&auto=format&fit=crop&q=80',
    release_date: '2021-03-18',
    vote_average: 8.3,
    imdb_rating: 8.3,
    runtime: null,
    type: 'series',
    genre_ids: [35, 14, 9648],
    genres: ['Комедия', 'Фэнтези', 'Детектив'],
    is_serial: true,
    directors: ['Антон Маслов'],
    actors: ['Юрий Стоянов', 'Татьяна Догилева', 'Артём Ткаченко'],
    countries: ['Россия'],
    popularity: 82.0,
    adult: false,
    quality: 'Full HD',
    is_russian: true,
  },
  {
    id: 'tv-98188',
    imdbID: 'tt10850238',
    title: 'Триггер',
    original_title: 'Trigger',
    overview: 'Психолог Артём Стрелецкий использует провокационный метод шоковой терапии, выводя клиентов из зоны комфорта.',
    poster_path: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1280&auto=format&fit=crop&q=80',
    release_date: '2020-02-10',
    vote_average: 8.1,
    imdb_rating: 8.1,
    runtime: null,
    type: 'series',
    genre_ids: [18, 9648],
    genres: ['Драма', 'Детектив'],
    is_serial: true,
    directors: ['Дмитрий Тюрин'],
    actors: ['Максим Матвеев', 'Лена Тронина'],
    countries: ['Россия'],
    popularity: 79.0,
    adult: false,
    quality: 'Full HD',
    is_russian: true,
  },
  {
    id: 'movie-630240',
    imdbID: 'tt7601480',
    title: 'Майор Гром: Чумной Доктор',
    original_title: 'Mayor Grom: Chumnoy Doktor',
    overview: 'Майор полиции Игорь Гром сталкивается с таинственным мстителем в маске Чумного Доктора, который объявляет войну коррупции в Петербурге.',
    poster_path: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1280&auto=format&fit=crop&q=80',
    release_date: '2021-04-01',
    vote_average: 7.7,
    imdb_rating: 7.7,
    runtime: 136,
    type: 'movie',
    genre_ids: [28, 80],
    genres: ['Боевик', 'Криминал'],
    is_serial: false,
    directors: ['Олег Трофим'],
    actors: ['Тихон Жизневский', 'Любовь Аксёнова'],
    countries: ['Россия'],
    popularity: 84.0,
    adult: false,
    quality: '4K Ultra HD',
    is_russian: true,
  },
  {
    id: 'movie-1075794',
    imdbID: 'tt28489718',
    title: 'Холоп 2',
    original_title: 'Kholop 2',
    overview: 'Гриша, бывший мажор, замечает избалованную Катю и решает перевоспитать её в декорациях эпохи наполеоновских войн.',
    poster_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
    backdrop_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&auto=format&fit=crop&q=80',
    release_date: '2024-01-01',
    vote_average: 7.4,
    imdb_rating: 7.4,
    runtime: 119,
    type: 'movie',
    genre_ids: [35],
    genres: ['Комедия'],
    is_serial: false,
    directors: ['Клим Шипенко'],
    actors: ['Милош Бикович', 'Аглая Тарасова'],
    countries: ['Россия'],
    popularity: 91.0,
    adult: false,
    quality: '4K Ultra HD',
    is_russian: true,
  },
];

export async function getRussianMovies(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/discover/movie', {
      with_original_language: 'ru',
      sort_by: 'popularity.desc',
      'vote_count.gte': 10,
    });
    const fetched = (data.results || []).map((i: any) => ({
      ...toMovie(i, 'movie'),
      is_russian: true,
    }));
    return fetched.length > 0 ? fetched : CURATED_RUSSIAN_HITS.filter((m) => !m.is_serial);
  } catch {
    return CURATED_RUSSIAN_HITS.filter((m) => !m.is_serial);
  }
}

export async function getRussianSeries(): Promise<Movie[]> {
  try {
    const data = await tmdb<any>('/discover/tv', {
      with_original_language: 'ru',
      sort_by: 'popularity.desc',
      'vote_count.gte': 10,
    });
    const fetched = (data.results || []).map((i: any) => ({
      ...toMovie(i, 'tv'),
      is_russian: true,
    }));
    return fetched.length > 0 ? fetched : CURATED_RUSSIAN_HITS.filter((m) => m.is_serial);
  } catch {
    return CURATED_RUSSIAN_HITS.filter((m) => m.is_serial);
  }
}

export async function getRussianCinema(): Promise<Movie[]> {
  try {
    const [movies, series] = await Promise.all([
      getRussianMovies(),
      getRussianSeries(),
    ]);
    const merged: Movie[] = [];
    const maxLen = Math.max(movies.length, series.length);
    for (let i = 0; i < maxLen; i++) {
      if (movies[i]) merged.push(movies[i]);
      if (series[i]) merged.push(series[i]);
    }
    return merged.length > 0 ? merged : CURATED_RUSSIAN_HITS;
  } catch {
    return CURATED_RUSSIAN_HITS;
  }
}
