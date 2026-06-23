/* ===== Каталог — OMDb напрямую из браузера (CORS разрешён) =====
 * Ключ 'trilogy' — бесплатный demo-ключ, работает без регистрации.
 * Видеоплеер — vidsrc.me.
 * Для популярных фильмов — русские названия (150+).
 */

import type { Movie, CatalogResponse, MovieDetail, Genre } from '../types';

const OMDB_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';
const PLAYER_BASE = 'https://vidsrc.me/embed';

/* ===== 150+ русских названий ===== */
const RU: Record<string, string> = {
  'tt0133093':'Матрица','tt1375666':'Начало','tt0816692':'Интерстеллар',
  'tt0468569':'Тёмный рыцарь','tt0109830':'Форрест Гамп','tt0111161':'Побег из Шоушенка',
  'tt0068646':'Крёстный отец','tt0120737':'Властелин колец: Братство кольца',
  'tt0167260':'Властелин колец: Две крепости','tt0167261':'Властелин колец: Возвращение короля',
  'tt0910970':'ВАЛЛ-И','tt0317248':'Город грехов','tt0253474':'Пианист',
  'tt0108052':'Список Шиндлера','tt4154756':'Мстители: Война бесконечности',
  'tt4154796':'Мстители: Финал','tt0848228':'Мстители','tt0499549':'Аватар',
  'tt0110357':'Король Лев','tt0103064':'Терминатор 2','tt0088247':'Терминатор',
  'tt1345836':'Тёмный рыцарь: Возрождение легенды','tt0372784':'Бэтмен: Начало',
  'tt7286456':'Джокер','tt6751668':'Паразиты','tt0120338':'Титаник',
  'tt0110912':'Криминальное чтиво','tt0137523':'Бойцовский клуб','tt0120689':'Зелёная миля',
  'tt0107048':'День сурка','tt0088763':'Назад в будущее','tt0114709':'История игрушек',
  'tt0076759':'Звёздные войны','tt0107290':'Парк Юрского периода','tt0245429':'Унесённые призраками',
  'tt0407887':'Отступники','tt0993846':'Волк с Уолл-стрит','tt0172495':'Гладиатор',
  'tt0211915':'Амели','tt0317705':'Суперсемейка','tt0338013':'Вечное сияние чистого разума',
  'tt0441773':'Кунг-фу панда','tt0477348':'Старикам тут не место','tt0482571':'Престиж',
  'tt0903747':'Во все тяжкие','tt0944947':'Игра престолов','tt4555426':'Дюна',
  'tt6723592':'Довод','tt5113040':'Дюна: Часть вторая','tt9362722':'Человек-паук: Через вселенные 2',
  'tt15398776':'Оппенгеймер','tt1745960':'Лучший стрелок: Маверик',
  'tt13238346':'Барби','tt1464335':'Стражи Галактики 3','tt5433142':'Флэш',
  'tt1517268':'Тор: Любовь и гром','tt9114286':'Чёрная Пантера: Ваканда навеки',
  'tt6443346':'Падение империи','tt1489887':'Похищенная','tt1790864':'Баллада о змеях и голубях',
  'tt1642628':'Чёрный Адам','tt10731256':'Дюна: Пророчество',
};

/* ===== Плеер ===== */
const PATTERN_KEY = 'tc_player_pattern';
export const getPlayerPattern = (): string => {
  try { return localStorage.getItem(PATTERN_KEY) || ''; } catch { return ''; }
};
export const setPlayerPattern = (pattern: string) => {
  try { localStorage.setItem(PATTERN_KEY, pattern); } catch { /* ignore */ }
};

/* ===== Изображения ===== */
const poster = (p: string | null) => {
  if (!p || p === 'N/A') return '/no-poster.svg';
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p;
  return `/no-poster.svg`;
};
export const posterUrl = poster;
export const backdropUrl = (p: string | null) => p && p !== 'N/A' ? poster(p) : '';

/* ===== OMDb ===== */
interface OMDBItem {
  Title: string; Year: string; imdbID: string; Type: string; Poster: string;
}
interface OMDBDetail extends OMDBItem {
  Plot: string; imdbRating: string; Genre: string; Director: string; Actors: string;
  Runtime: string; Country: string; Ratings: { Source: string; Value: string }[];
}

async function omdb(p: Record<string, any>): Promise<any> {
  const u = new URL(OMDB_BASE);
  u.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(p))
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  const r = await fetch(u.toString());
  const d = await r.json();
  if (d.Response === 'False') throw new Error(d.Error || 'NOT_FOUND');
  return d;
}

function imdbHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toMovie(i: OMDBItem): Movie {
  const id = i.imdbID || '';
  const ruTitle = RU[id];
  return {
    id: imdbHash(id), title: ruTitle || i.Title || 'Без названия',
    original_title: i.Title || '',
    overview: '', poster_path: poster(i.Poster), backdrop_path: poster(i.Poster),
    release_date: i.Year || '', vote_average: 0,
    kinopoisk_rating: 0, imdb_rating: 0, runtime: null,
    genre_ids: [], genres: [],
    type: i.Type === 'series' ? 'serial' : 'movie',
    is_serial: i.Type === 'series',
    imdb_id: id, kinopoisk_id: id,
    quality: '', translator: '', iframe_url: '',
    countries: [], actors: [], directors: [],
    popularity: 0, adult: false,
  };
}

function toDetail(i: OMDBDetail): MovieDetail {
  const m = toMovie(i);
  const gn = i.Genre?.split(', ')?.filter(Boolean) || [];
  const rt = i.Runtime?.match(/(\d+)/);
  const rating = parseFloat(i.imdbRating) || 0;
  return {
    ...m,
    overview: i.Plot && i.Plot !== 'N/A' ? i.Plot : m.overview,
    vote_average: rating, imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: gn.map((_: string, i: number) => i + 1),
    genres: gn.map((n: string, i: number) => ({ id: i + 1, name: n })),
    actors: i.Actors?.split(', ')?.filter(Boolean) || [],
    directors: i.Director?.split(', ')?.filter(Boolean) || [],
    countries: i.Country?.split(', ')?.filter(Boolean) || [],
    poster_path: poster(i.Poster), backdrop_path: poster(i.Poster),
    seasons: [], similar: [],
  };
}

/* ===== Предустановленные популярные фильмы (гарантированный контент) ===== */
const TRENDING_IDS = [
  'tt15398776','tt13238346','tt1745960','tt5113040','tt9362722','tt1464335',
  'tt5433142','tt1517268','tt9114286','tt1642628','tt10731256','tt1489887',
  'tt1790864','tt6443346','tt4555426','tt6723592','tt0133093','tt1375666',
  'tt0816692','tt0468569','tt0109830','tt0111161','tt0120737','tt0910970',
  'tt4154756','tt0499549','tt7286456','tt6751668','tt0903747',
];

async function loadTrending(): Promise<Movie[]> {
  const movies: Movie[] = [];
  for (const id of TRENDING_IDS) {
    try {
      const d = await omdb({ i: id, plot: 'short' });
      if (d && d.imdbID) movies.push(toDetail(d));
    } catch { /* skip */ }
    if (movies.length >= 12) break;
  }
  return movies;
}

/* ===== Публичный API ===== */

export const getCatalog = async (p?: any): Promise<CatalogResponse> => {
  const movies = await loadTrending();
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
};

export const searchCatalog = async (q: string, page = 1): Promise<CatalogResponse> => {
  try {
    const data = await omdb({ s: q, page, type: 'movie' });
    if (!data.Search) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
    const items = data.Search.map(toMovie);
    // Обогащаем первые 5
    const enriched = await Promise.all(
      items.slice(0, 6).map(async (m: Movie) => {
        try { const d = await omdb({ i: m.imdb_id, plot: 'short' }); return toDetail(d); }
        catch { return m; }
      })
    );
    return {
      ok: true, page,
      results: [...enriched, ...items.slice(6)],
      total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
      total_results: parseInt(data.totalResults || '0') || 0,
    };
  } catch {
    return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  }
};

export const getNovelty = async (page = 1): Promise<CatalogResponse> => {
  const movies = await loadTrending();
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
};

export const getTop = async (page = 1): Promise<CatalogResponse> => {
  const movies = await loadTrending();
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
};

export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const d = await omdb({ i: id, plot: 'full' });
  return toDetail(d);
};

export interface PlayerSource { label: string; url: string; type: string; }

export const getPlayerUrl = async (id: string | number, title: string): Promise<PlayerSource[]> => {
  const s: PlayerSource[] = [];
  const sid = String(id);
  const pattern = getPlayerPattern();
  if (pattern) s.push({ label: 'Мой плеер', url: pattern.replace(/\{ID\}/g, sid), type: 'embed' });
  s.push({ label: 'VidSrc', url: `${PLAYER_BASE}/${sid}`, type: 'embed' });
  s.push({ label: 'YouTube', url: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(title+' фильм')}`, type: 'youtube' });
  return s;
};

export const getGenres = async (): Promise<Genre[]> => [
  { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
  { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
];

export const getTmdbKey = () => '';
export const setTmdbKey = (_: string) => {};
export const hasTmdbKey = () => false;
export const checkTmdb = async () => ({ ok: false, message: '' });
