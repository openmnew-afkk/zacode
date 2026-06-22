/* ===== Каталог + Плеер — OMDb + vidsrc.me =====
 * OMDb: поиск, детали, постеры (CORS разрешён, бесплатный ключ trilogy)
 * vidsrc.me: реальный видеоплеер по IMDb ID (CORS, iframe compatible)
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
  if (path && (path.startsWith('http') || path.startsWith('//')))
    return path.startsWith('//') ? `https:${path}` : path;
  return '/no-poster.svg';
};
export const backdropUrl = (path: string | null, _size?: string): string =>
  path ? (path.startsWith('http') ? path : `https:${path}`) : '';

/* ===== Нормализация ===== */

function omdbToMovie(item: any): Movie {
  const imdbID = item.imdbID || '';
  const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : null;
  const type = item.Type === 'series' ? 'serial' : 'movie';
  return {
    id: imdbID,
    title: item.Title || 'Без названия',
    original_title: '',
    overview: '',
    poster_path: poster, backdrop_path: poster,
    release_date: item.Year || '',
    vote_average: 0, kinopoisk_rating: 0, imdb_rating: 0,
    runtime: null, genre_ids: [], genres: [],
    type, is_serial: item.Type === 'series',
    imdb_id: imdbID, kinopoisk_id: imdbID,
    quality: '', translator: '', iframe_url: '',
    countries: [], actors: [], directors: [],
    popularity: 0, adult: false,
  };
}

function omdbToDetail(item: any): MovieDetail {
  const base = omdbToMovie(item);
  const gn = item.Genre?.split(', ')?.filter(Boolean) || [];
  const actors = item.Actors?.split(', ')?.filter(Boolean) || [];
  const directors = item.Director?.split(', ')?.filter(Boolean) || [];
  const countries = item.Country?.split(', ')?.filter(Boolean) || [];
  const rt = item.Runtime?.match(/(\d+)/);
  const rating = parseFloat(item.imdbRating) || 0;
  return {
    ...base,
    overview: item.Plot && item.Plot !== 'N/A' ? item.Plot : '',
    vote_average: rating, imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: gn.map((_: string, i: number) => i + 1),
    genres: gn.map((name: string, i: number) => ({ id: i + 1, name })),
    actors, directors, countries,
    poster_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    backdrop_path: item.Poster && item.Poster !== 'N/A' ? item.Poster : base.poster_path,
    seasons: [], similar: [],
  };
}

/* ===== OMDb запросы ===== */

async function omdbFetch(params: Record<string, any>): Promise<any> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False' && data.Error?.includes('not found')) throw new Error('NOT_FOUND');
  return data;
}

/** Поиск + обогащение деталями первых 5 */
async function searchOMDb(query: string, page = 1): Promise<CatalogResponse> {
  const data = await omdbFetch({ s: query, page, type: 'movie' });
  if (!data.Search) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  const items = data.Search.map(omdbToMovie);
  const enriched = await Promise.all(
    items.slice(0, 6).map(async (m: Movie) => {
      try { const d = await omdbFetch({ i: m.imdb_id, plot: 'short' }); return d ? omdbToDetail(d) : m; }
      catch { return m; }
    })
  );
  return {
    ok: true, page,
    results: [...enriched, ...items.slice(6)],
    total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
    total_results: parseInt(data.totalResults || '0') || 0,
  };
}

/* ===== Популярные фильмы (гарантированный контент для главной) ===== */
const POPULAR: { id: string; ru: string }[] = [
  { id: 'tt1375666', ru: 'Начало' },          // Inception
  { id: 'tt0816692', ru: 'Интерстеллар' },     // Interstellar
  { id: 'tt0133093', ru: 'Матрица' },          // The Matrix
  { id: 'tt0468569', ru: 'Тёмный рыцарь' },    // The Dark Knight
  { id: 'tt0109830', ru: 'Форрест Гамп' },     // Forrest Gump
  { id: 'tt0111161', ru: 'Побег из Шоушенка' }, // Shawshank Redemption
  { id: 'tt0068646', ru: 'Крёстный отец' },     // The Godfather
  { id: 'tt0120737', ru: 'Властелин колец: Братство кольца' },
  { id: 'tt0167260', ru: 'Властелин колец: Две крепости' },
  { id: 'tt0167261', ru: 'Властелин колец: Возвращение короля' },
  { id: 'tt0910970', ru: 'ВАЛЛ-И' },
  { id: 'tt0317248', ru: 'Город грехов' },
  { id: 'tt0253474', ru: 'Пианист' },
  { id: 'tt0108052', ru: 'Список Шиндлера' },
  { id: 'tt4154756', ru: 'Мстители: Война бесконечности' }, // Avengers: Infinity War
];

async function fetchPopular(): Promise<Movie[]> {
  const movies: Movie[] = [];
  for (const p of POPULAR) {
    try {
      const d = await omdbFetch({ i: p.id, plot: 'short' });
      if (d) {
        const m = omdbToDetail(d);
        // Ставим русское название
        m.title = p.ru;
        movies.push(m);
      }
    } catch { /* skip */ }
    if (movies.length >= 8) break;
  }
  return movies;
}

/* ===== Публичные функции ===== */

/** Поиск по названию */
export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> => {
  return searchOMDb(query, page);
};

/** Каталог — всегда пытается найти фильмы */
export const getCatalog = async (params: {
  page?: number; q?: string; genre?: string; year?: string; sort?: string; limit?: number;
}): Promise<CatalogResponse> => {
  if (params.q) return searchOMDb(params.q, params.page || 1);
  // Главная: возвращаем популярные
  const popular = await fetchPopular();
  return {
    ok: true, page: 1,
    results: popular,
    total_pages: 1, total_results: popular.length,
  };
};

/** Новинки — те же популярные (OMDb не умеет сортировать по дате) */
export const getNovelty = async (page = 1): Promise<CatalogResponse> => {
  const popular = await fetchPopular();
  return { ok: true, page: 1, results: popular, total_pages: 1, total_results: popular.length };
};

/** Топ — то же */
export const getTop = (page = 1): Promise<CatalogResponse> => getNovelty(page);

/** Детали фильма */
export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const d = await omdbFetch({ i: id, plot: 'full' });
  return omdbToDetail(d);
};

/** Плеер — возвращает источники видео */
export interface PlayerSource { label: string; url: string; type: string; }

export const getPlayerUrl = async (id: string | number, title: string): Promise<PlayerSource[]> => {
  const sources: PlayerSource[] = [];
  const strId = String(id);

  // 1. Пользовательский шаблон
  const pattern = getPlayerPattern();
  if (pattern) {
    sources.push({ label: 'Мой плеер', url: pattern.replace(/\{ID\}/g, strId), type: 'embed' });
  }

  // 2. vidsrc.me — реальный плеер с фильмом
  sources.push({ label: 'VidSrc', url: `https://vidsrc.me/embed/${strId}`, type: 'embed' });

  // 3. YouTube фолбэк
  sources.push({
    label: 'YouTube',
    url: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title + ' фильм')}`,
    type: 'youtube',
  });

  return sources;
};

/* ===== Жанры (хардкод, по-русски) ===== */
export const getGenres = async (): Promise<Genre[]> => [
  { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
  { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
  { id: 16, name: 'Биография' }, { id: 17, name: 'Спорт' }, { id: 18, name: 'Кино' },
];
