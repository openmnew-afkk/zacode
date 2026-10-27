/* ═══════════════════════════════════════════════════════════════════════════
 *  ✦ ZENOVA SOUND — персональный музыкальный поток и открытый каталог
 *  Только ПОЛНЫЕ легальные треки: открытый каталог Audius + HD Live Radio 24/7.
 *  Полные треки ищутся и подгружаются в services/audius.ts
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number; // в секундах, 0 для прямого радиоэфира
  streamUrl: string;
  fallbackUrl?: string;
  genre: string;
  mood: "energy" | "relax" | "night" | "cinema" | "chart" | "rock";
  isLiveRadio?: boolean;
  plays?: number;
  source?: "yandex" | "radio" | "audius" | "archive" | "chill" | "vk" | "soundcloud";
}

export interface WaveMood {
  id: "all" | "energy" | "relax" | "night" | "cinema" | "chart" | "rock";
  label: string;
  icon: string;
  gradient: string;
  description: string;
  /** Жанр Audius для плейлиста настроения */
  genre?: string;
  /** Поисковый запрос вместо жанра (для настроений без прямого жанра) */
  query?: string;
}

export const WAVE_MOODS: WaveMood[] = [
  {
    id: "all",
    label: "ZENOVA Пульс",
    icon: "✦",
    gradient: "radial-gradient(circle at 30% 30%, #ff3366 0%, #a855f7 50%, #3b82f6 100%)",
    description: "Персональный поток музыки, настроенный под ваше настроение",
  },
  {
    id: "chart",
    label: "Топ Хиты",
    icon: "🔥",
    gradient: "radial-gradient(circle at 30% 30%, #ff334b 0%, #ff7849 50%, #ec4899 100%)",
    description: "Главные треки недели из открытого каталога",
  },
  {
    id: "energy",
    label: "Драйв & Энергия",
    icon: "⚡️",
    gradient: "radial-gradient(circle at 30% 30%, #ff0844 0%, #f97316 50%, #eab308 100%)",
    description: "Бодрящие клубные треки, EDM и мощный бит",
    genre: "Electronic",
  },
  {
    id: "relax",
    label: "Спокойствие & Chill",
    icon: "☕️",
    gradient: "radial-gradient(circle at 30% 30%, #10b981 0%, #06b6d4 50%, #6366f1 100%)",
    description: "Лаунж, лоу-фай и спокойный вайб",
    genre: "Lo-Fi",
  },
  {
    id: "night",
    label: "Ночной город",
    icon: "🌙",
    gradient: "radial-gradient(circle at 30% 30%, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    description: "Дип-хаус и неоновые ночные ритмы",
    genre: "Deep House",
  },
  {
    id: "cinema",
    label: "Саундтреки Кино",
    icon: "🍿",
    gradient: "radial-gradient(circle at 30% 30%, #f43f5e 0%, #fb923c 50%, #f59e0b 100%)",
    description: "Эпические кинематографичные композиции",
    query: "cinematic epic soundtrack",
  },
  {
    id: "rock",
    label: "Рок & Драйв",
    icon: "🎸",
    gradient: "radial-gradient(circle at 30% 30%, #e11d48 0%, #991b1b 50%, #3b0764 100%)",
    description: "Легендарный рок, альтернатива и гитарный драйв",
    genre: "Rock",
  },
];

/* 📻 24/7 Официальные открытые радиостанции в HD качестве */
export const LIVE_RADIO_STATIONS: MusicTrack[] = [
  {
    id: "radio-europa-plus",
    title: "Европа Плюс HD",
    artist: "Прямой эфир · Топ 40 Хитов",
    album: "Europa Plus Live",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Top 40 / Pop",
    mood: "chart",
    streamUrl: "https://ep256.hostingradio.ru:8052/europaplus256.mp3",
    fallbackUrl: "https://dfm.hostingradio.ru/dfm96.aacp",
    isLiveRadio: true,
    source: "radio",
    plays: 580000,
  },
  {
    id: "radio-dfm-club",
    title: "DFM Club Dance",
    artist: "Танцевальный Драйв 24/7",
    album: "DFM Club Music",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Electronic / Dance",
    mood: "energy",
    streamUrl: "https://dfm.hostingradio.ru/dfm96.aacp",
    fallbackUrl: "https://radiorecord.hostingradio.ru/techno96.aacp",
    isLiveRadio: true,
    source: "radio",
    plays: 490000,
  },
  {
    id: "radio-chillout",
    title: "Record Chillout Lounge",
    artist: "Релакс & Лаунж 24/7",
    album: "Radio Record Chillout",
    artwork: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Lounge / Ambient",
    mood: "relax",
    streamUrl: "https://radiorecord.hostingradio.ru/chil96.aacp",
    fallbackUrl: "https://streams.ilovemusic.de/iloveradio17.mp3",
    isLiveRadio: true,
    source: "radio",
    plays: 430000,
  },
  {
    id: "radio-deep-house",
    title: "Record Deep House",
    artist: "Атмосферный Deep & Vocal",
    album: "Record Deep Session",
    artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Deep House",
    mood: "night",
    streamUrl: "https://radiorecord.hostingradio.ru/deep96.aacp",
    fallbackUrl: "https://dfm.hostingradio.ru/dfm96.aacp",
    isLiveRadio: true,
    source: "radio",
    plays: 380000,
  },
  {
    id: "radio-record-rock",
    title: "Radio Record Rock",
    artist: "Классический & Современный Рок",
    album: "Record Rock Live",
    artwork: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Rock / Alternative",
    mood: "rock",
    streamUrl: "https://radiorecord.hostingradio.ru/rock96.aacp",
    fallbackUrl: "https://radiorecord.hostingradio.ru/mdl96.aacp",
    isLiveRadio: true,
    source: "radio",
    plays: 320000,
  },
  {
    id: "radio-lofi-cafe",
    title: "Lo-Fi Chill Cafe",
    artist: "Биты для Учебы и Отдыха",
    album: "Lo-Fi 24/7 Stream",
    artwork: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    duration: 0,
    genre: "Lo-Fi / Hip-Hop",
    mood: "relax",
    streamUrl: "https://streams.ilovemusic.de/iloveradio17.mp3",
    fallbackUrl: "https://radiorecord.hostingradio.ru/chil96.aacp",
    isLiveRadio: true,
    source: "radio",
    plays: 350000,
  },
];
