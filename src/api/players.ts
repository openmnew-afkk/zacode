import type { WatchOption } from '../types';

/* ===== TeleCinema — Все источники плееров ===== */

/**
 * Получение списка источников для просмотра.
 * Для каждого фильма/сериала возвращаем несколько плееров.
 * Если первый не загрузился — можно переключиться на другой.
 */

export async function getWatchOptions(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<WatchOption[]> {
  const isSerial = season !== undefined && episode !== undefined;
  const options: WatchOption[] = [];

  // ══════════════ ОСНОВНЫЕ IFRAME-ПЛЕЕРЫ ══════════════

  // 1. VidSrc (запасной API, часто работает)
  if (isSerial) {
    options.push({
      id: 'vidsrc-cc-tv',
      label: 'VidSrc TV',
      sublabel: 'EN + субтитры',
      url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc',
      flag: '🌐',
      quality: 'HD',
    });
  } else {
    options.push({
      id: 'vidsrc-cc-movie',
      label: 'VidSrc',
      sublabel: 'EN + субтитры',
      url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc',
      flag: '🌐',
      quality: 'HD',
    });
  }

  // 2. VidSrc.xyz (альтернатива)
  if (isSerial) {
    options.push({
      id: 'vidsrc-xyz-tv',
      label: 'VidSrc XYZ',
      sublabel: 'Многоязычный',
      url: `https://vidsrc.xyz/embed/tv/${imdbId}?s=${season}&e=${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc XYZ',
      flag: '🌐',
      quality: 'HD',
    });
  } else {
    options.push({
      id: 'vidsrc-xyz-movie',
      label: 'VidSrc XYZ',
      sublabel: 'Многоязычный',
      url: `https://vidsrc.xyz/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc XYZ',
      flag: '🌐',
      quality: 'HD',
    });
  }

  // 3. Embed.su (надёжный)
  if (!isSerial) {
    options.push({
      id: 'embed-su',
      label: 'Embed.su',
      sublabel: 'HD плеер',
      url: `https://embed.su/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'Embed.su',
      flag: '🎬',
      quality: 'HD',
    });
  } else {
    options.push({
      id: 'embed-su-tv',
      label: 'Embed.su',
      sublabel: 'HD плеер',
      url: `https://embed.su/embed/tv/${imdbId}/${season}/${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: 'Embed.su',
      flag: '🎬',
      quality: 'HD',
    });
  }

  // 4. SuperEmbed (резервный)
  if (!isSerial) {
    options.push({
      id: 'superembed',
      label: 'SuperEmbed',
      sublabel: 'Альтернатива',
      url: `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`,
      type: 'iframe',
      lang: 'en',
      provider: 'SuperEmbed',
      flag: '🎥',
      quality: 'HD',
    });
  }

  // 5. 2Embed (старый, но работает)
  if (isSerial) {
    options.push({
      id: '2embed-tv',
      label: '2Embed',
      sublabel: 'Резерв',
      url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: '2Embed',
      flag: '🔄',
      quality: 'SD',
    });
  } else {
    options.push({
      id: '2embed-movie',
      label: '2Embed',
      sublabel: 'Резерв',
      url: `https://www.2embed.cc/embed/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: '2Embed',
      flag: '🔄',
      quality: 'SD',
    });
  }

  // 6. AutoEmbed (ещё один)
  if (!isSerial) {
    options.push({
      id: 'autoembed',
      label: 'AutoEmbed',
      sublabel: 'Авто плеер',
      url: `https://autoembed.cc/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'AutoEmbed',
      flag: '▶️',
      quality: 'HD',
    });
  }

  // ══════════════ ВНЕШНИЕ САЙТЫ (редиректы) ══════════════

  // 7. Kinobase (внешний сайт)
  options.push({
    id: 'kinobase',
    label: 'Kinobase',
    sublabel: 'Русская озвучка',
    url: `https://kinobase.org/film/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'Kinobase',
    flag: '🇷🇺',
    quality: 'HD',
  });

  // 8. LordFilm (внешний)
  options.push({
    id: 'lordfilm',
    label: 'LordFilm',
    sublabel: 'Русская озвучка',
    url: `https://${isSerial ? 'lordserials' : 'lordfilm'}.lol/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'LordFilm',
    flag: '🇷🇺',
    quality: 'HD',
  });

  // 9. Rezka (внешний)
  options.push({
    id: 'rezka',
    label: 'Rezka',
    sublabel: 'Русская озвучка',
    url: `https://rezka.ag/films/${imdbId}`,
    type: 'external',
    lang: 'ru',
    provider: 'Rezka',
    flag: '🇷🇺',
    quality: 'HD',
  });

  // 10. YouTube поиск
  options.push({
    id: 'youtube',
    label: 'YouTube',
    sublabel: 'Поиск трейлера',
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(isSerial ? `tv series` : `movie`)}+${imdbId}`,
    type: 'external',
    lang: 'en',
    provider: 'YouTube',
    flag: '📺',
    quality: 'HD',
  });

  // ══════════════ ПОЛЬЗОВАТЕЛЬСКИЙ ПАТТЕРН ══════════════
  const customPattern = tryGetCustomPattern();
  if (customPattern) {
    options.push({
      id: 'custom-player',
      label: 'Свой плеер',
      sublabel: 'Пользовательский',
      url: customPattern.replace('{ID}', imdbId),
      type: 'iframe',
      lang: 'ru',
      provider: 'Custom',
      flag: '⚡',
      quality: 'HD',
    });
  }

  return options;
}

function tryGetCustomPattern(): string | null {
  try {
    const val = localStorage.getItem('tc_player_pattern');
    if (val && val.includes('{ID}')) return val;
    return null;
  } catch {
    return null;
  }
}

/**
 * Получить URL для просмотра через прокси (если iframe заблокирован)
 */
export function getProxyUrl(url: string): string {
  // Пробуем открыть через несколько прокси
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://proxy.cors.sh/${encodeURIComponent(url)}`,
  ];
  return proxies[0];
}