/* ===== TeleCinema — Catalog API =====
 * OMDb напрямую из браузера (CORS разрешён).
 * Видеоплеер: vidsrc.to / vidsrc.me / embed.su — работают без сервера.
 */

import type { Movie, CatalogResponse, MovieDetail, Genre } from '../types';

const OMDB_KEY = 'trilogy';
const OMDB_BASE = 'https://www.omdbapi.com';

/* ===== Русские названия ===== */
const RU: Record<string, string> = {
  'tt0133093':'Матрица','tt1375666':'Начало','tt0816692':'Интерстеллар',
  'tt0468569':'Тёмный рыцарь','tt0109830':'Форрест Гамп','tt0111161':'Побег из Шоушенка',
  'tt0068646':'Крёстный отец','tt0120737':'Властелин колец: Братство кольца',
  'tt0167260':'Властелин колец: Две крепости','tt0167261':'Властелин колец: Возвращение короля',
  'tt0910970':'ВАЛЛ-И','tt0317248':'Город грехов','tt0253474':'Пианист',
  'tt0108052':'Список Шиндлера','tt4154756':'Мстители: Война бесконечности',
  'tt4154796':'Мстители: Финал','tt0848228':'Мстители','tt0499549':'Аватар',
  'tt0110357':'Король Лев','tt0103064':'Терминатор 2','tt0088247':'Терминатор',
  'tt1345836':'Тёмный рыцарь: Возрождение легенды','tt0372784':'Бэтмен: Начало',
  'tt7286456':'Джокер','tt6751668':'Паразиты','tt0120338':'Титаник',
  'tt0110912':'Криминальное чтиво','tt0137523':'Бойцовский клуб','tt0120689':'Зелёная миля',
  'tt0107048':'День сурка','tt0088763':'Назад в будущее','tt0114709':'История игрушек',
  'tt0076759':'Звёздные войны','tt0107290':'Парк Юрского периода','tt0245429':'Унесённые призраками',
  'tt0407887':'Отступники','tt0993846':'Волк с Уолл-стрит','tt0172495':'Гладиатор',
  'tt0211915':'Амели','tt0338013':'Вечное сияние чистого разума',
  'tt0441773':'Кунг-фу панда','tt0477348':'Старикам тут не место','tt0482571':'Престиж',
  'tt0903747':'Во все тяжкие','tt0944947':'Игра престолов','tt4555426':'Дюна',
  'tt6723592':'Довод','tt5113040':'Дюна: Часть вторая',
  'tt15398776':'Оппенгеймер','tt1745960':'Лучший стрелок: Маверик',
  'tt13238346':'Барби','tt1464335':'Стражи Галактики 3',
};

/* ===== Плеер — несколько источников по приоритету ===== */
export const PLAYER_SOURCES = [
  { label: 'VidSrc Pro',  base: 'https://vidsrc.pro/embed/movie/',   idType: 'imdb' },
  { label: 'VidSrc.to',  base: 'https://vidsrc.to/embed/movie/',    idType: 'imdb' },
  { label: 'VidSrc.me',  base: 'https://vidsrc.me/embed/movie/',    idType: 'imdb' },
  { label: 'embed.su',   base: 'https://embed.su/embed/movie/',     idType: 'imdb' },
  { label: '2embed',     base: 'https://www.2embed.cc/embed/',      idType: 'imdb' },
];

export const PLAYER_SOURCES_TV = [
  { label: 'VidSrc Pro',  base: 'https://vidsrc.pro/embed/tv/',     idType: 'imdb' },
  { label: 'VidSrc.to',  base: 'https://vidsrc.to/embed/tv/',      idType: 'imdb' },
  { label: 'VidSrc.me',  base: 'https://vidsrc.me/embed/tv/',      idType: 'imdb' },
  { label: 'embed.su',   base: 'https://embed.su/embed/tv/',       idType: 'imdb' },
];

/* ===== Изображения ===== */
const poster = (p: string | null) => {
  if (!p || p === 'N/A') return '/no-poster.svg';
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p;
  return `/no-poster.svg`;
};
export const posterUrl = poster;
export const backdropUrl = (p: string | null) => p && p !== 'N/A' ? poster(p) : '';

/* ===== OMDb ===== */
interface OMDBItem {
  Title: string; Year: string; imdbID: string; Type: string; Poster: string;
}
interface OMDBDetail extends OMDBItem {
  Plot: string; imdbRating: string; Genre: string; Director: string; Actors: string;
  Runtime: string; Country: string; Ratings: { Source: string; Value: string }[];
}

async function omdb(p: Record<string, any>): Promise<any> {
  const u = new URL(OMDB_BASE);
  u.searchParams.set('apikey', OMDB_KEY);
  for (const [k, v] of Object.entries(p))
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  const r = await fetch(u.toString());
  const d = await r.json();
  if (d.Response === 'False') throw new Error(d.Error || 'NOT_FOUND');
  return d;
}

function imdbHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toMovie(i: OMDBItem): Movie {
  const id = i.imdbID || '';
  const ruTitle = RU[id];
  return {
    id: imdbHash(id), title: ruTitle || i.Title || 'Без названия',
    original_title: i.Title || '',
    overview: '', poster_path: poster(i.Poster), backdrop_path: poster(i.Poster),
    release_date: i.Year || '', vote_average: 0,
    kinopoisk_rating: 0, imdb_rating: 0, runtime: null,
    genre_ids: [], genres: [],
    type: i.Type === 'series' ? 'serial' : 'movie',
    is_serial: i.Type === 'series',
    imdb_id: id, kinopoisk_id: id,
    quality: '', translator: '', iframe_url: '',
    countries: [], actors: [], directors: [],
    popularity: 0, adult: false,
  };
}

function toDetail(i: OMDBDetail): MovieDetail {
  const m = toMovie(i);
  const gn = i.Genre?.split(', ')?.filter(Boolean) || [];
  const rt = i.Runtime?.match(/(\d+)/);
  const rating = parseFloat(i.imdbRating) || 0;
  return {
    ...m,
    overview: i.Plot && i.Plot !== 'N/A' ? i.Plot : m.overview,
    vote_average: rating, imdb_rating: rating,
    runtime: rt ? parseInt(rt[1]) : null,
    genre_ids: gn.map((_: string, i: number) => i + 1),
    genres: gn.map((n: string, i: number) => ({ id: i + 1, name: n })),
    actors: i.Actors?.split(', ')?.filter(Boolean) || [],
    directors: i.Director?.split(', ')?.filter(Boolean) || [],
    countries: i.Country?.split(', ')?.filter(Boolean) || [],
    poster_path: poster(i.Poster), backdrop_path: poster(i.Poster),
    seasons: [], similar: [],
  };
}

/* ===== 90+ фильмов и сериалов ===== */
const ALL_IDS = [
  'tt15398776','tt13238346','tt1745960','tt5113040','tt9362722','tt4555426','tt1464335',
  'tt1375666','tt0816692','tt0133093','tt0468569','tt0109830','tt0111161','tt0120737',
  'tt4154756','tt0499549','tt7286456','tt6751668','tt0120338','tt0903747',
  'tt5433142','tt1517268','tt9114286','tt1642628','tt10731256','tt1790864','tt6443346',
  'tt6723592','tt1489887','tt0068646','tt0167260','tt0167261','tt0910970',
  'tt4154796','tt0103064','tt1345836','tt0110912','tt0137523','tt0120689','tt0088763',
  'tt0108052','tt0172495','tt0407887','tt0993846','tt0338013','tt0441773',
  'tt0482571','tt5113040','tt1856101','tt1392190','tt2582802',
  'tt3659388','tt5027774','tt5726616','tt5109280','tt6139732',
  'tt7323606','tt7734218','tt8178634','tt8367814',
  'tt0944947','tt5491994','tt7366338','tt0108778','tt0898266','tt0411008',
  'tt1475582','tt1520211','tt3032476','tt2861424','tt5180504','tt7658402',
  'tt2306299','tt3526078','tt4574334','tt8111088','tt9174558','tt10048342',
];

/* ===== Кэш ===== */
let _cache: Record<string, any> | null = null;
let _cacheLoaded = false;

function getCache(): Record<string, any> {
  if (_cacheLoaded) return _cache || {};
  try {
    const raw = localStorage.getItem('tc_cache_v2');
    if (raw) {
      const { data, time } = JSON.parse(raw);
      if (Date.now() - time < 60 * 60 * 1000) _cache = data;
    }
  } catch {}
  _cacheLoaded = true;
  return _cache || {};
}

function saveCache(data: Record<string, any>) {
  _cache = data;
  try { localStorage.setItem('tc_cache_v2', JSON.stringify({ data, time: Date.now() })); } catch {}
}

async function loadBatch(ids: string[], limit = 30): Promise<Movie[]> {
  const cache = getCache();
  const results: Movie[] = [];
  const toFetch: string[] = [];

  for (const id of ids) {
    if (cache[id]) results.push(cache[id]);
    else toFetch.push(id);
    if (results.length + toFetch.length >= limit * 2) break;
  }

  if (results.length >= limit) {
    if (toFetch.length > 0) refreshCache(toFetch);
    return results.slice(0, limit);
  }

  const needed = toFetch.slice(0, limit);
  for (let i = 0; i < needed.length; i += 5) {
    const batch = needed.slice(i, i + 5);
    const responses = await Promise.allSettled(
      batch.map((id) => omdb({ i: id, plot: 'short' }))
    );
    for (const r of responses) {
      if (r.status === 'fulfilled' && r.value?.imdbID) {
        const m = toDetail(r.value);
        results.push(m);
        cache[r.value.imdbID] = m;
      }
    }
    if (results.length >= limit) break;
  }
  saveCache(cache);
  const remaining = toFetch.slice(limit);
  if (remaining.length > 0) setTimeout(() => refreshCache(remaining), 500);
  return results.slice(0, limit);
}

function refreshCache(ids: string[]) {
  const cache = getCache();
  const toFetch = ids.filter((id) => !cache[id]);
  if (toFetch.length === 0) return;
  (async () => {
    for (let i = 0; i < toFetch.length; i += 5) {
      const responses = await Promise.allSettled(
        toFetch.slice(i, i + 5).map((id) => omdb({ i: id, plot: 'short' }))
      );
      for (const r of responses) {
        if (r.status === 'fulfilled' && r.value?.imdbID) cache[r.value.imdbID] = toDetail(r.value);
      }
      if (i % 15 === 0) saveCache(cache);
    }
    saveCache(cache);
  })();
}

/* ===== Встроенный каталог ===== */
const BUILTIN: MovieDetail[] = [
  {id:15398776,title:'Оппенгеймер',original_title:'Oppenheimer',overview:'История жизни американского физика Роберта Оппенгеймера, руководителя Манхэттенского проекта по созданию ядерного оружия.',poster_path:'https://m.media-amazon.com/images/M/MV5BMDBiZDg0N2MtMjZlNi00NmY5LWIzZDYtMmQ5MDQ4Mjc3NzFhXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMDBiZDg0N2MtMjZlNi00NmY5LWIzZDYtMmQ5MDQ4Mjc3NzFhXkEyXkFqcGc@._V1_SX300.jpg',release_date:'2023',vote_average:8.8,kinopoisk_rating:0,imdb_rating:8.8,runtime:180,genre_ids:[1,4],genres:[{id:1,name:'Биография'},{id:4,name:'Драма'}],type:'movie',is_serial:false,imdb_id:'tt15398776',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Киллиан Мёрфи','Эмили Блант','Мэтт Дэймон'],directors:['Кристофер Нолан'],popularity:99,adult:false,seasons:[],similar:[]},
  {id:13238346,title:'Барби',original_title:'Barbie',overview:'Кукла Барби отправляется из Барбиленда в реальный мир, где сталкивается с несовершенством человечества и открывает смысл жизни.',poster_path:'https://m.media-amazon.com/images/M/MV5BNjU3N2QxNzMtMWJkNS00NjRjLTkwMzItMzE1YzE5NmUxNTc2XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BNjU3N2QxNzMtMWJkNS00NjRjLTkwMzItMzE1YzE5NmUxNTc2XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2023',vote_average:7.4,kinopoisk_rating:0,imdb_rating:7.4,runtime:114,genre_ids:[3,12],genres:[{id:3,name:'Комедия'},{id:12,name:'Приключения'}],type:'movie',is_serial:false,imdb_id:'tt13238346',kinopoisk_id:'',quality:'HD',translator:'',iframe_url:'',countries:['США'],actors:['Марго Робби','Райан Гослинг'],directors:['Грета Гервиг'],popularity:95,adult:false,seasons:[],similar:[]},
  {id:4555426,title:'Дюна',original_title:'Dune: Part One',overview:'Пол Атрейдес отправляется на пустынную планету Арракис, где разворачивается масштабная битва за самую ценную пряность во вселенной.',poster_path:'https://m.media-amazon.com/images/M/MV5BYTAzYzNlMDMtMmVhYy00Y2NiLThiN2YtMGU5MjA3NjI3N2Q0XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BYTAzYzNlMDMtMmVhYy00Y2NiLThiN2YtMGU5MjA3NjI3N2Q0XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2021',vote_average:8.0,kinopoisk_rating:0,imdb_rating:8.0,runtime:155,genre_ids:[5,12],genres:[{id:5,name:'Фантастика'},{id:12,name:'Приключения'}],type:'movie',is_serial:false,imdb_id:'tt4555426',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Тимоти Шаламе','Зендея','Хавьер Бардем'],directors:['Дени Вильнёв'],popularity:90,adult:false,seasons:[],similar:[]},
  {id:1375666,title:'Начало',original_title:'Inception',overview:'Профессиональный вор, специализирующийся на краже идей из подсознания, получает уникальное задание — внедрить идею в сознание цели.',poster_path:'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',release_date:'2010',vote_average:8.8,kinopoisk_rating:0,imdb_rating:8.8,runtime:148,genre_ids:[5,4],genres:[{id:5,name:'Фантастика'},{id:4,name:'Триллер'}],type:'movie',is_serial:false,imdb_id:'tt1375666',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Леонардо ДиКаприо','Джозеф Гордон-Левитт'],directors:['Кристофер Нолан'],popularity:97,adult:false,seasons:[],similar:[]},
  {id:8131666,title:'Дюна: Часть вторая',original_title:'Dune: Part Two',overview:'Пол Атрейдес объединяется с фрименами, чтобы отомстить заговорщикам, уничтожившим его семью, и исполнить своё пророческое предназначение.',poster_path:'https://m.media-amazon.com/images/M/MV5BNGZlZjVjM2QtNGQ2ZS00ZjA4LTliMDItYzI4Mjc4OWM1YjU4XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BNGZlZjVjM2QtNGQ2ZS00ZjA4LTliMDItYzI4Mjc4OWM1YjU4XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2024',vote_average:8.6,kinopoisk_rating:0,imdb_rating:8.6,runtime:167,genre_ids:[5,12,4],genres:[{id:5,name:'Фантастика'},{id:12,name:'Приключения'}],type:'movie',is_serial:false,imdb_id:'tt15239678',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Тимоти Шаламе','Зендея'],directors:['Дени Вильнёв'],popularity:92,adult:false,seasons:[],similar:[]},
  {id:9362722,title:'Пауки: Паутина вселенных',original_title:'Spider-Man: Across the Spider-Verse',overview:'Майлз Моралес отправляется в мультивселенную, где встречает армию других Пауков и сталкивается с судьбоносным выбором.',poster_path:'https://m.media-amazon.com/images/M/MV5BMzI0NmVkMjEtYmY4MS00ZDMxLWE2ZTUtYzQyM2RkYjQxN2ZmXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMzI0NmVkMjEtYmY4MS00ZDMxLWE2ZTUtYzQyM2RkYjQxN2ZmXkEyXkFqcGc@._V1_SX300.jpg',release_date:'2023',vote_average:8.7,kinopoisk_rating:0,imdb_rating:8.7,runtime:140,genre_ids:[13,5,12],genres:[{id:13,name:'Мультфильм'},{id:5,name:'Фантастика'}],type:'movie',is_serial:false,imdb_id:'tt9362722',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Шамик Андерсон','Хэйли Стайнфелд'],directors:['Хоакин Дос Сантос'],popularity:88,adult:false,seasons:[],similar:[]},
  {id:1727824,title:'Бойцовский клуб',original_title:'Fight Club',overview:'Страдающий бессонницей офисный работник знакомится с загадочным продавцом мыла и создаёт подпольный бойцовский клуб.',poster_path:'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtNmEyYjBiMjI1Y2M5XkEyXkFqcGc@._V1_SX300.jpg',release_date:'1999',vote_average:8.8,kinopoisk_rating:0,imdb_rating:8.8,runtime:139,genre_ids:[4,2],genres:[{id:4,name:'Драма'},{id:2,name:'Триллер'}],type:'movie',is_serial:false,imdb_id:'tt0137523',kinopoisk_id:'',quality:'HD',translator:'',iframe_url:'',countries:['США'],actors:['Брэд Питт','Эдвард Нортон'],directors:['Дэвид Финчер'],popularity:93,adult:false,seasons:[],similar:[]},
  {id:1464335,title:'Стражи Галактики 3',original_title:'Guardians of the Galaxy Vol. 3',overview:'Стражи Галактики отправляются в последнее приключение, чтобы спасти Ракету от его создателя — Высшего эволюционера.',poster_path:'https://m.media-amazon.com/images/M/MV5BOTA1Mzg3NjI2NV5BMl5BanBnXkFtZTgwMDQ2ODI5NTM@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BOTA1Mzg3NjI2NV5BMl5BanBnXkFtZTgwMDQ2ODI5NTM@._V1_SX300.jpg',release_date:'2023',vote_average:8.0,kinopoisk_rating:0,imdb_rating:8.0,runtime:150,genre_ids:[5,12,3],genres:[{id:5,name:'Фантастика'},{id:12,name:'Приключения'},{id:3,name:'Комедия'}],type:'movie',is_serial:false,imdb_id:'tt6791350',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Крис Прэтт','Зоя Салдана'],directors:['Джеймс Ганн'],popularity:85,adult:false,seasons:[],similar:[]},
  {id:7286456,title:'Джокер',original_title:'Joker',overview:'История становления главного злодея Готэма — неудачливый комик превращается в хаотичного преступника Джокера.',poster_path:'https://m.media-amazon.com/images/M/MV5BNzY3OWQ5MTktZDM2Ny00OTVkLWI5OTctY2MwNTJiZTU5YzY3XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BNzY3OWQ5MTktZDM2Ny00OTVkLWI5OTctY2MwNTJiZTU5YzY3XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2019',vote_average:8.4,kinopoisk_rating:0,imdb_rating:8.4,runtime:122,genre_ids:[4,2,6],genres:[{id:4,name:'Драма'},{id:2,name:'Триллер'}],type:'movie',is_serial:false,imdb_id:'tt7286456',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Хоакин Феникс','Роберт Де Ниро'],directors:['Тодд Филлипс'],popularity:91,adult:false,seasons:[],similar:[]},
  {id:6751668,title:'Паразиты',original_title:'Parasite',overview:'Бедная корейская семья виртуозно внедряется в богатый дом, но давние тайны грозят разрушить всё.',poster_path:'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_SX300.jpg',release_date:'2019',vote_average:8.5,kinopoisk_rating:0,imdb_rating:8.5,runtime:132,genre_ids:[4,2,3],genres:[{id:4,name:'Драма'},{id:2,name:'Триллер'},{id:3,name:'Комедия'}],type:'movie',is_serial:false,imdb_id:'tt6751668',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['Южная Корея'],actors:['Со Кан-хо','Ли Сон-гюн'],directors:['Пон Джун-хо'],popularity:87,adult:false,seasons:[],similar:[]},
  {id:903624,title:'Матрица',original_title:'The Matrix',overview:'Хакер Нео узнаёт, что привычная реальность — всего лишь иллюзия, созданная машинами, и присоединяется к восстанию.',poster_path:'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODEzM2ZkZDc5Y2UyXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODEzM2ZkZDc5Y2UyXkEyXkFqcGc@._V1_SX300.jpg',release_date:'1999',vote_average:8.7,kinopoisk_rating:0,imdb_rating:8.7,runtime:136,genre_ids:[5,1],genres:[{id:5,name:'Фантастика'},{id:1,name:'Боевик'}],type:'movie',is_serial:false,imdb_id:'tt0133093',kinopoisk_id:'',quality:'HD',translator:'',iframe_url:'',countries:['США'],actors:['Киану Ривз','Лоуренс Фишборн'],directors:['Лана Вачовски'],popularity:96,adult:false,seasons:[],similar:[]},
  {id:1745960,title:'Лучший стрелок: Маверик',original_title:'Top Gun: Maverick',overview:'Легендарный пилот Маверик возвращается в лётную школу, чтобы подготовить новое поколение к опасной миссии.',poster_path:'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjY5YmIwYmI5XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjY5YmIwYmI5XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2022',vote_average:8.3,kinopoisk_rating:0,imdb_rating:8.3,runtime:130,genre_ids:[1,4],genres:[{id:1,name:'Боевик'},{id:4,name:'Драма'}],type:'movie',is_serial:false,imdb_id:'tt1745960',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Том Круз','Майлз Теллер'],directors:['Джозеф Косински'],popularity:89,adult:false,seasons:[],similar:[]},
  {id:6723592,title:'Довод',original_title:'Tenet',overview:'Безымянный агент путешествует во времени, чтобы предотвратить Третью мировую войну, используя технологию инверсии энтропии.',poster_path:'https://m.media-amazon.com/images/M/MV5BNTYyMjczMjMtYzYxZC00YTRjLTkwYjItYzY5ZjNmOTZiNTIxXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BNTYyMjczMjMtYzYxZC00YTRjLTkwYjItYzY5ZjNmOTZiNTIxXkEyXkFqcGc@._V1_SX300.jpg',release_date:'2020',vote_average:7.3,kinopoisk_rating:0,imdb_rating:7.3,runtime:150,genre_ids:[5,1,2],genres:[{id:5,name:'Фантастика'},{id:1,name:'Боевик'},{id:2,name:'Триллер'}],type:'movie',is_serial:false,imdb_id:'tt6723592',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Джон Дэвид Вашингтон','Роберт Паттинсон'],directors:['Кристофер Нолан'],popularity:82,adult:false,seasons:[],similar:[]},
  {id:907232,title:'Интерстеллар',original_title:'Interstellar',overview:'Группа исследователей отправляется через червоточину в поисках нового дома для человечества.',poster_path:'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX300.jpg',release_date:'2014',vote_average:8.7,kinopoisk_rating:0,imdb_rating:8.7,runtime:169,genre_ids:[5,4,12],genres:[{id:5,name:'Фантастика'},{id:4,name:'Драма'},{id:12,name:'Приключения'}],type:'movie',is_serial:false,imdb_id:'tt0816692',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Мэттью МакКонахи','Энн Хэтэуэй'],directors:['Кристофер Нолан'],popularity:98,adult:false,seasons:[],similar:[]},
  {id:4154756,title:'Мстители: Война бесконечности',original_title:'Avengers: Infinity War',overview:'Танос собирает камни Бесконечности. Мстители объединяются в последней попытке остановить его.',poster_path:'https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNjY1MTUwNTM@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNjY1MTUwNTM@._V1_SX300.jpg',release_date:'2018',vote_average:8.4,kinopoisk_rating:0,imdb_rating:8.4,runtime:149,genre_ids:[5,1,12],genres:[{id:5,name:'Фантастика'},{id:1,name:'Боевик'}],type:'movie',is_serial:false,imdb_id:'tt4154756',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Роберт Дауни мл.','Крис Эванс','Джош Бролин'],directors:['Энтони Руссо'],popularity:94,adult:false,seasons:[],similar:[]},
  {id:4154796,title:'Мстители: Финал',original_title:'Avengers: Endgame',overview:'После щелчка Таноса выжившие Мстители планируют путешествие во времени, чтобы вернуть утраченное.',poster_path:'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX300.jpg',release_date:'2019',vote_average:8.4,kinopoisk_rating:0,imdb_rating:8.4,runtime:181,genre_ids:[5,1,4],genres:[{id:5,name:'Фантастика'},{id:1,name:'Боевик'}],type:'movie',is_serial:false,imdb_id:'tt4154796',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Роберт Дауни мл.','Крис Эванс','Скарлетт Йоханссон'],directors:['Энтони Руссо'],popularity:97,adult:false,seasons:[],similar:[]},
  {id:111161,title:'Побег из Шоушенка',original_title:'The Shawshank Redemption',overview:'Несправедливо осуждённый банкир медленно планирует побег из тюрьмы Шоушенк, дружа с опытным заключённым.',poster_path:'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg',release_date:'1994',vote_average:9.3,kinopoisk_rating:0,imdb_rating:9.3,runtime:142,genre_ids:[4],genres:[{id:4,name:'Драма'}],type:'movie',is_serial:false,imdb_id:'tt0111161',kinopoisk_id:'',quality:'HD',translator:'',iframe_url:'',countries:['США'],actors:['Тим Роббинс','Морган Фриман'],directors:['Фрэнк Дарабонт'],popularity:99,adult:false,seasons:[],similar:[]},
  {id:468569,title:'Тёмный рыцарь',original_title:'The Dark Knight',overview:'Бэтмен вступает в противостояние с Джокером, который хочет погрузить Готэм в анархию и хаос.',poster_path:'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',release_date:'2008',vote_average:9.0,kinopoisk_rating:0,imdb_rating:9.0,runtime:152,genre_ids:[1,4,2],genres:[{id:1,name:'Боевик'},{id:4,name:'Драма'},{id:2,name:'Триллер'}],type:'movie',is_serial:false,imdb_id:'tt0468569',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Кристиан Бейл','Хит Леджер'],directors:['Кристофер Нолан'],popularity:100,adult:false,seasons:[],similar:[]},
  {id:120338,title:'Титаник',original_title:'Titanic',overview:'Молодая аристократка влюбляется в бедного художника на борту «Титаника» накануне его гибели.',poster_path:'https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YzXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YzXkEyXkFqcGc@._V1_SX300.jpg',release_date:'1997',vote_average:7.9,kinopoisk_rating:0,imdb_rating:7.9,runtime:194,genre_ids:[8,4,10],genres:[{id:8,name:'Мелодрама'},{id:4,name:'Драма'},{id:10,name:'Исторический'}],type:'movie',is_serial:false,imdb_id:'tt0120338',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США'],actors:['Леонардо ДиКаприо','Кейт Уинслет'],directors:['Джеймс Кэмерон'],popularity:95,adult:false,seasons:[],similar:[]},
  {id:5013056,title:'Дюнкерк',original_title:'Dunkirk',overview:'Масштабная эвакуация союзных войск с французского пляжа в 1940 году с трёх точек зрения.',poster_path:'https://m.media-amazon.com/images/M/MV5BN2YyZjQ0NTEtNzU5MS00NGZkLTg3ZjgtOGI0ZjE1OGQ0MjUzXkEyXkFqcGc@._V1_SX300.jpg',backdrop_path:'https://m.media-amazon.com/images/M/MV5BN2YyZjQ0NTEtNzU5MS00NGZkLTg3ZjgtOGI0ZjE1OGQ0MjUzXkEyXkFqcGc@._V1_SX300.jpg',release_date:'2017',vote_average:7.8,kinopoisk_rating:0,imdb_rating:7.8,runtime:106,genre_ids:[1,10,4],genres:[{id:1,name:'Боевик'},{id:10,name:'Военный'},{id:4,name:'Драма'}],type:'movie',is_serial:false,imdb_id:'tt5013056',kinopoisk_id:'',quality:'4K',translator:'',iframe_url:'',countries:['США','Великобритания'],actors:['Финн Уайтхед','Том Харди','Марк Райлэнс'],directors:['Кристофер Нолан'],popularity:84,adult:false,seasons:[],similar:[]},
];

/* ===== API ===== */

export const getCatalog = async (_p?: any): Promise<CatalogResponse> => {
  const results = BUILTIN as Movie[];
  return { ok: true, page: 1, results, total_pages: 1, total_results: results.length };
};

export const searchCatalog = async (q: string, page = 1, type?: string): Promise<CatalogResponse> => {
  try {
    const params: Record<string, any> = { s: q, page };
    if (type === 'series') params.type = 'series';
    const data = await omdb(params);
    if (!data.Search) return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
    const items = data.Search.map(toMovie);
    const enriched = await Promise.all(
      items.slice(0, 6).map(async (m: Movie) => {
        try { const d = await omdb({ i: m.imdb_id, plot: 'short' }); return toDetail(d); }
        catch { return m; }
      })
    );
    return {
      ok: true, page,
      results: [...enriched, ...items.slice(6)],
      total_pages: Math.ceil(Math.min(parseInt(data.totalResults || '0'), 100) / 10),
      total_results: parseInt(data.totalResults || '0') || 0,
    };
  } catch {
    return { ok: true, page, results: [], total_pages: 0, total_results: 0 };
  }
};

export const getNovelty = async (_page = 1): Promise<CatalogResponse> => {
  const movies = await loadBatch(ALL_IDS, 24);
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
};

export const getTop = async (_page = 1): Promise<CatalogResponse> => {
  const movies = await loadBatch(ALL_IDS, 24);
  return { ok: true, page: 1, results: movies, total_pages: 1, total_results: movies.length };
};

export const getMovieDetail = async (id: string | number): Promise<MovieDetail> => {
  // Сначала ищем в BUILTIN по числовому id или imdb_id
  const numId = typeof id === 'string' ? parseInt(id) : id;
  const found = BUILTIN.find(m => m.id === numId || m.imdb_id === String(id));
  if (found) return found;
  // Если id выглядит как imdb (ttXXX) - грузим с OMDb
  const sid = String(id);
  if (sid.startsWith('tt')) {
    try { return toDetail(await omdb({ i: sid, plot: 'full' })); } catch {}
  }
  throw new Error('Фильм не найден');
};

export interface PlayerSource { label: string; url: string; type: string; }

export const getPlayerUrl = async (id: string | number, _title: string, isSerial = false): Promise<PlayerSource[]> => {
  const s: PlayerSource[] = [];
  const numId = typeof id === 'string' ? parseInt(id) : id;
  
  // Найти imdb_id по числовому id в BUILTIN
  const movie = BUILTIN.find(m => m.id === numId);
  const imdbId = movie?.imdb_id || (String(id).startsWith('tt') ? String(id) : null);

  if (imdbId) {
    const sources = isSerial ? PLAYER_SOURCES_TV : PLAYER_SOURCES;
    for (const src of sources) {
      s.push({ label: src.label, url: `${src.base}${imdbId}`, type: 'embed' });
    }
  }
  return s;
};

export const getGenres = async (): Promise<Genre[]> => [
  { id: 1, name: 'Боевик' }, { id: 2, name: 'Триллер' }, { id: 3, name: 'Комедия' },
  { id: 4, name: 'Драма' }, { id: 5, name: 'Фантастика' }, { id: 6, name: 'Ужасы' },
  { id: 7, name: 'Приключения' }, { id: 8, name: 'Мелодрама' }, { id: 9, name: 'Детектив' },
  { id: 10, name: 'Военный' }, { id: 11, name: 'Исторический' }, { id: 12, name: 'Семейный' },
  { id: 13, name: 'Мультфильм' }, { id: 14, name: 'Фэнтези' }, { id: 15, name: 'Криминал' },
];

export const getPlayerPattern = (): string => { try { return localStorage.getItem('tc_player_pattern') || ''; } catch { return ''; } };
export const setPlayerPattern = (pattern: string) => { try { localStorage.setItem('tc_player_pattern', pattern); } catch {} };
export const getTmdbKey = () => '';
export const setTmdbKey = (_: string) => {};
export const hasTmdbKey = () => false;
export const checkTmdb = async () => ({ ok: false, message: '' });
