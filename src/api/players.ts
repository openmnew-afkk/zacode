/* ===== Плееры — ТОЛЬКО с русскими озвучками =====
 * Collaps, Kodik, VideoFrame — 000 с моего сервера
 * но РАБОТАЮТ из России (гео-ограничены)
 * + Kodik API для выбора конкретной озвучки
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

/* ═══ Kodik API — поиск озвучек из браузера пользователя ═══ */
const KODIK_TOKENS = [
  '447d179e875efe44217f20d1ee2146e2',
  'b7cc4293ed475c4ad1fd599d1f5a1e0f',
  'a0a3e1e3573dd849cfbc7d21cc4e3b5e',
  'bf3e454fa0b09835dd5a14608c21ec85',
  '71d52b41e3c57b5b61e73d46d3346b90',
];

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

        const tl = tr.toLowerCase();
        let flag = '🎙️';
        if (tl.includes('lostfilm')) flag = '🔥';
        else if (tl.includes('coldfilm')) flag = '❄️';
        else if (tl.includes('redhead')) flag = '🔴';
        else if (tl.includes('кубик')) flag = '🎲';
        else if (tl.includes('amedia')) flag = '📺';
        else if (tl.includes('newstudio')) flag = '🆕';
        else if (tl.includes('дубл')) flag = '🇷🇺';

        opts.push({
          id: `kodik-${seen.size}`, label: tr,
          sublabel: `Kodik · ${item.quality || 'HD'}`,
          url: link, type: 'iframe', lang: 'ru',
          provider: 'Kodik', flag, quality: item.quality || 'HD',
        });
      }
      if (opts.length > 0) return opts;
    } catch { continue; }
  }
  return [];
}

/* ═══ Главная функция ═══ */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season: s = 1, episode: e = 1 } = req;
  const hasImdb = imdbId?.startsWith('tt');

  // Kodik API параллельно
  const kodikP = hasImdb ? fetchKodik(imdbId!, isSerial, s, e) : Promise.resolve([]);

  const embeds: WatchOption[] = [];

  /* ── 🇷🇺 Collaps — лучший выбор озвучек ── */
  if (hasImdb) {
    embeds.push({
      id: 'collaps', label: 'Collaps',
      sublabel: '🇷🇺 Все озвучки · Выбор внутри',
      url: isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${s}&e=${e}`
        : `https://api.collaps.cc/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Collaps', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── 🇷🇺 Kodik — прямой embed ── */
  if (hasImdb) {
    embeds.push({
      id: 'kodik-direct', label: 'Kodik',
      sublabel: '🇷🇺 Все озвучки · Авто',
      url: isSerial
        ? `https://kodik.info/find-player?imdbID=${imdbId}&season=${s}&episode=${e}`
        : `https://kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Kodik', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── 🇷🇺 VideoFrame ── */
  if (hasImdb) {
    embeds.push({
      id: 'videoframe', label: 'VideoFrame',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://videoframe.space/embed/${imdbId}?s=${s}&e=${e}`
        : `https://videoframe.space/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'VideoFrame', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── 🇷🇺 VideoCDN ── */
  if (hasImdb) {
    embeds.push({
      id: 'videocdn', label: 'VideoCDN',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}&season=${s}&episode=${e}`
        : `https://cdn.videocdn.tv/api/short?imdb_id=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'VideoCDN', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── 🌐 VidSrc — резерв (мультиязычный) ── */
  embeds.push({
    id: 'vidsrc', label: 'VidSrc',
    sublabel: '🌐 Мультиязычный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc', flag: '🌐', quality: 'HD',
  });

  // Ждём Kodik API
  const kodikOpts = await kodikP;

  if (kodikOpts.length > 0) {
    // Kodik озвучки ПЕРВЫЕ, потом остальные embed (без дубля kodik-direct)
    return [...kodikOpts, ...embeds.filter(o => o.id !== 'kodik-direct')];
  }

  return embeds;
}
