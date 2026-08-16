/* ===== Плееры — ПРОВЕРЕНЫ 16 авг 2026 =====
 * Все 200 OK, без X-Frame-Options
 * apiplayer.ru и vidrock.ru — РУССКИЕ домены
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
  const s = season, e = episode;
  const opts: WatchOption[] = [];

  /* ═══ 🇷🇺 РУССКИЕ СЕРВИСЫ (первые) ═══ */

  opts.push({
    id: 'apiplayer-ru',
    label: 'ApiPlayer',
    sublabel: '🇷🇺 Русские озвучки · HD',
    url: isSerial
      ? `https://apiplayer.ru/embed/tv/${tmdbId}/${s}/${e}`
      : `https://apiplayer.ru/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'ApiPlayer.ru',
    flag: '🇷🇺', quality: 'HD',
  });

  opts.push({
    id: 'vidrock-ru',
    label: 'VidRock',
    sublabel: '🇷🇺 Русские озвучки · HD',
    url: isSerial
      ? `https://vidrock.ru/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidrock.ru/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidRock.ru',
    flag: '🇷🇺', quality: 'HD',
  });

  /* ═══ 🎬 МУЛЬТИСЕРВЕРНЫЕ (с русским аудио) ═══ */

  opts.push({
    id: 'vidcore',
    label: 'VidCore',
    sublabel: 'Мульти-сервер · Авто-переключение',
    url: isSerial
      ? `https://vidcore.org/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidcore.org/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidCore',
    flag: '⚡', quality: 'HD',
  });

  opts.push({
    id: 'vidflix',
    label: 'VidFlix',
    sublabel: 'HD · С русским',
    url: isSerial
      ? `https://vidflix.club/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidflix.club/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidFlix',
    flag: '🎬', quality: 'HD',
  });

  opts.push({
    id: 'superembed',
    label: 'SuperEmbed',
    sublabel: 'Мульти-сервер',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`
      : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
    type: 'iframe', lang: 'ru', provider: 'SuperEmbed',
    flag: '🌐', quality: 'HD',
  });

  /* ═══ ✅ ПОДТВЕРЖДЁННЫЕ ═══ */

  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: '✅ HD · Мультиязычный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.to',
    flag: '✅', quality: 'HD',
  });

  opts.push({
    id: 'vidlink',
    label: 'VidLink',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`
      : `https://vidlink.pro/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidLink',
    flag: '🔗', quality: 'HD',
  });

  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: 'HD',
    url: isSerial
      ? `https://www.2embed.online/embed/tv/${tmdbId}/${s}/${e}`
      : `https://www.2embed.online/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: '2Embed',
    flag: '📺', quality: 'HD',
  });

  opts.push({
    id: 'videasy',
    label: 'Videasy',
    sublabel: 'HD',
    url: isSerial
      ? `https://player.videasy.net/tv/${tmdbId}/${s}/${e}`
      : `https://player.videasy.net/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'Videasy',
    flag: '🎥', quality: 'HD',
  });

  opts.push({
    id: 'vidsrc-me',
    label: 'VidSrc ME',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`
      : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.me',
    flag: '🎞️', quality: 'HD',
  });

  return opts;
}
