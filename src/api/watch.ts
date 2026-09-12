/* ===== Источники просмотра и правила показа =====
 *
 * Правила приложения:
 *  — Зарубежные фильмы/сериалы → доступны к просмотру (рус. озвучка)
 *  — Российские/СНГ фильмы и сериалы, не разрешённые к онлайн-показу →
 *    НЕ воспроизводятся: показывается плашка и ссылки на легальные сервисы
 *    (Кинопоиск, Okko, Wink, Иви, JustWatch)
 */
import type { WatchOption } from '../types';

/** Страны, чей контент нельзя стримить в приложении */
const RESTRICTED_COUNTRIES = [
  'Россия', 'Russia', 'RU',
  'СССР', 'Soviet Union',
  'Беларусь', 'Belarus', 'BY',
  'Казахстан', 'Kazakhstan', 'KZ',
];

/** Проверка: контент из РФ/СНГ → показывать только ссылки */
export function isRestrictedContent(countries: string[] | undefined): boolean {
  if (!countries || countries.length === 0) return false;
  return countries.some((c) =>
    RESTRICTED_COUNTRIES.some((rc) => c.toLowerCase().includes(rc.toLowerCase()))
  );
}

/**
 * Источники для зарубежного контента с русской озвучкой.
 * VidSrc отдаёт рус. дорожку через ds_lang=ru, 2Embed — резерв.
 */
export function buildForeignWatchOptions(
  tmdbId: string,
  isSerial: boolean,
  season = 1,
  episode = 1
): WatchOption[] {
  const opts: WatchOption[] = [];

  opts.push({
    id: 'vidsrc-ru',
    label: 'VidSrc RU',
    sublabel: '🇷🇺 Русская озвучка',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=ru`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}&ds_lang=ru`,
    type: 'iframe',
    lang: 'ru',
    provider: 'VidSrc',
    flag: '🇷🇺',
    quality: 'HD',
  });

  opts.push({
    id: 'vidsrc',
    label: 'VidSrc',
    sublabel: '🌐 Мультиязычный',
    url: isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: 'VidSrc',
    flag: '🌐',
    quality: 'HD',
  });

  opts.push({
    id: '2embed',
    label: '2Embed',
    sublabel: '🌐 Резервный сервер',
    url: isSerial
      ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${tmdbId}`,
    type: 'iframe',
    lang: 'multi',
    provider: '2Embed',
    flag: '🌐',
    quality: 'HD',
  });

  return opts;
}

/** Ссылка на сериал с нужной серией внутри VidSrc */
export function switchSourceUrl(
  base: WatchOption,
  tmdbId: string,
  isSerial: boolean,
  season: number,
  episode: number
): string {
  if (base.provider === 'VidSrc') {
    return isSerial
      ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}${base.lang === 'ru' ? '&ds_lang=ru' : ''}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}${base.lang === 'ru' ? '?ds_lang=ru' : ''}`;
  }
  return base.url;
}
