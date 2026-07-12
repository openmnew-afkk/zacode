/* ===== TeleCinema — PLAYER SOURCES ===== */
/* VidSrc, embed.su и другие поддерживают TMDB ID напрямую — это надёжнее IMDB ID.
   Передаём оба ID и используем тот, который нужен конкретному плееру. */

import type { WatchOption } from '../types';

export interface PlayerRequest {
  tmdbId: string;      // TMDB numeric ID (например "550")
  imdbId?: string;     // Реальный IMDB ID если есть (например "tt0137523")
  isSerial: boolean;
  season?: number;
  episode?: number;
  title?: string;
}

/* ════════════════════════════════════════════════════════
   Список источников — порядок = приоритет
   ════════════════════════════════════════════════════════ */

function buildUrl(req: PlayerRequest, template: (r: PlayerRequest) => string): string {
  try { return template(req); } catch { return ''; }
}

export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1 } = req;
  const opts: WatchOption[] = [];

  /* ── VidSrc.to — TMDB ID, надёжный ── */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'HD + субтитры',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc',
    flag: '🎬',
    quality: 'HD',
  });

  /* ── VidSrc.cc — TMDB ID ── */
  opts.push({
    id: 'vidsrc-cc',
    label: 'VidSrc CC',
    sublabel: 'HD Альтернатива',
    url: isSerial
      ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc CC',
    flag: '🎥',
    quality: 'HD',
  });

  /* ── embed.su — TMDB ID (лучший для русскоязычного) ── */
  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: '🇷🇺 Русская озвучка',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Embed.su',
    flag: '🇷🇺',
    quality: 'HD',
  });

  /* ── VidSrc.xyz — TMDB ID ── */
  opts.push({
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    sublabel: 'Мультиязычный',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc XYZ',
    flag: '🌐',
    quality: 'HD',
  });

  /* ── 111movies — TMDB ID ── */
  opts.push({
    id: '111movies',
    label: '111Movies',
    sublabel: 'Резерв HD',
    url: isSerial
      ? `https://111movies.com/tv/${tmdbId}/${season}/${episode}`
      : `https://111movies.com/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: '111Movies',
    flag: '▶️',
    quality: 'HD',
  });

  /* ── 2embed — TMDB ID ── */
  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: 'Резерв',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: '2Embed',
    flag: '🔄',
    quality: 'SD',
  });

  /* ── SuperEmbed — TMDB ID ── */
  opts.push({
    id: 'superembed',
    label: 'SuperEmbed',
    sublabel: 'Авто',
    url: isSerial
      ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
    type: 'iframe',
    lang: 'en',
    provider: 'SuperEmbed',
    flag: '⚡',
    quality: 'HD',
  });

  /* ── Если есть IMDB ID — добавляем IMDB-специфичные ── */
  if (imdbId && imdbId.startsWith('tt')) {
    opts.push({
      id: 'autoembed',
      label: 'AutoEmbed',
      sublabel: 'IMDB источник',
      url: isSerial
        ? `https://autoembed.cc/tv/imdb/${imdbId}-${season}-${episode}`
        : `https://autoembed.cc/movie/imdb/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'AutoEmbed',
      flag: '🔆',
      quality: 'HD',
    });
  }

  /* ── Пользовательский паттерн ── */
  const customUrl = getCustomPattern();
  if (customUrl) {
    const id = imdbId || tmdbId;
    opts.push({
      id: 'custom',
      label: 'Свой плеер',
      sublabel: 'Пользовательский',
      url: customUrl.replace('{ID}', id).replace('{TMDB}', tmdbId).replace('{IMDB}', imdbId || ''),
      type: 'iframe',
      lang: 'ru',
      provider: 'Custom',
      flag: '⚡',
      quality: 'HD',
    });
  }

  return opts.filter(o => o.url);
}

function getCustomPattern(): string | null {
  try {
    const p = localStorage.getItem('tc_player_pattern');
    if (p && p.includes('{')) return p;
    return null;
  } catch {
    return null;
  }
}

/* Старая сигнатура для обратной совместимости */
export async function getWatchOptionsLegacy(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<WatchOption[]> {
  const isSerial = season !== undefined && episode !== undefined;
  // imdbId может быть как TMDB ID так и IMDB — определяем
  const isTmdb = !imdbId.startsWith('tt');
  return getWatchOptions({
    tmdbId: isTmdb ? imdbId : '',
    imdbId: imdbId.startsWith('tt') ? imdbId : undefined,
    isSerial,
    season,
    episode,
  });
}