/* ===== Russian Hits & Streams (Яндекс Музыка / VK Музыка Стилизация) ===== */

export interface RussianTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number; // в секундах, 0 для Live Stream
  genre: string;
  streamUrl: string;
  isLiveStream?: boolean;
  yandexUrl?: string;
  vkUrl?: string;
  mood: 'drive' | 'chill' | 'russian' | 'romance' | 'ost' | 'night';
}

export const YANDEX_MOODS = [
  { id: 'drive', label: 'Драйв', icon: '⚡️', desc: 'Энергичные бэнгеры и фонк' },
  { id: 'chill', label: 'Спокойное', icon: '🧘', desc: 'Lo-Fi, лаунж и релакс' },
  { id: 'russian', label: 'Хиты России', icon: '🇷🇺', desc: 'Главный чарт и тренды РФ' },
  { id: 'romance', label: 'Романтика', icon: '💖', desc: 'Душевные медляки и лирика' },
  { id: 'ost', label: 'Саундтреки', icon: '🍿', desc: 'Киномузыка и легендарные OST' },
  { id: 'night', label: 'Ночной вайб', icon: '🌙', desc: 'Дип-хаус и ночной синтвейв' },
] as const;

export type MoodId = typeof YANDEX_MOODS[number]['id'];

export const getYandexMusicUrl = (artist: string, title: string): string =>
  `https://music.yandex.ru/search?text=${encodeURIComponent(`${artist} ${title}`)}`;

export const getVkMusicUrl = (artist: string, title: string): string =>
  `https://vk.com/audio?q=${encodeURIComponent(`${artist} ${title}`)}`;

/* 24/7 Полноценные HD Аудио-потоки без ограничений по 30 сек */
export const RUSSIAN_RADIO_STREAMS: RussianTrack[] = [
  {
    id: 'stream-record-rus',
    title: 'Record Russian Mix',
    artist: 'Радио Record · Русские хиты',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Хиты РФ',
    streamUrl: 'https://radiorecord.hostingradio.ru/rus96.aacp',
    isLiveStream: true,
    mood: 'russian',
  },
  {
    id: 'stream-dfm-dance',
    title: 'DFM Russian Dance',
    artist: 'DFM · Танцевальный чарт РФ',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Клубная',
    streamUrl: 'https://dfm.hostingradio.ru/dfm96.aacp',
    isLiveStream: true,
    mood: 'drive',
  },
  {
    id: 'stream-europa-plus',
    title: 'Европа Плюс Топ-40',
    artist: 'Европа Плюс · Главный чарт',
    artwork: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Топ-40',
    streamUrl: 'https://ep256.hostingradio.ru:8052/europaplus256.mp3',
    isLiveStream: true,
    mood: 'drive',
  },
  {
    id: 'stream-like-fm',
    title: 'Like FM — Горячие новинки',
    artist: 'Like FM · Премьеры треков',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Новинки',
    streamUrl: 'https://pub0302.101.ru:8443/stream/air/aac/64/100',
    isLiveStream: true,
    mood: 'russian',
  },
  {
    id: 'stream-relax-fm',
    title: 'Relax FM Спокойствие',
    artist: 'Relax FM · Лаунж и акустика',
    artwork: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Релакс',
    streamUrl: 'https://pub0302.101.ru:8443/stream/air/aac/64/200',
    isLiveStream: true,
    mood: 'chill',
  },
  {
    id: 'stream-record-chill',
    title: 'Cinema & Chillout OST',
    artist: 'Record Chill-Out · Киноатмосфера',
    artwork: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    duration: 0,
    genre: 'Киномузыка',
    streamUrl: 'https://radiorecord.hostingradio.ru/chil96.aacp',
    isLiveStream: true,
    mood: 'ost',
  },
];

/* Топ-чарт российских треков (как в Яндекс Музыке) */
export const RUSSIAN_CHART_TOP: RussianTrack[] = [
  {
    id: 'ru-anna-asti-tsaritsa',
    title: 'Царица',
    artist: 'ANNA ASTI',
    artwork: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
    duration: 215,
    genre: 'Поп',
    streamUrl: 'https://dfm.hostingradio.ru/dfm96.aacp',
    mood: 'russian',
  },
  {
    id: 'ru-macan-asphalt8',
    title: 'ASPHALT 8',
    artist: 'MACAN',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    duration: 184,
    genre: 'Хип-хоп',
    streamUrl: 'https://radiorecord.hostingradio.ru/rus96.aacp',
    mood: 'drive',
  },
  {
    id: 'ru-miyagi-got-love',
    title: 'I Got Love',
    artist: 'Miyagi & Эндшпиль feat. Рем Дигга',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    duration: 275,
    genre: 'Рэгги / Хип-хоп',
    streamUrl: 'https://radiorecord.hostingradio.ru/rus96.aacp',
    mood: 'chill',
  },
  {
    id: 'ru-basta-moya-igra',
    title: 'Моя игра (Live Symphony)',
    artist: 'Баста',
    artwork: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    duration: 332,
    genre: 'Рэп',
    streamUrl: 'https://pub0302.101.ru:8443/stream/air/aac/64/100',
    mood: 'russian',
  },
  {
    id: 'ru-jony-kometa',
    title: 'Комета',
    artist: 'JONY',
    artwork: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80',
    duration: 168,
    genre: 'Поп',
    streamUrl: 'https://ep256.hostingradio.ru:8052/europaplus256.mp3',
    mood: 'romance',
  },
  {
    id: 'ru-zivert-credo',
    title: 'Credo',
    artist: 'Zivert',
    artwork: 'https://images.unsplash.com/photo-1520523839898-5071270407a5?w=600&auto=format&fit=crop&q=80',
    duration: 204,
    genre: 'Диско / Поп',
    streamUrl: 'https://dfm.hostingradio.ru/dfm96.aacp',
    mood: 'drive',
  },
  {
    id: 'ru-3days-otpuskay',
    title: 'Отпускай',
    artist: 'Три дня дождя',
    artwork: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    duration: 178,
    genre: 'Рок',
    streamUrl: 'https://radiorecord.hostingradio.ru/rus96.aacp',
    mood: 'romance',
  },
  {
    id: 'ru-xcho-ty-i-ya',
    title: 'Ты и Я',
    artist: 'Xcho',
    artwork: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop&q=80',
    duration: 154,
    genre: 'Хип-хоп',
    streamUrl: 'https://pub0302.101.ru:8443/stream/air/aac/64/100',
    mood: 'night',
  },
  {
    id: 'ru-markul-strely',
    title: 'Стрелы',
    artist: 'Markul, Тося Чайкина',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    duration: 182,
    genre: 'Поп / Рэп',
    streamUrl: 'https://ep256.hostingradio.ru:8052/europaplus256.mp3',
    mood: 'drive',
  },
  {
    id: 'ru-tape-million',
    title: 'Million',
    artist: 'Big Baby Tape, Kizaru',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    duration: 146,
    genre: 'Трэп',
    streamUrl: 'https://radiorecord.hostingradio.ru/rus96.aacp',
    mood: 'drive',
  },
  {
    id: 'ru-zimmer-interstellar',
    title: 'Cornfield Chase (Interstellar OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    duration: 236,
    genre: 'Киномузыка',
    streamUrl: 'https://radiorecord.hostingradio.ru/chil96.aacp',
    mood: 'ost',
  },
  {
    id: 'ru-dune-paul',
    title: 'Paul’s Dream (Dune OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    duration: 320,
    genre: 'Киномузыка',
    streamUrl: 'https://radiorecord.hostingradio.ru/chil96.aacp',
    mood: 'ost',
  },
];
