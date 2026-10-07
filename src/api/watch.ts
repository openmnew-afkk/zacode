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
  kinopoiskId?: number | string;
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
  kinopoiskId,
  title: _title,
  isSerial,
  season = 1,
  episode = 1,
}: WatchBuildParams): WatchOption[] {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';
  const cleanKp = kinopoiskId ? String(kinopoiskId).replace(/\D/g, '') : '';

  const opts: WatchOption[] = [];

  /* 1. Плеер 1 — СЕРВЕР №1 (главный студийный балансер: LostFilm, Red Head Sound, Резка, Дубляж) */
  opts.push({
    id: 'collaps',
    label: 'Плеер 1',
    sublabel: '⚡ Ultra HD 4K · Дубляж и студии (Основной)',
    url: cleanKp
      ? `https://api.delivembed.cc/embed/kp/${cleanKp}?host=delivembed.cc`
      : isSerial
        ? cleanImdb
          ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
          : `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
        : cleanImdb
          ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
          : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Collaps',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 2. Плеер 2 — проверенный плеер со студийными переводами (HDRezka, LostFilm, Дубляж), без редиректов */
  opts.push({
    id: 'voidboost',
    label: 'Плеер 2',
    sublabel: '🍿 Full HD · Все переводы (Резерв #1)',
    url: cleanKp
      ? `https://voidboost.net/embed/${cleanKp}`
      : cleanImdb
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

  /* 3. Плеер 3 — альтернативный балансер со студийными дорожками */
  opts.push({
    id: 'alloha',
    label: 'Плеер 3',
    sublabel: '✨ Full HD · Альтернативный поток (Резерв #2)',
    url: cleanKp
      ? `https://stream.voidboost.cc/embed/${cleanKp}`
      : cleanImdb
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

  /* 4. Плеер 4 — скоростной CDN плеер с дубляжом */
  opts.push({
    id: 'lumex',
    label: 'Плеер 4',
    sublabel: '🎥 Скоростной видео-CDN · Full HD (Резерв #3)',
    url: cleanKp
      ? `https://v1727192800.lumex.news/embed/${cleanKp}`
      : cleanImdb
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

  /* 5. Плеер 5 — мульти-поток */
  if (cleanKp) {
    opts.push({
      id: 'kinobox',
      label: 'Плеер 5',
      sublabel: '🎬 Мульти-поток · HD (Резерв #4)',
      url: `https://kinobox.tv/embed?kinopoisk=${cleanKp}`,
      type: 'iframe',
      lang: 'ru',
      provider: 'Kinobox',
      flag: '🎬',
      quality: '1080p',
    });
  }

  /* 6. Международный сервер (100% стабилен с любым VPN США, оригинал + субтитры) */
  opts.push({
    id: 'global-us',
    label: cleanKp ? 'Плеер 6' : 'Плеер 5',
    sublabel: '🇺🇸 Скоростной поток (США / VPN) · 4K/1080p',
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
  episode: number,
  kinopoiskId?: number | string,
): string {
  const cleanTmdb = tmdbId.replace(/^(tv|movie)-/, '');
  const cleanImdb = imdbId.startsWith('tt') ? imdbId : '';
  const cleanKp = kinopoiskId ? String(kinopoiskId).replace(/\D/g, '') : '';

  if (base.provider === 'Kinobox' && cleanKp) {
    return `https://kinobox.tv/embed?kinopoisk=${cleanKp}`;
  }
  if (base.provider === 'Collaps') {
    return cleanKp
      ? `https://api.delivembed.cc/embed/kp/${cleanKp}?host=delivembed.cc`
      : cleanImdb
        ? `https://api.delivembed.cc/embed/imdb/${cleanImdb}?host=delivembed.cc`
        : isSerial
          ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
          : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`;
  }
  if (base.provider === 'Voidboost') {
    return cleanKp
      ? `https://voidboost.net/embed/${cleanKp}`
      : cleanImdb
        ? `https://voidboost.net/embed/${cleanImdb}`
        : isSerial
          ? `https://voidboost.net/embed/tv/${cleanTmdb}`
          : `https://voidboost.net/embed/movie/${cleanTmdb}`;
  }
  if (base.provider === 'Alloha') {
    return cleanKp
      ? `https://stream.voidboost.cc/embed/${cleanKp}`
      : cleanImdb
        ? `https://stream.voidboost.cc/embed/${cleanImdb}`
        : isSerial
          ? `https://api.delivembed.cc/embed/tv/${cleanTmdb}?host=delivembed.cc`
          : `https://api.delivembed.cc/embed/movie/${cleanTmdb}?host=delivembed.cc`;
  }
  if (base.provider === 'Lumex') {
    return cleanKp
      ? `https://v1727192800.lumex.news/embed/${cleanKp}`
      : cleanImdb
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
