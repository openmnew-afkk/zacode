/* ===== TeleCinema — Players с русской озвучкой =====
 * Приоритет:
 * 1. Kodik API   — LostFilm, RedHead Sound, Кубик в Кубе, BaibaKo, NewStudio и т.д.
 * 2. Collaps     — русский агрегатор озвучек
 * 3. HDVB        — русский плеер
 * 4. Alloha      — русский плеер
 * 5. VidSrc      — английский резервный
 * 6. embed.su    — мультиязычный резервный
 */

import type { WatchOption } from '../types';

export interface PlayerRequest {
  tmdbId: string;       // TMDB numeric ID (обязателен)
  imdbId?: string;      // Реальный tt... ID (нужен для Kodik/HDVB)
  isSerial: boolean;
  season?: number;
  episode?: number;
  title?: string;
}

/* ══════════════════════════════════════════════════════════
   KODIK — главный русский плеер
   API возвращает iframe URL с выбором озвучки внутри плеера
   Поддерживает: LostFilm, RedHead Sound, Кубик в Кубе, BaibaKo, NewStudio, Jaskier и др.
   ══════════════════════════════════════════════════════════ */
const KODIK_TOKENS = [
  '447d179e875efe44b600c796a18d1449',
  '04d83feaaefdc09a8e62c27e0af2ba5b',
];

async function searchKodik(req: PlayerRequest): Promise<WatchOption[]> {
  const { imdbId, tmdbId, isSerial, season = 1, episode = 1 } = req;

  // Kodik требует IMDB ID для точного поиска
  if (!imdbId || !imdbId.startsWith('tt')) return [];

  const types = isSerial
    ? 'foreign-serial,anime,russian-serial,cartoon'
    : 'movie,foreign-movie,anime-movie,russian-movie,cartoon-movie';

  for (const token of KODIK_TOKENS) {
    try {
      const params = new URLSearchParams({
        token,
        imdb_id: imdbId,
        with_episodes: 'false',
        types,
        limit: '20',
      });

      const res = await fetch(`https://kodikapi.com/search?${params}`, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;
      const data = await res.json();

      if (!data.results || data.results.length === 0) continue;

      const options: WatchOption[] = [];

      for (const result of data.results) {
        const translation = result.translation || {};
        let url: string = result.link || '';

        if (!url) continue;
        if (url.startsWith('//')) url = 'https:' + url;

        // Для сериалов добавляем сезон и серию
        if (isSerial) {
          url += (url.includes('?') ? '&' : '?') + `season=${season}&episode=${episode}`;
        }

        // Определяем студию озвучки
        const studio = translation.title || 'Кодик';
        const isVoice = translation.type === 'voice';

        options.push({
          id: `kodik-${translation.id || Math.random()}`,
          label: studio,
          sublabel: isVoice ? '🎙️ Озвучка' : '📝 Субтитры',
          url,
          type: 'iframe',
          lang: 'ru',
          provider: 'Kodik',
          flag: '🇷🇺',
          quality: '720p',
        });
      }

      if (options.length > 0) {
        console.log(`[Kodik] Найдено ${options.length} озвучек для ${imdbId}`);
        return options;
      }
    } catch (e) {
      console.warn('[Kodik] token error:', e);
      continue;
    }
  }

  console.log('[Kodik] Не найдено для', imdbId);
  return [];
}

/* ══════════════════════════════════════════════════════════
   ALLOHA — русский плеер с API
   ══════════════════════════════════════════════════════════ */
async function searchAlloha(req: PlayerRequest): Promise<WatchOption[]> {
  const { imdbId, tmdbId, isSerial, season = 1, episode = 1 } = req;
  const ALLOHA_TOKEN = '04d83feaaefdc09a8e62c27e0af2ba5b';

  try {
    const searchId = imdbId && imdbId.startsWith('tt') ? imdbId : tmdbId;
    const params = new URLSearchParams({
      token: ALLOHA_TOKEN,
      ...(imdbId?.startsWith('tt') ? { imdb_id: imdbId } : { id: tmdbId }),
    });

    const res = await fetch(`https://api.alloha.tv/?${params}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    let url = data?.data?.iframe || '';
    if (!url) return [];
    if (url.startsWith('//')) url = 'https:' + url;

    if (isSerial) {
      url += (url.includes('?') ? '&' : '?') + `s=${season}&e=${episode}`;
    }

    return [{
      id: 'alloha',
      label: 'Alloha',
      sublabel: '🇷🇺 Русская озвучка',
      url,
      type: 'iframe',
      lang: 'ru',
      provider: 'Alloha',
      flag: '🇷🇺',
      quality: 'HD',
    }];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   HDVB — русский плеер с API
   ══════════════════════════════════════════════════════════ */
async function searchHDVB(req: PlayerRequest): Promise<WatchOption[]> {
  const { imdbId, isSerial, season = 1, episode = 1 } = req;
  if (!imdbId?.startsWith('tt')) return [];

  const HDVB_TOKEN = '18f5e90c3410a59c5e67c43fe436a88e';
  try {
    const res = await fetch(
      `https://api.hdvb.ru/api/media?token=${HDVB_TOKEN}&imdb_id=${imdbId}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    let url = data?.iframe_url || '';
    if (!url) return [];
    if (url.startsWith('//')) url = 'https:' + url;

    if (isSerial) {
      url += (url.includes('?') ? '&' : '?') + `s=${season}&e=${episode}`;
    }

    return [{
      id: 'hdvb',
      label: 'HDVB',
      sublabel: '🇷🇺 Русская озвучка',
      url,
      type: 'iframe',
      lang: 'ru',
      provider: 'HDVB',
      flag: '🇷🇺',
      quality: 'HD',
    }];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   Videocdn — русский iframe плеер
   ══════════════════════════════════════════════════════════ */
async function searchVideocdn(req: PlayerRequest): Promise<WatchOption[]> {
  const { imdbId, isSerial, season = 1, episode = 1 } = req;
  if (!imdbId?.startsWith('tt')) return [];

  const VIDEOCDN_TOKEN = 'e56RjwKQGBqGF4UbFpFXiRxxGUqSFrgG';
  try {
    const res = await fetch(
      `https://videocdn.tv/api/short?api_token=${VIDEOCDN_TOKEN}&imdb_id=${imdbId}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const item = data?.data?.[0];
    if (!item) return [];

    let url = item.iframe_src || '';
    if (!url) return [];
    if (url.startsWith('//')) url = 'https:' + url;

    return [{
      id: 'videocdn',
      label: 'VideoCDN',
      sublabel: '🇷🇺 Русская озвучка',
      url,
      type: 'iframe',
      lang: 'ru',
      provider: 'VideoCDN',
      flag: '🇷🇺',
      quality: 'HD',
    }];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   Статичные embed-плееры (без API, всегда доступны)
   ══════════════════════════════════════════════════════════ */
function buildStaticOptions(req: PlayerRequest): WatchOption[] {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1 } = req;
  const opts: WatchOption[] = [];

  /* VidSrc.to — TMDB ID */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'EN · HD',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc',
    flag: '🌐',
    quality: 'HD',
  });

  /* embed.su — TMDB ID */
  opts.push({
    id: 'embed-su',
    label: 'Embed.su',
    sublabel: 'Мультиязычный',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Embed.su',
    flag: '🎬',
    quality: 'HD',
  });

  /* VidSrc.cc */
  opts.push({
    id: 'vidsrc-cc',
    label: 'VidSrc CC',
    sublabel: 'HD Резерв',
    url: isSerial
      ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'en',
    provider: 'VidSrc CC',
    flag: '🎥',
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

  /* SuperEmbed — TMDB */
  opts.push({
    id: 'superembed',
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

  /* 2embed — TMDB */
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

  return opts;
}

/* ══════════════════════════════════════════════════════════
   ГЛАВНАЯ ФУНКЦИЯ — собирает все источники
   ══════════════════════════════════════════════════════════ */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  // Параллельно запрашиваем все русские API
  const [kodikOpts, hdvbOpts, allohaOpts, videoCdnOpts] = await Promise.allSettled([
    searchKodik(req),
    searchHDVB(req),
    searchAlloha(req),
    searchVideocdn(req),
  ]);

  const ruOpts: WatchOption[] = [
    ...(kodikOpts.status === 'fulfilled' ? kodikOpts.value : []),
    ...(hdvbOpts.status === 'fulfilled' ? hdvbOpts.value : []),
    ...(allohaOpts.status === 'fulfilled' ? allohaOpts.value : []),
    ...(videoCdnOpts.status === 'fulfilled' ? videoCdnOpts.value : []),
  ];

  const staticOpts = buildStaticOptions(req);

  // Сначала русские с реальными озвучками, потом остальные
  return [...ruOpts, ...staticOpts].filter(o => o.url);
}

/* Для обратной совместимости */
export async function getWatchOptionsLegacy(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<WatchOption[]> {
  return getWatchOptions({
    tmdbId: imdbId.replace('tt', ''),
    imdbId: imdbId.startsWith('tt') ? imdbId : undefined,
    isSerial: !!(season && episode),
    season,
    episode,
  });
}