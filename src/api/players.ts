/* ===== Плееры — Kodik API (из браузера РФ) + рабочие embed'ы =====
 * Kodik API вызывается из БРАУЗЕРА пользователя (не с сервера!)
 * Из России kodikapi.com доступен и вернёт все озвучки
 * + рабочие embed-сервисы как резерв
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

/* ═══ Kodik API — все озвучки (LostFilm, ColdFilm, RedHead Sound) ═══ */
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
      const url = `https://kodikapi.com/search?token=${token}&imdb_id=${imdbId}&with_episodes=true&limit=30`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
        else if (tl.includes('пифагор')) flag = '🎯';
        else if (tl.includes('jaskier')) flag = '🎵';

        opts.push({
          id: `kodik-${seen.size}`,
          label: tr,
          sublabel: `Kodik · ${item.quality || 'HD'}`,
          url: link,
          type: 'iframe', lang: 'ru', provider: 'Kodik',
          flag, quality: item.quality || 'HD',
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

  // Kodik API параллельно с формированием остальных
  const kodikP = hasImdb ? fetchKodik(imdbId!, isSerial, s, e) : Promise.resolve([]);

  const embeds: WatchOption[] = [];

  /* ── Прямой Kodik embed (если API не сработает) ── */
  if (hasImdb) {
    embeds.push({
      id: 'kodik-direct',
      label: 'Kodik',
      sublabel: '🇷🇺 Все озвучки · Авто',
      url: isSerial
        ? `https://kodik.info/find-player?imdbID=${imdbId}&season=${s}&episode=${e}`
        : `https://kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Kodik', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── Collaps ── */
  if (hasImdb) {
    embeds.push({
      id: 'collaps',
      label: 'Collaps',
      sublabel: '🇷🇺 Русские озвучки',
      url: isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${s}&e=${e}`
        : `https://api.collaps.cc/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Collaps', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ── ApiPlayer.ru ── */
  embeds.push({
    id: 'apiplayer',
    label: 'ApiPlayer',
    sublabel: '🇷🇺 HD',
    url: isSerial
      ? `https://apiplayer.ru/embed/tv/${tmdbId}/${s}/${e}`
      : `https://apiplayer.ru/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'ApiPlayer.ru', flag: '🇷🇺', quality: 'HD',
  });

  /* ── VidRock.ru ── */
  embeds.push({
    id: 'vidrock',
    label: 'VidRock',
    sublabel: '🇷🇺 HD',
    url: isSerial
      ? `https://vidrock.ru/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidrock.ru/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidRock.ru', flag: '🇷🇺', quality: 'HD',
  });

  /* ── VidCore (мульти-сервер) ── */
  embeds.push({
    id: 'vidcore',
    label: 'VidCore',
    sublabel: 'Мульти-сервер · HD',
    url: isSerial
      ? `https://vidcore.org/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidcore.org/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidCore', flag: '⚡', quality: 'HD',
  });

  /* ── VidSrc ── */
  embeds.push({
    id: 'vidsrc',
    label: 'VidSrc',
    sublabel: '✅ HD',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'VidSrc', flag: '✅', quality: 'HD',
  });

  /* ── Videasy ── */
  embeds.push({
    id: 'videasy',
    label: 'Videasy',
    sublabel: 'HD',
    url: isSerial
      ? `https://player.videasy.net/tv/${tmdbId}/${s}/${e}`
      : `https://player.videasy.net/movie/${tmdbId}`,
    type: 'iframe', lang: 'multi', provider: 'Videasy', flag: '🎥', quality: 'HD',
  });

  // Ждём Kodik API
  const kodikOpts = await kodikP;

  // Если Kodik API вернул озвучки — они ПЕРВЫЕ (убираем прямой kodik embed)
  if (kodikOpts.length > 0) {
    return [...kodikOpts, ...embeds.filter(o => o.id !== 'kodik-direct')];
  }

  // Иначе все embed'ы (включая прямой kodik)
  return embeds;
}
