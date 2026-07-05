/* ===== TeleCinema — Catalog API =====
 * OMDb API (CORS разрешён, работает без сервера)
 * Плеер: vidsrc.xyz / vidsrc.pro / 2embed / embed.su
 */

import type { Movie, CatalogResponse, MovieDetail, Genre } from '../types';

// OMDb API key — получи свой бесплатно на https://www.omdbapi.com/apikey.aspx
const OMDB_KEY = '4a3b711b';
const OMDB_BASE = 'https://www.omdbapi.com';

/* ===== Источники для плеера — 3 RU + 1 EN ===== */
export interface PlayerSourceDef {
  label: string;
  lang: 'ru' | 'en';
  buildUrl: (imdbId: string, season?: number, episode?: number) => string;
}

export const PLAYER_SOURCES: PlayerSourceDef[] = [
  {
    label: 'Collaps',
    lang: 'ru',
    buildUrl: (id) => `https://api.lap.cat/embed/movie?imdb=${id}`,
  },
  {
    label: 'HDVB',
    lang: 'ru',
    buildUrl: (id) => `https://hdvb.uk/embed/movie/${id}`,
  },
  {
    label: 'VidSrc RU',
    lang: 'ru',
    buildUrl: (id) => `https://vidsrc-embed.ru/embed/movie?imdb=${id}&ds_lang=ru`,
  },
  {
    label: 'VidSrc',
    lang: 'en',
    buildUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
  },
];

export const PLAYER_SOURCES_TV: PlayerSourceDef[] = [
  {
    label: 'Collaps',
    lang: 'ru',
    buildUrl: (id, s = 1, e = 1) => `https://api.lap.cat/embed/series?imdb=${id}&s=${s}&e=${e}`,
  },
  {
    label: 'HDVB',
    lang: 'ru',
    buildUrl: (id, s = 1, e = 1) => `https://hdvb.uk/embed/tv/${id}/${s}/${e}`,
  },
  {
    label: 'VidSrc RU',
    lang: 'ru',
    buildUrl: (id, s = 1, e = 1) => `https://vidsrc-embed.ru/embed/tv?imdb=${id}&season=${s}&episode=${e}&ds_lang=ru`,
  },
  {
    label: 'VidSrc',
    lang: 'en',
    buildUrl: (id, s = 1, e = 1) => `https://vidsrc.xyz/embed/tv/${id}?s=${s}&e=${e}`,
  },
];

/* ===== Изображения ===== */
const posterFallback = './no-poster.svg';

const omdbPoster = (imdbId: string): string =>
  `https://img.omdbapi.com/?i=${imdbId}&h=1000&apikey=${OMDB_KEY}`;

const cleanPoster = (p: string | null | undefined, imdbId?: string): string => {
  if (!p || p === 'N/A') {
    if (imdbId?.startsWith('tt')) return omdbPoster(imdbId);
    return posterFallback;
  }
  if (p.startsWith('http') || p.startsWith('//')) return p;
  if (imdbId?.startsWith('tt')) return omdbPoster(imdbId);
  return posterFallback;
};

export const posterUrl = (p: string | null | undefined, imdbId?: string): string =>
  cleanPoster(p, imdbId);

export const backdropUrl = (p: string | null | undefined, imdbId?: string): string => {
  const url = cleanPoster(p, imdbId);
  return url !== posterFallback ? url : (imdbId?.startsWith('tt') ? omdbPoster(imdbId) : '');
};

/* ===== OMDb helpers ===== */
interface OMDBItem {
  Title: string; Year: string; imdbID: string; Type: string; Poster: string;
}
interface OMDBDetail extends OMDBItem {
  Plot: string; imdbRating: string; Genre: string; Director: string; Actors: string;
  Runtime: string; Country: string;
}

async function omdb(params: Record<string, any>): Promise<any> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(params))
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error || 'NOT_FOUND');
  return data;
}

function idToNum(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toMovie(i: OMDBItem): Movie {
  const id = i.imdbID || '';
  return {
    id: idToNum(id),
    title: i.Title || 'Без названия',
    original_title: i.Title || '',
    overview: '',
    poster_path: cleanPoster(i.Poster, id),
    backdrop_path: cleanPoster(i.Poster, id),
    release_date: i.Year || '',
    vote_average: 0,
    kinopoisk_rating: 0,
    imdb_rating: 0,
    runtime: null,
    genre_ids: [],
    genres: [],
    type: i.Type === 'series' ? 'serial' : 'movie',
    is_serial: i.Type === 'series',
    imdb_id: id,
    kinopoisk_id: id,
    quality: 'HD',
    translator: '',
    iframe_url: '',
    countries: [],
    actors: [],
    directors: [],
    popularity: 0,
    adult: false,
  };
}

function toDetail(i: OMDBDetail): MovieDetail {
  const m = toMovie(i);
  const genres = (i.Genre || '').split(', ').filter(Boolean);
  const rt = (i.Runtime || '').match(/(\d+)/);
  const rating = parseFloat(i.imdbRating) || 0;
  return {
    ...m,
    overview: i.Plot && i.Plot !== 'N/A' ? i.Plot : '',
    vote_average: rating,
    imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: genres.map((_: string, idx: number) => idx + 1),
    genres: genres.map((name: string, idx: number) => ({ id: idx + 1, name })),
    actors: (i.Actors || '').split(', ').filter(Boolean),
    directors: (i.Director || '').split(', ').filter(Boolean),
    countries: (i.Country || '').split(', ').filter(Boolean),
    seasons: [],
    similar: [],
  };
}

/* ===== Встроенный каталог: Фильмы ===== */
const BUILTIN_MOVIES: MovieDetail[] = [
  { id: idToNum('tt15398776'), title: 'Оппенгеймер', original_title: 'Oppenheimer', overview: 'История создателя атомной бомбы Роберта Оппенгеймера.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDBiZDg0N2MtMjZlNi00NmY5LWIzZDYtMmQ5MDQ4Mjc3NzFhXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMDBiZDg0N2MtMjZlNi00NmY5LWIzZDYtMmQ5MDQ4Mjc3NzFhXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2023', vote_average: 8.8, kinopoisk_rating: 8.5, imdb_rating: 8.8, runtime: 180, genre_ids: [1, 4], genres: [{ id: 1, name: 'Биография' }, { id: 4, name: 'Драма' }], type: 'movie', is_serial: false, imdb_id: 'tt15398776', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Киллиан Мёрфи', 'Эмили Блант', 'Мэтт Дэймон'], directors: ['Кристофер Нолан'], popularity: 99, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0468569'), title: 'Тёмный рыцарь', original_title: 'The Dark Knight', overview: 'Бэтмен против Джокера в смертельной схватке за Готэм.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX1000.jpg', release_date: '2008', vote_average: 9.0, kinopoisk_rating: 8.9, imdb_rating: 9.0, runtime: 152, genre_ids: [1, 4, 2], genres: [{ id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }], type: 'movie', is_serial: false, imdb_id: 'tt0468569', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Кристиан Бейл', 'Хит Леджер', 'Аарон Экхарт'], directors: ['Кристофер Нолан'], popularity: 100, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0111161'), title: 'Побег из Шоушенка', original_title: 'The Shawshank Redemption', overview: 'Несправедливо осуждённый банкир готовит побег из тюрьмы.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '1994', vote_average: 9.3, kinopoisk_rating: 9.1, imdb_rating: 9.3, runtime: 142, genre_ids: [4], genres: [{ id: 4, name: 'Драма' }], type: 'movie', is_serial: false, imdb_id: 'tt0111161', kinopoisk_id: '', quality: 'HD', translator: '', iframe_url: '', countries: ['США'], actors: ['Тим Роббинс', 'Морган Фриман'], directors: ['Фрэнк Дарабонт'], popularity: 99, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0816692'), title: 'Интерстеллар', original_title: 'Interstellar', overview: 'Экспедиция через червоточину в поисках нового дома для человечества.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2014', vote_average: 8.7, kinopoisk_rating: 8.6, imdb_rating: 8.7, runtime: 169, genre_ids: [5, 4], genres: [{ id: 5, name: 'Фантастика' }, { id: 4, name: 'Драма' }], type: 'movie', is_serial: false, imdb_id: 'tt0816692', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Мэттью МакКонахи', 'Энн Хэтэуэй', 'Джессика Честейн'], directors: ['Кристофер Нолан'], popularity: 98, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt1375666'), title: 'Начало', original_title: 'Inception', overview: 'Вор, проникающий в сны, получает задание внедрить идею в чужой разум.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX1000.jpg', release_date: '2010', vote_average: 8.8, kinopoisk_rating: 8.7, imdb_rating: 8.8, runtime: 148, genre_ids: [5, 2], genres: [{ id: 5, name: 'Фантастика' }, { id: 2, name: 'Триллер' }], type: 'movie', is_serial: false, imdb_id: 'tt1375666', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Леонардо ДиКаприо', 'Джозеф Гордон-Левитт'], directors: ['Кристофер Нолан'], popularity: 97, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0133093'), title: 'Матрица', original_title: 'The Matrix', overview: 'Хакер Нео узнаёт, что мир вокруг — симуляция, и присоединяется к восстанию.', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODEzM2ZkZDc5Y2UyXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODEzM2ZkZDc5Y2UyXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '1999', vote_average: 8.7, kinopoisk_rating: 8.5, imdb_rating: 8.7, runtime: 136, genre_ids: [5, 1], genres: [{ id: 5, name: 'Фантастика' }, { id: 1, name: 'Боевик' }], type: 'movie', is_serial: false, imdb_id: 'tt0133093', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Киану Ривз', 'Лоуренс Фишборн', 'Кэрри-Энн Мосс'], directors: ['Лана Вачовски', 'Лилли Вачовски'], popularity: 96, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt7286456'), title: 'Джокер', original_title: 'Joker', overview: 'Неудачник-комик превращается в безумного преступника Джокера.', poster_path: 'https://m.media-amazon.com/images/M/MV5BNzY3OWQ5MTktZDM2Ny00OTVkLWI5OTctY2MwNTJiZTU5YzY3XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BNzY3OWQ5MTktZDM2Ny00OTVkLWI5OTctY2MwNTJiZTU5YzY3XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2019', vote_average: 8.4, kinopoisk_rating: 7.9, imdb_rating: 8.4, runtime: 122, genre_ids: [4, 2], genres: [{ id: 4, name: 'Драма' }, { id: 2, name: 'Триллер' }], type: 'movie', is_serial: false, imdb_id: 'tt7286456', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Хоакин Феникс', 'Роберт Де Ниро', 'Зази Битц'], directors: ['Тодд Филлипс'], popularity: 91, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt4154796'), title: 'Мстители: Финал', original_title: 'Avengers: Endgame', overview: 'Мстители собираются в финальной битве против Таноса.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX1000.jpg', release_date: '2019', vote_average: 8.4, kinopoisk_rating: 8.1, imdb_rating: 8.4, runtime: 181, genre_ids: [5, 1], genres: [{ id: 5, name: 'Фантастика' }, { id: 1, name: 'Боевик' }], type: 'movie', is_serial: false, imdb_id: 'tt4154796', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Роберт Дауни мл.', 'Крис Эванс', 'Скарлетт Йоханссон'], directors: ['Энтони Руссо', 'Джо Руссо'], popularity: 97, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt4555426'), title: 'Дюна', original_title: 'Dune: Part One', overview: 'Пол Атрейдес отправляется на планету Арракис — источник ценнейшей пряности.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYTAzYzNlMDMtMmVhYy00Y2NiLThiN2YtMGU5MjA3NjI3N2Q0XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYTAzYzNlMDMtMmVhYy00Y2NiLThiN2YtMGU5MjA3NjI3N2Q0XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2021', vote_average: 8.0, kinopoisk_rating: 7.7, imdb_rating: 8.0, runtime: 155, genre_ids: [5, 12], genres: [{ id: 5, name: 'Фантастика' }, { id: 12, name: 'Приключения' }], type: 'movie', is_serial: false, imdb_id: 'tt4555426', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Тимоти Шаламе', 'Зендея', 'Оскар Айзек'], directors: ['Дени Вильнёв'], popularity: 90, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt6751668'), title: 'Паразиты', original_title: 'Parasite', overview: 'Бедная семья хитростью внедряется в богатый дом — с непредсказуемыми последствиями.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2019', vote_average: 8.5, kinopoisk_rating: 8.1, imdb_rating: 8.5, runtime: 132, genre_ids: [4, 2, 3], genres: [{ id: 4, name: 'Драма' }, { id: 3, name: 'Комедия' }], type: 'movie', is_serial: false, imdb_id: 'tt6751668', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['Южная Корея'], actors: ['Со Кан-хо', 'Ли Сон-гюн', 'Чо Ё-чжон'], directors: ['Пон Джун-хо'], popularity: 87, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0120338'), title: 'Титаник', original_title: 'Titanic', overview: 'Роковая любовь на борту «Титаника» накануне его гибели.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YzXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YzXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '1997', vote_average: 7.9, kinopoisk_rating: 8.0, imdb_rating: 7.9, runtime: 194, genre_ids: [8, 4], genres: [{ id: 8, name: 'Мелодрама' }, { id: 4, name: 'Драма' }], type: 'movie', is_serial: false, imdb_id: 'tt0120338', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Леонардо ДиКаприо', 'Кейт Уинслет'], directors: ['Джеймс Кэмерон'], popularity: 95, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0137523'), title: 'Бойцовский клуб', original_title: 'Fight Club', overview: 'Офисный работник с бессонницей создаёт подпольный бойцовский клуб.', poster_path: 'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '1999', vote_average: 8.8, kinopoisk_rating: 8.7, imdb_rating: 8.8, runtime: 139, genre_ids: [4, 2], genres: [{ id: 4, name: 'Драма' }, { id: 2, name: 'Триллер' }], type: 'movie', is_serial: false, imdb_id: 'tt0137523', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Брэд Питт', 'Эдвард Нортон', 'Хелена Бонем Картер'], directors: ['Дэвид Финчер'], popularity: 93, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt1745960'), title: 'Лучший стрелок: Маверик', original_title: 'Top Gun: Maverick', overview: 'Легендарный пилот возвращается тренировать новое поколение для опасной миссии.', poster_path: 'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjY1YmIwYmI5XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjY1YmIwYmI5XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2022', vote_average: 8.3, kinopoisk_rating: 7.8, imdb_rating: 8.3, runtime: 130, genre_ids: [1, 4], genres: [{ id: 1, name: 'Боевик' }, { id: 4, name: 'Драма' }], type: 'movie', is_serial: false, imdb_id: 'tt1745960', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Том Круз', 'Майлз Теллер', 'Дженнифер Коннелли'], directors: ['Джозеф Косински'], popularity: 89, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0109830'), title: 'Форрест Гамп', original_title: 'Forrest Gump', overview: 'История простого человека с необычной судьбой, который стал свидетелем ключевых событий американской истории.', poster_path: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '1994', vote_average: 8.8, kinopoisk_rating: 8.9, imdb_rating: 8.8, runtime: 142, genre_ids: [4, 10], genres: [{ id: 4, name: 'Драма' }, { id: 10, name: 'Исторический' }], type: 'movie', is_serial: false, imdb_id: 'tt0109830', kinopoisk_id: '', quality: 'HD', translator: '', iframe_url: '', countries: ['США'], actors: ['Том Хэнкс', 'Робин Райт', 'Гэри Синиз'], directors: ['Роберт Земекис'], popularity: 96, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt13238346'), title: 'Барби', original_title: 'Barbie', overview: 'Кукла Барби отправляется в реальный мир и открывает смысл жизни.', poster_path: 'https://m.media-amazon.com/images/M/MV5BNjU3N2QxNzMtMWJkNS00NjRjLTkwMzItMzE1YzE5NmUxNTc2XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BNjU3N2QxNzMtMWJkNS00NjRjLTkwMzItMzE1YzE5NmUxNTc2XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2023', vote_average: 7.4, kinopoisk_rating: 6.9, imdb_rating: 7.4, runtime: 114, genre_ids: [3, 12], genres: [{ id: 3, name: 'Комедия' }, { id: 12, name: 'Приключения' }], type: 'movie', is_serial: false, imdb_id: 'tt13238346', kinopoisk_id: '', quality: 'HD', translator: '', iframe_url: '', countries: ['США'], actors: ['Марго Робби', 'Райан Гослинг', 'Америка Феррера'], directors: ['Грета Гервиг'], popularity: 88, adult: false, seasons: [], similar: [] },
  { id: idToNum('tt0499549'), title: 'Аватар', original_title: 'Avatar', overview: 'Паралич морпеха не мешает ему влюбиться в планету Пандора и её жителей.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMTYwOTEwNjAzMl5BMl5BanBnXkFtZTcwODc5MTUwMw@@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMTYwOTEwNjAzMl5BMl5BanBnXkFtZTcwODc5MTUwMw@@._V1_SX1000.jpg', release_date: '2009', vote_average: 7.9, kinopoisk_rating: 7.8, imdb_rating: 7.9, runtime: 162, genre_ids: [5, 12, 1], genres: [{ id: 5, name: 'Фантастика' }, { id: 12, name: 'Приключения' }], type: 'movie', is_serial: false, imdb_id: 'tt0499549', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Сэм Уортингтон', 'Зоя Салдана', 'Сигурни Уивер'], directors: ['Джеймс Кэмерон'], popularity: 85, adult: false, seasons: [], similar: [] },
];

/* ===== Встроенный каталог: Сериалы ===== */
const BUILTIN_SERIALS: MovieDetail[] = [
  { id: idToNum('tt0903747'), title: 'Во все тяжкие', original_title: 'Breaking Bad', overview: 'Учитель химии с диагнозом «рак» начинает варить метамфетамин, чтобы обеспечить семью.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDdmLWJjOTUtYjc1NjU3OTgxMWJiXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDdmLWJjOTUtYjc1NjU3OTgxMWJiXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2008–2013', vote_average: 9.5, kinopoisk_rating: 9.2, imdb_rating: 9.5, runtime: 47, genre_ids: [4, 2, 6], genres: [{ id: 4, name: 'Драма' }, { id: 2, name: 'Триллер' }, { id: 6, name: 'Криминал' }], type: 'serial', is_serial: true, imdb_id: 'tt0903747', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Брайан Крэнстон', 'Аарон Пол', 'Анна Ганн'], directors: ['Винс Гиллиган'], popularity: 100, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 7, episodes: [] }, { id: 2, season_number: 2, episodes_count: 13, episodes: [] }, { id: 3, season_number: 3, episodes_count: 13, episodes: [] }, { id: 4, season_number: 4, episodes_count: 13, episodes: [] }, { id: 5, season_number: 5, episodes_count: 16, episodes: [] }], similar: [] },
  { id: idToNum('tt0944947'), title: 'Игра престолов', original_title: 'Game of Thrones', overview: 'Война за Железный трон в мире магии и интриг.', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2IzYzBiOTQtNGZmMi00NDI5LTgxMzMtN2EzZjdlZWM4OGU3XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BN2IzYzBiOTQtNGZmMi00NDI5LTgxMzMtN2EzZjdlZWM4OGU3XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2011–2019', vote_average: 9.2, kinopoisk_rating: 9.1, imdb_rating: 9.2, runtime: 57, genre_ids: [14, 4, 1], genres: [{ id: 14, name: 'Фэнтези' }, { id: 4, name: 'Драма' }, { id: 1, name: 'Приключения' }], type: 'serial', is_serial: true, imdb_id: 'tt0944947', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Эмилия Кларк', 'Питер Динклэйдж', 'Кит Харингтон'], directors: ['Дэвид Бениофф', 'Д. Б. Уайсс'], popularity: 100, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 10, episodes: [] }, { id: 2, season_number: 2, episodes_count: 10, episodes: [] }, { id: 3, season_number: 3, episodes_count: 10, episodes: [] }, { id: 4, season_number: 4, episodes_count: 10, episodes: [] }, { id: 5, season_number: 5, episodes_count: 10, episodes: [] }, { id: 6, season_number: 6, episodes_count: 10, episodes: [] }, { id: 7, season_number: 7, episodes_count: 7, episodes: [] }, { id: 8, season_number: 8, episodes_count: 6, episodes: [] }], similar: [] },
  { id: idToNum('tt5180504'), title: 'Ведьмак', original_title: 'The Witcher', overview: 'Геральт из Ривии — охотник на чудовищ в мире людей и монстров.', poster_path: 'https://m.media-amazon.com/images/M/MV5BN2FiOWU4ZWMtOWYwNi00MzIxLWI2N2UtNzI0ZWZkZmFkMzI3XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BN2FiOWU4ZWMtOWYwNi00MzIxLWI2N2UtNzI0ZWZkZmFkMzI3XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2019–2023', vote_average: 8.0, kinopoisk_rating: 7.9, imdb_rating: 8.0, runtime: 60, genre_ids: [14, 4, 1], genres: [{ id: 14, name: 'Фэнтези' }, { id: 4, name: 'Драма' }, { id: 1, name: 'Боевик' }], type: 'serial', is_serial: true, imdb_id: 'tt5180504', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США', 'Польша'], actors: ['Генри Кавилл', 'Аня Чалотра', 'Фрейя Аллан'], directors: ['Лорен Шмидт Хиссрик'], popularity: 90, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 8, episodes: [] }, { id: 2, season_number: 2, episodes_count: 8, episodes: [] }, { id: 3, season_number: 3, episodes_count: 8, episodes: [] }], similar: [] },
  { id: idToNum('tt4574334'), title: 'Очень странные дела', original_title: 'Stranger Things', overview: 'Дети в маленьком городке сталкиваются с паранормальным и секретными экспериментами.', poster_path: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BMDZkYmVhNjMtNWU4MC00MDQxLWE3MjYtZGMzZWI1ZjhlOWJmXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2016–2025', vote_average: 8.7, kinopoisk_rating: 8.5, imdb_rating: 8.7, runtime: 51, genre_ids: [7, 5, 4], genres: [{ id: 7, name: 'Ужасы' }, { id: 5, name: 'Фантастика' }, { id: 4, name: 'Драма' }], type: 'serial', is_serial: true, imdb_id: 'tt4574334', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Милли Бобби Браун', 'Финн Вулфхард', 'Уинона Райдер'], directors: ['Братья Даффер'], popularity: 95, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 8, episodes: [] }, { id: 2, season_number: 2, episodes_count: 9, episodes: [] }, { id: 3, season_number: 3, episodes_count: 8, episodes: [] }, { id: 4, season_number: 4, episodes_count: 9, episodes: [] }], similar: [] },
  { id: idToNum('tt2306299'), title: 'Викинги', original_title: 'Vikings', overview: 'Легендарный Рагнар Лотброк ведёт набеги и завоёвывает новые земли.', poster_path: 'https://m.media-amazon.com/images/M/MV5BYTIzNjQ5YWItZGZiMS00OTBmLWIxMjItNzVhYTQ5NmQzZjM4XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BYTIzNjQ5YWItZGZiMS00OTBmLWIxMjItNzVhYTQ5NmQzZjM4XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2013–2020', vote_average: 8.5, kinopoisk_rating: 8.4, imdb_rating: 8.5, runtime: 44, genre_ids: [4, 10, 1], genres: [{ id: 4, name: 'Драма' }, { id: 10, name: 'Исторический' }, { id: 1, name: 'Боевик' }], type: 'serial', is_serial: true, imdb_id: 'tt2306299', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['Ирландия', 'Канада'], actors: ['Трэвис Фиммел', 'Клайв Стэндэн', 'Катерин Вингор'], directors: ['Майкл Херст'], popularity: 88, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 9, episodes: [] }, { id: 2, season_number: 2, episodes_count: 10, episodes: [] }, { id: 3, season_number: 3, episodes_count: 10, episodes: [] }, { id: 4, season_number: 4, episodes_count: 20, episodes: [] }, { id: 5, season_number: 5, episodes_count: 20, episodes: [] }, { id: 6, season_number: 6, episodes_count: 20, episodes: [] }], similar: [] },
  { id: idToNum('tt7366338'), title: 'Корона', original_title: 'The Crown', overview: 'История правления королевы Елизаветы II и британской монархии.', poster_path: 'https://m.media-amazon.com/images/M/MV5BZWM4MWI0ZGQtZDFhYS00OGZjLTllMjgtM2NmOWNkNDU5OWZmXkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BZWM4MWI0ZGQtZDFhYS00OGZjLTllMjgtM2NmOWNkNDU5OWZmXkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2016–2023', vote_average: 8.7, kinopoisk_rating: 8.2, imdb_rating: 8.7, runtime: 58, genre_ids: [4, 10], genres: [{ id: 4, name: 'Драма' }, { id: 10, name: 'Исторический' }], type: 'serial', is_serial: true, imdb_id: 'tt7366338', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['Великобритания'], actors: ['Клэр Фой', 'Оливия Колман', 'Иэн Маклейн'], directors: ['Питер Морган'], popularity: 83, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 10, episodes: [] }, { id: 2, season_number: 2, episodes_count: 10, episodes: [] }, { id: 3, season_number: 3, episodes_count: 10, episodes: [] }, { id: 4, season_number: 4, episodes_count: 10, episodes: [] }, { id: 5, season_number: 5, episodes_count: 10, episodes: [] }, { id: 6, season_number: 6, episodes_count: 10, episodes: [] }], similar: [] },
  { id: idToNum('tt3032476'), title: 'Лучше звоните Солу', original_title: 'Better Call Saul', overview: 'История адвоката Джимми Макгилла — будущего Сола Гудмана из «Во все тяжкие».', poster_path: 'https://m.media-amazon.com/images/M/MV5BZjZlNzE0YzAtZTMzOC00NzYxLWE5MWQtM2M1YzYzY2MxZTI0XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BZjZlNzE0YzAtZTMzOC00NzYxLWE5MWQtM2M1YzYzY2MxZTI0XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2015–2022', vote_average: 9.0, kinopoisk_rating: 8.8, imdb_rating: 9.0, runtime: 46, genre_ids: [4, 2, 6], genres: [{ id: 4, name: 'Драма' }, { id: 6, name: 'Криминал' }], type: 'serial', is_serial: true, imdb_id: 'tt3032476', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Боб Оденкёрк', 'Джонатан Бэнкс', 'Рис Ахмед'], directors: ['Винс Гиллиган', 'Питер Гулд'], popularity: 92, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 10, episodes: [] }, { id: 2, season_number: 2, episodes_count: 10, episodes: [] }, { id: 3, season_number: 3, episodes_count: 10, episodes: [] }, { id: 4, season_number: 4, episodes_count: 10, episodes: [] }, { id: 5, season_number: 5, episodes_count: 10, episodes: [] }, { id: 6, season_number: 6, episodes_count: 13, episodes: [] }], similar: [] },
  { id: idToNum('tt11198330'), title: 'Дом дракона', original_title: 'House of the Dragon', overview: 'Предыстория «Игры престолов» — гражданская война дома Таргариенов.', poster_path: 'https://m.media-amazon.com/images/M/MV5BM2Q1MjU0ZjMtNzIxNC00NjQxLTk4MTctYWNkNjA5NjkzMGI4XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BM2Q1MjU0ZjMtNzIxNC00NjQxLTk4MTctYWNkNjA5NjkzMGI4XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2022–', vote_average: 8.4, kinopoisk_rating: 8.0, imdb_rating: 8.4, runtime: 60, genre_ids: [14, 4, 1], genres: [{ id: 14, name: 'Фэнтези' }, { id: 4, name: 'Драма' }], type: 'serial', is_serial: true, imdb_id: 'tt11198330', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Падди Консидайн', 'Эмма Д\'Арси', 'Мэтт Смит'], directors: ['Мигель Сапочник', 'Райан Кондал'], popularity: 91, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 10, episodes: [] }, { id: 2, season_number: 2, episodes_count: 8, episodes: [] }], similar: [] },
  { id: idToNum('tt9174558'), title: 'Мандалорец', original_title: 'The Mandalorian', overview: 'Охотник за головами во вселенной «Звёздных войн» защищает загадочного малыша Грогу.', poster_path: 'https://m.media-amazon.com/images/M/MV5BZDhlMzY0ZGItZTcyNS00ZTAxLWIyMmYtZGQ2MDYyZjYyNDc5XkEyXkFqcGc@._V1_SX1000.jpg', backdrop_path: 'https://m.media-amazon.com/images/M/MV5BZDhlMzY0ZGItZTcyNS00ZTAxLWIyMmYtZGQ2MDYyZjYyNDc5XkEyXkFqcGc@._V1_SX1000.jpg', release_date: '2019–', vote_average: 8.7, kinopoisk_rating: 8.3, imdb_rating: 8.7, runtime: 40, genre_ids: [5, 1, 12], genres: [{ id: 5, name: 'Фантастика' }, { id: 1, name: 'Боевик' }], type: 'serial', is_serial: true, imdb_id: 'tt8111088', kinopoisk_id: '', quality: '4K', translator: '', iframe_url: '', countries: ['США'], actors: ['Педро Паскаль', 'Грина Кавалланро', 'Карл Уэзерс'], directors: ['Джон Фавро'], popularity: 93, adult: false, seasons: [{ id: 1, season_number: 1, episodes_count: 8, episodes: [] }, { id: 2, season_number: 2, episodes_count: 8, episodes: [] }, { id: 3, season_number: 3, episodes_count: 8, episodes: [] }], similar: [] },
];

const BUILTIN_ALL: MovieDetail[] = [...BUILTIN_MOVIES, ...BUILTIN_SERIALS];

/* ===== Кэш ===== */
let _cache: Record<string, MovieDetail> = {};
let _cacheLoaded = false;

function getCache(): Record<string, MovieDetail> {
  if (_cacheLoaded) return _cache;
  try {
    const raw = localStorage.getItem('tc_cache_v3');
    if (raw) {
      const { data, time } = JSON.parse(raw);
      if (Date.now() - time < 2 * 60 * 60 * 1000) _cache = data;
    }
  } catch {}
  _cacheLoaded = true;
  return _cache;
}

function saveCache() {
  try { localStorage.setItem('tc_cache_v3', JSON.stringify({ data: _cache, time: Date.now() })); } catch {}
}

/* ===== API функции ===== */

export const getCatalog = async (params?: { page?: number; type?: string }): Promise<CatalogResponse> => {
  const type = params?.type;
  let results: Movie[];
  if (type === 'movie') results = BUILTIN_MOVIES as Movie[];
  else if (type === 'serial' || type === 'series') results = BUILTIN_SERIALS as Movie[];
  else results = BUILTIN_ALL as Movie[];
  return { ok: true, page: 1, results, total_pages: 1, total_results: results.length };
};

export const getNovelty = async (): Promise<CatalogResponse> => {
  const sorted = [...BUILTIN_ALL].sort((a, b) =>
    (b.release_date || '').localeCompare(a.release_date || '')
  ) as Movie[];
  return { ok: true, page: 1, results: sorted, total_pages: 1, total_results: sorted.length };
};

export const getTop = async (): Promise<CatalogResponse> => {
  const sorted = [...BUILTIN_ALL].sort((a, b) => b.vote_average - a.vote_average) as Movie[];
  return { ok: true, page: 1, results: sorted, total_pages: 1, total_results: sorted.length };
};

export const searchCatalog = async (q: string, page = 1, type?: string): Promise<CatalogResponse> => {
  const ql = q.toLowerCase().trim();
  if (!ql) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };

  // Сначала ищем в локальном каталоге
  const local = BUILTIN_ALL.filter(m =>
    m.title.toLowerCase().includes(ql) ||
    m.original_title.toLowerCase().includes(ql)
  );

  if (local.length > 0) {
    let res = local as Movie[];
    if (type === 'series') res = res.filter(m => m.is_serial);
    else if (type === 'movie') res = res.filter(m => !m.is_serial);
    return { ok: true, page, results: res, total_pages: 1, total_results: res.length };
  }

  // Если не нашли — запрос к OMDb
  try {
    const omdbParams: Record<string, any> = { s: q, page };
    if (type === 'series') omdbParams.type = 'series';
    else if (type === 'movie') omdbParams.type = 'movie';
    const data = await omdb(omdbParams);
    if (!data.Search) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };

    const cache = getCache();
    const items: Movie[] = data.Search.map((i: OMDBItem) => {
      if (cache[i.imdbID]) return cache[i.imdbID];
      return toMovie(i);
    });

    // Обогащаем топ-6 деталями
    const enriched = await Promise.allSettled(
      items.slice(0, 6).map(async m => {
        if (cache[m.imdb_id]) return cache[m.imdb_id];
        try {
          const d = await omdb({ i: m.imdb_id, plot: 'short' });
          const detail = toDetail(d);
          _cache[d.imdbID] = detail;
          saveCache();
          return detail;
        } catch { return m; }
      })
    );

    const results = [
      ...enriched.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean),
      ...items.slice(6),
    ] as Movie[];

    return {
      ok: true, page,
      results,
      total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
      total_results: parseInt(data.totalResults || '0') || 0,
    };
  } catch {
    return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  }
};

export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  const sid = String(id);
  // Ищем в builtin по числовому id
  const numId = parseInt(sid);
  const byNum = BUILTIN_ALL.find(m => m.id === numId);
  if (byNum) return byNum;
  // Ищем по imdb_id
  const byImdb = BUILTIN_ALL.find(m => m.imdb_id === sid);
  if (byImdb) return byImdb;
  // Из кэша
  const cache = getCache();
  if (cache[sid]) return cache[sid];
  // OMDb запрос
  const imdbId = sid.startsWith('tt') ? sid : null;
  if (imdbId) {
    try {
      const d = await omdb({ i: imdbId, plot: 'full' });
      const detail = toDetail(d);
      _cache[imdbId] = detail;
      saveCache();
      return detail;
    } catch {}
  }
  throw new Error('Фильм не найден');
};

export interface PlayerSource { label: string; url: string; type: string; lang: 'ru' | 'en'; }

export const getPlayerUrl = async (
  id: string | number,
  _title: string,
  isSerial = false,
  season = 1,
  episode = 1,
): Promise<PlayerSource[]> => {
  const sid = String(id);
  const numId = parseInt(sid);

  let imdbId: string | null = null;

  const byNum = BUILTIN_ALL.find(m => m.id === numId);
  if (byNum?.imdb_id) imdbId = byNum.imdb_id;
  else if (sid.startsWith('tt')) imdbId = sid;
  else {
    const byImdb = BUILTIN_ALL.find(m => m.imdb_id === sid);
    if (byImdb?.imdb_id) imdbId = byImdb.imdb_id;
  }

  if (!imdbId) return [];

  const defs = isSerial ? PLAYER_SOURCES_TV : PLAYER_SOURCES;
  return defs.map(src => ({
    label: src.lang === 'ru' ? `🇷🇺 ${src.label}` : `🇬🇧 ${src.label}`,
    url: src.buildUrl(imdbId, season, episode),
    type: 'embed',
    lang: src.lang,
  }));
};

export const getGenres = async (): Promise<Genre[]> => [
  { id: 1, name: 'Боевик' },   { id: 2, name: 'Триллер' },  { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' },    { id: 5, name: 'Фантастика' },{ id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения'},{ id: 8, name: 'Мелодрама' },{ id: 9, name: 'Детектив' },
  { id: 10, name: 'Исторический' }, { id: 11, name: 'Военный' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
];

export const getPlayerPattern = (): string => { try { return localStorage.getItem('tc_player_pattern') || ''; } catch { return ''; } };
export const setPlayerPattern = (p: string) => { try { localStorage.setItem('tc_player_pattern', p); } catch {} };
export const getTmdbKey = () => '';
export const setTmdbKey = (_: string) => {};
export const hasTmdbKey = () => false;
export const checkTmdb = async () => ({ ok: false, message: '' });
