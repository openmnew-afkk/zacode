/* ===== Клиент к poiskkino.dev API (бывший kinopoisk.dev) =====
 * Токен читается из 'x-tc-token' заголовка или серверной переменной KINOPOISK_API_KEY
 *
 * Эндпоинты v1.4:
 *   GET /movie/search?query=...&page=...&limit=... — поиск
 *   GET /movie?page=...&limit=...&sortField=...&sortType=... — каталог
 *   GET /movie/{id} — детали
 *   GET /genre — жанры
 *   GET /movie?genres.name=...&year=... — фильтр
 */

import type { ResShape } from './common';

const BASE = 'https://api.poiskkino.dev/v1.4';

export const getToken = (req: { headers?: Record<string, string | string[] | undefined> }): string => {
  const headerToken = req.headers?.['x-tc-token'];
  if (typeof headerToken === 'string' && headerToken) return headerToken;
  return process.env.KINOPOISK_API_KEY || '';
};

/** Проверить, задан ли токен */
export const hasToken = (req: { headers?: Record<string, string | string[] | undefined> }): boolean => {
  const t = getToken(req);
  return !!t;
};

/** Выполнить запрос к poiskkino.dev */
export async function fetchPoiskkino(
  path: string,
  params: Record<string, any>,
  token: string,
): Promise<any> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 0) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-KEY': token,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('BAD_TOKEN');
    throw new Error(`UPSTREAM_${res.status}`);
  }

  return res.json();
}
