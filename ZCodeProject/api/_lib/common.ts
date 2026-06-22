/* ===== Общие типы и утилиты для serverless-функций ===== */

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

export const json = (data: unknown, status = 200): ResShape => ({
  status,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(data),
});

export const error = (message: string, status = 500): ResShape =>
  json({ error: message, ok: false }, status);

/** Обработка OPTIONS */
export const handleOptions = (req: { method?: string }): ResShape | null => {
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }
  return null;
};
