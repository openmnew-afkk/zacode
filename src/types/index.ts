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
}

export interface MovieDetail extends Movie {
  plot: string;
  seasons?: number;
  episodes?: number;
}

export interface WatchOption {
  id: string;
  label: string;
  sublabel: string;
  url: string;
  type: 'iframe' | 'direct';
  lang: 'en' | 'ru';
  provider: string;
  flag: string;
  quality?: string;
}

export interface CatalogResponse {
  ok: boolean;
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface Episode {
  episode: number;
  name: string;
}
