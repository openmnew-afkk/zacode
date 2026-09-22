/* ===== Данные киноленты новостей и трейлеров (Telegram Channel Style) ===== */
import type { FeedPost } from '../types';

export const INITIAL_FEED_POSTS: FeedPost[] = [
  {
    id: 'post-cliff-booth',
    category: 'trailer',
    title: '⚡ «Злоключения Клиффа Бута» — вышел полноценный трейлер продолжения «Однажды в... Голливуде».',
    badge: '⚡ ТРЕЙЛЕР С СУБТИТРАМИ',
    badgeColor: '#eab308',
    description:
      'Лента расскажет о жизни каскадёра Клиффа Бута после финала культового фильма Квентина Тарантино. Главную роль вновь исполнил неподражаемый Брэд Питт, а режиссёрское кресло занял сам Тарантино.',
    releaseDate: 'Премьера — 23 декабря 2026',
    specs: 'Режиссёр: Квентин Тарантино · В ролях: Брэд Питт, Леонардо ДиКаприо · Жанр: Драма, Комедия',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'ELeMaP8Pbsw', // Once Upon a Time in Hollywood official trailer with Russian subtitles
    duration: '2:24',
    hasSubtitles: true,
    movieId: 'movie-466272', // Once Upon a Time in Hollywood
    timestamp: 'сегодня в 01:27',
    reactions: {
      fire: 1420,
      heart: 984,
      popcorn: 752,
      clap: 419,
    },
  },
  {
    id: 'post-dune-messiah',
    category: 'announce',
    title: '🔥 Дени Вильнёв официально приступил к съёмкам «Дюны 3: Мессия». Опубликован первый промо-тизер!',
    badge: '🔥 ГРОМКИЙ АНОНС',
    badgeColor: '#f97316',
    description:
      'Сюжет сосредоточится на трагической судьбе падишаха-императора Пола Атрейдеса и священной войне, охватившей миллиарды миров. Тимоти Шаламе, Зендея и Флоренс Пью вернулись к своим ролям.',
    releaseDate: 'Мировой релиз — 18 декабря 2026',
    specs: 'Режиссёр: Дени Вильнёв · Композитор: Ханс Циммер · Формат: IMAX 70mm',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'Way9Dexny3w', // Dune 2 official main trailer
    duration: '3:02',
    hasSubtitles: true,
    movieId: 'movie-693134', // Dune 2
    timestamp: 'вчера в 19:45',
    reactions: {
      fire: 2890,
      heart: 1640,
      popcorn: 1120,
      clap: 890,
    },
  },
  {
    id: 'post-batman-2',
    category: 'trailer',
    title: '🦇 «Бэтмен: Часть 2» Мэтта Ривза — опубликован мрачный тизер с русскими субтитрами!',
    badge: '🦇 ЭКСКЛЮЗИВ',
    badgeColor: '#8b5cf6',
    description:
      'Готэм погружён под воду после взрывов Загадочника. Брюсу Уэйну предстоит столкнуться с тайным преступным синдикатом и новым воплощением Мистера Фриза в ледяном мегаполисе.',
    releaseDate: 'Премьера в кинотеатрах — 2 октября 2026',
    specs: 'В главной роли: Роберт Паттинсон · Музыка: Майкл Джаккино · DC Elseworlds',
    posterUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'mqqft2x_Aa4', // The Batman official trailer
    duration: '2:38',
    hasSubtitles: true,
    movieId: 'movie-414906', // The Batman
    timestamp: '20 сентября в 14:10',
    reactions: {
      fire: 3100,
      heart: 2240,
      popcorn: 980,
      clap: 670,
    },
  },
  {
    id: 'post-peaky-blinders',
    category: 'premiere',
    title: '🥃 Полнометражный фильм «Острые козырьки: Бессмертный человек» завершил продакшн!',
    badge: '🥃 СКОРО В AURA',
    badgeColor: '#ec4899',
    description:
      '«По приказу Острых козырьков!» Томас Шелби возвращается в Бирмингем в разгар Второй мировой войны. Киллиан Мёрфи заявил, что фильм станет грандиозным и бескомпромиссным финалом саги.',
    releaseDate: 'Премьера на стриминге — ноябрь 2026',
    specs: 'В главных ролях: Киллиан Мёрфи, Ребекка Фергюсон, Барри Кеоган · Сценарий: Стивен Найт',
    posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'oVzVdvGIC7U', // Peaky Blinders final season trailer
    duration: '1:55',
    hasSubtitles: true,
    movieId: 'tv-60574', // Peaky Blinders
    timestamp: '19 сентября в 22:30',
    reactions: {
      fire: 4210,
      heart: 3500,
      popcorn: 1430,
      clap: 1200,
    },
  },
  {
    id: 'post-avatar-3',
    category: 'announce',
    title: '🌊 Джеймс Кэмерон раскрыл первые кадры «Аватара 3: Огонь и пепел». Нас ждёт враждебный клан Пандоры.',
    badge: '🌊 СУПЕРХИТ',
    badgeColor: '#06b6d4',
    description:
      'Впервые зрителям покажут не только гармоничные племена На\'ви, но и безжалостный кочевой клан Пепла, живущий среди вулканических пустынь. Фильм снят с революционной частотой 48 FPS.',
    releaseDate: 'Премьера — 19 декабря 2026',
    specs: 'Режиссёр: Джеймс Кэмерон · В ролях: Сэм Уортингтон, Зои Салдана, Уна Чаплин',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'd9MyW72ELq0', // Avatar 2 trailer
    duration: '2:28',
    hasSubtitles: true,
    movieId: 'movie-76600', // Avatar 2
    timestamp: '18 сентября в 16:15',
    reactions: {
      fire: 1980,
      heart: 1420,
      popcorn: 890,
      clap: 520,
    },
  },
  {
    id: 'post-stranger-things',
    category: 'series',
    title: '⚡ «Очень странные дела 5» — финальный трейлер культового сериала. Изнанка поглощает Хоукинс!',
    badge: '⚡ ФИНАЛЬНЫЙ СЕЗОН',
    badgeColor: '#ef4444',
    description:
      'Братья Даффер обещают эпизоды масштаба голливудских блокбастеров. Вся банда Одиннадцать собирается вместе для решающей схватки с Векной. Русская озвучка выйдет в день релиза в AURA.',
    releaseDate: 'Премьера всех серий — осень 2026',
    specs: 'В ролях: Милли Бобби Браун, Финн Вулфхард, Дэвид Харбор · 8 эпизодов по 90 минут',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    youtubeId: 'sBEvEcpnG7k', // Stranger Things 4 trailer
    duration: '3:11',
    hasSubtitles: true,
    movieId: 'tv-66732', // Stranger Things
    timestamp: '17 сентября в 11:00',
    reactions: {
      fire: 5430,
      heart: 4120,
      popcorn: 2310,
      clap: 1890,
    },
  },
];
