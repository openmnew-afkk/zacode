/* ===== Все типы приложения ===== */

export interface Movie {
  id: string;
  imdbID: string;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  imdb_rating: number;
  runtime: number | null;
  type: 'movie' | 'series';
  genre_ids: number[];
  genres: string[];
  is_serial: boolean;
  directors: string[];
  actors: string[];
  countries: string[];
  popularity: number;
  adult: boolean;
  quality?: string;
}

export interface MovieDetail extends Movie {
  plot: string;
  seasons?: Season[];
  episodes?: number;
}

export interface Season {
  id: number;
  season_number: number;
  episodes_count: number;
  episodes: Episode[];
}

export interface Episode {
  id: number;
  episode: number;
  title: string;
  season: number;
}

export interface WatchOption {
  id: string;
  label: string;
  sublabel: string;
  url: string;
  type: 'iframe' | 'direct' | 'external' | 'telegram';
  lang: 'en' | 'ru';
  provider: string;
  flag: string;
  quality?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface WatchHistoryItem {
  movie: Movie;
  watchedAt: number;
}

export type AppTheme = 'dark' | 'light';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface CatalogResponse {
  ok: boolean;
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}
