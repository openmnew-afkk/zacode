import type { WatchOption } from '../types';

export async function getWatchOptions(
  imdbId: string,
  season?: number,
  episode?: number
): Promise<WatchOption[]> {
  const isSerial = season !== undefined && episode !== undefined;
  const options: WatchOption[] = [];
  
  // VidSrc - основной плеер
  if (isSerial) {
    options.push({
      id: 'vidsrc-tv',
      label: 'VidSrc TV',
      sublabel: 'Английский + субтитры',
      url: `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc',
      flag: '🌐',
      quality: 'HD',
    });
    
    options.push({
      id: 'vidsrc-xyz-tv',
      label: 'VidSrc XYZ',
      sublabel: 'Многоязычный',
      url: `https://vidsrc.xyz/embed/tv/${imdbId}?s=${season}&e=${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc XYZ',
      flag: '🌐',
      quality: 'HD',
    });
  } else {
    options.push({
      id: 'vidsrc-movie',
      label: 'VidSrc',
      sublabel: 'Английский + субтитры',
      url: `https://vidsrc.cc/v2/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc',
      flag: '🌐',
      quality: 'HD',
    });
    
    options.push({
      id: 'vidsrc-xyz-movie',
      label: 'VidSrc XYZ',
      sublabel: 'Многоязычный',
      url: `https://vidsrc.xyz/embed/movie/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'VidSrc XYZ',
      flag: '🌐',
      quality: 'HD',
    });
  }
  
  // 2embed - резервный плеер
  if (isSerial) {
    options.push({
      id: '2embed-tv',
      label: '2Embed',
      sublabel: 'Резервный источник',
      url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
      type: 'iframe',
      lang: 'en',
      provider: '2Embed',
      flag: '🔄',
      quality: 'SD',
    });
  } else {
    options.push({
      id: '2embed-movie',
      label: '2Embed',
      sublabel: 'Резервный источник',
      url: `https://www.2embed.cc/embed/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: '2Embed',
      flag: '🔄',
      quality: 'SD',
    });
  }
  
  // embed.su - еще один вариант
  if (!isSerial) {
    options.push({
      id: 'embed-su',
      label: 'Embed.su',
      sublabel: 'Альтернативный плеер',
      url: `https://embed.su/embed/${imdbId}`,
      type: 'iframe',
      lang: 'en',
      provider: 'Embed.su',
      flag: '🎬',
      quality: 'HD',
    });
  }
  
  return options;
}
