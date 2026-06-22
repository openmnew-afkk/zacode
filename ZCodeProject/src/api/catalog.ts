import axios from 'axios';
import type { Movie, MovieDetail, CatalogResponse, MovieDetailResponse, Genre } from '../types';

/* ===== Клиентский слой над serverless-прокси ===== */

const API_BASE = import.meta.env.VITE_API_BASE || '';

/* ===== Токен Кинопоиска (poiskkino.dev) ===== */
const TOKEN_KEY = 'tc_kinopoisk_token';

export const getToken = (): string => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (token: string) => {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
};
export const hasToken = () => !!getToken();

/* ===== Embed-паттерн плеера ({ID} → kinopoisk_id) ===== */
const PATTERN_KEY = 'tc_player_pattern';

export const getPlayerPattern = (): string => {
  try { return localStorage.getItem(PATTERN_KEY) || ''; } catch { return ''; }
};
export const setPlayerPattern = (pattern: string) => {
  try { localStorage.setItem(PATTERN_KEY, pattern); } catch { /* ignore */ }
};

const headers = () => {
  const token = getToken();
  return token ? { 'x-tc-token': token } : {};
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
  const { data } = await client.get<CatalogResponse>('/api/catalog', { params, headers: headers() });
  return data;
};

export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> =>
  getCatalog({ q: query, page });

export const getNovelty = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'year', limit: 20 });

export const getTop = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'rating', limit: 20 });

/* ===== Детали ===== */
export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const { data } = await client.get<MovieDetailResponse>('/api/catalog', { params: { id }, headers: headers() });
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
      '/api/player', { params, headers: headers() }
    );
    return data.sources || [];
  } catch (err) {
    console.error('Ошибка плеера:', err);
    return [];
  }
};

/* ===== Жанры ===== */
export const getGenres = async (): Promise<Genre[]> => {
  try {
    const { data } = await client.get<{ ok: boolean; genres: Genre[] }>('/api/catalog', {
      params: { meta: 1 }, headers: headers(),
    });
    return data.genres || [];
  } catch { return []; }
};

/* ===== Проверка соединения ===== */
export const checkSource = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    const res = await client.get<CatalogResponse>('/api/catalog', {
      params: { page: 1, limit: 1 }, headers: headers(),
    });
    if (res.data.ok) return { ok: true, message: 'Соединение установлено' };
    return { ok: false, message: 'Нет данных' };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) return { ok: false, message: 'Неверный API-ключ' };
    return { ok: false, message: 'Ошибка: ' + (err?.message || '') };
  }
};
