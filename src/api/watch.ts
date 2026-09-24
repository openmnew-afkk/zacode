/* ===== Источники просмотра и мульти-балансеры видео =====
 *
 * Оптимизировано для воспроизведения под VPN и с русской озвучкой:
 *  1. Collaps HD (Delivembed) — Сервер №1 (LostFilm, RHS, Резка, Дубляж, NewStudio)
 *  2. Voidboost HD — официальный плеер HDRezka со студийными переводами РФ (без переходов на сторонние сайты)
 *  3. Alloha / Резка — альтернативный российский балансер со студийными дорожками
 *  4. Lumex HD — российский CDN плеер с дубляжом
 *  5. Global 4K (США) — ЕДИНСТВЕННЫЙ американский сервер (100% стабилен с любым VPN США, 4K/1080p, оригинал + субтитры)
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
 * Требование: Collaps — №1, ровно 1 американский (Global 4K), все остальные — российские балансеры.
 */
export function buildWatchOptions({
  tmdbId,
  imdbId = '',
  title: _title,
  isSerial,
  season = 1,
  episode = 1,
}: WatchBuildParams): WatchOption[] {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';

  const opts: WatchOption[] = [];

  /* 1. Collaps HD — СЕРВЕР №1 (главный студийный балансер РФ: LostFilm, Red Head Sound, Резка, Дубляж) */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🇷🇺 LostFilm · Red Head Sound · Резка · Дубляж (Сервер №1)',
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

  /* 2. Voidboost HD — проверенный плеер со студийными переводами РФ (HDRezka, LostFilm, Дубляж), без редиректов */
  opts.push({
    id: 'voidboost',
    label: 'Voidboost HD',
    sublabel: '🍿 HDRezka · LostFilm · NewStudio · Дубляж (РФ)',
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

  /* 3. Alloha / Резка — альтернативный российский балансер со студийными дорожками */
  opts.push({
    id: 'alloha',
    label: 'Alloha / Резка',
    sublabel: '✨ Студийные озвучки РФ · Альтернативный поток',
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

  /* 4. Lumex HD — российский CDN плеер с дубляжом */
  opts.push({
    id: 'lumex',
    label: 'Lumex HD',
    sublabel: '🎥 Российский видео-CDN · Дубляж Full HD',
    url: cleanImdb
      ? `https://v1727192800.lumex.news/embed/${cleanImdb}`
      : isSerial
        ? `https://v1727192800.lumex.news/embed/tv/${cleanTmdb}`
        : `https://v1727192800.lumex.news/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Lumex',
    flag: '🎥',
    quality: 'Full HD',
  });

  /* 5. Global 4K (США) — ЕДИНСТВЕННЫЙ американский сервер (100% стабилен с любым VPN США, оригинал + субтитры) */
  opts.push({
    id: 'global-us',
    label: 'Global 4K (США)',
    sublabel: '🇺🇸 100% с любым VPN (США) · Скоростной CDN · Оригинал + субтитры',
    url: isSerial
      ? `https://embed.su/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://embed.su/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'GlobalUS',
    flag: '🇺🇸',
    quality: '4K/1080p',
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
  if (base.provider === 'Lumex') {
    return cleanImdb
      ? `https://v1727192800.lumex.news/embed/${cleanImdb}`
      : isSerial
        ? `https://v1727192800.lumex.news/embed/tv/${cleanTmdb}`
        : `https://v1727192800.lumex.news/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'GlobalUS' || base.provider === 'VidLink') {
    return isSerial
      ? `https://embed.su/embed/tv/${cleanTmdb}/${season}/${episode}`
      : `https://embed.su/embed/movie/${cleanTmdb}`;
  }
  return base.url;
}
