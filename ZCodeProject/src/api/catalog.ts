import axios from 'axios';
import type {
  Movie,
  MovieDetail,
  CatalogResponse,
  MovieDetailResponse,
  PlayerResponse,
  MetaResponse,
  Genre,
} from '../types';

/* ===== Клиентский слой данных над нашим serverless-прокси /api ===== */

/** Базовый URL API. На проде — относительный, локально можно задать VITE_API_BASE. */
const API_BASE = import.meta.env.VITE_API_BASE || '';

/** Токен VideoCDN, введённый пользователем в Настройках (фолбэк к серверной env). */
const STORAGE_KEY = 'tc_videocdn_token';

export const getToken = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setToken = (token: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
};

/** Заголовки с токеном пользователя (если есть) */
const headers = () => {
  const token = getToken();
  return token ? { 'x-tc-token': token } : {};
};

const client = axios.create({ baseURL: API_BASE });

/** Проверка, задан ли токен (клиентский или серверный). */
export const hasToken = () => !!getToken();

/* ===== Изображения ===== */

export const posterUrl = (path: string | null, _size?: string): string => {
  if (path) {
    // VideoCDN отдаёт полные URL постеров
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

/** Получить список фильмов/сериалов с фильтрами. */
export const getCatalog = async (params: {
  page?: number;
  q?: string;
  type?: string;
  genre?: number | string;
  year?: number | string;
  sort?: string;
  limit?: number;
}): Promise<CatalogResponse> => {
  const { data } = await client.get<CatalogResponse>('/api/catalog', {
    params,
    headers: headers(),
  });
  return data;
};

/** Поиск по названию. */
export const searchCatalog = async (query: string, page = 1): Promise<CatalogResponse> => {
  const { data } = await client.get<CatalogResponse>('/api/catalog', {
    params: { q: query, page },
    headers: headers(),
  });
  return data;
};

/** Новинки. */
export const getNovelty = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'novelty', limit: 20 });

/** Топ по IMDb. */
export const getTop = (page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, sort: 'top', limit: 20 });

/** По категории (Фильмы/Сериалы/Аниме). */
export const getByCategory = (type: string, page = 1): Promise<CatalogResponse> =>
  getCatalog({ page, type, limit: 20 });

/** Детали фильма/сериала. */
export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const { data } = await client.get<MovieDetailResponse>('/api/movie', {
    params: { id },
    headers: headers(),
  });
  return data.movie;
};

/** Ссылка на плеер. */
export const getPlayerUrl = async (id: string | number): Promise<string | null> => {
  try {
    const { data } = await client.get<PlayerResponse>('/api/player', {
      params: { id },
      headers: headers(),
    });
    return data.ok ? data.url : null;
  } catch (err) {
    console.error('Ошибка получения плеера:', err);
    return null;
  }
};

/** Список жанров (мета). */
export const getGenres = async (): Promise<Genre[]> => {
  try {
    const { data } = await client.get<MetaResponse>('/api/catalog', {
      params: { meta: 1 },
      headers: headers(),
    });
    return data.genres || [];
  } catch (err) {
    console.error('Ошибка получения жанров:', err);
    return [];
  }
};

/** Проверка соединения с источником (для экрана Настроек). */
export const checkSource = async (): Promise<{ ok: boolean; message: string }> => {
  try {
    const res = await client.get<CatalogResponse>('/api/catalog', {
      params: { page: 1, limit: 1 },
      headers: headers(),
    });
    if (res.data.ok) {
      return { ok: true, message: 'Соединение установлено' };
    }
    return { ok: false, message: 'Нет данных' };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) return { ok: false, message: 'Неверный токен' };
    return { ok: false, message: 'Ошибка соединения' };
  }
};

/* ===== Совместимость (алиасы для удобства миграции страниц) ===== */

export type { Movie, MovieDetail };
