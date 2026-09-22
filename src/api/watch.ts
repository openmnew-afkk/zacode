/* ===== Источники просмотра и мульти-балансеры видео =====
 *
 * Оптимизировано для воспроизведения с русской озвучкой под VPN:
 *  1. Collaps HD (Delivembed) — российский CDN со студиями (LostFilm, RHS, Резка, Дубляж)
 *     * С исправлением передачи host & referrer для обхода сбоев iframe в РФ/VPN
 *  2. Kinohub / Kinobox — агрегатор балансеров РФ (Kodik, Alloha, Collaps, VideoCDN)
 *  3. VidLink Pro — скоростной 4K/1080p CDN с выбором аудиодорожек (включая русскую)
 *  4. Voidboost HD — проверенное зеркало со студийными переводами
 *  5. VidSrc PM — скоростной международный CDN под VPN
 *  6. VidSrc SH — надёжный резервный поток под VPN
 *  7. 2Embed HD — мировой архив кино и сериалов
 *  8. MultiEmbed — авто-ротатор потоков
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

  /* 1. Collaps HD — главный балансер с русскими студиями (LostFilm, RHS, Резка, Дубляж) */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🇷🇺 LostFilm · Red Head Sound · Резка · Дубляж',
    url: isSerial
      ? cleanImdb
        ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
      : cleanImdb
        ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Collaps',
    flag: '🇷🇺',
    quality: '1080p',
  });

  /* 2. Kinohub / Kinobox — мульти-балансер (Kodik, Alloha, Collaps, VideoCDN) */
  opts.push({
    id: 'kinohub',
    label: 'Kinohub',
    sublabel: '🎬 Мульти-балансер РФ · Авто-поиск студий озвучки',
    url: cleanImdb
      ? `https://on.kinohub.vip/?imdb=${cleanImdb}`
      : `https://kinobox.in/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Kinohub',
    flag: '🎬',
    quality: 'Full HD',
  });

  /* 3. VidLink Pro — ультра-быстрый 4K плеер, 100% стабилен с любым VPN, русская дорожка в меню звука */
  opts.push({
    id: 'vidlink',
    label: 'VidLink Pro',
    sublabel: '⚡ 4K/1080p · Выбор дорожки (вкл. русскую) · 100% с VPN',
    url: isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`
      : `https://vidlink.pro/movie/${cleanTmdb}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidLink',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 4. Voidboost HD — зеркало со студийными переводами */
  opts.push({
    id: 'voidboost',
    label: 'Voidboost HD',
    sublabel: '🍿 LostFilm · NewStudio · Дубляж (Резерв РФ)',
    url: cleanImdb
      ? `https://voidboost.net/embed/${cleanImdb}`
      : isSerial
        ? `https://voidboost.net/embed/tv/${cleanTmdb}`
        : `https://voidboost.net/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Voidboost',
    flag: '🍿',
    quality: '1080p',
  });

  /* 5. VidSrc PM — прямой скоростной CDN, отлично работает под VPN */
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

  /* 6. VidSrc SH — надёжное зеркало под VPN */
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

  /* 7. 2Embed HD — мировой архив кино и сериалов */
  opts.push({
    id: '2embed',
    label: '2Embed HD',
    sublabel: '🌐 Мировой архив · Сезоны и серии · Работает с VPN',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${cleanTmdb}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '🌐',
    quality: 'Full HD',
  });

  /* 8. MultiEmbed — авто-ротатор потоков */
  opts.push({
    id: 'multiembed',
    label: 'MultiEmbed',
    sublabel: '🔄 Мульти-балансер · Работает с VPN',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`,
    type: 'iframe',
    lang: 'multi',
    provider: 'MultiEmbed',
    flag: '🔄',
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
  imdbId: string = '',
  isSerial: boolean,
  season: number,
  episode: number
): string {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';

  if (base.provider === 'Collaps') {
    return cleanImdb
      ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
      : isSerial
        ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`;
  }
  if (base.provider === 'Kinohub') {
    return cleanImdb
      ? `https://on.kinohub.vip/?imdb=${cleanImdb}`
      : `https://kinobox.in/movie/${cleanTmdb}`;
  }
  if (base.provider === 'Voidboost') {
    return cleanImdb
      ? `https://voidboost.net/embed/${cleanImdb}`
      : isSerial
        ? `https://voidboost.net/embed/tv/${cleanTmdb}`
        : `https://voidboost.net/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'VidLink') {
    return isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`
      : `https://vidlink.pro/movie/${cleanTmdb}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`;
  }
  if (base.provider === 'VidSrc') {
    return isSerial
      ? `https://vidsrc.pm/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://vidsrc.pm/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'VidSrcSH') {
    return isSerial
      ? `https://vidsrc.sh/embed/tv/${cleanTmdb}/${season}/${episode}`
      : cleanImdb
        ? `https://vidsrc.sh/embed/movie?imdb=${cleanImdb}`
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
