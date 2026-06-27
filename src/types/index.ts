/* ===== Типы данных приложения (источник: VideoCDN) ===== */

/** Жанр */
export interface Genre {
  id: number;
  name: string;
}

/** Карточка фильма/сериала (нормализованный формат VideoCDN) */
export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  kinopoisk_rating: number;
  imdb_rating: number;
  runtime: number | null;
  genre_ids: number[];
  genres: Genre[];
  type: string; // movie | serial | tvshow | anime
  is_serial: boolean;
  imdb_id: string;
  kinopoisk_id: string;
  quality: string;
  translator: string;
  iframe_url: string;
  countries: string[];
  actors: string[];
  directors: string[];
  popularity: number;
  adult: boolean;
  media_type?: string;
}

/** Серия сериала */
export interface Episode {
  id: string | number;
  episode: number;
  season: number;
  title: string;
  iframe_url: string;
  preview: string;
}

/** Сезон сериала */
export interface Season {
  id: string | number;
  season_number: number;
  episodes_count: number;
  episodes: Episode[];
}

/** Детальная информация о фильме/сериале */
export interface MovieDetail extends Movie {
  seasons: Season[];
  similar?: Movie[];
}

/** Ответ API со списком */
export interface CatalogResponse {
  ok: boolean;
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

/** Ответ API деталей фильма */
export interface MovieDetailResponse {
  ok: boolean;
  movie: MovieDetail;
  similar: Movie[];
}

/** Ответ API плеера */
export interface PlayerResponse {
  ok: boolean;
  url: string;
  id: number;
  quality: string;
  translator: string;
}

/** Ответ API мета (жанры/категории) */
export interface MetaResponse {
  ok: boolean;
  genres: Genre[];
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

/** Источник видео (для настроек) */
export interface VideoSourceConfig {
  token: string;
  enabled: boolean;
}
