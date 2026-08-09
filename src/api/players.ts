/* ===== ТОЛЬКО РУССКИЕ ПЛЕЕРЫ =====
 * Kodik API — поиск всех озвучек
 * + прямые iframe русских сервисов
 * Английские плееры УДАЛЕНЫ по запросу
 */

import type { WatchOption } from '../types';

export interface PlayerRequest {
  tmdbId: string;
  imdbId?: string;
  isSerial: boolean;
  season?: number;
  episode?: number;
  title?: string;
  kinopoiskId?: string;
}

/* Токены Kodik (пробуем несколько) */
const KODIK_TOKENS = [
  '447d179e875efe44217f20d1ee2146e2',
  'b7cc4293ed475c4ad1fd599d1f5a1e0f',
  'a0a3e1e3573dd849cfbc7d21cc4e3b5e',
];

/* ── Kodik API ── */
async function fetchKodikSources(
  imdbId: string, isSerial: boolean, season: number, episode: number
): Promise<WatchOption[]> {
  for (const token of KODIK_TOKENS) {
    try {
      const params = new URLSearchParams({
        token,
        imdb_id: imdbId,
        with_episodes: 'true',
        with_episodes_data: 'true',
        limit: '30',
      });

      const res = await fetch(`https://kodikapi.com/search?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data.results || data.results.length === 0) continue;

      const opts: WatchOption[] = [];
      const seen = new Set<string>();

      for (const item of data.results) {
        const translation = item.translation?.title || 'Озвучка';
        if (seen.has(translation)) continue;
        seen.add(translation);

        let iframeUrl = item.link || '';
        if (iframeUrl.startsWith('//')) iframeUrl = `https:${iframeUrl}`;

        if (isSerial) {
          const sep = iframeUrl.includes('?') ? '&' : '?';
          iframeUrl += `${sep}season=${season}&episode=${episode}`;
        }

        let flag = '🎙️';
        const tl = translation.toLowerCase();
        if (tl.includes('lostfilm')) flag = '🔥';
        else if (tl.includes('coldfilm')) flag = '❄️';
        else if (tl.includes('redhead') || tl.includes('red head')) flag = '🔴';
        else if (tl.includes('кубик')) flag = '🎲';
        else if (tl.includes('amedia')) flag = '📺';
        else if (tl.includes('newstudio')) flag = '🆕';
        else if (tl.includes('дублированн') || tl.includes('дубляж')) flag = '🇷🇺';
        else if (tl.includes('jaskier')) flag = '🎵';
        else if (tl.includes('оригинал')) flag = '🌐';

        opts.push({
          id: `kodik-${seen.size}`,
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

      if (opts.length > 0) return opts;
    } catch {
      continue;
    }
  }
  return [];
}

/* ── Главная функция ── */
export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, imdbId, isSerial, season = 1, episode = 1, title, kinopoiskId } = req;
  const hasImdb = imdbId && imdbId.startsWith('tt');
  const opts: WatchOption[] = [];

  /* ═══ 1. Kodik API — все русские озвучки ═══ */
  if (hasImdb) {
    const kodikOpts = await fetchKodikSources(imdbId, isSerial, season, episode);
    opts.push(...kodikOpts);
  }

  /* ═══ 2. Прямой Kodik iframe (если API не сработал) ═══ */
  if (hasImdb && opts.length === 0) {
    opts.push({
      id: 'kodik-direct',
      label: 'Kodik Плеер',
      sublabel: '🇷🇺 Все озвучки',
      url: isSerial
        ? `https://kodik.info/find-player?imdbID=${imdbId}&season=${season}&episode=${episode}&only_season=${season}`
        : `https://kodik.info/find-player?imdbID=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Kodik', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 3. Collaps — русские озвучки ═══ */
  if (hasImdb) {
    opts.push({
      id: 'collaps',
      label: 'Collaps',
      sublabel: '🇷🇺 Русские озвучки · HD',
      url: isSerial
        ? `https://api.collaps.cc/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://api.collaps.cc/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Collaps', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 4. HDVB — русская озвучка ═══ */
  if (hasImdb) {
    opts.push({
      id: 'hdvb',
      label: 'HDVB',
      sublabel: '🇷🇺 Русская озвучка · HD',
      url: isSerial
        ? `https://vid1730366744.vb17120ayescdn.pw/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://vid1730366744.vb17120ayescdn.pw/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'HDVB', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 5. Alloha — русская озвучка ═══ */
  if (hasImdb) {
    opts.push({
      id: 'alloha',
      label: 'Alloha',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://api.alloha.tv/?imdb=${imdbId}&s=${season}&e=${episode}`
        : `https://api.alloha.tv/?imdb=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Alloha', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 6. Bazon — русская озвучка ═══ */
  if (hasImdb) {
    opts.push({
      id: 'bazon',
      label: 'Bazon',
      sublabel: '🇷🇺 Русская озвучка · HD',
      url: isSerial
        ? `https://bazon.cc/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://bazon.cc/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Bazon', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 7. Kinobox — агрегатор русских озвучек ═══ */
  if (hasImdb) {
    opts.push({
      id: 'kinobox',
      label: 'Kinobox',
      sublabel: '🇷🇺 Агрегатор озвучек',
      url: isSerial
        ? `https://kinobox.tv/player?imdb=${imdbId}&season=${season}&episode=${episode}`
        : `https://kinobox.tv/player?imdb=${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'Kinobox', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 8. VideoFrame — русская озвучка ═══ */
  if (hasImdb) {
    opts.push({
      id: 'videoframe',
      label: 'VideoFrame',
      sublabel: '🇷🇺 Русская озвучка',
      url: isSerial
        ? `https://videoframe.space/embed/${imdbId}?s=${season}&e=${episode}`
        : `https://videoframe.space/embed/${imdbId}`,
      type: 'iframe', lang: 'ru', provider: 'VideoFrame', flag: '🇷🇺', quality: 'HD',
    });
  }

  /* ═══ 9. VidSrc (мультиязычный, часто с русским) ═══ */
  opts.push({
    id: 'vidsrc-to',
    label: 'VidSrc',
    sublabel: 'HD · Есть русский',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe', lang: 'ru', provider: 'VidSrc.to', flag: '🎬', quality: 'HD',
  });

  return opts;
}
