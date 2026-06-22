/* ===== /api/player — ссылки на плеер по kinopoisk_id =====
 *
 * GET /api/player?id=301
 *   — id: kinopoisk_id фильма
 *   — pattern (опц.): кастомный embed-паттерн, {ID} заменяется на id
 *   — title (опц.): название для YouTube-фолбэка
 *
 * Возвращает список возможных URL плеера (от наиболее приоритетного).
 */

import { json, error, handleOptions, ResShape } from './_lib/common';

/* Дефолтные плеер-шаблоны (по приоритету) */
const DEFAULT_PATTERNS: { label: string; pattern: string }[] = [
  { label: 'Kinobase', pattern: 'https://kinobase.org/film/{ID}' },
];

/** Заменить {ID} на id, {TITLE} на название в URL */
function applyPattern(pattern: string, id: string, title: string): string {
  return pattern
    .replace(/\{ID\}/g, id)
    .replace(/\{TITLE\}/g, encodeURIComponent(title))
    .replace(/\{TITLE_RAW\}/g, title);
}

/** YouTube-поиск как фолбэк */
function youtubeFallback(title: string): string {
  const q = encodeURIComponent(`${title} фильм смотреть онлайн`);
  return `https://www.youtube.com/embed?listType=search&list=${q}`;
}

export default async function handler(req: {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}): Promise<ResShape> {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const id = url.searchParams.get('id') || '';
    const title = url.searchParams.get('title') || 'фильм';
    const customPattern = url.searchParams.get('pattern') || '';

    if (!id) return error('Не указан id', 400);

    const sources: { label: string; url: string; type: string }[] = [];

    // 1. Пользовательский паттерн (макс. приоритет)
    if (customPattern) {
      sources.push({
        label: 'Мой плеер',
        url: applyPattern(customPattern, id, title),
        type: 'embed',
      });
    }

    // 2. Дефолтные шаблоны
    for (const sp of DEFAULT_PATTERNS) {
      const playerUrl = applyPattern(sp.pattern, id, title);
      // Проверяем, отвечает ли URL (чтобы не слать мёртвые ссылки)
      try {
        const check = await fetch(playerUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        if (check.ok || check.status === 200 || check.status === 403 || check.status === 401) {
          sources.push({ label: sp.label, url: playerUrl, type: 'embed' });
        }
      } catch {
        // Если не отвечает — пропускаем, но добавляем как fallback
        sources.push({ label: sp.label + ' (офлайн)', url: playerUrl, type: 'embed_fallback' });
      }
    }

    // 3. YouTube-фолбэк (всегда)
    sources.push({
      label: 'YouTube',
      url: youtubeFallback(title),
      type: 'youtube',
    });

    return json({
      ok: true,
      id,
      sources,
      default_url: sources[0]?.url || youtubeFallback(title),
    });
  } catch (e: any) {
    return error('Ошибка плеера: ' + (e?.message || 'UNKNOWN'), 502);
  }
}
