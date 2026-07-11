/* ===== Агрегатор плееров — Kodik, Collaps, Alloha + статика + внешние ===== */

export interface WatchOption {
  id: string;
  label: string;
  sublabel?: string;
  url: string;
  type: 'iframe' | 'external' | 'telegram';
  lang: 'ru' | 'en';
  provider: string;
  flag?: string;
}

interface ResolveParams {
  imdbId: string;
  title: string;
  year?: string;
  isSerial: boolean;
  season?: number;
  episode?: number;
}

// ── Kodik (самый надёжный, много переводов) ──
const KODIK_TOKEN = 'b23aec78905d0f14083e1fbe2e06a2c2';

const ensureHttps = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
};

const appendSerial = (url: string, season: number, episode: number): string => {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  if (url.includes('kodik') || url.includes('aniboom')) return `${url}${sep}season=${season}&episode=${episode}`;
  return `${url}${sep}s=${season}&e=${episode}`;
};

async function safeJson<T>(url: string, timeout = 7000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Kodik — лучший источник русской озвучки ──
async function fetchKodik(
  imdbId: string, season: number, episode: number, isSerial: boolean
): Promise<WatchOption[]> {
  const data = await safeJson<{
    results?: Array<{ link: string; translation?: { title: string }; quality?: string }>;
  }>(
    `https://kodikapi.com/search?token=${KODIK_TOKEN}&imdb_id=${imdbId}&with_episodes=true&limit=6`
  );
  if (!data?.results?.length) return [];

  const seen = new Set<string>();
  const out: WatchOption[] = [];

  for (const r of data.results) {
    const base = ensureHttps(r.link);
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const url = isSerial ? appendSerial(base, season, episode) : base;
    out.push({
      id: `kodik-${out.length}`,
      label: r.translation?.title || 'Kodik',
      sublabel: r.quality || 'HD',
      url,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kodik',
      flag: '🇷🇺',
    });
    if (out.length >= 4) break;
  }
  return out;
}

// ── Collaps (bhcesh) ──
async function fetchCollaps(
  imdbId: string, season: number, episode: number, isSerial: boolean
): Promise<WatchOption[]> {
  const data = await safeJson<{
    results?: Array<{ iframe_url: string; translation?: string }>;
  }>(
    `https://api.bhcesh.me/list?token=eedefb541aeba871dcfc756e6b31c02e&imdb_id=${imdbId}`
  );
  if (!data?.results?.length) return [];

  const seen = new Set<string>();
  const out: WatchOption[] = [];

  for (const r of data.results) {
    const base = ensureHttps(r.iframe_url);
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const url = isSerial ? appendSerial(base, season, episode) : base;
    out.push({
      id: `collaps-${out.length}`,
      label: r.translation || 'Collaps',
      sublabel: 'Русская озвучка',
      url,
      type: 'iframe',
      lang: 'ru',
      provider: 'Collaps',
      flag: '🇷🇺',
    });
    if (out.length >= 3) break;
  }
  return out;
}

// ── Статичные embed-плееры (всегда работают) ──
function staticEmbeds(imdbId: string, season: number, episode: number, isSerial: boolean): WatchOption[] {
  if (isSerial) {
    return [
      {
        id: 'vidsrc-tv',
        label: 'VidSrc',
        sublabel: 'EN + суб',
        url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`,
        type: 'iframe',
        lang: 'en',
        provider: 'VidSrc',
        flag: '🌐',
      },
      {
        id: 'vidsrc-xyz-tv',
        label: 'VidSrc XYZ',
        sublabel: 'EN мульти',
        url: `https://vidsrc.xyz/embed/tv/${imdbId}?s=${season}&e=${episode}`,
        type: 'iframe',
        lang: 'en',
        provider: 'VidSrc XYZ',
        flag: '🌐',
      },
    ];
  }
  return [
    {
      id: 'vidsrc-movie',
      label: 'VidSrc',
      sublabel: 'EN + суб',
      url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc',
      flag: '🌐',
    },
    {
      id: 'vidsrc-xyz-movie',
      label: 'VidSrc XYZ',
      sublabel: 'EN мульти',
      url: `https://vidsrc.xyz/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc XYZ',
      flag: '🌐',
    },
  ];
}

// ── Внешние площадки (открываются в браузере) ──
function externalPlatforms(title: string, year: string | undefined, imdbId: string): WatchOption[] {
  const q = encodeURIComponent(title);
  const search = encodeURIComponent(`${title} ${year || ''}`.trim());

  return [
    {
      id: 'hdrezka',
      label: 'HDRezka',
      sublabel: 'Лучшая русская озвучка',
      url: `https://rezka.ag/search/?do=search&subaction=search&q=${q}`,
      type: 'external',
      lang: 'ru',
      provider: 'HDRezka',
      flag: '🇷🇺',
    },
    {
      id: 'kinohost',
      label: 'KinoHost',
      sublabel: 'Агрегатор озвучек',
      url: `https://kinohost.top/search?query=${search}`,
      type: 'external',
      lang: 'ru',
      provider: 'KinoHost',
      flag: '🇷🇺',
    },
    {
      id: 'zfilm',
      label: 'ZFilm',
      sublabel: 'Онлайн-кинотеатр',
      url: `https://zfilm-hd.org/?s=${q}`,
      type: 'external',
      lang: 'ru',
      provider: 'ZFilm',
      flag: '🇷🇺',
    },
    {
      id: 'tg-search',
      label: 'Telegram',
      sublabel: 'Поиск в каналах',
      url: `https://t.me/s/Lostfilmtv648?q=${q}`,
      type: 'telegram',
      lang: 'ru',
      provider: 'Telegram',
      flag: '✈️',
    },
  ];
}

export async function resolveWatchOptions(params: ResolveParams): Promise<WatchOption[]> {
  const { imdbId, title, year, isSerial, season = 1, episode = 1 } = params;
  if (!imdbId?.startsWith('tt')) return externalPlatforms(title, year, imdbId);

  const [kodik, collaps] = await Promise.all([
    fetchKodik(imdbId, season, episode, isSerial),
    fetchCollaps(imdbId, season, episode, isSerial),
  ]);

  const statics = staticEmbeds(imdbId, season, episode, isSerial);
  const iframeSources = [...kodik, ...collaps, ...statics];

  const seen = new Set<string>();
  const unique = iframeSources.filter((s) => {
    if (!s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return [...unique, ...externalPlatforms(title, year, imdbId)];
}

export type { ResolveParams };
