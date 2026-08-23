/* ===== Плееры — умный выбор источников по региону =====
 *
 * Проблема: российские плееры (Kodik, Collaps, VideoCDN…) работают ТОЛЬКО
 * с российских IP. Если пользователь в Telegram сидит через VPN (зарубежный
 * IP) — они не грузятся. А без VPN у части пользователей недоступен сам
 * Telegram, так что VPN включён часто.
 *
 * Решение:
 *  1. Определяем страну пользователя (кэш 6 часов).
 *  2. РФ/СНГ → сначала русские плееры, глобальные — резерв.
 *  3. Другие страны (VPN) → сначала глобальные плееры с русской дорожкой
 *     (VidSrc ds_lang=ru), русские плееры — резервом (вдруг VPN с выходом в РФ).
 *  4. Плеер сам переключается на следующий источник, если текущий не грузится.
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

/* ═══ Определение страны пользователя ═══ */
const GEO_KEY = 'tc_geo_cache';
let geoPromise: Promise<string> | null = null;

export function detectCountry(): Promise<string> {
  if (geoPromise) return geoPromise;

  // Кэш в localStorage на 6 часов
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.cc && Date.now() - parsed.time < 6 * 60 * 60 * 1000) {
        geoPromise = Promise.resolve(parsed.cc);
        return geoPromise;
      }
    }
  } catch {}

  geoPromise = (async () => {
    const endpoints = [
      'https://ipwho.is/',          // бесплатный, CORS, без ключа
      'https://ipapi.co/json/',     // резерв
    ];
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) continue;
        const data = await res.json();
        const cc: string = data.country_code || data.countryCode || '';
        if (cc) {
          try { localStorage.setItem(GEO_KEY, JSON.stringify({ cc, time: Date.now() })); } catch {}
          return cc.toUpperCase();
        }
      } catch { continue; }
    }
    // Не смогли определить — считаем РФ (основная аудитория)
    return 'RU';
  })();

  return geoPromise;
}

/** Зона, где работают российские плееры */
function isRuZone(cc: string): boolean {
  return ['RU', 'BY', 'AM', 'KZ', 'KG', 'UZ', 'TJ', 'AZ'].includes(cc);
}

/* ═══ Kodik API — поиск конкретных озвучек ═══ */
const KODIK_TOKENS = [
  '447d179e875efe44217f20d1ee2146e2',
  'b7cc4293ed475c4ad1fd599d1f5a1e0f',
  'a0a3e1e3573dd849cfbc7d21cc4e3b5e',
  'bf3e454fa0b09835dd5a14608c21ec85',
  '71d52b41e3c57b5b61e73d46d3346b90',
];

/* Приоритет студий озвучки: чем меньше число — тем выше в списке */
const DUB_PRIORITY: Array<{ match: string[]; flag: string }> = [
  { match: ['lostfilm'], flag: '🔥' },
  { match: ['redhead', 'red head'], flag: '🔴' },
  { match: ['coldfilm'], flag: '❄️' },
  { match: ['кубик'], flag: '🎲' },
  { match: ['jaskier'], flag: '🎭' },
  { match: ['newstudio', 'new studio'], flag: '🆕' },
  { match: ['amedia'], flag: '📺' },
  { match: ['hdrezka', 'rezka'], flag: '🎬' },
  { match: ['baibako', 'байбако'], flag: '🐻' },
  { match: ['kerob'], flag: '🎧' },
  { match: ['crunchyroll'], flag: '🍥' },
  { match: ['аним', 'anime', 'anilibria'], flag: '🌸' },
  { match: ['дубл', 'dubl'], flag: '🇷🇺' },
  { match: ['многоголос', 'закадр'], flag: '🗣️' },
];

function dubInfo(title: string): { priority: number; flag: string } {
  const tl = title.toLowerCase();
  for (let i = 0; i < DUB_PRIORITY.length; i++) {
    if (DUB_PRIORITY[i].match.some((m) => tl.includes(m))) {
      return { priority: i, flag: DUB_PRIORITY[i].flag };
    }
  }
  return { priority: 100, flag: '🎙️' };
}

async function fetchKodik(imdbId: string, isSerial: boolean, s: number, e: number): Promise<WatchOption[]> {
  for (const token of KODIK_TOKENS) {
    try {
      const res = await fetch(
        `https://kodikapi.com/search?token=${token}&imdb_id=${imdbId}&with_episodes=true&limit=30`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.results?.length) continue;

      const opts: WatchOption[] = [];
      const seen = new Set<string>();
      for (const item of data.results) {
        const tr = item.translation?.title || 'Озвучка';
        if (seen.has(tr)) continue;
        seen.add(tr);
        let link = item.link || '';
        if (link.startsWith('//')) link = `https:${link}`;
        if (isSerial) link += `${link.includes('?') ? '&' : '?'}season=${s}&episode=${e}`;

        const { flag } = dubInfo(tr);

        opts.push({
          id: `kodik-${seen.size}`, label: tr,
          sublabel: `Kodik · ${item.quality || 'HD'}`,
          url: link, type: 'iframe', lang: 'ru',
          provider: 'Kodik', flag, quality: item.quality || 'HD',
        });
      }

      // Сортируем: LostFilm → RedHeadSound → ColdFilm → остальные
      opts.sort((a, b) => dubInfo(a.label).priority - dubInfo(b.label).priority);

      if (opts.length > 0) return opts;
    } catch { continue; }
  }
  return [];
}

/* ═══ Главная функция ═══ */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season: s = 1, episode: e = 1 } = req;
  const hasImdb = imdbId?.startsWith('tt');

  // Kodik API и регион — параллельно
  const kodikP = hasImdb ? fetchKodik(imdbId!, isSerial, s, e) : Promise.resolve([]);
  const countryP = detectCountry();

  /* ── 🇷🇺 Российские плееры (работают только с IP РФ/СНГ) ── */
  const ruEmbeds: WatchOption[] = [];

  if (hasImdb) {
    ruEmbeds.push({
      id: 'collaps', label: 'Collaps',
      sublabel: '🇷🇺 Все озвучки · Выбор внутри',
      url: isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${s}&e=${e}`
        : `https://api.collaps.cc/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Collaps', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'kodik-direct', label: 'Kodik',
      sublabel: '🇷🇺 Все озвучки · Авто',
      url: isSerial
        ? `https://kodik.info/find-player?imdbID=${imdbId}&season=${s}&episode=${e}`
        : `https://kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Kodik', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'videoframe', label: 'VideoFrame',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://videoframe.space/embed/${imdbId}?s=${s}&e=${e}`
        : `https://videoframe.space/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'VideoFrame', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'videocdn', label: 'VideoCDN',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}&season=${s}&episode=${e}`
        : `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'VideoCDN', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── 🌐 Глобальные плееры (работают из любой страны, есть русская дорожка) ── */
  const globalEmbeds: WatchOption[] = [];

  // VidSrc XYZ с русской звуковой дорожкой
  globalEmbeds.push({
    id: 'vidsrc-xyz-ru', label: 'VidSrc RU',
    sublabel: '🌐 Работает с VPN · Русская дорожка',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}&ds_lang=ru`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}&ds_lang=ru`,
    type: 'iframe', lang: 'ru', provider: 'VidSrc', flag: '🌐', quality: 'HD',
  });

  // VidSrc TO — проверенный резерв
  globalEmbeds.push({
    id: 'vidsrc-to', label: 'VidSrc',
    sublabel: '🌐 Мультиязычный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc', flag: '🌐', quality: 'HD',
  });

  // Ждём Kodik и регион
  const [kodikOpts, country] = await Promise.all([kodikP, countryP]);
  const ruFirst = isRuZone(country);

  /* Собираем итоговый список по приоритету региона */
  const withoutKodikDirect = (list: WatchOption[]) => list.filter(o => o.id !== 'kodik-direct');

  if (ruFirst) {
    // РФ/СНГ: озвучки Kodik → русские плееры → глобальные
    if (kodikOpts.length > 0) {
      return [...kodikOpts, ...withoutKodikDirect(ruEmbeds), ...globalEmbeds];
    }
    return [...ruEmbeds, ...globalEmbeds];
  }

  // Зарубежный IP (VPN): глобальные с русской дорожкой → озвучки Kodik → русские плееры
  if (kodikOpts.length > 0) {
    return [...globalEmbeds.slice(0, 1), ...kodikOpts, ...withoutKodikDirect(ruEmbeds), ...globalEmbeds.slice(1)];
  }
  return [...globalEmbeds, ...ruEmbeds];
}