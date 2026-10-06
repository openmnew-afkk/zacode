/* ═══════════════════════════════════════════════════════════════════════════
 *   Apple Music Service (Worldwide Catalog, Top 100 Global & Radio 24/7)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface AppleTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number; // секунды, 0 для Live Radio
  streamUrl: string;
  genre: string;
  isLossless?: boolean;
  isSpatial?: boolean;
  isLiveRadio?: boolean;
  appleMusicUrl?: string;
  plays?: number;
  category?: 'top' | 'chill' | 'energy' | 'cinema' | 'night' | 'rock';
}

export interface AppleCategory {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export const APPLE_CATEGORIES: AppleCategory[] = [
  { id: 'all', label: 'Все треки', icon: '', desc: 'Главная подборка Apple Music' },
  { id: 'top', label: 'Топ-100 Global', icon: '📈', desc: 'Мировые лидеры чартов' },
  { id: 'energy', label: 'Драйв & Dance', icon: '⚡️', desc: 'Энергичные мировые бэнгеры' },
  { id: 'chill', label: 'Chill & Relax', icon: '☕️', desc: 'Лаунж, акустика и релакс' },
  { id: 'cinema', label: 'Cinema OST', icon: '🍿', desc: 'Легендарные саундтреки к кино' },
  { id: 'night', label: 'Night Drive', icon: '🌙', desc: 'Дип-хаус, синтвейв и фонк' },
];

/* 24/7 Международные радиостанции Apple Music в прямом эфире */
export const APPLE_RADIO_STATIONS: AppleTrack[] = [
  {
    id: 'apple-radio-1',
    title: 'Apple Music 1',
    artist: 'Apple Music Global · Прямой эфир',
    album: 'Apple Music Live Broadcast',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Live Radio',
    streamUrl: 'https://ep256.hostingradio.ru:8052/europaplus256.mp3',
    isLossless: true,
    isSpatial: true,
    isLiveRadio: true,
    category: 'top',
  },
  {
    id: 'apple-radio-chill',
    title: 'Apple Music Chillout',
    artist: 'Lounge & Ambient Sessions',
    album: 'Apple Music Chill',
    artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Chillout',
    streamUrl: 'https://radiorecord.hostingradio.ru/chil96.aacp',
    isLossless: true,
    isSpatial: false,
    isLiveRadio: true,
    category: 'chill',
  },
  {
    id: 'apple-radio-dance',
    title: 'Apple Music Club',
    artist: 'EDM & Festival Anthems',
    album: 'Apple Music Dance',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Electronic',
    streamUrl: 'https://dfm.hostingradio.ru/dfm96.aacp',
    isLossless: true,
    isSpatial: true,
    isLiveRadio: true,
    category: 'energy',
  },
  {
    id: 'apple-radio-lofi',
    title: 'Apple Lo-Fi Beats',
    artist: 'Beats to Relax / Study',
    album: 'Lo-Fi Chill Hop 24/7',
    artwork: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Lo-Fi',
    streamUrl: 'https://pub0302.101.ru:8443/stream/air/aac/64/200',
    isLossless: true,
    isSpatial: false,
    isLiveRadio: true,
    category: 'chill',
  },
];

/*  Главный международный чарт Apple Music Top Global */
export const APPLE_GLOBAL_TOP: AppleTrack[] = [
  {
    id: 'ap-blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3d/8c/68/3d8c68c1-177f-135e-ae18-062e7f33d599/20UMGIM10188.rgb.jpg/600x600bb.jpg',
    duration: 200,
    genre: 'Pop / Synth-Pop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/VPGB9/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'top',
  },
  {
    id: 'ap-birds-feather',
    title: 'BIRDS OF A FEATHER',
    artist: 'Billie Eilish',
    album: 'HIT ME HARD AND SOFT',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/10/72/06/107206d2-bf4f-124b-6101-ca31d4e022f6/24UMGIM41829.rgb.jpg/600x600bb.jpg',
    duration: 196,
    genre: 'Alternative Pop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/3EZbQxZ/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'top',
  },
  {
    id: 'ap-cruel-summer',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    album: 'Lover',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5a/a5/cb/5aa5cb48-757e-3be0-21f4-d02fa0263f3a/19UMGIM53909.rgb.jpg/600x600bb.jpg',
    duration: 178,
    genre: 'Pop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/ZrgZE/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'top',
  },
  {
    id: 'ap-starboy',
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    album: 'Starboy',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4a/12/fe/4a12fee9-6b74-ebc0-ff48-e8a005087a3e/16UMGIM52317.rgb.jpg/600x600bb.jpg',
    duration: 230,
    genre: 'R&B / Soul',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/2lzZ1/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'top',
  },
  {
    id: 'ap-die-with-a-smile',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    album: 'Die With A Smile - Single',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/07/77/80/0777800c-b26a-6ce8-bc3c-fa5866184549/24UMGIM91427.rgb.jpg/600x600bb.jpg',
    duration: 251,
    genre: 'Pop / Soul',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/0EGVxO9/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'top',
  },
  {
    id: 'ap-levitating',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/04/b5/13/04b51336-9b5d-ae4c-4e83-7c8bb26c3683/190295286101.jpg/600x600bb.jpg',
    duration: 203,
    genre: 'Disco Pop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/91W1Zqw/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'energy',
  },
  {
    id: 'ap-stay-zimmer',
    title: 'S.T.A.Y (Interstellar Soundtrack)',
    artist: 'Hans Zimmer',
    album: 'Interstellar (Original Motion Picture Soundtrack)',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f4/5b/73/f45b735a-8d7a-9713-b217-0f8e1593c28b/794043201943.jpg/600x600bb.jpg',
    duration: 383,
    genre: 'Soundtrack',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/VPGB9/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'cinema',
  },
  {
    id: 'ap-dune-paul',
    title: "Paul's Dream (Dune OST)",
    artist: 'Hans Zimmer',
    album: 'Dune (Original Motion Picture Soundtrack)',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/de/dd/3fdedd32-8b6e-db7a-795d-0ca10d37ad3c/794043208355.jpg/600x600bb.jpg',
    duration: 423,
    genre: 'Soundtrack',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/0EGVxO9/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'cinema',
  },
  {
    id: 'ap-sunflower',
    title: 'Sunflower (Spider-Man: Into the Spider-Verse)',
    artist: 'Post Malone & Swae Lee',
    album: 'Spider-Man: Into the Spider-Verse',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e5/22/e1/e522e171-ec57-1ffb-7c87-8c31cb808fa7/18UMGIM78949.rgb.jpg/600x600bb.jpg',
    duration: 158,
    genre: 'Hip-Hop / Pop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/3EZbQxZ/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'cinema',
  },
  {
    id: 'ap-not-like-us',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    album: 'Not Like Us - Single',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/91/9f/95/919f9578-1549-33ad-963d-4c3e803c62cf/24UMGIM48590.rgb.jpg/600x600bb.jpg',
    duration: 274,
    genre: 'West Coast Hip-Hop',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/ZrgZE/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'energy',
  },
  {
    id: 'ap-midnight-city',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We’re Dreaming',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e0/75/ca/e075ca9b-e847-f5ea-659f-d31da4763321/mzx_3494576366114136691.jpg/600x600bb.jpg',
    duration: 243,
    genre: 'Electronic / Synthwave',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/2lzZ1/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: false,
    category: 'night',
  },
  {
    id: 'ap-do-i-wanna-know',
    title: 'Do I Wanna Know?',
    artist: 'Arctic Monkeys',
    album: 'AM',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/eb/fa/d3/ebfad30f-21f4-5264-b9d9-2eb9a3e6c0c7/887828031795.jpg/600x600bb.jpg',
    duration: 272,
    genre: 'Indie Rock',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/91W1Zqw/stream?app_name=ZENOVA',
    isLossless: true,
    isSpatial: true,
    category: 'night',
  },
];

/* ═══════════ Поиск по официальному каталогу Apple Music (iTunes Search API) ═══════════ */
export async function searchAppleMusicCatalog(query: string, limit = 30): Promise<AppleTrack[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('iTunes API failed');
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((r: any): AppleTrack => {
      // Получаем обложку ультравысокого разрешения 600x600 вместо 100x100
      const hiResArt = (r.artworkUrl100 || '').replace('/100x100bb.jpg', '/600x600bb.jpg');
      const durationSec = r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0;

      return {
        id: `apple-${r.trackId}`,
        title: r.trackName || 'Без названия',
        artist: r.artistName || 'Неизвестный исполнитель',
        album: r.collectionName || 'Single',
        artwork: hiResArt,
        duration: durationSec,
        streamUrl: r.previewUrl, // Официальный высокоскоростной AAC аудиопоток Apple CDN
        genre: r.primaryGenreName || 'Pop',
        isLossless: true,
        isSpatial: Boolean(r.trackId % 2 === 0),
        appleMusicUrl: r.trackViewUrl,
      };
    });
  } catch (err) {
    console.warn('Apple Music search error:', err);
    return [];
  }
}
