/* ===== TeleCinema — Плееры с русскими озвучками =====
 * Используем DIRECT EMBED URLs — никаких API токенов не нужно.
 * Всё работает из браузера пользователя напрямую.
 *
 * Источники с русскими озвучками (LostFilm, ColdFilm, RedHead Sound, Кубик в Кубе и др.):
 * 1. Kinobox    — агрегатор всех русских плееров (Kodik + Collaps + HDVB + Alloha)
 * 2. Kodik      — прямой iframe
 * 3. Collaps    — прямой iframe
 * 4. HDVB       — прямой iframe
 * 5. Alloha     — прямой iframe
 * 6. Videoframe — агрегатор
 *
 * Международные резервные:
 * 7. VidSrc     — EN
 * 8. Embed.su   — мультиязычный
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

/* ══════════════════════════════════════════════════════════
   Строим все iframe URL для фильма/сериала
   ══════════════════════════════════════════════════════════ */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1 } = req;
  const hasImdb = imdbId && imdbId.startsWith('tt');
  const opts: WatchOption[] = [];

  /* ═══════════════════════════════════════════
     🇷🇺 РУССКИЕ ИСТОЧНИКИ (с озвучками)
     ═══════════════════════════════════════════ */

  /* 1. Kinobox — агрегатор ВСЕХ русских плееров
     Внутри: Kodik, Collaps, HDVB, Alloha, Bazon
     Озвучки: LostFilm, ColdFilm, RedHead Sound, Кубик в Кубе, NewStudio, Jaskier */
  if (hasImdb) {
    opts.push({
      id: 'kinobox',
      label: 'Kinobox',
      sublabel: '🎙️ Все озвучки · LostFilm, ColdFilm, RedHead…',
      url: isSerial
        ? `https://kinobox.tv/player?imdb=${imdbId}&season=${season}&episode=${episode}`
        : `https://kinobox.tv/player?imdb=${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kinobox',
      flag: '🇷🇺',
      quality: '1080p',
    });
  }
  /* Kinobox также по TMDB */
  opts.push({
    id: 'kinobox-tmdb',
    label: 'Kinobox',
    sublabel: '🎙️ Все озвучки · TMDB',
    url: isSerial
      ? `https://kinobox.tv/player?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://kinobox.tv/player?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Kinobox',
    flag: '🇷🇺',
    quality: '1080p',
  });

  /* 2. Videoframe — ещё один агрегатор русских озвучек */
  if (hasImdb) {
    opts.push({
      id: 'videoframe',
      label: 'VideoFrame',
      sublabel: '🎙️ Русские озвучки',
      url: isSerial
        ? `https://videoframe.space/?imdb=${imdbId}&season=${season}&episode=${episode}`
        : `https://videoframe.space/?imdb=${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'VideoFrame',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* 3. Collaps — прямой embed с озвучками */
  if (hasImdb) {
    opts.push({
      id: 'collaps',
      label: 'Collaps',
      sublabel: '🎙️ LostFilm, ColdFilm, Кубик…',
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

  /* 4. HDVB — русский плеер */
  if (hasImdb) {
    opts.push({
      id: 'hdvb',
      label: 'HDVB',
      sublabel: '🎙️ Русская озвучка · HD',
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

  /* 5. Alloha — русский плеер */
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

  /* 6. Kodik прямой — search по IMDB */
  if (hasImdb) {
    opts.push({
      id: 'kodik',
      label: 'Kodik',
      sublabel: '🎙️ Все студии озвучки',
      url: isSerial
        ? `//kodik.info/find-player?imdbID=${imdbId}&season=${season}&episode=${episode}`
        : `//kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kodik',
      flag: '🇷🇺',
      quality: 'HD',
    });
  }

  /* ═══════════════════════════════════════════
     🌐 МЕЖДУНАРОДНЫЕ РЕЗЕРВНЫЕ
     ═══════════════════════════════════════════ */

  /* VidSrc.to — по TMDB ID */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'EN · Мультиязычный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc',
    flag: '🌐',
    quality: 'HD',
  });

  /* VidSrc.xyz */
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
    flag: '📺',
    quality: 'HD',
  });

  /* embed.su */
  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'Мультиязычный',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'Embed.su',
    flag: '🎬',
    quality: 'HD',
  });

  /* VidSrc.cc */
  opts.push({
    id: 'vidsrc-cc',
    label: 'VidSrc CC',
    sublabel: 'Резерв · HD',
    url: isSerial
      ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc CC',
    flag: '🎥',
    quality: 'HD',
  });

  /* MultiEmbed */
  opts.push({
    id: 'multiembed',
    label: 'MultiEmbed',
    sublabel: 'Авто',
    url: isSerial
      ? `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`,
    type: 'iframe',
    lang: 'en',
    provider: 'MultiEmbed',
    flag: '⚡',
    quality: 'HD',
  });

  return opts.filter(o => o.url);
}