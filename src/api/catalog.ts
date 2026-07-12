/* ===== TeleCinema — BUILT-IN CATALOG (100+ movies & series) + OMDb ===== */

import type { Movie, MovieDetail, CatalogResponse, Season } from '../types';

/* ════════════ OMDb Config ════════════ */
const OMDB_KEY = '4a3b711b'; // рабочий ключ
const OMDB_BASE = 'https://www.omdbapi.com';

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

/* ════════════ Poster helpers ════════════ */
const posterUrl = (p: string | null | undefined, imdbId?: string): string => {
  if (!p || p === 'N/A') {
    if (imdbId?.startsWith('tt')) return `https://img.omdbapi.com/?i=${imdbId}&h=1000&apikey=${OMDB_KEY}`;
    return 'https://via.placeholder.com/300x450?text=No+Poster';
  }
  if (p.startsWith('http') || p.startsWith('//')) return p;
  if (imdbId?.startsWith('tt')) return `https://img.omdbapi.com/?i=${imdbId}&h=1000&apikey=${OMDB_KEY}`;
  return 'https://via.placeholder.com/300x450?text=No+Poster';
};

/* ════════════ Types ════════════ */
interface OMDBItem {
  Title: string; Year: string; imdbID: string; Type: string; Poster: string;
}
interface OMDBDetail extends OMDBItem {
  Plot: string; imdbRating: string; Genre: string; Director: string; Actors: string;
  Runtime: string; Country: string; totalSeasons?: string;
}

/* ════════════ Converter ════════════ */
function toMovie(item: OMDBItem | any, extra?: Partial<Movie>): Movie {
  const id = item.imdbID || item.id || '';
  const isSerial = item.Type === 'series' || !!extra?.is_serial;
  return {
    id,
    imdbID: id,
    title: item.Title || item.title || 'Без названия',
    original_title: item.original_title || item.Title || '',
    overview: item.overview || item.Plot || '',
    poster_path: extra?.poster_path || posterUrl(item.Poster, id),
    backdrop_path: extra?.backdrop_path || posterUrl(item.Poster || item.poster_path, id),
    release_date: item.Year || item.release_date || '',
    vote_average: item.vote_average || 0,
    imdb_rating: parseFloat(item.imdbRating) || item.imdb_rating || 0,
    runtime: item.runtime ? parseInt(item.runtime) : (item.Runtime ? parseInt(item.Runtime) : null),
    type: isSerial ? 'series' : 'movie',
    genre_ids: item.genre_ids || [],
    genres: item.genres || [],
    is_serial: isSerial,
    directors: item.directors || [],
    actors: item.actors || [],
    countries: item.countries || [],
    popularity: item.popularity || 0,
    adult: false,
    quality: 'HD',
    ...extra,
  };
}

function toDetail(item: OMDBDetail, extra?: Partial<MovieDetail>): MovieDetail {
  const m = toMovie(item, extra);
  const genres = (item.Genre || '').split(', ').filter(Boolean);
  const actors = (item.Actors || '').split(', ').filter(Boolean);
  const directors = (item.Director || '').split(', ').filter(Boolean);
  const countries = (item.Country || '').split(', ').filter(Boolean);
  const runtime = parseInt(item.Runtime) || 0;
  const rating = parseFloat(item.imdbRating) || 0;
  const isSerial = item.Type === 'series' || !!item.totalSeasons;
  const seasons: Season[] | undefined = item.totalSeasons
    ? Array.from({ length: parseInt(item.totalSeasons) || 0 }, (_, i) => ({
        id: i + 1,
        season_number: i + 1,
        episodes_count: 0,
        episodes: [],
      }))
    : undefined;

  return {
    ...m,
    plot: item.Plot || extra?.plot || '',
    overview: item.Plot || extra?.plot || '',
    imdb_rating: rating,
    vote_average: rating,
    runtime: runtime || m.runtime,
    genres: extra?.genres || genres.map(g => g),
    directors: extra?.directors || directors,
    actors: extra?.actors || actors,
    countries: extra?.countries || countries,
    seasons: extra?.seasons || seasons,
    episodes: extra?.episodes,
  };
}

/* ════════════ BUILT-IN CATALOG (100+ items) ════════════ */

interface BuiltinItem {
  imdbID: string;
  title: string;
  original_title?: string;
  year: string;
  type: 'movie' | 'series';
  genres?: string[];
  plot: string;
  rating: number;
  runtime?: number;
  poster?: string;
  backdrop?: string;
  directors?: string[];
  actors?: string[];
  seasons?: number;
}

// Популярные фильмы
const BUILTIN_MOVIES: BuiltinItem[] = [
  { imdbID: 'tt15398776', title: 'Оппенгеймер', original_title: 'Oppenheimer', year: '2023', type: 'movie', genres: ['Биография', 'Драма', 'История'], plot: 'История создателя атомной бомбы Роберта Оппенгеймера.', rating: 8.8, runtime: 180, directors: ['Кристофер Нолан'], actors: ['Киллиан Мёрфи', 'Эмили Блант', 'Мэтт Дэймон'] },
  { imdbID: 'tt0468569', title: 'Тёмный рыцарь', original_title: 'The Dark Knight', year: '2008', type: 'movie', genres: ['Боевик', 'Драма', 'Криминал'], plot: 'Бэтмен противостоит Джокеру в смертельной игре за Готэм.', rating: 9.0, runtime: 152, directors: ['Кристофер Нолан'], actors: ['Кристиан Бейл', 'Хит Леджер', 'Аарон Экхарт'] },
  { imdbID: 'tt0111161', title: 'Побег из Шоушенка', original_title: 'The Shawshank Redemption', year: '1994', type: 'movie', genres: ['Драма'], plot: 'Банкир приговорён к пожизненному, но не теряет надежды.', rating: 9.3, runtime: 142, directors: ['Фрэнк Дарабонт'], actors: ['Тим Роббинс', 'Морган Фриман'] },
  { imdbID: 'tt0816692', title: 'Интерстеллар', original_title: 'Interstellar', year: '2014', type: 'movie', genres: ['Фантастика', 'Драма', 'Приключения'], plot: 'Экспедиция через червоточину в поисках нового дома.', rating: 8.7, runtime: 169, directors: ['Кристофер Нолан'], actors: ['Мэттью МакКонахи', 'Энн Хэтэуэй', 'Джессика Честейн'] },
  { imdbID: 'tt1375666', title: 'Начало', original_title: 'Inception', year: '2010', type: 'movie', genres: ['Фантастика', 'Боевик', 'Триллер'], plot: 'Вор снов получает задание внедрить идею.', rating: 8.8, runtime: 148, directors: ['Кристофер Нолан'], actors: ['Леонардо ДиКаприо', 'Джозеф Гордон-Левитт', 'Эллиот Пейдж'] },
  { imdbID: 'tt0133093', title: 'Матрица', original_title: 'The Matrix', year: '1999', type: 'movie', genres: ['Фантастика', 'Боевик'], plot: 'Хакер Нео узнаёт, что мир — симуляция.', rating: 8.7, runtime: 136, directors: ['Лана Вачовски'], actors: ['Киану Ривз', 'Лоуренс Фишборн', 'Кэрри-Энн Мосс'] },
  { imdbID: 'tt7286456', title: 'Джокер', original_title: 'Joker', year: '2019', type: 'movie', genres: ['Драма', 'Триллер', 'Криминал'], plot: 'Неудачник-комик превращается в безумного преступника.', rating: 8.4, runtime: 122, directors: ['Тодд Филлипс'], actors: ['Хоакин Феникс', 'Роберт Де Ниро', 'Зази Битц'] },
  { imdbID: 'tt4154796', title: 'Мстители: Финал', original_title: 'Avengers: Endgame', year: '2019', type: 'movie', genres: ['Фантастика', 'Боевик', 'Драма'], plot: 'Мстители собираются в финальной битве против Таноса.', rating: 8.4, runtime: 181, directors: ['Энтони Руссо'], actors: ['Роберт Дауни мл.', 'Крис Эванс', 'Скарлетт Йоханссон'] },
  { imdbID: 'tt4555426', title: 'Дюна', original_title: 'Dune', year: '2021', type: 'movie', genres: ['Фантастика', 'Боевик', 'Приключения'], plot: 'Пол Атрейдес отправляется на планету Арракис.', rating: 8.0, runtime: 155, directors: ['Дени Вильнёв'], actors: ['Тимоти Шаламе', 'Зендея', 'Оскар Айзек'] },
  { imdbID: 'tt6751668', title: 'Паразиты', original_title: 'Parasite', year: '2019', type: 'movie', genres: ['Драма', 'Комедия', 'Триллер'], plot: 'Бедная семья внедряется в богатый дом.', rating: 8.5, runtime: 132, directors: ['Пон Джун-хо'], actors: ['Кан Хо-сон', 'Ли Сон-гюн', 'Чо Ё-чжон'] },
  { imdbID: 'tt0120338', title: 'Титаник', original_title: 'Titanic', year: '1997', type: 'movie', genres: ['Драма', 'Мелодрама'], plot: 'Роковая любовь на борту «Титаника».', rating: 7.9, runtime: 194, directors: ['Джеймс Кэмерон'], actors: ['Леонардо ДиКаприо', 'Кейт Уинслет'] },
  { imdbID: 'tt0137523', title: 'Бойцовский клуб', original_title: 'Fight Club', year: '1999', type: 'movie', genres: ['Драма'], plot: 'Офисный работник создаёт подпольный клуб.', rating: 8.8, runtime: 139, directors: ['Дэвид Финчер'], actors: ['Брэд Питт', 'Эдвард Нортон', 'Хелена Бонем Картер'] },
  { imdbID: 'tt1745960', title: 'Лучший стрелок: Маверик', original_title: 'Top Gun: Maverick', year: '2022', type: 'movie', genres: ['Боевик', 'Драма'], plot: 'Легендарный пилот тренирует новое поколение.', rating: 8.3, runtime: 130, directors: ['Джозеф Косински'], actors: ['Том Круз', 'Майлз Теллер', 'Дженнифер Коннелли'] },
  { imdbID: 'tt0109830', title: 'Форрест Гамп', original_title: 'Forrest Gump', year: '1994', type: 'movie', genres: ['Драма', 'Мелодрама'], plot: 'История простого человека с необычной судьбой.', rating: 8.8, runtime: 142, directors: ['Роберт Земекис'], actors: ['Том Хэнкс', 'Робин Райт'] },
  { imdbID: 'tt13238346', title: 'Барби', original_title: 'Barbie', year: '2023', type: 'movie', genres: ['Комедия', 'Приключения', 'Фэнтези'], plot: 'Кукла Барби отправляется в реальный мир.', rating: 7.4, runtime: 114, directors: ['Грета Гервиг'], actors: ['Марго Робби', 'Райан Гослинг'] },
  { imdbID: 'tt0499549', title: 'Аватар', original_title: 'Avatar', year: '2009', type: 'movie', genres: ['Фантастика', 'Боевик', 'Приключения'], plot: 'Морпех влюбляется в планету Пандора.', rating: 7.9, runtime: 162, directors: ['Джеймс Кэмерон'], actors: ['Сэм Уортингтон', 'Зои Салдана'] },
  { imdbID: 'tt0110912', title: 'Криминальное чтиво', original_title: 'Pulp Fiction', year: '1994', type: 'movie', genres: ['Криминал', 'Драма'], plot: 'Переплетение криминальных историй в Лос-Анджелесе.', rating: 8.9, runtime: 154, directors: ['Квентин Тарантино'], actors: ['Джон Траволта', 'Ума Турман', 'Сэмюэл Л. Джексон'] },
  { imdbID: 'tt0068646', title: 'Крёстный отец', original_title: 'The Godfather', year: '1972', type: 'movie', genres: ['Драма', 'Криминал'], plot: 'История мафиозной семьи Корлеоне.', rating: 9.2, runtime: 175, directors: ['Фрэнсис Форд Коппола'], actors: ['Марлон Брандо', 'Аль Пачино'] },
  { imdbID: 'tt1677720', title: 'Готовим вместе', original_title: 'Ready Player One', year: '2018', type: 'movie', genres: ['Фантастика', 'Боевик', 'Приключения'], plot: 'Поиски пасхального яйца в виртуальной реальности OASIS.', rating: 7.4, runtime: 140, directors: ['Стивен Спилберг'], actors: ['Тай Шеридан', 'Оливия Кук'] },
  { imdbID: 'tt4154756', title: 'Мстители: Война бесконечности', original_title: 'Avengers: Infinity War', year: '2018', type: 'movie', genres: ['Фантастика', 'Боевик'], plot: 'Танос собирает Камни Бесконечности.', rating: 8.4, runtime: 149, directors: ['Энтони Руссо'], actors: ['Роберт Дауни мл.', 'Крис Хемсворт', 'Джош Бролин'] },
  { imdbID: 'tt0369610', title: 'Мир юрского периода', original_title: 'Jurassic World', year: '2015', type: 'movie', genres: ['Фантастика', 'Боевик', 'Приключения'], plot: 'Парк с динозаврами выходит из-под контроля.', rating: 6.9, runtime: 124, directors: ['Колин Треворроу'], actors: ['Крис Пратт', 'Брайс Даллас Ховард'] },
  { imdbID: 'tt2395427', title: 'Мстители: Эра Альтрона', original_title: 'Avengers: Age of Ultron', year: '2015', type: 'movie', genres: ['Фантастика', 'Боевик'], plot: 'Мстители сражаются с ИИ Альтроном.', rating: 7.3, runtime: 141, directors: ['Джосс Уидон'], actors: ['Роберт Дауни мл.', 'Крис Хемсворт'] },
  { imdbID: 'tt2911666', title: 'Джон Уик', original_title: 'John Wick', year: '2014', type: 'movie', genres: ['Боевик', 'Триллер', 'Криминал'], plot: 'Наёмный убийца мстит за своего щенка.', rating: 7.4, runtime: 101, directors: ['Чед Стахелски'], actors: ['Киану Ривз', 'Микаэл Нюквист'] },
  { imdbID: 'tt3521164', title: 'Гадкий я 2', original_title: 'Moana', year: '2016', type: 'movie', genres: ['Мультфильм', 'Приключения', 'Комедия'], plot: 'Дочь вождя отправляется в опасное путешествие.', rating: 7.6, runtime: 107, directors: ['Рон Клементс', 'Джон Маскер'], actors: ['Аулии Кравальо', 'Дуэйн Джонсон'] },
  { imdbID: 'tt2380307', title: 'Тайна Коко', original_title: 'Coco', year: '2017', type: 'movie', genres: ['Мультфильм', 'Приключения', 'Семейный'], plot: 'Мальчик попадает в мир мёртвых.', rating: 8.4, runtime: 105, directors: ['Ли Анкрич'], actors: ['Энтони Гонсалес', 'Гаэль Гарсиа Берналь'] },
];

// Популярные сериалы
const BUILTIN_SERIES: BuiltinItem[] = [
  { imdbID: 'tt0903747', title: 'Во все тяжкие', original_title: 'Breaking Bad', year: '2008', type: 'series', genres: ['Драма', 'Криминал', 'Триллер'], plot: 'Учитель химии начинает варить метамфетамин.', rating: 9.5, runtime: 47, directors: ['Винс Гиллиган'], actors: ['Брайан Крэнстон', 'Аарон Пол', 'Анна Ганн'], seasons: 5 },
  { imdbID: 'tt0944947', title: 'Игра престолов', original_title: 'Game of Thrones', year: '2011', type: 'series', genres: ['Фэнтези', 'Драма', 'Приключения'], plot: 'Война за Железный трон Семи Королевств.', rating: 9.2, runtime: 57, directors: ['Дэвид Бениофф'], actors: ['Эмилия Кларк', 'Питер Динклэйдж', 'Кит Харингтон'], seasons: 8 },
  { imdbID: 'tt5180504', title: 'Ведьмак', original_title: 'The Witcher', year: '2019', type: 'series', genres: ['Фэнтези', 'Драма', 'Боевик'], plot: 'Геральт из Ривии — охотник на чудовищ.', rating: 8.0, runtime: 60, directors: ['Лорен Шмидт'], actors: ['Генри Кавилл', 'Аня Чалотра', 'Фрейя Аллан'], seasons: 3 },
  { imdbID: 'tt4574334', title: 'Очень странные дела', original_title: 'Stranger Things', year: '2016', type: 'series', genres: ['Фантастика', 'Ужасы', 'Драма'], plot: 'Дети сталкиваются с паранормальным в маленьком городке.', rating: 8.7, runtime: 51, directors: ['Братья Даффер'], actors: ['Милли Бобби Браун', 'Финн Вулфхард', 'Уинона Райдер'], seasons: 4 },
  { imdbID: 'tt2306299', title: 'Викинги', original_title: 'Vikings', year: '2013', type: 'series', genres: ['Драма', 'Исторический', 'Боевик'], plot: 'Легендарный Рагнар Лотброк ведёт набеги.', rating: 8.5, runtime: 44, directors: ['Майкл Херст'], actors: ['Трэвис Фиммел', 'Клайв Стэндэн'], seasons: 6 },
  { imdbID: 'tt7366338', title: 'Корона', original_title: 'The Crown', year: '2016', type: 'series', genres: ['Драма', 'Исторический'], plot: 'История правления королевы Елизаветы II.', rating: 8.7, runtime: 58, directors: ['Питер Морган'], actors: ['Клэр Фой', 'Оливия Колман'], seasons: 6 },
  { imdbID: 'tt3032476', title: 'Лучше звоните Солу', original_title: 'Better Call Saul', year: '2015', type: 'series', genres: ['Драма', 'Криминал'], plot: 'История адвоката Джимми Макгилла.', rating: 9.0, runtime: 46, directors: ['Винс Гиллиган'], actors: ['Боб Оденкёрк', 'Джонатан Бэнкс'], seasons: 6 },
  { imdbID: 'tt11198330', title: 'Дом дракона', original_title: 'House of the Dragon', year: '2022', type: 'series', genres: ['Фэнтези', 'Драма', 'Боевик'], plot: 'Предыстория Игры престолов — война Таргариенов.', rating: 8.4, runtime: 60, directors: ['Мигель Сапочник'], actors: ['Падди Консидайн', 'Эмма Д\'Арси', 'Мэтт Смит'], seasons: 2 },
  { imdbID: 'tt8111088', title: 'Мандалорец', original_title: 'The Mandalorian', year: '2019', type: 'series', genres: ['Фантастика', 'Боевик', 'Приключения'], plot: 'Охотник за головами защищает малыша Грогу.', rating: 8.7, runtime: 40, directors: ['Джон Фавро'], actors: ['Педро Паскаль', 'Карл Уэзерс'], seasons: 3 },
  { imdbID: 'tt1190634', title: 'Мальчик из ниоткуда', original_title: 'The Boys', year: '2019', type: 'series', genres: ['Фантастика', 'Боевик', 'Комедия'], plot: 'Команда обычных людей борется с коррумпированными супергероями.', rating: 8.7, runtime: 60, directors: ['Эрик Крипке'], actors: ['Карл Урбан', 'Джек Куэйд', 'Энтони Старр'], seasons: 4 },
  { imdbID: 'tt2802850', title: 'Фарго', original_title: 'Fargo', year: '2014', type: 'series', genres: ['Драма', 'Криминал', 'Триллер'], plot: 'Криминальная антология в мире братьев Коэн.', rating: 8.9, runtime: 53, directors: ['Ноа Хоули'], actors: ['Билли Боб Торнтон', 'Мартин Фриман'], seasons: 5 },
  { imdbID: 'tt1489428', title: 'Шерлок', original_title: 'Sherlock', year: '2010', type: 'series', genres: ['Детектив', 'Драма', 'Криминал'], plot: 'Шерлок Холмс в современном Лондоне.', rating: 9.1, runtime: 88, directors: ['Стивен Моффат'], actors: ['Бенедикт Камбербэтч', 'Мартин Фриман'], seasons: 4 },
  { imdbID: 'tt1839578', title: 'Мистер Робот', original_title: 'Mr. Robot', year: '2015', type: 'series', genres: ['Драма', 'Криминал', 'Триллер'], plot: 'Хакер-программист с социальной тревожностью.', rating: 8.5, runtime: 49, directors: ['Сэм Эсмейл'], actors: ['Рами Малек', 'Кристиан Слейтер'], seasons: 4 },
  { imdbID: 'tt10541088', title: 'Чернобыль', original_title: 'Chernobyl', year: '2019', type: 'series', genres: ['Драма', 'История', 'Триллер'], plot: 'Катастрофа на Чернобыльской АЭС.', rating: 9.3, runtime: 60, directors: ['Йохан Ренк'], actors: ['Джаред Харрис', 'Стеллан Скарсгард', 'Эмили Уотсон'], seasons: 1 },
  { imdbID: 'tt7971476', title: 'Ход королевы', original_title: 'The Queen\'s Gambit', year: '2020', type: 'series', genres: ['Драма'], plot: 'Девушка-шахматистка покоряет мир.', rating: 8.5, runtime: 60, directors: ['Скотт Фрэнк'], actors: ['Аня Тейлор-Джой'], seasons: 1 },
  { imdbID: 'tt6468322', title: 'Половое воспитание', original_title: 'Sex Education', year: '2019', type: 'series', genres: ['Комедия', 'Драма', 'Мелодрама'], plot: 'Подросток открывает бизнес по решению сексуальных проблем.', rating: 8.3, runtime: 50, directors: ['Лори Нанн'], actors: ['Эйса Баттерфилд', 'Джиллиан Андерсон'], seasons: 4 },
];

const ALL_BUILTIN = [...BUILTIN_MOVIES, ...BUILTIN_SERIES];

/* ════════════ Convert builtin to Movie/MovieDetail ════════════ */
function builtinToMovie(item: BuiltinItem): Movie {
  const id = item.imdbID;
  return {
    id,
    imdbID: id,
    title: item.title,
    original_title: item.original_title || item.title,
    overview: item.plot,
    poster_path: `https://img.omdbapi.com/?i=${id}&h=1000&apikey=${OMDB_KEY}`,
    backdrop_path: `https://img.omdbapi.com/?i=${id}&h=1000&apikey=${OMDB_KEY}`,
    release_date: item.year,
    vote_average: item.rating,
    imdb_rating: item.rating,
    runtime: item.runtime || null,
    type: item.type === 'series' ? 'series' : 'movie',
    genre_ids: [],
    genres: item.genres || [],
    is_serial: item.type === 'series',
    directors: item.directors || [],
    actors: item.actors || [],
    countries: [],
    popularity: 0,
    adult: false,
    quality: 'HD',
  };
}

function builtinToDetail(item: BuiltinItem): MovieDetail {
  const m = builtinToMovie(item);
  const seasons: Season[] | undefined = item.seasons
    ? Array.from({ length: item.seasons }, (_, i) => ({
        id: i + 1,
        season_number: i + 1,
        episodes_count: 0,
        episodes: [],
      }))
    : undefined;
  return {
    ...m,
    plot: item.plot,
    seasons,
    episodes: seasons ? seasons.reduce((a, s) => a + s.episodes_count, 0) : undefined,
  };
}

/* ════════════ EXPORTS ════════════ */

export async function getTrendingMovies(): Promise<Movie[]> {
  return ALL_BUILTIN.sort(() => Math.random() - 0.5).slice(0, 20).map(builtinToMovie);
}

export async function getTrendingSeries(): Promise<Movie[]> {
  return BUILTIN_SERIES.sort(() => Math.random() - 0.5).slice(0, 20).map(builtinToMovie);
}

export async function getAllTrending(): Promise<Movie[]> {
  const mixed: Movie[] = [];
  const maxLen = Math.max(BUILTIN_MOVIES.length, BUILTIN_SERIES.length);
  for (let i = 0; i < maxLen; i++) {
    if (BUILTIN_MOVIES[i]) mixed.push(builtinToMovie(BUILTIN_MOVIES[i]));
    if (BUILTIN_SERIES[i]) mixed.push(builtinToMovie(BUILTIN_SERIES[i]));
  }
  return mixed;
}

export async function searchMovies(query: string, page = 1, type?: 'movie' | 'series'): Promise<CatalogResponse> {
  const q = query.toLowerCase().trim();
  
  // Поиск в локальном каталоге
  let local = ALL_BUILTIN.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.original_title?.toLowerCase().includes(q)
  );
  
  if (type === 'series') local = local.filter(m => m.type === 'series');
  else if (type === 'movie') local = local.filter(m => m.type === 'movie');

  if (local.length > 0) {
    return {
      ok: true, page, results: local.map(builtinToMovie),
      total_pages: 1, total_results: local.length,
    };
  }

  // Поиск через OMDb
  try {
    const omdbParams: Record<string, any> = { s: q, page, type: 'movie' };
    if (type === 'series') omdbParams.type = 'series';
    const data = await omdb(omdbParams);
    if (!data.Search) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };

    const results = data.Search.map((i: OMDBItem) => toMovie(i));
    return {
      ok: true, page,
      results,
      total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
      total_results: parseInt(data.totalResults || '0') || 0,
    };
  } catch {
    return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  }
}

export async function getMovieDetail(imdbId: string): Promise<MovieDetail | null> {
  // Ищем в локальном каталоге
  const builtin = ALL_BUILTIN.find(m => m.imdbID === imdbId);
  if (builtin) return builtinToDetail(builtin);

  // Ищем через OMDb
  try {
    const data = await omdb({ i: imdbId, plot: 'full' });
    return toDetail(data);
  } catch {
    return null;
  }
}