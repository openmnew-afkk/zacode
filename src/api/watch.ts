/* ===== Источники просмотра и мульти-балансеры видео =====
 *
 * Оптимизировано для просмотра в РФ под VPN:
 *  1. VidLink Pro — скоростной 4K/1080p плеер с русскими аудиодорожками (работает на ура с VPN)
 *  2. VidSrc PM — прямой быстрый международный CDN (работает на ура с VPN)
 *  3. VidSrc SH — надёжный резервный поток (работает на ура с VPN)
 *  4. 2Embed HD — мировой архив фильмов и сериалов (работает на ура с VPN)
 *  5. MultiEmbed — адаптивный авто-ротатор потоков (работает на ура с VPN)
 *  6. Collaps HD (Delivembed) — российский CDN со студиями (LostFilm, RHS, Резка) [для тех, кто без VPN]
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
 * Генерация списка проверенных серверов для просмотра фильма или сериала.
 * Первыми идут скоростные серверы, которые работают под VPN.
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

  /* 1. VidLink Pro — топовый плеер с русскими дорожками, стабильно работает под VPN */
  opts.push({
    id: 'vidlink',
    label: 'VidLink Pro',
    sublabel: '⚡ 4K/1080p · Русская озвучка · Работает с VPN',
    url: isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidlink.pro/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidLink',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 2. VidSrc PM — прямой скоростной CDN, отлично работает под VPN */
  opts.push({
    id: 'vidsrc-pm',
    label: 'VidSrc PM',
    sublabel: '💎 Скоростной CDN · Full HD · Работает с VPN',
    url: isSerial
      ? `https://vidsrc.pm/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidsrc.pm/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc',
    flag: '💎',
    quality: '1080p',
  });

  /* 3. VidSrc SH — надёжное зеркало под VPN */
  opts.push({
    id: 'vidsrc-sh',
    label: 'VidSrc SH',
    sublabel: '🚀 Альтернативный поток · Работает с VPN',
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

  /* 4. 2Embed HD — мировой архив кино и сериалов */
  opts.push({
    id: '2embed',
    label: '2Embed HD',
    sublabel: '🍿 Мировой архив · Сезоны и серии · Работает с VPN',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${cleanTmdb}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '🍿',
    quality: 'Full HD',
  });

  /* 5. MultiEmbed — авто-ротатор потоков */
  opts.push({
    id: 'multiembed',
    label: 'MultiEmbed',
    sublabel: '🌐 Мульти-балансер · Работает с VPN',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`,
    type: 'iframe',
    lang: 'multi',
    provider: 'MultiEmbed',
    flag: '🌐',
    quality: 'HD',
  });

  /* 6. Collaps HD — российский CDN со студиями озвучки (только без VPN) */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🇷🇺 LostFilm · RHS · Резка (Только БЕЗ VPN)',
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
  if (base.provider === 'Collaps') {
    return isSerial
      ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}`
      : `https://api.delivembed.cc/embed/movie/${cleanTmdb}`;
  }
  return base.url;
}
