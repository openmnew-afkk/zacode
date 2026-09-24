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

/* Топ-чарт российских треков (Реальные студийные треки без радиорекламы) */
export const RUSSIAN_CHART_TOP: RussianTrack[] = [
  {
    id: 'ru-anna-asti-tsaritsa',
    title: 'Царица',
    artist: 'ANNA ASTI',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/36/b3/57/36b35733-08b0-e4e1-8509-746d0f531f29/cover.jpg/600x600bb.jpg',
    duration: 215,
    genre: 'Поп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a3/a6/71/a3a67162-690c-87f4-7257-3f7aa9d683ed/mzaf_11703994124901380594.plus.aac.p.m4a',
    mood: 'russian',
  },
  {
    id: 'ru-macan-asphalt8',
    title: 'ASPHALT 8',
    artist: 'MACAN',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    duration: 184,
    genre: 'Хип-хоп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fe/a8/23/fea8230a-8cda-7297-9841-79d9bf71a3ba/mzaf_18229323036952052363.plus.aac.p.m4a',
    mood: 'drive',
  },
  {
    id: 'ru-miyagi-got-love',
    title: 'I Got Love',
    artist: 'Miyagi & Эндшпиль feat. Рем Дигга',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    duration: 275,
    genre: 'Рэгги / Хип-хоп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/aa/96/1c/aa961c03-67aa-6594-0194-8342f82a8744/mzaf_10022336969339332223.plus.aac.p.m4a',
    mood: 'chill',
  },
  {
    id: 'ru-basta-moya-igra',
    title: 'Моя игра',
    artist: 'Баста',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/0b/c4/eb0bc40b-df48-3dde-7757-49643b02ce29/cover.jpg/600x600bb.jpg',
    duration: 332,
    genre: 'Рэп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a0/f7/04/a0f704db-d334-2242-44db-0458ec94df3a/mzaf_8373930132485747749.plus.aac.p.m4a',
    mood: 'russian',
  },
  {
    id: 'ru-jony-kometa',
    title: 'Комета',
    artist: 'JONY',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e1/98/41/e1984195-7531-3d3d-9faa-801c2b90e426/0.jpg/600x600bb.jpg',
    duration: 168,
    genre: 'Поп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/f7/41/26/f7412687-e8ad-29a5-06c4-3df77515dc14/mzaf_17100045987774497785.plus.aac.p.m4a',
    mood: 'romance',
  },
  {
    id: 'ru-zivert-credo',
    title: 'Credo',
    artist: 'Zivert',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/ad/21/ea/ad21ea60-ed1f-5c71-fa1a-2fb5b3916c06/cover.jpg/600x600bb.jpg',
    duration: 204,
    genre: 'Диско / Поп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/51/5d/78/515d785c-7790-5633-73f2-7c6935350a15/mzaf_11426769329991540269.plus.aac.p.m4a',
    mood: 'drive',
  },
  {
    id: 'ru-3days-otpuskay',
    title: 'Отпускай',
    artist: 'Три дня дождя',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/49/1b/6c/491b6c77-b982-fae0-4711-b91d0fa0f8c1/cover.jpg/600x600bb.jpg',
    duration: 178,
    genre: 'Рок',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/21/b4/15/21b415ee-fa2d-bfb5-ec8c-6e95cee58deb/mzaf_10532833504085759963.plus.aac.p.m4a',
    mood: 'romance',
  },
  {
    id: 'ru-xcho-ty-i-ya',
    title: 'Ты и Я',
    artist: 'Xcho',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/c7/b0/4b/c7b04b77-a2b6-f0bf-df80-8cdc08abd09d/cover.jpg/600x600bb.jpg',
    duration: 154,
    genre: 'Хип-хоп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ad/01/f3/ad01f3d6-fbe1-4034-54a4-72df58ee0409/mzaf_3712383284108264722.plus.aac.p.m4a',
    mood: 'night',
  },
  {
    id: 'ru-markul-strely',
    title: 'Стрелы',
    artist: 'Markul, Тося Чайкина',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/17/9d/3b/179d3b32-8163-77b8-3eec-274d9ed3ac2e/5063018335668.jpg/600x600bb.jpg',
    duration: 182,
    genre: 'Поп / Рэп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/79/0f/5a/790f5af5-012a-c48d-03e5-9f43539346cc/mzaf_3308115083261160906.plus.aac.p.m4a',
    mood: 'drive',
  },
  {
    id: 'ru-tape-million',
    title: 'Million',
    artist: 'Big Baby Tape, Kizaru',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    duration: 146,
    genre: 'Трэп',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/db/91/db/db91db9e-bf24-3d13-3597-16dcb8d9936b/mzaf_7245870547111628222.plus.aac.p.m4a',
    mood: 'drive',
  },
  {
    id: 'ru-zimmer-interstellar',
    title: 'Cornfield Chase (Interstellar OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f4/5b/73/f45b735a-8d7a-9713-b217-0f8e1593c28b/794043201943.jpg/600x600bb.jpg',
    duration: 236,
    genre: 'Киномузыка',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3a/ee/23/3aee2300-f6f7-a006-e20f-28092e814cbe/mzaf_1624587954644600228.plus.aac.p.m4a',
    mood: 'ost',
  },
  {
    id: 'ru-dune-paul',
    title: 'Paul’s Dream (Dune OST)',
    artist: 'Hans Zimmer',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/de/dd/3fdedd32-8b6e-db7a-795d-0ca10d37ad3c/794043208355.jpg/600x600bb.jpg',
    duration: 320,
    genre: 'Киномузыка',
    streamUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/9f/5e/3d/9f5e3da8-e698-31b3-c4e4-5964df457951/mzaf_11074540054311181787.plus.aac.p.m4a',
    mood: 'ost',
  },
];
