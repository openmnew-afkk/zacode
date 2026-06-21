import axios from 'axios';
import type { TMDBResponse, MovieDetail, Genre } from '../types';

/* ===== TMDB API клиент ===== */

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const LANGUAGE = 'ru-RU';

/** Базовый URL для изображений */
export const IMAGE_BASE = 'https://image.tmdb.org/t/p';
export const posterUrl = (path: string | null, size = 'w500') =>
  path ? `${IMAGE_BASE}/${size}${path}` : '/no-poster.svg';
export const backdropUrl = (path: string | null, size = 'w1280') =>
  path ? `${IMAGE_BASE}/${size}${path}` : '';

/** Axios-инстанс для TMDB */
const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: LANGUAGE,
  },
});

/** Проверка наличия API-ключа */
export const hasApiKey = () => !!API_KEY && API_KEY !== 'your_tmdb_api_key_here';

/** Получить трендовые фильмы за неделю */
export const getTrending = async (page = 1): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/trending/movie/week', {
    params: { page },
  });
  return data;
};

/** Получить популярные фильмы */
export const getPopular = async (page = 1): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/movie/popular', {
    params: { page },
  });
  return data;
};

/** Получить новинки (сейчас в кино) */
export const getNowPlaying = async (page = 1): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/movie/now_playing', {
    params: { page },
  });
  return data;
};

/** Получить предстоящие релизы */
export const getUpcoming = async (page = 1): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/movie/upcoming', {
    params: { page },
  });
  return data;
};

/** Поиск фильмов по запросу */
export const searchMovies = async (
  query: string,
  page = 1
): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/search/movie', {
    params: { query, page },
  });
  return data;
};

/** Поиск фильмов с фильтрами */
export const discoverMovies = async (params: {
  page?: number;
  with_genres?: string;
  primary_release_year?: number;
  sort_by?: string;
}): Promise<TMDBResponse> => {
  const { data } = await tmdb.get<TMDBResponse>('/discover/movie', {
    params: {
      sort_by: 'popularity.desc',
      ...params,
    },
  });
  return data;
};

/** Получить детали фильма */
export const getMovieDetail = async (id: number): Promise<MovieDetail> => {
  const { data } = await tmdb.get<MovieDetail>(`/movie/${id}`, {
    params: {
      append_to_response: 'credits,similar',
    },
  });
  return data;
};

/** Получить список жанров */
export const getGenres = async (): Promise<Genre[]> => {
  const { data } = await tmdb.get<{ genres: Genre[] }>('/genre/movie/list');
  return data.genres;
};
