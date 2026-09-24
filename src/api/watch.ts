/* ===== Источники просмотра и мульти-балансеры видео =====
 *
 * Оптимизировано для воспроизведения под VPN и с русской озвучкой:
 *  1. VidLink Pro — скоростной 4K/1080p CDN (ЕДИНСТВЕННЫЙ международный сервер, 100% с любым VPN, выбор русской дорожки)
 *  2. Kinohub / Kinobox — агрегатор балансеров РФ (Kodik, Alloha, Collaps, VideoCDN), работает без блокировок
 *  3. Collaps HD (Delivembed) — российский балансер со студиями (LostFilm, RHS, Резка, Дубляж)
 *  4. Voidboost HD — проверенное зеркало со студийными переводами РФ
 *  5. Alloha / Резка — альтернативный российский плеер со студийными дорожками
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
 * Требование: ровно 1 американский (VidLink Pro), все остальные — российские балансеры.
 */
export function buildWatchOptions({
  tmdbId,
  imdbId = '',
  title,
  isSerial,
  season = 1,
  episode = 1,
}: WatchBuildParams): WatchOption[] {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';

  const opts: WatchOption[] = [];

  /* 1. VidLink Pro — единственный международный/американский сервер (100% стабилен с любым VPN, 4K/1080p, русская дорожка в меню звука) */
  opts.push({
    id: 'vidlink',
    label: 'VidLink Pro',
    sublabel: '⚡ 4K/1080p · Выбор русской дорожки (🇷🇺 в ⚙️/🎧) · 100% с любым VPN',
    url: isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`
      : `https://vidlink.pro/movie/${cleanTmdb}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidLink',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 2. Kinohub / Kinobox — главный мульти-балансер РФ (Kodik, Alloha, Collaps, VideoCDN) без регионального блока под VPN */
  const kinohubUrl = cleanImdb
    ? `https://on.kinohub.vip/?imdb=${cleanImdb}&title=${encodeURIComponent(title || '')}`
    : `https://on.kinohub.vip/?title=${encodeURIComponent(title || '')}`;
  opts.push({
    id: 'kinohub',
    label: 'Kinohub',
    sublabel: '🎬 Мульти-балансер РФ (Kodik, Alloha, Collaps) · Без блокировки по региону',
    url: kinohubUrl,
    type: 'iframe',
    lang: 'ru',
    provider: 'Kinohub',
    flag: '🎬',
    quality: 'Full HD',
  });

  /* 3. Collaps HD — главный студийный балансер РФ (LostFilm, Red Head Sound, Резка, Дубляж) */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🇷🇺 LostFilm · Red Head Sound · Резка · Дубляж (Серверы РФ/Европы)',
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

  /* 4. Voidboost HD — проверенное зеркало со студийными переводами РФ */
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

  /* 5. Alloha / Резка — альтернативный российский балансер */
  opts.push({
    id: 'alloha',
    label: 'Alloha / Резка',
    sublabel: '✨ Студийные озвучки · Автопоиск озвучек РФ',
    url: cleanImdb
      ? `https://stream.voidboost.cc/embed/${cleanImdb}`
      : isSerial
        ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Alloha',
    flag: '✨',
    quality: 'Full HD',
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

  if (base.provider === 'VidLink') {
    return isSerial
      ? `https://vidlink.pro/tv/${cleanTmdb}/${season}/${episode}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`
      : `https://vidlink.pro/movie/${cleanTmdb}?primaryColor=7c3aed&secondaryColor=a855f7&iconColor=ffffff`;
  }
  if (base.provider === 'Kinohub') {
    return cleanImdb
      ? `https://on.kinohub.vip/?imdb=${cleanImdb}`
      : `https://kinobox.in/movie/${cleanTmdb}`;
  }
  if (base.provider === 'Collaps') {
    return cleanImdb
      ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
      : isSerial
        ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`;
  }
  if (base.provider === 'Voidboost') {
    return cleanImdb
      ? `https://voidboost.net/embed/${cleanImdb}`
      : isSerial
        ? `https://voidboost.net/embed/tv/${cleanTmdb}`
        : `https://voidboost.net/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'Alloha') {
    return cleanImdb
      ? `https://stream.voidboost.cc/embed/${cleanImdb}`
      : isSerial
        ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
        : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`;
  }
  return base.url;
}
