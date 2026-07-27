/* ===== TeleCinema — Только РАБОЧИЕ плееры =====
 * Проверено: vidsrc.to (200 OK, no X-Frame), 2embed.cc (200 OK, no X-Frame)
 * vidsrc.xyz, embed.su — могут работать из РФ
 * Kinobox, Collaps, Kodik — НЕ работают как iframe с внешних доменов
 * Rutube — открывается как ссылка поиска
 */

import type { WatchOption } from '../types';

export interface PlayerRequest {
  tmdbId: string;
  imdbId?: string;
  isSerial: boolean;
  season?: number;
  episode?: number;
  title?: string;
}

export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1, title } = req;
  const hasImdb = imdbId && imdbId.startsWith('tt');
  const opts: WatchOption[] = [];

  /* ═══════════════════════════════════════════
     ✅ ПРОВЕРЕННЫЕ — 200 OK, без X-Frame-Options
     ═══════════════════════════════════════════ */

  /* 1. VidSrc.to — ПОДТВЕРЖДЁН, работает всегда */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'HD · Мультиязычный · Проверен ✅',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc.to',
    flag: '✅',
    quality: 'HD',
  });

  /* 2. 2Embed — ПОДТВЕРЖДЁН */
  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: 'HD · Проверен ✅',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '✅',
    quality: 'HD',
  });

  /* ═══════════════════════════════════════════
     🔄 МОГУТ РАБОТАТЬ из РФ (geo-dependent)
     ═══════════════════════════════════════════ */

  /* 3. VidSrc.xyz — может работать из РФ */
  opts.push({
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    sublabel: 'HD · С русским аудио',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc.xyz',
    flag: '📺',
    quality: 'HD',
  });

  /* 4. Embed.su — может работать из РФ */
  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'HD · Мультиязычный',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'Embed.su',
    flag: '🎬',
    quality: 'HD',
  });

  /* 5. AutoEmbed — агрегатор */
  opts.push({
    id: 'autoembed',
    label: 'AutoEmbed',
    sublabel: 'HD · Авто-подбор',
    url: isSerial
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'AutoEmbed',
    flag: '⚡',
    quality: 'HD',
  });

  /* 6. VidSrc.nl */
  opts.push({
    id: 'vidsrc-nl',
    label: 'VidSrc NL',
    sublabel: 'HD · Резерв',
    url: isSerial
      ? `https://player.vidsrc.nl/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.vidsrc.nl/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc NL',
    flag: '🎥',
    quality: 'HD',
  });

  /* 7. SuperEmbed */
  opts.push({
    id: 'superembed',
    label: 'SuperEmbed',
    sublabel: 'Авто · Резерв',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    type: 'iframe',
    lang: 'multi',
    provider: 'SuperEmbed',
    flag: '🌐',
    quality: 'HD',
  });

  /* 8. MoviesAPI */
  opts.push({
    id: 'moviesapi',
    label: 'MoviesAPI',
    sublabel: 'HD',
    url: isSerial
      ? `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`
      : `https://moviesapi.club/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'MoviesAPI',
    flag: '🎞️',
    quality: 'HD',
  });

  /* ═══════════════════════════════════════════
     🇷🇺 RUTUBE — открывается как ссылка
     ═══════════════════════════════════════════ */
  if (title) {
    const q = encodeURIComponent(title);
    opts.push({
      id: 'rutube',
      label: 'Rutube',
      sublabel: '🇷🇺 Русский · Поиск на Rutube',
      url: `https://rutube.ru/search/?query=${q}`,
      type: 'external',
      lang: 'ru',
      provider: 'Rutube',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  return opts;
}