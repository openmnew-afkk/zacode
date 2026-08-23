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

/* ═══ Прокси для русских плееров (обход гео-блока при VPN) ═══
 * Настраивается в админке или через переменную окружения VITE_RU_PROXY.
 * Код прокси — в папке /proxy этого репозитория (деплой на российский VPS).
 */
const RU_PROXY_KEY = 'tc_ru_proxy';

/** Прокси по умолчанию из переменных окружения (задаётся при сборке) */
function defaultRuProxy(): string {
  try {
    const env = (import.meta as any).env || {};
    return String(env.VITE_RU_PROXY || '').trim();
  } catch { return ''; }
}

export function getRuProxy(): string {
  try { return localStorage.getItem(RU_PROXY_KEY) ?? defaultRuProxy(); }
  catch { return defaultRuProxy(); }
}

/** Сохранить адрес прокси ('' = сбросить на дефолт из env) */
export function setRuProxy(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  try {
    if (clean) localStorage.setItem(RU_PROXY_KEY, clean);
    else localStorage.removeItem(RU_PROXY_KEY);
  } catch {}
}

/**
 * Проверка прокси: пингуем корень (сервер отвечает статусом) и пробуем
 * реальный проход до kodikapi.com — так проверяется и связность, и обход гео.
 */
export async function testRuProxy(
  base?: string
): Promise<{ ok: boolean; message: string }> {
  const p = (base !== undefined ? base : getRuProxy()).trim().replace(/\/+$/, '');
  if (!p) return { ok: false, message: '❌ Адрес не задан' };
  if (!/^https?:\/\//i.test(p)) return { ok: false, message: '❌ Нужен URL вида https://…' };

  // 1. Сервер вообще доступен?
  try {
    const res = await fetch(p + '/', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, message: `⚠️ Сервер ответил HTTP ${res.status}` };
    const text = await res.text().catch(() => '');
    if (text && !/RU-Proxy/i.test(text)) {
      return { ok: false, message: '⚠️ По этому адресу не RU-Proxy' };
    }
  } catch {
    return { ok: false, message: '❌ Сервер недоступен (таймаут/DNS/CORS)' };
  }

  // 2. Проход до российского плеер-провайдера работает?
  try {
    const target = encodeURIComponent('https://kodikapi.com/');
    const res = await fetch(`${p}/?url=${target}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) return { ok: true, message: '✅ Прокси работает! Русские озвучки будут доступны с VPN' };
    return { ok: false, message: `⚠️ Прокси доступен, но upstream вернул HTTP ${res.status}` };
  } catch {
    return { ok: false, message: '⚠️ Сервер жив, но запрос через ?url= не прошёл' };
  }
}

/** Завернуть URL российского плеера в прокси (если настроен) */
function viaProxy(url: string): string {
  const p = getRuProxy().replace(/\/+$/, '');
  if (!p) return url;
  return `${p}?url=${encodeURIComponent(url)}`;
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
          url: viaProxy(link), type: 'iframe', lang: 'ru',
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

  /* ── 🇷🇺 Российские плееры (работают с IP РФ/СНГ или через прокси) ── */
  const hasProxy = !!getRuProxy();
  const ruEmbeds: WatchOption[] = [];

  if (hasImdb) {
    ruEmbeds.push({
      id: 'collaps', label: 'Collaps',
      sublabel: hasProxy ? '🇷🇺 Через прокси · Все озвучки' : '🇷🇺 Все озвучки · Выбор внутри',
      url: viaProxy(isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${s}&e=${e}`
        : `https://api.collaps.cc/embed/${imdbId}`),
      type: 'iframe', lang: 'ru', provider: 'Collaps', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'kodik-direct', label: 'Kodik',
      sublabel: hasProxy ? '🇷🇺 Через прокси · Авто' : '🇷🇺 Все озвучки · Авто',
      url: viaProxy(isSerial
        ? `https://kodik.info/find-player?imdbID=${imdbId}&season=${s}&episode=${e}`
        : `https://kodik.info/find-player?imdbID=${imdbId}`),
      type: 'iframe', lang: 'ru', provider: 'Kodik', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'videoframe', label: 'VideoFrame',
      sublabel: hasProxy ? '🇷🇺 Через прокси' : '🇷🇺 Русская озвучка',
      url: viaProxy(isSerial
        ? `https://videoframe.space/embed/${imdbId}?s=${s}&e=${e}`
        : `https://videoframe.space/embed/${imdbId}`),
      type: 'iframe', lang: 'ru', provider: 'VideoFrame', flag: '🇷🇺', quality: 'HD',
    });
    ruEmbeds.push({
      id: 'videocdn', label: 'VideoCDN',
      sublabel: hasProxy ? '🇷🇺 Через прокси' : '🇷🇺 Русская озвучка',
      url: viaProxy(isSerial
        ? `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}&season=${s}&episode=${e}`
        : `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}`),
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

  // MultiEmbed — глобальный, иногда есть русская дорожка
  if (hasImdb) {
    globalEmbeds.push({
      id: 'multiembed', label: 'MultiEmbed',
      sublabel: '🌐 Альтернативный сервер',
      url: isSerial
        ? `https://multiembed.mov/?video_id=${imdbId}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${imdbId}`,
      type: 'iframe', lang: 'multi', provider: 'MultiEmbed', flag: '🌐', quality: 'HD',
    });
  }

  // 2Embed — глобальный, стабильно доступен
  globalEmbeds.push({
    id: '2embed', label: '2Embed',
    sublabel: '🌐 Работает везде',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: '2Embed', flag: '🌐', quality: 'HD',
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

  // Зарубежный IP (VPN):
  // VidSrc RU → озвучки Kodik (через прокси если есть) → глобальные → русские плееры
  const globalsRest = globalEmbeds.slice(1);
  if (kodikOpts.length > 0) {
    return [globalEmbeds[0], ...kodikOpts, ...globalsRest, ...withoutKodikDirect(ruEmbeds)];
  }
  return [...globalEmbeds, ...ruEmbeds];
}
