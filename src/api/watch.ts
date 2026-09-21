/* ===== Источники просмотра и мульти-балансеры озвучек =====
 *
 * Поддержка всех основных русскоязычных видео-балансеров:
 *  1. Kinobox (мульти-балансер: агрегирует Kodik, Alloha, Collaps, HDRezka,
 *     позволяет переключать озвучки: LostFilm, Red Head Sound, Кубик в кубе, Дубляж и др.)
 *  2. Kodik (богатейшая база сериалов, аниме и фильмов)
 *  3. Collaps HD (скоростной CDN-сервер)
 *  4. Alloha TV (Full HD потоки с выбором переводов)
 *  5. Voidboost (HDRezka переводы)
 *  6. VidSrc RU (международный резерв с русской дорожкой)
 *  7. SuperEmbed (мульти-провайдер)
 */
import type { WatchOption } from '../types';

/** Проверка ограничений: полный обход включён для всех фильмов */
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
 * Генерация списка серверов для просмотра фильма или сериала
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
  const encTitle = encodeURIComponent(title);

  const opts: WatchOption[] = [];

  /* 1. Kinobox — лучший плеер со встроенным выбором LostFilm, Red Head Sound, Дубляж, Кубик и др. */
  opts.push({
    id: 'kinobox',
    label: 'Kinobox VIP',
    sublabel: '🎙️ LostFilm · RHS · Резка · Дубляж',
    url: `https://kinobox.tv/embed/?tmdb=${cleanTmdb}${cleanImdb ? `&imdb=${cleanImdb}` : ''}&title=${encTitle}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Kinobox',
    flag: '⚡',
    quality: '4K/1080p',
  });

  /* 2. Kodik — база всех переводов и серий */
  opts.push({
    id: 'kodik',
    label: 'Kodik Сервер',
    sublabel: '🍿 Все студии озвучки и сезоны',
    url: `https://kodik.info/find-player?${cleanImdb ? `imdb_id=${cleanImdb}&` : ''}title=${encTitle}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Kodik',
    flag: '🍿',
    quality: 'Full HD',
  });

  /* 3. Collaps HD — скоростной стриминг */
  opts.push({
    id: 'collaps',
    label: 'Collaps HD',
    sublabel: '🚀 Быстрая загрузка без задержек',
    url: isSerial
      ? `https://api.bhcesh.me/embed/tv/${cleanTmdb}`
      : `https://api.bhcesh.me/embed/movie/${cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Collaps',
    flag: '🚀',
    quality: '1080p',
  });

  /* 4. Alloha TV — мультиязычные дорожки и дубляж */
  opts.push({
    id: 'alloha',
    label: 'Alloha TV',
    sublabel: '💎 Лицензионный дубляж & озвучки',
    url: `https://api.alloha.tv/?tmdb=${cleanTmdb}${cleanImdb ? `&imdb=${cleanImdb}` : ''}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Alloha',
    flag: '💎',
    quality: '1080p',
  });

  /* 5. Voidboost — HDRezka Studio */
  opts.push({
    id: 'voidboost',
    label: 'Voidboost (Rezka)',
    sublabel: '🎬 Фирменные переводы HDRezka',
    url: `https://voidboost.net/embed/${cleanImdb || cleanTmdb}`,
    type: 'iframe',
    lang: 'ru',
    provider: 'Voidboost',
    flag: '🎬',
    quality: '1080p',
  });

  /* 6. VidSrc RU — международный резерв */
  opts.push({
    id: 'vidsrc-ru',
    label: 'VidSrc Резерв',
    sublabel: '🇷🇺 Русская дорожка',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${cleanTmdb}&season=${season}&episode=${episode}&ds_lang=ru`
      : `https://vidsrc.xyz/embed/movie?tmdb=${cleanTmdb}&ds_lang=ru`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidSrc',
    flag: '🇷🇺',
    quality: 'HD',
  });

  /* 7. SuperEmbed — глобальный резерв */
  opts.push({
    id: 'superembed',
    label: 'SuperEmbed',
    sublabel: '🌐 Мультиязычный сервер',
    url: isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`,
    type: 'iframe',
    lang: 'multi',
    provider: 'SuperEmbed',
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
  if (base.provider === 'VidSrc') {
    return isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${cleanTmdb}&season=${season}&episode=${episode}${base.lang === 'ru' ? '&ds_lang=ru' : ''}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${cleanTmdb}${base.lang === 'ru' ? '?ds_lang=ru' : ''}`;
  }
  if (base.provider === 'SuperEmbed') {
    return isSerial
      ? `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${cleanTmdb}&tmdb=1`;
  }
  return base.url;
}
