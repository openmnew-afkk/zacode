import axios from 'axios';
import type { CatalogResponse, MovieDetailResponse, Genre } from '../types';

/* ===== Клиентский слой над serverless-прокси =====
 * Каталог работает без токена — используется OMDb API с бесплатным ключом.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

/* ===== Плеер-паттерн (пользовательский embed URL, {ID} = IMDb ID) ===== */
const PATTERN_KEY = 'tc_player_pattern';

export const getPlayerPattern = (): string => {
  try { return localStorage.getItem(PATTERN_KEY) || ''; } catch { return ''; }
};
export const setPlayerPattern = (pattern: string) => {
  try { localStorage.setItem(PATTERN_KEY, pattern); } catch { /* ignore */ }
};

const client = axios.create({ baseURL: API_BASE });

/* ===== Изображения ===== */
export const posterUrl = (path: string | null, _size?: string): string => {
  if (path) {
    if (path.startsWith('http')) return path;
    if (path.startsWith('//')) return `https:${path}`;
    return path;
  }
  return '/no-poster.svg';
};

export const backdropUrl = (path: string | null, _size?: string): string => {
  if (path) {
    if (path.startsWith('http')) return path;
    if (path.startsWith('//')) return `https:${path}`;
    return path;
  }
  return '';
};

/* ===== Каталог ===== */
export const getCatalog = async (params: {
  page?: number;
  q?: string;
  genre?: string;
  year?: string;
  sort?: string;
  limit?: number;
}): Promise<CatalogResponse> => {
  const { data } = await client.get<CatalogResponse>('/api/catalog', { params });
  return data;
};

export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> =>
  getCatalog({ q: query, page });

export const getNovelty = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'year', limit: 20 });

export const getTop = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'rating', limit: 20 });

/* ===== Детали ===== */
export const getMovieDetail = async (id: string | number): Promise<any> => {
  const { data } = await client.get<MovieDetailResponse>('/api/catalog', { params: { id } });
  return data.movie;
};

/* ===== Плеер ===== */
export interface PlayerSource {
  label: string;
  url: string;
  type: string;
}

export const getPlayerUrl = async (id: string | number, title: string): Promise<PlayerSource[]> => {
  try {
    const pattern = getPlayerPattern();
    const params: Record<string, string | number> = { id };
    if (pattern) params.pattern = pattern;
    if (title) params.title = title;

    const { data } = await client.get<{ ok: boolean; sources: PlayerSource[]; default_url: string }>(
      '/api/player', { params }
    );
    return data.sources || [];
  } catch (err) {
    console.error('Ошибка плеера:', err);
    return [];
  }
};

/* ===== Жанры (хардкод, кешируем из API) ===== */
let genresCache: Genre[] | null = null;

export const getGenres = async (): Promise<Genre[]> => {
  if (genresCache) return genresCache;
  try {
    const { data } = await client.get<{ ok: boolean; genres: Genre[] }>('/api/catalog', {
      params: { meta: 1 },
    });
    genresCache = data.genres || [];
    return genresCache;
  } catch { return []; }
};
