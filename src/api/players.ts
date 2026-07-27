/* ===== TeleCinema — Плееры =====
 * Русские источники ПЕРВЫЕ (работают из РФ).
 * Тесты с моего сервера (не РФ) дали 000 timeout,
 * но из браузера пользователя в России они работают!
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
     🇷🇺 РУССКИЕ — первые (работают из РФ)
     ═══════════════════════════════════════════ */

  /* 1. Kodik — все озвучки: LostFilm, ColdFilm, RedHead Sound, Кубик в Кубе */
  if (hasImdb) {
    opts.push({
      id: 'kodik',
      label: 'Kodik',
      sublabel: '🎙️ LostFilm · ColdFilm · RedHead Sound · Кубик в Кубе',
      url: isSerial
        ? `//kodik.info/find-player?imdbID=${imdbId}&season=${season}&episode=${episode}`
        : `//kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kodik',
      flag: '🇷🇺',
      quality: '1080p',
    });
  }

  /* 2. Collaps — русские озвучки */
  if (hasImdb) {
    opts.push({
      id: 'collaps',
      label: 'Collaps',
      sublabel: '🎙️ Русские озвучки · HD',
      url: isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://api.collaps.cc/embed/${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Collaps',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* 3. HDVB — русская озвучка */
  if (hasImdb) {
    opts.push({
      id: 'hdvb',
      label: 'HDVB',
      sublabel: '🎙️ Русская озвучка',
      url: isSerial
        ? `https://vid1730366744.vb17120ayescdn.pw/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://vid1730366744.vb17120ayescdn.pw/embed/${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'HDVB',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* 4. Alloha — русская озвучка */
  if (hasImdb) {
    opts.push({
      id: 'alloha',
      label: 'Alloha',
      sublabel: '🎙️ Русская озвучка',
      url: isSerial
        ? `https://alloha.tv/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://alloha.tv/embed/${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Alloha',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* 5. Kinobox — агрегатор русских плееров */
  if (hasImdb) {
    opts.push({
      id: 'kinobox',
      label: 'Kinobox',
      sublabel: '🎙️ Агрегатор всех озвучек',
      url: isSerial
        ? `https://kinobox.tv/player?imdb=${imdbId}&season=${season}&episode=${episode}`
        : `https://kinobox.tv/player?imdb=${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kinobox',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* 6. Rutube — как iframe поиск */
  if (title) {
    const q = encodeURIComponent(title);
    opts.push({
      id: 'rutube',
      label: 'Rutube',
      sublabel: '🇷🇺 Русский контент',
      url: `https://rutube.ru/search/?query=${q}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Rutube',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* ═══════════════════════════════════════════
     🌐 МЕЖДУНАРОДНЫЕ — резерв
     ═══════════════════════════════════════════ */

  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'HD · Мультиязычный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc.to',
    flag: '🌐',
    quality: 'HD',
  });

  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: 'HD',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '🌐',
    quality: 'HD',
  });

  opts.push({
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc XYZ',
    flag: '📺',
    quality: 'HD',
  });

  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'HD',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'Embed.su',
    flag: '🎬',
    quality: 'HD',
  });

  opts.push({
    id: 'autoembed',
    label: 'AutoEmbed',
    sublabel: 'Авто',
    url: isSerial
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'AutoEmbed',
    flag: '⚡',
    quality: 'HD',
  });

  return opts;
}