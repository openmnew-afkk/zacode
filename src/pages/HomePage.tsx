import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  getAllTrending, getTrendingMovies, getTrendingSeries,
  getTopRated, getNowPlaying, getPopularByGenre, searchMovies,
  getRussianCinema,
} from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { checkRussianAccess } from '../services/accessControl';
import type { Movie, TrackedItem } from '../types';
import VeloraEmblem from '../components/VeloraEmblem';
import './HomePage.css';

/* ──────────────────────────────────────────────────────── */
/*  Мини-карточка фильма (с длинным нажатием → превью)     */
/* ──────────────────────────────────────────────────────── */
const Card: React.FC<{ movie: Movie; onClick: () => void; onLongPress?: (m: Movie) => void }> = ({ movie, onClick, onLongPress }) => {
  const [err, setErr] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  const startPress = () => {
    if (!onLongPress) return;
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onLongPress(movie);
    }, 450);
  };
  const clearPress = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  const handleClick = () => {
    if (longFired.current) { longFired.current = false; return; }
    onClick();
  };

  return (
    <div
      className={`hp-card${onLongPress ? ' hp-card--pressable' : ''}`}
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={clearPress}
      onTouchMove={clearPress}
      onMouseDown={startPress}
      onMouseUp={clearPress}
      onMouseLeave={clearPress}
      onContextMenu={e => { if (onLongPress) e.preventDefault(); }}
    >
      <div className="hp-card__img-wrap">
        <img
          src={err ? 'https://via.placeholder.com/200x300?text=?' : movie.poster_path}
          alt={movie.title}
          loading="lazy"
          onError={() => setErr(true)}
        />
        {movie.vote_average > 0 && (
          <span className="hp-card__rating">★ {movie.vote_average.toFixed(1)}</span>
        )}
        {movie.is_serial && <span className="hp-card__badge">Сериал</span>}
        {movie.is_russian && <span className="hp-card__badge hp-card__badge--rus">🇷🇺 РФ</span>}
      </div>
      <p className="hp-card__title">{movie.title}</p>
      {movie.release_date && <p className="hp-card__year">{movie.release_date.slice(0, 4)}</p>}
    </div>
  );
};

/* ──────────────────────────────────────────────────────── */
/*  Горизонтальный ряд                                     */
/* ──────────────────────────────────────────────────────── */
const Row: React.FC<{
  title: string;
  movies: Movie[];
  loading?: boolean;
  onMovieClick: (id: string) => void;
  onMovieLongPress?: (m: Movie) => void;
}> = ({ title, movies, loading, onMovieClick, onMovieLongPress }) => {
  if (!loading && movies.length === 0) return null;
  return (
    <div className="hp-row">
      <h3 className="hp-row__title">{title}</h3>
      <div className="hp-row__scroll">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="hp-card hp-card--skeleton">
                <div className="hp-card__img-wrap skeleton-pulse" />
                <div className="hp-card__title skeleton-pulse" style={{ height: 12, width: '80%', marginTop: 6, borderRadius: 6 }} />
              </div>
            ))
          : movies.map((m) => (
              <Card key={m.id} movie={m} onClick={() => onMovieClick(m.id)} onLongPress={onMovieLongPress} />
            ))
        }
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────── */
/*  Продолжить просмотр — градиентные карточки с прогрессом  */
/* ──────────────────────────────────────────────────────── */
const CW_GRADS: Array<[string, string, string]> = [
  ['#3a2a10', '#8a6a2e', '#d4b06a'], // бронза
  ['#0a3a32', '#0e7d5e', '#2bbf96'], // изумруд
  ['#2a1250', '#5b2a9e', '#a06ee8'], // фиолет
  ['#4d0a2e', '#8a1d55', '#e05a96'], // малина
  ['#0a234d', '#1d4e8a', '#5aa0e8'], // синий
];
const cwHash = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const cwGrad = (id: string): string => {
  const [c1, c2, c3] = CW_GRADS[cwHash(id) % CW_GRADS.length];
  return `linear-gradient(100deg, ${c1} 0%, ${c2} 55%, ${c3} 125%)`;
};

const ContinueCard: React.FC<{ item: TrackedItem; onOpen: (id: string) => void }> = ({ item, onOpen }) => {
  const m = item.movie;
  // Пока плеер не отдаёт точную позицию — прогресс оценочный, поле progress готово для него
  const pct = item.progress != null
    ? Math.round(item.progress * 100)
    : 20 + (cwHash(m.id) % 60);
  const minsLeft = m.runtime
    ? Math.max(5, Math.round(m.runtime * (1 - pct / 100)))
    : 25 + (cwHash(m.id) % 20);
  return (
    <button className="hp-cw__card" style={{ background: cwGrad(m.id) }} onClick={() => onOpen(m.id)}>
      <span className="hp-cw__thumb-wrap">
        <img className="hp-cw__thumb" src={m.poster_path} alt={m.title} loading="lazy" />
      </span>
      <span className="hp-cw__info">
        <span className="hp-cw__name">{m.title}</span>
        <span className="hp-cw__bar"><i style={{ width: `${pct}%` }} /></span>
        <span className="hp-cw__meta">
          {pct}%{m.runtime ? ` · осталось ~${minsLeft} мин` : ' · смотрю'}
        </span>
      </span>
      <span className="hp-cw__play">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
      </span>
    </button>
  );
};

/* ──────────────────────────────────────────────────────── */
/*  Hero баннер                                            */
/* ──────────────────────────────────────────────────────── */
const Hero: React.FC<{ movies: Movie[]; onWatch: (id: string) => void }> = ({ movies, onWatch }) => {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const heroMovies = movies.filter(m => m.backdrop_path && !m.backdrop_path.includes('placeholder')).slice(0, 8);
  const touchX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 220);
  }, []);

  const next = useCallback(() => {
    goTo((idx + 1) % Math.max(heroMovies.length, 1));
  }, [idx, heroMovies.length, goTo]);

  const prev = useCallback(() => {
    goTo((idx - 1 + heroMovies.length) % Math.max(heroMovies.length, 1));
  }, [idx, heroMovies.length, goTo]);

  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const t = setInterval(() => {
      setIdx(i => (i + 1) % heroMovies.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroMovies.length]);

  const m = heroMovies[idx];
  if (!m) return null;

  return (
    <div className="hp-hero-wrap">
      {/* Ambient OLED backlight glow spilling beyond borders */}
      <div
        className={`hp-hero-wrap__ambient ${fading ? 'fading' : ''}`}
        style={{ backgroundImage: `url(${m.backdrop_path})` }}
      />
      <div
        className="hp-hero"
        onClick={() => onWatch(m.id)}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null || heroMovies.length <= 1) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx < -45) next();
          else if (dx > 45) prev();
          touchX.current = null;
        }}
      >
      <div className={`hp-hero__bg ${fading ? 'fading' : ''}`} style={{ backgroundImage: `url(${m.backdrop_path})` }} />
      <div className="hp-hero__overlay" />
      <div className={`hp-hero__content ${fading ? 'fading' : ''}`}>
        <div className="hp-hero__chip">
          <span className="hp-hero__chip-dot" />
          <span>{m.is_serial ? 'Сериал' : 'Фильм'} · В тренде</span>
        </div>
        <h2 className="hp-hero__title">{m.title}</h2>
        {m.overview && <p className="hp-hero__desc">{m.overview.slice(0, 110)}…</p>}
        <div className="hp-hero__actions">
          <button className="hp-hero__btn" onClick={e => { e.stopPropagation(); onWatch(m.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
            Смотреть
          </button>
          {m.vote_average > 0 && <span className="hp-hero__tag hp-hero__tag--gold">★ {m.vote_average.toFixed(1)}</span>}
          {m.release_date && <span className="hp-hero__tag">{m.release_date.slice(0, 4)}</span>}
        </div>
      </div>
      <div className="hp-hero__dots">
        {heroMovies.map((_, i) => (
          <span
            key={i}
            className={`hp-hero__dot ${i === idx ? 'hp-hero__dot--on' : ''}`}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
          />
        ))}
      </div>
    </div>
  </div>
  );
};

/* ──────────────────────────────────────────────────────── */
/*  Главная страница                                       */
/* ──────────────────────────────────────────────────────── */

const TABS = [
  { id: 'home', label: 'Главная' },
  { id: 'movies', label: 'Фильмы' },
  { id: 'series', label: 'Сериалы' },
  { id: 'russian', label: '🇷🇺 РФ Кино' },
  { id: 'top', label: 'Топ' },
  { id: 'new', label: 'Новинки' },
];

const GENRES_MOVIES = [
  { id: 28, name: 'Боевики' },
  { id: 35, name: 'Комедии' },
  { id: 18, name: 'Драмы' },
  { id: 27, name: 'Ужасы' },
  { id: 878, name: 'Фантастика' },
  { id: 10749, name: 'Мелодрамы' },
  { id: 53, name: 'Триллеры' },
  { id: 16, name: 'Анимация' },
  { id: 12, name: 'Приключения' },
  { id: 80, name: 'Криминал' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: tgUser } = useTelegram();
  const { favorites, tracked, addFavorite, removeFavorite, isFavorite, announcement, adsEnabled, isPremium, theme, toggleTheme } = useStore();
  const watchingTracked = Object.values(tracked)
    .filter((t) => t.status === 'watching')
    .sort((a, b) => b.addedAt - a.addedAt);
  const { haptic } = useTelegram();
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Movie | null>(null);
  const [lockedMovie, setLockedMovie] = useState<Movie | null>(null);

  // Блокируем скролл страницы под открытым превью или модалкой
  useEffect(() => {
    if (!preview && !lockedMovie) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [preview, lockedMovie]);

  const openPreview = useCallback((m: Movie) => {
    haptic('medium');
    setPreview(m);
  }, [haptic]);

  // Данные для каждой секции
  const [trending, setTrending] = useState<Movie[]>([]);
  const [trendMovies, setTrendMovies] = useState<Movie[]>([]);
  const [trendSeries, setTrendSeries] = useState<Movie[]>([]);
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [topSeries, setTopSeries] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [russianCinema, setRussianCinema] = useState<Movie[]>([]);
  const [genreRows, setGenreRows] = useState<Record<number, Movie[]>>({});
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  const [loadingMain, setLoadingMain] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleMovieClick = (id: string) => {
    const all = [...trending, ...trendMovies, ...trendSeries, ...topMovies, ...topSeries, ...nowPlaying, ...russianCinema, ...searchResults];
    const movie = all.find(m => m.id === id);
    const isRus = movie?.is_russian || (movie?.id && String(movie.id).startsWith('rus-'));
    if (isRus && !checkRussianAccess(tgUser?.username)) {
      haptic('heavy');
      setLockedMovie(movie || ({ id, title: 'Российское кино', is_russian: true } as Movie));
      return;
    }
    navigate(`/movie/${id}`);
  };

  const go = handleMovieClick;

  /* Загрузка главных данных */
  useEffect(() => {
    let alive = true;
    setLoadingMain(true);
    setLoadError(false);

    const load = async () => {
      try {
        const results = await Promise.allSettled([
          getAllTrending(),
          getTrendingMovies(),
          getTrendingSeries(),
          getTopRated('movie'),
          getTopRated('series'),
          getNowPlaying(),
          getRussianCinema(),
        ]);
        if (!alive) return;

        const get = (i: number) => results[i].status === 'fulfilled' ? (results[i] as any).value : [];

        const tr = get(0), tm = get(1), ts = get(2), top_m = get(3), top_s = get(4), np = get(5), rus = get(6);
        setTrending(tr);
        setTrendMovies(tm);
        setTrendSeries(ts);
        setTopMovies(top_m);
        setTopSeries(top_s);
        setNowPlaying(np);
        setRussianCinema(rus);

        // Если ВСЕ пустые — ошибка загрузки
        const total = tr.length + tm.length + ts.length + top_m.length + top_s.length + np.length + rus.length;
        if (total === 0) setLoadError(true);
      } catch (e) {
        console.error('Home load error:', e);
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoadingMain(false);
      }
    };
    load();

    // Жанры загружаем лениво
    GENRES_MOVIES.forEach(async (g) => {
      try {
        const res = await getPopularByGenre(g.id);
        if (alive) setGenreRows(prev => ({ ...prev, [g.id]: res.results }));
      } catch {}
    });

    return () => { alive = false; };
  }, [retryCount]);

  /* Поиск */
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchMovies(query.trim());
        setSearchResults(res.results);
      } catch {}
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const heroMovies = trending.length ? trending : trendMovies;

  /* ── Рендер вкладок ── */
  const renderContent = () => {
    if (showSearch) {
      return (
        <div className="hp-search-results">
          {searchLoading && (
            <div className="hp-search-loading">
              <div className="hp-spinner" /> Поиск…
            </div>
          )}
          {!searchLoading && searchResults.length === 0 && query.trim() && (
            <div className="hp-empty">По запросу «{query}» ничего не найдено</div>
          )}
          {!searchLoading && searchResults.length === 0 && !query.trim() && (
            <div className="hp-empty">Введите название фильма или сериала</div>
          )}
          <div className="hp-grid">
            {searchResults.map(m => <Card key={m.id} movie={m} onClick={() => go(m.id)} onLongPress={openPreview} />)}
          </div>
        </div>
      );
    }

    if (tab === 'home') {
      return (
        <>
          {/* Ошибка загрузки */}
          {loadError && !loadingMain && trending.length === 0 && (
            <div className="hp-error">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6}}>Не удалось загрузить</p>
              <p style={{fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16}}>Проверьте интернет-соединение</p>
              <button
                style={{display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 12, background: 'rgba(251,113,133,0.16)', border: '1px solid rgba(251,113,133,0.3)', color: '#fda4af', fontWeight: 700, fontSize: 13, cursor: 'pointer'}}
                onClick={() => setRetryCount(c => c + 1)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                Повторить
              </button>
            </div>
          )}

          {/* Загрузка */}
          {loadingMain && trending.length === 0 && (
            <div className="hp-error">
              <div className="hp-spinner" />
              <p style={{fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 12}}>Загрузка каталога…</p>
            </div>
          )}

          {watchingTracked.length > 0 && (
            <div className="hp-cw">
              <h3 className="hp-cw__heading">Продолжить просмотр</h3>
              {watchingTracked.slice(0, 4).map((t) => (
                <ContinueCard key={t.movie.id} item={t} onOpen={go} />
              ))}
            </div>
          )}
          <Row title="🇷🇺 Российские сериалы и фильмы" movies={russianCinema} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Тренды недели" movies={trending} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Сейчас в кино" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Топ фильмов всех времён" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие сериалы" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          ))}
        </>
      );
    }

    if (tab === 'russian') {
      const rusMovies = russianCinema.filter(m => !m.is_serial);
      const rusSeries = russianCinema.filter(m => m.is_serial);
      const hasAccess = checkRussianAccess(tgUser?.username);
      return (
        <>
          <div className="hp-rus-banner">
            <div className="hp-rus-banner__content">
              <div className="hp-rus-banner__header">
                <span className="hp-rus-banner__badge">🇷🇺 РФ КИНО & СЕРИАЛЫ</span>
                {hasAccess ? (
                  <span className="hp-rus-access-pill hp-rus-access-pill--active">✓ Доступ открыт (@{tgUser?.username || 'аккаунт'})</span>
                ) : (
                  <span className="hp-rus-access-pill hp-rus-access-pill--locked">🔒 Выдаётся по нику в админке</span>
                )}
              </div>
              <h2 className="hp-rus-banner__title">Премьеры и культовые проекты РФ</h2>
              <p className="hp-rus-banner__desc">
                Слово пацана, Цикады, Триггер, Холоп, Кухня, Мажор и другие хиты в Full HD.
                {!hasAccess && ' Для получения доступа обратитесь к администратору в Telegram.'}
              </p>
              {!hasAccess && (
                <a
                  href="https://t.me/MikySauce"
                  target="_blank"
                  rel="noreferrer"
                  className="hp-rus-banner__btn"
                  onClick={() => haptic('medium')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  Запросить доступ у @MikySauce
                </a>
              )}
            </div>
          </div>
          <Row title="🔥 Горячие новинки РФ" movies={russianCinema} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="📺 Топовые сериалы РФ" movies={rusSeries.length > 0 ? rusSeries : russianCinema} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="🎬 Российские фильмы" movies={rusMovies.length > 0 ? rusMovies : russianCinema} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    if (tab === 'movies') {
      return (
        <>
          <Row title="Тренды — Фильмы" movies={trendMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Сейчас в кино" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие фильмы" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          ))}
        </>
      );
    }

    if (tab === 'series') {
      return (
        <>
          <Row title="Тренды — Сериалы" movies={trendSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Топ сериалов" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    if (tab === 'top') {
      return (
        <>
          <Row title="Лучшие фильмы всех времён" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие сериалы" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    if (tab === 'new') {
      return (
        <>
          <Row title="Новинки в кино" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Тренды" movies={trending} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    return null;
  };

  return (
    <div className="hp page">
      {/* ── Объявление / реклама (только для пользователей без премиума) ── */}
      {!isPremium && adsEnabled && announcement.trim() && (
        <div className="hp-ad">
          <span className="hp-ad__icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span className="hp-ad__text">{announcement}</span>
        </div>
      )}

      {/* ── Шапка ── */}
      <div className="hp-header">
        {showSearch ? (
          <div className="hp-searchbar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M12 12l3.5 3.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              className="hp-searchbar__input"
              placeholder="Фильм, сериал, актёр…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <button className="hp-searchbar__close" onClick={() => { setShowSearch(false); setQuery(''); setSearchResults([]); }}>✕</button>
          </div>
        ) : (
          <>
            <div className="hp-header__brand">
              <div className="hp-header__emblem">
                <VeloraEmblem size="sm" />
              </div>
              <div>
                <h1 className="hp-header__title">ZENOVA</h1>
                <span className="hp-header__sub">Cinema & Sound</span>
              </div>
            </div>
            <div className="hp-header__actions">
              {/* 📰 Новости кино и новинки (Кинолента) */}
              <button
                className="hp-header__feed-btn"
                onClick={() => navigate('/feed')}
                aria-label="Новости и новинки"
                title="Новости кино и новинки"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3.5" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="hp-feed-badge-pulse" />
              </button>
              {/* 🌗 Переключатель темы (Темная / Нежная розовая) */}
              <button
                className="hp-header__btn hp-header__theme-btn"
                onClick={() => { haptic('medium'); toggleTheme(); }}
                aria-label="Сменить тему"
                title={theme === 'dark' ? 'Включить нежную светлую тему' : 'Включить глубокую тёмную тему'}
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" fill="#f43f5e" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
                )}
              </button>
              <button className="hp-header__btn" onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="hp-header__btn hp-header__btn--avatar" onClick={() => navigate('/profile')}>
                {tgUser?.photo_url ? (
                  <img src={tgUser.photo_url} alt="" className="hp-header__avatar" />
                ) : (
                  <span className="hp-header__avatar hp-header__avatar--placeholder">
                    {(tgUser?.first_name || 'Г')[0]?.toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Плавающие фильмы (Hero баннер) — строго ВЫШЕ вкладок! ── */}
      {!showSearch && tab === 'home' && heroMovies.length > 0 && (
        <Hero movies={heroMovies} onWatch={go} />
      )}

      {/* ── Вкладки — теперь строго НИЖЕ плавающих фильмов и ближе к каталогу! ── */}
      {!showSearch && (
        <div className="hp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`hp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Контент ── */}
      <div className="hp-content">
        {renderContent()}
      </div>

      {/* ── Быстрое превью (длинное нажатие на карточку) — портал в body ── */}
      {preview && createPortal(
        <div className="hp-preview-overlay" onClick={() => setPreview(null)}>
          <div
            className="hp-preview__bg"
            style={{ backgroundImage: `url(${preview.backdrop_path || preview.poster_path})` }}
          />
          <div className="hp-preview__veil" />
          <div className="hp-preview" onClick={e => e.stopPropagation()}>
            <button className="hp-preview__close" onClick={() => setPreview(null)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <img
              className="hp-preview__poster"
              src={preview.backdrop_path || preview.poster_path}
              alt={preview.title}
              onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
            <h3 className="hp-preview__title">{preview.title}</h3>
            {preview.original_title && preview.original_title !== preview.title && (
              <p className="hp-preview__original">{preview.original_title}</p>
            )}
            {preview.overview && (
              <div className="hp-preview__desc-wrap">
                <p className="hp-preview__desc">{preview.overview}</p>
              </div>
            )}
            <div className="hp-preview__tags">
              {preview.vote_average > 0 && <span className="hp-preview__tag">★ {preview.vote_average.toFixed(1)}</span>}
              {preview.release_date && <span className="hp-preview__tag">{preview.release_date.slice(0, 4)}</span>}
              <span className="hp-preview__tag">{preview.is_serial ? 'Сериал' : 'Фильм'}</span>
            </div>
            <div className="hp-preview__actions">
              <button
                className="hp-preview__btn hp-preview__btn--primary"
                onClick={() => { setPreview(null); navigate(`/movie/${preview.id}`); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                Смотреть
              </button>
              <button
                className={`hp-preview__btn hp-preview__btn--fav ${isFavorite(preview.id) ? 'active' : ''}`}
                onClick={() => {
                  haptic('medium');
                  if (isFavorite(preview.id)) removeFavorite(preview.id);
                  else addFavorite(preview);
                }}
                aria-label="В избранное"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite(preview.id) ? '#ec4899' : 'none'} stroke={isFavorite(preview.id) ? '#ec4899' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Модалка ограничения доступа к российскому кино ── */}
      {lockedMovie && createPortal(
        <div className="hp-lock-overlay" onClick={() => setLockedMovie(null)}>
          <div className="hp-lock-modal" onClick={e => e.stopPropagation()}>
            <div className="hp-lock-modal__icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="hp-lock-modal__title">Доступ к контенту РФ ограничен</h3>
            <p className="hp-lock-modal__movie">«{lockedMovie.title}»</p>
            <p className="hp-lock-modal__text">
              Просмотр российских сериалов и новинок кино выдаётся администратором индивидуально по вашему нику Telegram.
            </p>
            <div className="hp-lock-modal__nick-box">
              <span className="hp-lock-modal__nick-label">Ваш текущий ник:</span>
              <span className="hp-lock-modal__nick-val">@{tgUser?.username || 'аккаунт_без_ника'}</span>
            </div>
            <div className="hp-lock-modal__actions">
              <a
                href="https://t.me/MikySauce"
                target="_blank"
                rel="noreferrer"
                className="hp-lock-modal__btn hp-lock-modal__btn--tg"
                onClick={() => { haptic('medium'); setLockedMovie(null); }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Запросить доступ у @MikySauce
              </a>
              <button
                className="hp-lock-modal__btn hp-lock-modal__btn--cancel"
                onClick={() => setLockedMovie(null)}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HomePage;