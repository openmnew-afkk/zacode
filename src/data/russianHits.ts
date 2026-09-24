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

/* Топ-чарт российских и мировых треков (Полноценные студийные треки полной длины, без 30 сек ограничений) */
export const RUSSIAN_CHART_TOP: RussianTrack[] = [
  {
    id: 'ru-anna-asti-tsaritsa',
    title: 'Царица',
    artist: 'ANNA ASTI',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/36/b3/57/36b35733-08b0-e4e1-8509-746d0f531f29/cover.jpg/600x600bb.jpg',
    duration: 241,
    genre: 'Поп',
    streamUrl: 'https://archive.org/download/y-2mate.com-anna-asti-2023/y2mate.com%20-%20ANNA%20ASTI%20%20%D0%A6%D0%90%D0%A0%D0%98%D0%A6%D0%90%20%20%D0%9F%D1%80%D0%B5%D0%BC%D1%8C%D0%B5%D1%80%D0%B0%20%D0%BA%D0%BB%D0%B8%D0%BF%D0%B0%202023%20.mp3',
    mood: 'russian',
  },
  {
    id: 'ru-macan-neuzheli',
    title: 'Неужели это всё любовь',
    artist: 'MACAN, Navai',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/74/49/a0/7449a04f-17e9-38b4-9c76-ec3d8fa6b67e/cover.jpg/600x600bb.jpg',
    duration: 156,
    genre: 'Хип-хоп',
    streamUrl: 'https://archive.org/download/macan-navai-neuzheli-jeto-vse-lyubov-79311746/Macan_Navai_-_Neuzheli_jeto_vse_lyubov_79311746.mp3',
    mood: 'drive',
  },
  {
    id: 'ru-miyagi-got-love',
    title: 'I Got Love',
    artist: 'Miyagi & Эндшпиль feat. Рем Дигга',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    duration: 274,
    genre: 'Рэгги / Хип-хоп',
    streamUrl: 'https://archive.org/download/MiyagiFt.IGotLoveOfficialVideo/Miyagi%2C%20%D0%AD%D0%BD%D0%B4%D1%88%D0%BF%D0%B8%D0%BB%D1%8C%20Ft.%20%D0%A0%D0%B5%D0%BC%20%D0%94%D0%B8%D0%B3%D0%B3%D0%B0%20-%20I%20Got%20Love%20%28Official%20Video%29.mp3',
    mood: 'chill',
  },
  {
    id: 'ru-basta-medlyachok',
    title: 'Выпускной (Медлячок)',
    artist: 'Баста',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/0b/c4/eb0bc40b-df48-3dde-7757-49643b02ce29/cover.jpg/600x600bb.jpg',
    duration: 335,
    genre: 'Рэп / Лирика',
    streamUrl: 'https://archive.org/download/basta5-2/03.%20%D0%92%D1%8B%D0%BF%D1%83%D1%81%D0%BA%D0%BD%D0%BE%D0%B9%20%28%D0%9C%D0%B5%D0%B4%D0%BB%D1%8F%D1%87%D0%BE%D0%BA%29.mp3',
    mood: 'romance',
  },
  {
    id: 'ru-basta-chisty-kayf',
    title: 'Чистый кайф',
    artist: 'Баста',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/0b/c4/eb0bc40b-df48-3dde-7757-49643b02ce29/cover.jpg/600x600bb.jpg',
    duration: 356,
    genre: 'Рэп',
    streamUrl: 'https://archive.org/download/basta4/14.%20%D0%A7%D0%9A.mp3',
    mood: 'russian',
  },
  {
    id: 'ru-tsoy-gruppa-krovi',
    title: 'Группа крови',
    artist: 'КИНО (Виктор Цой)',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/45/be/d545be21-0aee-f0aa-b939-2eaeb6cb3fe7/cover.jpg/600x600bb.jpg',
    duration: 286,
    genre: 'Рок',
    streamUrl: 'https://archive.org/download/04_20260525/01%20-%20%D0%93%D1%80%D1%83%D0%BF%D0%BF%D0%B0%20%D0%BA%D1%80%D0%BE%D0%B2%D0%B8.mp3',
    mood: 'russian',
  },
  {
    id: 'ru-tsoy-peremen',
    title: 'Хочу перемен',
    artist: 'КИНО (Виктор Цой)',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d5/45/be/d545be21-0aee-f0aa-b939-2eaeb6cb3fe7/cover.jpg/600x600bb.jpg',
    duration: 282,
    genre: 'Рок',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/JNZV2/stream?app_name=ZENOVA',
    mood: 'drive',
  },
  {
    id: 'ru-miyagi-nutro',
    title: 'Нутро',
    artist: 'MiyaGi & Эндшпиль',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    duration: 229,
    genre: 'Хип-хоп',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/50Jl7/stream?app_name=ZENOVA',
    mood: 'chill',
  },
  {
    id: 'ru-miyagi-lyubi-menya',
    title: 'Люби меня',
    artist: 'MiyaGi & Эндшпиль feat. Симптом',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    duration: 319,
    genre: 'Хип-хоп',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/JB0Jz/stream?app_name=ZENOVA',
    mood: 'romance',
  },
  {
    id: 'ru-zivert-bestseller',
    title: 'Bestseller (Retrowave Remix)',
    artist: 'Max Barskih & Zivert',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/21/ea/ad21ea60-ed1f-5c71-fa1a-2fb5b3916c06/cover.jpg/600x600bb.jpg',
    duration: 224,
    genre: 'Поп',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/ZrgZE/stream?app_name=ZENOVA',
    mood: 'drive',
  },
  {
    id: 'ru-markul-fata-morgana',
    title: 'Fata Morgana',
    artist: 'Markul & Oxxxymiron',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/17/9d/3b/179d3b32-8163-77b8-3eec-274d9ed3ac2e/5063018335668.jpg/600x600bb.jpg',
    duration: 183,
    genre: 'Рэп',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/2lzZ1/stream?app_name=ZENOVA',
    mood: 'night',
  },
  {
    id: 'ru-kizaru-jefe',
    title: 'Jefe',
    artist: 'Kizaru',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    duration: 137,
    genre: 'Трэп',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/91W1Zqw/stream?app_name=ZENOVA',
    mood: 'drive',
  },
  {
    id: 'ru-zimmer-stay',
    title: 'S.T.A.Y (Interstellar OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f4/5b/73/f45b735a-8d7a-9713-b217-0f8e1593c28b/794043201943.jpg/600x600bb.jpg',
    duration: 307,
    genre: 'Киномузыка',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/VPGB9/stream?app_name=ZENOVA',
    mood: 'ost',
  },
  {
    id: 'ru-zimmer-dune',
    title: 'Paul’s Theme (Dune OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/de/dd/3fdedd32-8b6e-db7a-795d-0ca10d37ad3c/794043208355.jpg/600x600bb.jpg',
    duration: 266,
    genre: 'Киномузыка',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/0EGVxO9/stream?app_name=ZENOVA',
    mood: 'ost',
  },
  {
    id: 'ru-gordo-live-it-up',
    title: 'Live It Up',
    artist: 'GORDO DJ',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    duration: 244,
    genre: 'Клубная',
    streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/3EZbQxZ/stream?app_name=ZENOVA',
    mood: 'drive',
  },
];
