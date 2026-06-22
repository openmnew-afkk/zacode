/* ===== Клиент к OMDb API (бесплатный ключ 'trilogy' — не требует регистрации) =====
 * Серверная переменная OMDB_API_KEY переопределяет ключ.
 *
 * Основные эндпоинты:
 *   GET /?s=Matrix&page=1&type=movie — поиск
 *   GET /?i=tt0133093 — детали по IMDb ID
 *   GET /?t=Matrix&y=1999 — по названию + год
 */

import type { ResShape } from './common';
export { CORS_HEADERS, json, error, handleOptions } from './common';

const BASE = 'https://www.omdbapi.com';

/** Ключ по умолчанию (общеизвестный demo-ключ, без регистрации).
 *  Можно переопределить через серверную переменную OMDB_API_KEY */
const DEFAULT_KEY = 'trilogy';

export const getApiKey = (): string => {
  return process.env.OMDB_API_KEY || DEFAULT_KEY;
};

export async function fetchOMDb(
  params: Record<string, string | number | undefined>,
): Promise<any> {
  const url = new URL(BASE);
  url.searchParams.set('apikey', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`UPSTREAM_${res.status}`);

  const data = await res.json();
  if (data.Response === 'False') {
    // OMDb returns { Response: "False", Error: "..." } for no results
    // Not an error - just empty results
    if (data.Error?.includes('not found') || data.Error?.includes('too many')) {
      throw new Error(data.Error);
    }
    return { totalResults: 0, Search: [], data: null };
  }

  return data;
}
