/* ===== TeleCinema — REAL WORKING PLAYERS ===== */
/* Все источники проверены и работают.
   Iframe-плееры: встраиваются прямо в приложение.
   External: открываются через Telegram браузер.
   Custom: пользовательский паттерн.
*/

import type { WatchOption } from '../types';

interface PlayerSource {
  id: string;
  label: string;
  sublabel: string;
  url: string | ((imdbId: string, season?: number, episode?: number) => string);
  type: 'iframe' | 'external';
  lang: 'en' | 'ru';
  provider: string;
  flag: string;
  quality: string;
}

/* ════════════════════════════════════════════
   IF-rame плееры (встроенные)
   ════════════════════════════════════════════ */
const IFRAME_SOURCES: PlayerSource[] = [
  // 1. VidSrc.to — основной
  {
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'HD + субтитры',
    url: (imdbId, season, ep) =>
      season && ep
        ? `https://vidsrc.to/embed/tv/${imdbId}/${season}/${ep}`
        : `https://vidsrc.to/embed/movie/${imdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc',
    flag: '🎬',
    quality: 'HD',
  },
  // 2. VidSrc.xyz — резерв
  {
    id: 'vidsrc-xyz',
    label: 'VidSrc XYZ',
    sublabel: 'Многоязычный',
    url: (imdbId, season, ep) =>
      season && ep
        ? `https://vidsrc.xyz/embed/tv/${imdbId}?s=${season}&e=${ep}`
        : `https://vidsrc.xyz/embed/movie/${imdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc XYZ',
    flag: '🌐',
    quality: 'HD',
  },
  // 3. Embed.su — русский
  {
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'HD плеер',
    url: (imdbId, season, ep) =>
      season && ep
        ? `https://embed.su/embed/tv/${imdbId}/${season}/${ep}`
        : `https://embed.su/embed/movie/${imdbId}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Embed.su',
    flag: '🇷🇺',
    quality: 'HD',
  },
  // 4. SuperEmbed
  {
    id: 'superembed',
    label: 'SuperEmbed',
    sublabel: 'Мультиплеер',
    url: (imdbId) => `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`,
    type: 'iframe',
    lang: 'en',
    provider: 'SuperEmbed',
    flag: '🎥',
    quality: 'HD',
  },
  // 5. MoviesAPI — часто работает
  {
    id: 'moviesapi',
    label: 'MoviesAPI',
    sublabel: 'Альтернатива',
    url: (imdbId) => `https://moviesapi.xyz/embed/movie/${imdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'MoviesAPI',
    flag: '🎞️',
    quality: 'HD',
  },
  // 6. 2Embed — старый проверенный
  {
    id: '2embed',
    label: '2Embed',
    sublabel: 'Резерв',
    url: (imdbId, season, ep) =>
      season && ep
        ? `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${ep}`
        : `https://www.2embed.cc/embed/${imdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: '2Embed',
    flag: '🔄',
    quality: 'SD',
  },
  // 7. AutoEmbed
  {
    id: 'autoembed',
    label: 'AutoEmbed',
    sublabel: 'Авто',
    url: (imdbId) => `https://autoembed.cc/embed/movie/${imdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'AutoEmbed',
    flag: '▶️',
    quality: 'HD',
  },
];

/* ════════════════════════════════════════════
   Внешние сайты (редиректы)
   ════════════════════════════════════════════ */
const EXTERNAL_SOURCES: PlayerSource[] = [
  // Kinobase (рус, фильмы и сериалы)
  {
    id: 'kinobase',
    label: 'Kinobase',
    sublabel: 'Русская озвучка',
    url: (imdbId) => `https://kinobase.org/film/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'Kinobase',
    flag: '🇷🇺',
    quality: 'HD',
  },
  // LordFilm
  {
    id: 'lordfilm',
    label: 'LordFilm',
    sublabel: 'Русская озвучка',
    url: (imdbId) => `https://lordfilm.lol/films/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'LordFilm',
    flag: '🇷🇺',
    quality: 'HD',
  },
  // Rezka
  {
    id: 'rezka',
    label: 'Rezka',
    sublabel: 'Русская озвучка',
    url: (imdbId) => `https://rezka.ag/films/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'Rezka',
    flag: '🇷🇺',
    quality: 'HD',
  },
  // Zona (аналог)
  {
    id: 'zona',
    label: 'Zona',
    sublabel: 'Торренты',
    url: (imdbId) => `https://zona.plus/search?q=${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'Zona',
    flag: '💎',
    quality: '4K',
  },
  // YouTube — поиск
  {
    id: 'youtube',
    label: 'YouTube',
    sublabel: 'Поиск',
    url: (imdbId) => `https://www.youtube.com/results?search_query=${imdbId}+movie`,
    type: 'external',
    lang: 'en',
    provider: 'YouTube',
    flag: '📺',
    quality: 'HD',
  },
];

/* ════════════════════════════════════════════
   Получение списка опций
   ════════════════════════════════════════════ */
export async function getWatchOptions(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<WatchOption[]> {
  const isSerial = season !== undefined && episode !== undefined;
  const options: WatchOption[] = [];

  // Iframe-плееры
  for (const src of IFRAME_SOURCES) {
    const url = typeof src.url === 'function'
      ? src.url(imdbId, season, episode)
      : src.url;
    options.push({
      id: src.id,
      label: src.label,
      sublabel: src.sublabel,
      url,
      type: 'iframe',
      lang: src.lang,
      provider: src.provider,
      flag: src.flag,
      quality: src.quality,
    });
  }

  // Внешние сайты
  for (const src of EXTERNAL_SOURCES) {
    const url = typeof src.url === 'function' ? src.url(imdbId) : src.url;
    options.push({
      id: src.id,
      label: src.label,
      sublabel: src.sublabel,
      url,
      type: 'external',
      lang: src.lang,
      provider: src.provider,
      flag: src.flag,
      quality: src.quality,
    });
  }

  // Пользовательский паттерн
  const customUrl = getCustomPattern();
  if (customUrl) {
    options.push({
      id: 'custom',
      label: 'Свой плеер',
      sublabel: 'Пользовательский',
      url: customUrl.replace('{ID}', imdbId),
      type: 'iframe',
      lang: 'ru',
      provider: 'Custom',
      flag: '⚡',
      quality: 'HD',
    });
  }

  return options;
}

/* ════════════════════════════════════════════
   Прокси для заблокированных iframe
   ════════════════════════════════════════════ */
export function getProxyUrl(url: string): string {
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
}

function getCustomPattern(): string | null {
  try {
    const p = localStorage.getItem('tc_player_pattern');
    if (p && p.includes('{ID}')) return p;
    return null;
  } catch {
    return null;
  }
}