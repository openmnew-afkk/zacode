/* ===== Плееры с русскими озвучками =====
 * Kodik API — вызывается с клиента, возвращает iframe_url
 * с правильными озвучками (LostFilm, ColdFilm, RedHead Sound)
 * + международные плееры как резерв
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

const KODIK_TOKEN = '447d179e875efe44217f20d1ee2146e2';

/* ── Kodik API: поиск озвучек ── */
async function fetchKodikSources(imdbId: string, isSerial: boolean, season: number, episode: number): Promise<WatchOption[]> {
  try {
    const params = new URLSearchParams({
      token: KODIK_TOKEN,
      imdb_id: imdbId,
      with_episodes: 'true',
      limit: '20',
    });

    const res = await fetch(`https://kodikapi.com/search?${params}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    const opts: WatchOption[] = [];
    const seen = new Set<string>();

    for (const item of data.results) {
      const translation = item.translation?.title || 'Неизвестная озвучка';
      if (seen.has(translation)) continue;
      seen.add(translation);

      // Формируем iframe URL
      let iframeUrl = item.link || '';
      if (iframeUrl.startsWith('//')) iframeUrl = `https:${iframeUrl}`;

      // Добавляем сезон/эпизод для сериалов
      if (isSerial && item.seasons) {
        const seasonData = item.seasons?.[String(season)];
        if (seasonData?.episodes?.[String(episode)]) {
          // URL уже привязан к конкретному эпизоду через Kodik
        }
        // Добавляем параметры
        const sep = iframeUrl.includes('?') ? '&' : '?';
        iframeUrl += `${sep}season=${season}&episode=${episode}`;
      }

      // Определяем иконку озвучки
      let flag = '🎙️';
      const tl = translation.toLowerCase();
      if (tl.includes('lostfilm')) flag = '🔥';
      else if (tl.includes('coldfilm')) flag = '❄️';
      else if (tl.includes('redhead') || tl.includes('red head')) flag = '🔴';
      else if (tl.includes('кубик')) flag = '🎲';
      else if (tl.includes('amedia')) flag = '📺';
      else if (tl.includes('newstudio')) flag = '🆕';
      else if (tl.includes('дубляж') || tl.includes('дублированн')) flag = '🇷🇺';

      opts.push({
        id: `kodik-${translation.replace(/\s/g, '-').toLowerCase()}`,
        label: translation,
        sublabel: `Kodik · ${item.quality || 'HD'}`,
        url: iframeUrl,
        type: 'iframe',
        lang: 'ru',
        provider: 'Kodik',
        flag,
        quality: item.quality || 'HD',
      });
    }

    return opts;
  } catch (e) {
    console.warn('Kodik API error:', e);
    return [];
  }
}

/* ── Главная функция ── */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1 } = req;
  const hasImdb = imdbId && imdbId.startsWith('tt');

  // Запускаем поиск русских озвучек параллельно с формированием международных
  const kodikPromise = hasImdb
    ? fetchKodikSources(imdbId, isSerial, season, episode)
    : Promise.resolve([]);

  /* ═══ Международные плееры (всегда работают) ═══ */
  const intlOpts: WatchOption[] = [];

  intlOpts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: '✅ HD · Проверен',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.to', flag: '✅', quality: 'HD',
  });

  intlOpts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: '✅ HD',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: '2Embed', flag: '✅', quality: 'HD',
  });

  intlOpts.push({
    id: 'vidsrc-in',
    label: 'VidSrc IN',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidsrc.in/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.in/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.in', flag: '📺', quality: 'HD',
  });

  intlOpts.push({
    id: 'vidsrc-me',
    label: 'VidSrc ME',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.me', flag: '🎬', quality: 'HD',
  });

  intlOpts.push({
    id: 'videasy',
    label: 'Videasy',
    sublabel: 'HD',
    url: isSerial
      ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`
      : `https://player.videasy.net/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'Videasy', flag: '⚡', quality: 'HD',
  });

  intlOpts.push({
    id: 'vidsrc-dev',
    label: 'VidSrc Dev',
    sublabel: 'HD',
    url: isSerial
      ? `https://vidsrc.dev/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.dev/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc.dev', flag: '🎥', quality: 'HD',
  });

  // Ждём русские озвучки
  const kodikOpts = await kodikPromise;

  // Русские ПЕРВЫЕ, потом международные
  return [...kodikOpts, ...intlOpts];
}
