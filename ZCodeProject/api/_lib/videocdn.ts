/* ===== Общий клиент к VideoCDN API для serverless-функций =====
 * Токен читается из серверной переменной окружения VIDEOCDN_TOKEN
 * (НЕ VITE_ — недоступен клиенту), с фолбэком на клиентский заголовок
 * x-tc-token (токен, введённый пользователем в Настройках).
 */

const BASE = 'https://videocdn.tv/api/short';

/** Получить токен из запроса или окружения */
export const getToken = (req: { headers?: Record<string, string | string[] | undefined> }): string => {
  const headerToken = req.headers?.['x-tc-token'];
  if (typeof headerToken === 'string' && headerToken) return headerToken;
  return process.env.VIDEOCDN_TOKEN || '';
};

/** CORS-заголовки для всех ответов прокси */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tc-token',
  'Cache-Control': 'public, max-age=300, s-maxage=600',
};

export interface ResShape {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Унифицированный JSON-ответ */
export const json = (data: unknown, status = 200): ResShape => ({
  status,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(data),
});

/** Ответ с ошибкой */
export const error = (message: string, status = 500): ResShape =>
  json({ error: message, ok: false }, status);

/** Прямой запрос к VideoCDN с обработкой ошибок */
export async function fetchVCdn(
  params: Record<string, string | number | undefined>,
  token: string
): Promise<any> {
  if (!token) {
    throw new Error('NO_TOKEN');
  }

  const url = new URL(BASE);
  url.searchParams.set('api_token', token);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`UPSTREAM_${res.status}`);
  }

  const data = await res.json();

  // VideoCDN отдаёт { error: "..." } при невалидном токене
  if (data && typeof data === 'object' && data.error && !data.data) {
    throw new Error('BAD_TOKEN');
  }

  return data;
}
