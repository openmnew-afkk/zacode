/* ===== Каталог + Плеер — OMDb + vidsrc.me =====
 * OMDb: поиск, детали, постеры (CORS разрешён, бесплатный ключ trilogy)
 * vidsrc.me: реальный видеоплеер по IMDb ID (CORS, iframe compatible)
 */

import type { Movie, CatalogResponse, MovieDetail, Genre } from '../types';

const OMDB_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';

/* ===== Русские названия фильмов по IMDb ID ===== */
const RU_TITLES: Record<string, string> = {
  'tt0133093': 'Матрица',
  'tt1375666': 'Начало',
  'tt0816692': 'Интерстеллар',
  'tt0468569': 'Тёмный рыцарь',
  'tt0109830': 'Форрест Гамп',
  'tt0111161': 'Побег из Шоушенка',
  'tt0068646': 'Крёстный отец',
  'tt0071562': 'Крёстный отец 2',
  'tt0120737': 'Властелин колец: Братство кольца',
  'tt0167260': 'Властелин колец: Две крепости',
  'tt0167261': 'Властелин колец: Возвращение короля',
  'tt0910970': 'ВАЛЛ-И',
  'tt0317248': 'Город грехов',
  'tt0253474': 'Пианист',
  'tt0108052': 'Список Шиндлера',
  'tt4154756': 'Мстители: Война бесконечности',
  'tt4154796': 'Мстители: Финал',
  'tt0848228': 'Мстители',
  'tt2395427': 'Мстители: Эра Альтрона',
  'tt0499549': 'Аватар',
  'tt1630029': 'Аватар 2',
  'tt0110357': 'Король Лев',
  'tt0103064': 'Терминатор 2',
  'tt0088247': 'Терминатор',
  'tt1345836': 'Тёмный рыцарь: Возрождение легенды',
  'tt0372784': 'Бэтмен: Начало',
  'tt7286456': 'Джокер',
  'tt6751668': 'Паразиты',
  'tt0120338': 'Титаник',
  'tt0102926': 'Молчание ягнят',
  'tt0114369': 'Семь',
  'tt0110912': 'Криминальное чтиво',
  'tt0137523': 'Бойцовский клуб',
  'tt0120689': 'Зелёная миля',
  'tt0107048': 'День сурка',
  'tt0088763': 'Назад в будущее',
  'tt0082971': 'Индиана Джонс: В поисках утраченного ковчега',
  'tt0114709': 'История игрушек',
  'tt0121765': 'Звёздные войны: Месть ситхов',
  'tt0080684': 'Звёздные войны: Империя наносит ответный удар',
  'tt0076759': 'Звёздные войны: Новая надежда',
  'tt0107290': 'Парк Юрского периода',
  'tt0119698': 'Принцесса Мононоке',
  'tt0245429': 'Унесённые призраками',
  'tt0095327': 'Мой сосед Тоторо',
  'tt0407887': 'Отступники',
  'tt0993846': 'Волк с Уолл-стрит',
  'tt0139699': 'Малышка на миллион',
  'tt0172495': 'Гладиатор',
  'tt0169547': 'США',
  'tt0211915': 'Амели',
  'tt0209144': 'Мemento',
  'tt0317705': 'Суперсемейка',
  'tt0338013': 'Вечное сияние чистого разума',
  'tt0348150': 'Супермен',
  'tt0382932': 'Рататуй',
  'tt0405094': 'Жизнь других',
  'tt0441773': 'Кунг-фу панда',
  'tt0454876': 'В жизни есть любовь',
  'tt0477348': 'Старикам тут не место',
  'tt0482571': 'Престиж',
  'tt0498380': 'Сокровище',
  'tt0903747': 'Во все тяжкие',
  'tt0944947': 'Игра престолов',
  'tt1119644': 'Форс-мажоры',
  'tt1196946': 'Интерн',
  'tt1213641': 'Первый мститель',
  'tt1270797': 'Человек из стали',
  'tt1300854': 'Старший сын',
  'tt1327773': 'Тор',
  'tt1431045': 'Дэдпул',
  'tt1475582': 'Шерлок',
  'tt1520211': 'Ходячие мертвецы',
  'tt1798684': 'Доктор Сон',
  'tt1825683': 'Чёрная пантера',
  'tt1865718': 'Гравити Фолз',
  'tt1981115': 'Тор 2',
  'tt2098220': 'Хоббит: Нежданное путешествие',
  'tt1170358': 'Хоббит: Пустошь Смауга',
  'tt2310332': 'Хоббит: Битва пяти воинств',
  'tt2119532': 'Дом Z',
  'tt2442560': 'Пила: Игра на выживание',
  'tt2582802': 'Одержимость',
  'tt2802850': 'Три билборда на границе Эббинга, Миссури',
  'tt2872718': 'Оно',
  'tt3315342': 'Логан',
  'tt3397884': 'Стражи Галактики 2',
  'tt3659388': 'Марсианин',
  'tt3748528': 'Изгой-один',
  'tt3890160': 'Малыш на драйве',
  'tt4034228': 'Мандалорец',
  'tt4158110': 'Побег',
  'tt4287320': 'Прочь',
  'tt4459900': 'Мир юрского периода',
  'tt4555426': 'Дюна',
  'tt4633694': 'Человек-паук: Через вселенные',
  'tt4698684': 'Охота',
  'tt4972582': 'Сплит',
  'tt5013056': 'Дюнкерк',
  'tt5052448': 'Оно 2',
  'tt5186714': 'Новый папа',
  'tt5311542': 'Кловерфилд, 10',
  'tt5580390': 'Дикая',
  'tt5606664': 'Восьмой класс',
  'tt5726616': 'Остров собак',
  'tt5776858': 'Человек-паук: Вдали от дома',
  'tt5898034': 'Варкрафт',
  'tt6105098': 'Король Лев 2019',
  'tt6156584': 'Леди Бёрд',
  'tt6209534': 'Шестое чувство',
  'tt6320628': 'Человек-паук: Нет пути домой',
  'tt6723592': 'Довод',
  'tt6806448': 'Быстрее пули',
  'tt6857112': 'Грань будущего',
  'tt6966692': 'Зелёная книга',
  'tt7139936': 'Форсаж 9',
  'tt7349662': 'Чёрная Вдова',
  'tt7734218': 'Круэлла',
  'tt8110330': 'Душа',
  'tt8178634': 'РЭД',
  'tt8236116': 'Игра',
};

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
  // Русское название если есть
  const ru = RU_TITLES[imdbID];
  return {
    id: imdbID,
    title: ru || item.Title || 'Без названия',
    original_title: item.Title || '',
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
async function searchOMDb(query: string, page = 1, type?: string): Promise<CatalogResponse> {
  const params: Record<string, any> = { s: query, page };
  if (type === 'series') params.type = 'series';
  else params.type = 'movie';

  const data = await omdbFetch(params);
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
export const searchCatalog = async (query: string, page = 1, type?: string): Promise<CatalogResponse> => {
  return searchOMDb(query, page, type);
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
