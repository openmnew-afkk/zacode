/* ===== Типы данных для приложения ===== */

/** Фильм из TMDB API */
export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  adult: boolean;
  media_type?: string;
}

/** Детальная информация о фильме */
export interface MovieDetail extends Movie {
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  genres: Genre[];
  production_countries: ProductionCountry[];
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  similar?: {
    results: Movie[];
  };
}

/** Жанр */
export interface Genre {
  id: number;
  name: string;
}

/** Страна производства */
export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

/** Актёр */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

/** Член съёмочной группы */
export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

/** Ответ TMDB API со списком фильмов */
export interface TMDBResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

/** Ответ Kodik API */
export interface KodikResponse {
  time: string;
  total: number;
  results: KodikResult[];
}

/** Результат Kodik */
export interface KodikResult {
  id: string;
  type: string;
  link: string;
  title: string;
  title_orig: string;
  year: number;
  kinopoisk_id: string;
  imdb_id: string;
  worldart_link: string;
  shikimori_id: string;
  quality: string;
  camrip: boolean;
  translation: {
    id: number;
    title: string;
    type: string;
  };
  screenshots: string[];
}

/** Пользователь Telegram */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/** Элемент истории просмотров */
export interface WatchHistoryItem {
  movie: Movie;
  watchedAt: number; // timestamp
}

/** Тема приложения */
export type AppTheme = 'dark' | 'light';
