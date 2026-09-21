/* ===== Источники просмотра и мульти-балансеры видео =====
 *
 * Проверенные серверы для прямого просмотра внутри приложения без сторонних ссылок:
 *  1. Collaps HD (Delivembed) — прямой российский CDN (LostFilm, RHS, Резка, Дубляж) [РФ / Без VPN]
 *  2. VidLink Pro — скоростной плеер 4K/1080p с русскими аудиодорожками [РФ / Без VPN]
 *  3. VidSrc PM — стабильное прямое CDN-зеркало без блокировок
 *  4. VidSrc SH — надёжный резервный поток
 *  5. 2Embed HD — мировой архив фильмов и сериалов
 *  6. MultiEmbed — адаптивный авто-ротатор потоков
 */
import type { WatchOption } from '../types';

/** Проверка ограничений: просмотр разрешён для всех фильмов */
export function isRestrictedContent(_countries: string[] | undefined): boolean {
  return false;
}

export interface WatchBuildParams {
  tmdbId: string;
  imdbId?: string;
  title: string;
  isSerial: boolean;
  season?: number;
  episode?: number;
}

/**
 * Генерация списка проверенных серверов для просмотра фильма или сериала
 */
export function buildWatchOptions({
  tmdbId,
  imdbId = '',
  isSerial,
  season = 1,
  episode = 1,
}: WatchBuildParams): WatchOption[] {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';

  const opts: WatchOption[] = [];

  /* 1. Collaps HD — скоростной российский CDN со студиями озвучки */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🇷🇺 LostFilm · RHS · Резка · Дубляж (Без VPN)',
    url: isSerial
      ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}`
      : cleanImdb
        ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Collaps',
    flag: '🇷🇺',
    quality: '1080p',
  });

  /* 2. VidLink Pro — скоростной плеер с русскими аудиодорожками без блокировок */
  opts.push({
    id: 'vidlink',
    label: 'VidLink Pro',
    sublabel: '⚡ Русские дорожки · 4K/1080p (Без VPN)',
    url: isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidlink.pro/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidLink',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 3. VidSrc PM — прямой CDN без блокировок */
  opts.push({
    id: 'vidsrc-pm',
    label: 'VidSrc PM',
    sublabel: '💎 Быстрый CDN-сервер (Прямой поток)',
    url: isSerial
      ? `https://vidsrc.pm/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidsrc.pm/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc',
    flag: '💎',
    quality: '1080p',
  });

  /* 4. VidSrc SH — надёжное зеркало */
  opts.push({
    id: 'vidsrc-sh',
    label: 'VidSrc SH',
    sublabel: '🚀 Альтернативный скоростной поток',
    url: isSerial
      ? `https://vidsrc.sh/embed/tv/${cleanTmdb}/${season}/${episode}`
      : cleanImdb
        ? `https://vidsrc.sh/embed/movie?imdb=${cleanImdb}`
        : `https://vidsrc.sh/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrcSH',
    flag: '🚀',
    quality: '1080p',
  });

  /* 5. 2Embed HD — мировой архив */
  opts.push({
    id: '2embed',
    label: '2Embed HD',
    sublabel: '🍿 Мировая база кино и сериалов',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${cleanTmdb}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '🍿',
    quality: 'Full HD',
  });

  /* 6. MultiEmbed — адаптивный авто-ротатор */
  opts.push({
    id: 'multiembed',
    label: 'MultiEmbed',
    sublabel: '🌐 Мульти-балансер потоков',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`,
    type: 'iframe',
    lang: 'multi',
    provider: 'MultiEmbed',
    flag: '🌐',
    quality: 'HD',
  });

  return opts;
}

/** Совместимость со старым API вызова */
export function buildForeignWatchOptions(
  tmdbId: string,
  isSerial: boolean,
  season = 1,
  episode = 1
): WatchOption[] {
  return buildWatchOptions({
    tmdbId,
    title: '',
    isSerial,
    season,
    episode,
  });
}

/** Ссылка на сериал с нужной серией */
export function switchSourceUrl(
  base: WatchOption,
  tmdbId: string,
  isSerial: boolean,
  season: number,
  episode: number
): string {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  if (base.provider === 'Collaps') {
    return isSerial
      ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}`
      : `https://api.delivembed.cc/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'VidLink') {
    return isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidlink.pro/movie/${cleanTmdb}`;
  }
  if (base.provider === 'VidSrc') {
    return isSerial
      ? `https://vidsrc.pm/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidsrc.pm/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'VidSrcSH') {
    return isSerial
      ? `https://vidsrc.sh/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidsrc.sh/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === '2Embed') {
    return isSerial
      ? `https://www.2embed.cc/embedtv/${cleanTmdb}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${cleanTmdb}`;
  }
  if (base.provider === 'MultiEmbed') {
    return isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`;
  }
  return base.url;
}
