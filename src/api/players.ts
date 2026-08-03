/* ===== Источники воспроизведения =====
 * Пользователю показываем русские названия.
 * Технические провайдеры скрыты в id/provider.
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

const PREFERRED_KEY = 'kz_preferred_player';

export function getPreferredPlayerId(): string | null {
  try {
    return localStorage.getItem(PREFERRED_KEY);
  } catch {
    return null;
  }
}

export function setPreferredPlayerId(id: string) {
  try {
    localStorage.setItem(PREFERRED_KEY, id);
  } catch {
    /* ignore */
  }
}

export async function getWatchOptions(req: PlayerRequest): Promise<WatchOption[]> {
  const { tmdbId, isSerial, season = 1, episode = 1 } = req;
  const opts: WatchOption[] = [];

  /* Русская озвучка — приоритет */
  opts.push({
    id: 'ru-main',
    label: 'Русская озвучка',
    sublabel: 'Основной · Full HD',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'ru-main',
    flag: '🇷🇺',
    quality: 'Full HD',
  });

  opts.push({
    id: 'hd-1',
    label: 'Плеер HD',
    sublabel: 'Быстрый · Стабильный',
    url: isSerial
      ? `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'hd-1',
    flag: '▶',
    quality: 'HD',
  });

  opts.push({
    id: 'mirror-1',
    label: 'Зеркало',
    sublabel: 'Если основной не грузится',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'mirror-1',
    flag: '◇',
    quality: 'HD',
  });

  opts.push({
    id: 'hd-2',
    label: 'Плеер 2',
    sublabel: 'Дополнительный источник',
    url: isSerial
      ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://embed.su/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'hd-2',
    flag: '◆',
    quality: 'HD',
  });

  opts.push({
    id: 'auto',
    label: 'Авто',
    sublabel: 'Подбор лучшего потока',
    url: isSerial
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'auto',
    flag: '⚡',
    quality: 'HD',
  });

  opts.push({
    id: 'reserve-1',
    label: 'Резерв',
    sublabel: 'Запасной канал',
    url: isSerial
      ? `https://player.vidsrc.nl/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://player.vidsrc.nl/embed/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'reserve-1',
    flag: '▣',
    quality: 'HD',
  });

  opts.push({
    id: 'reserve-2',
    label: 'Резерв 2',
    sublabel: 'Последний вариант',
    url: isSerial
      ? `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`
      : `https://moviesapi.club/movie/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'reserve-2',
    flag: '▢',
    quality: 'HD',
  });

  /* Любимый плеер пользователя — наверх */
  const preferred = getPreferredPlayerId();
  if (preferred) {
    const idx = opts.findIndex((o) => o.id === preferred);
    if (idx > 0) {
      const [item] = opts.splice(idx, 1);
      opts.unshift(item);
    }
  }

  return opts;
}
