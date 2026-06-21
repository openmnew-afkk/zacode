/* ===== Нормализация ответа VideoCDN к единому формату =====
 * VideoCDN отдаёт массив "short" объектов с полем material_data,
 * содержащим постер, описание, жанры, рейтинги КП/IMDb.
 */

/** Категории VideoCDN (для меню/фильтров) */
export const CATEGORIES = [
  { id: 'movie', title: 'Фильмы' },
  { id: 'serial', title: 'Сериалы' },
  { id: 'tvshow', title: 'ТВ-шоу' },
  { id: 'anime', title: 'Аниме' },
] as const;

/** Жанры (базовый набор, ID совпадают с VideoCDN) */
export const GENRES = [
  { id: 1, name: 'Боевик' },
  { id: 2, name: 'Триллер' },
  { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' },
  { id: 5, name: 'Криминал' },
  { id: 6, name: 'Фантастика' },
  { id: 7, name: 'Ужасы' },
  { id: 8, name: 'Приключения' },
  { id: 9, name: 'Мелодрама' },
  { id: 10, name: 'Детектив' },
  { id: 11, name: 'Военный' },
  { id: 12, name: 'Исторический' },
  { id: 13, name: 'Семейный' },
  { id: 14, name: 'Мультфильм' },
  { id: 15, name: 'Фэнтези' },
  { id: 16, name: 'Документальный' },
  { id: 17, name: 'Биография' },
  { id: 18, name: 'Мюзикл' },
  { id: 19, name: 'Спорт' },
  { id: 20, name: 'Вестерн' },
];

interface VCdnShort {
  id: string | number;
  imdb_id?: string;
  kinopoisk_id?: string | number;
  title: string;
  title_orig?: string;
  type?: string;
  year?: number | string;
  iframe_url?: string;
  blocked?: number | boolean;
  camrip?: number | boolean;
  translator?: string;
  quality?: string;
  screenshots?: string[];
  translations?: any[];
  seasons?: any[];
  material_data?: {
    title?: string;
    description?: string;
    poster?: string;
    preview?: string;
    genres?: string[];
    countries?: string[];
    actors?: string[];
    directors?: string[];
    imdb_rating?: number | string;
    kinopoisk_rating?: number | string;
    kp_rating?: number | string;
    duration?: number;
    release_year?: number | string;
    world_art_id?: string | number;
    kinopoisk_id?: string | number;
    imdb_id?: string;
  };
  added_at?: string;
  updated_at?: string;
}

interface VCdnListResponse {
  data?: VCdnShort[];
  total?: number;
  last_page?: number;
  current_page?: number;
  from?: number;
  to?: number;
  per_page?: number;
}

/** Привести оценку к 0-10 */
const toRating = (v: any): number => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (typeof n !== 'number' || isNaN(n)) return 0;
  return Math.round(n * 10) / 10;
};

/** Главный ID — предпочитаем kinopoisk_id */
export const pickId = (item: VCdnShort): number => {
  const kp = item.material_data?.kinopoisk_id ?? item.kinopoisk_id;
  if (kp) {
    const n = parseInt(String(kp), 10);
    if (!isNaN(n)) return n;
  }
  const imdb = item.material_data?.imdb_id ?? item.imdb_id;
  if (imdb) {
    // Хэш от imdb_id как числовой идентификатор
    let h = 0;
    const s = String(imdb);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  const n = parseInt(String(item.id), 10);
  return isNaN(n) ? 0 : n + 10_000_000;
};

/** Нормализовать один элемент */
export function normalizeItem(item: VCdnShort) {
  const md = item.material_data || {};
  const id = pickId(item);
  const kpRating = toRating(md.kinopoisk_rating ?? md.kp_rating);
  const imdbRating = toRating(md.imdb_rating);
  const rating = kpRating || imdbRating || 0;
  const poster = md.poster || md.preview || '';
  const preview = md.preview || md.poster || '';
  const isSerial =
    item.type === 'serial' ||
    item.type === 'anime' ||
    item.type === 'tvshow' ||
    Array.isArray(item.seasons) && item.seasons.length > 0;

  // Жанры: массив строк -> {id,name}
  const genreNames = md.genres || [];
  const genres = genreNames.map((name, i) => ({ id: i + 1, name }));

  return {
    id,
    title: md.title || item.title || 'Без названия',
    original_title: item.title_orig || '',
    overview: md.description || '',
    poster_path: poster || null,
    backdrop_path: preview || poster || null,
    release_date: String(md.release_year || item.year || ''),
    vote_average: rating,
    kinopoisk_rating: kpRating,
    imdb_rating: imdbRating,
    runtime: md.duration ? Math.round(md.duration) : null,
    genre_ids: genres.map((g) => g.id),
    genres,
    type: item.type || 'movie',
    is_serial: isSerial,
    imdb_id: md.imdb_id || item.imdb_id || '',
    kinopoisk_id: String(md.kinopoisk_id ?? item.kinopoisk_id ?? ''),
    quality: item.quality || '',
    translator: item.translator || '',
    iframe_url: item.iframe_url || '',
    countries: md.countries || [],
    actors: (md.actors || []).slice(0, 20),
    directors: md.directors || [],
    popularity: 0,
    adult: false,
  };
}

/** Нормализовать список */
export function normalizeList(raw: any) {
  const resp: VCdnListResponse = raw || {};
  const items = (resp.data || []).map(normalizeItem);
  return {
    items,
    total: resp.total || items.length,
    lastPage: resp.last_page || 1,
    currentPage: resp.current_page || 1,
  };
}

/** Подготовить структуру сезонов для сериала */
export function normalizeSeasons(seasonsRaw: any[]) {
  if (!Array.isArray(seasonsRaw)) return [];
  return seasonsRaw
    .map((s: any) => {
      const episodes = (s.episodes || []).map((ep: any) => ({
        id: ep.id || `${s.season_number || s.id}-${ep.episode}`,
        episode: ep.episode || ep.num,
        season: s.season_number || s.id,
        title: ep.title || `Серия ${ep.episode || ep.num}`,
        iframe_url: ep.iframe_url || '',
        preview: ep.preview || '',
      }));
      return {
        id: s.id || s.season_number,
        season_number: s.season_number || s.id,
        episodes_count: episodes.length,
        episodes,
      };
    })
    .sort((a, b) => (a.season_number as number) - (b.season_number as number));
}
