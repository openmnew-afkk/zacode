/* ===== Плееры — РАБОЧИЕ ПЕРВЫЕ =====
 * VidSrc.to — подтверждён 200 OK, без X-Frame-Options
 * 2Embed    — подтверждён 200 OK, без X-Frame-Options
 * Kodik/Collaps/HDVB — требуют API-токен, НЕ работают как iframe
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
  const { tmdbId, isSerial, season = 1, episode = 1 } = req;
  const opts: WatchOption[] = [];

  /* ═══ 1. VidSrc.to — ПРОВЕРЕН ✅ ═══ */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: '✅ HD · Мультиязычный · Работает',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.to', flag: '✅', quality: 'HD',
  });

  /* ═══ 2. 2Embed — ПРОВЕРЕН ✅ ═══ */
  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: '✅ HD · Работает',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: '2Embed', flag: '✅', quality: 'HD',
  });

  /* ═══ 3. Embed.su ═══ */
  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'HD · Мультиязычный',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'Embed.su', flag: '🎬', quality: 'HD',
  });

  /* ═══ 4. VidSrc.xyz ═══ */
  opts.push({
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    sublabel: 'HD · С русским аудио',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidSrc.xyz', flag: '📺', quality: 'HD',
  });

  /* ═══ 5. AutoEmbed ═══ */
  opts.push({
    id: 'autoembed',
    label: 'AutoEmbed',
    sublabel: 'Авто-подбор · HD',
    url: isSerial
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'AutoEmbed', flag: '⚡', quality: 'HD',
  });

  /* ═══ 6. VidSrc NL ═══ */
  opts.push({
    id: 'vidsrc-nl',
    label: 'VidSrc NL',
    sublabel: 'Резерв',
    url: isSerial
      ? `https://player.vidsrc.nl/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.vidsrc.nl/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc NL', flag: '🎥', quality: 'HD',
  });

  /* ═══ 7. MoviesAPI ═══ */
  opts.push({
    id: 'moviesapi',
    label: 'MoviesAPI',
    sublabel: 'HD',
    url: isSerial
      ? `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`
      : `https://moviesapi.club/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'MoviesAPI', flag: '🎞️', quality: 'HD',
  });

  return opts;
}