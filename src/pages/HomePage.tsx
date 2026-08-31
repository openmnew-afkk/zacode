import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllTrending, getTrendingMovies, getTrendingSeries,
  getTopRated, getNowPlaying, getPopularByGenre, searchMovies,
} from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
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
  icon?: string;
  movies: Movie[];
  loading?: boolean;
  onMovieClick: (id: string) => void;
  onMovieLongPress?: (m: Movie) => void;
}> = ({ title, icon, movies, loading, onMovieClick, onMovieLongPress }) => {
  if (!loading && movies.length === 0) return null;
  return (
    <div className="hp-row">
      <h3 className="hp-row__title">{icon && <span>{icon}</span>} {title}</h3>
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
          {m.is_serial ? 'Сериал' : 'Фильм'} · Популярное
        </div>
        <h2 className="hp-hero__title">{m.title}</h2>
        {m.overview && <p className="hp-hero__desc">{m.overview.slice(0, 100)}…</p>}
        <div className="hp-hero__meta">
          {m.vote_average > 0 && <span className="hp-hero__rating">★ {m.vote_average.toFixed(1)}</span>}
          {m.release_date && <span>{m.release_date.slice(0, 4)}</span>}
        </div>
        <button className="hp-hero__btn" onClick={e => { e.stopPropagation(); onWatch(m.id); }}>
          ▶ Смотреть
        </button>
      </div>
      {heroMovies.length > 1 && (
        <div className="hp-hero__pager">
          <div className="hp-hero__progress">
            <div key={idx} className="hp-hero__progress-fill" />
          </div>
          <span className="hp-hero__counter">{idx + 1} / {heroMovies.length}</span>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────── */
/*  Главная страница                                       */
/* ──────────────────────────────────────────────────────── */

const TABS = [
  { id: 'home', label: '🏠 Главная' },
  { id: 'movies', label: '🎬 Фильмы' },
  { id: 'series', label: '📺 Сериалы' },
  { id: 'top', label: '🏆 Топ' },
  { id: 'new', label: '🆕 Новинки' },
];

const GENRES_MOVIES = [
  { id: 28, name: '💥 Боевики' },
  { id: 35, name: '😂 Комедии' },
  { id: 18, name: '🎭 Драмы' },
  { id: 27, name: '👻 Ужасы' },
  { id: 878, name: '🚀 Фантастика' },
  { id: 10749, name: '❤️ Мелодрамы' },
  { id: 53, name: '🔪 Триллеры' },
  { id: 16, name: '✨ Анимация' },
  { id: 12, name: '🗺️ Приключения' },
  { id: 80, name: '🕵️ Криминал' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: tgUser } = useTelegram();
  const { favorites, addFavorite, removeFavorite, isFavorite, announcement, adsEnabled, isPremium } = useStore();
  const { haptic } = useTelegram();
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Movie | null>(null);

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
  const [genreRows, setGenreRows] = useState<Record<number, Movie[]>>({});
  const [searchResults, setSearchResults] = useState<Movie[]>([]);

  const [loadingMain, setLoadingMain] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const go = (id: string) => navigate(`/movie/${id}`);

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
        ]);
        if (!alive) return;

        const get = (i: number) => results[i].status === 'fulfilled' ? (results[i] as any).value : [];

        const tr = get(0), tm = get(1), ts = get(2), top_m = get(3), top_s = get(4), np = get(5);
        setTrending(tr);
        setTrendMovies(tm);
        setTrendSeries(ts);
        setTopMovies(top_m);
        setTopSeries(top_s);
        setNowPlaying(np);

        // Если ВСЕ пустые — ошибка загрузки
        const total = tr.length + tm.length + ts.length + top_m.length + top_s.length + np.length;
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
            <div className="hp-empty">😕 По запросу «{query}» ничего не найдено</div>
          )}
          {!searchLoading && searchResults.length === 0 && !query.trim() && (
            <div className="hp-empty">🔍 Введите название фильма или сериала</div>
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
              <p style={{fontSize: 40, marginBottom: 12}}>😕</p>
              <p style={{fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6}}>Не удалось загрузить</p>
              <p style={{fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16}}>Проверьте интернет или попробуйте VPN</p>
              <button
                style={{padding: '10px 28px', borderRadius: 12, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd', fontWeight: 700, fontSize: 14, cursor: 'pointer'}}
                onClick={() => setRetryCount(c => c + 1)}
              >
                🔄 Повторить
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

          <Hero movies={heroMovies} onWatch={go} />
          <Row title="Тренды недели" icon="🔥" movies={trending} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Сейчас в кино" icon="🎬" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Топ фильмов всех времён" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие сериалы" icon="📺" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          ))}
        </>
      );
    }

    if (tab === 'movies') {
      return (
        <>
          <Row title="Тренды — Фильмы" icon="🔥" movies={trendMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Сейчас в кино" icon="🎬" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие фильмы" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          ))}
        </>
      );
    }

    if (tab === 'series') {
      return (
        <>
          <Row title="Тренды — Сериалы" icon="🔥" movies={trendSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Топ сериалов" icon="🏆" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    if (tab === 'top') {
      return (
        <>
          <Row title="Лучшие фильмы всех времён" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Лучшие сериалы" icon="🏆" movies={topSeries} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
        </>
      );
    }

    if (tab === 'new') {
      return (
        <>
          <Row title="Новинки в кино" icon="🆕" movies={nowPlaying} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
          <Row title="Тренды" icon="🔥" movies={trending} loading={loadingMain} onMovieClick={go} onMovieLongPress={openPreview} />
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
          <span className="hp-ad__icon">📢</span>
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
              <span className="hp-header__logo">🎬</span>
              <div>
                <h1 className="hp-header__title">КиноЗал</h1>
                <span className="hp-header__sub">Фильмы и сериалы</span>
              </div>
            </div>
            <div className="hp-header__actions">
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

      {/* ── Вкладки (только не в поиске) ── */}
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

      {/* ── Быстрое превью (длинное нажатие на карточку) ── */}
      {preview && (
        <div className="hp-preview-overlay" onClick={() => setPreview(null)}>
          <div className="hp-preview" onClick={e => e.stopPropagation()}>
            <div className="hp-preview__top">
              <img
                className="hp-preview__poster"
                src={preview.poster_path}
                alt={preview.title}
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
              />
              <div className="hp-preview__info">
                <h3 className="hp-preview__title">{preview.title}</h3>
                <div className="hp-preview__meta">
                  {preview.vote_average > 0 && <span className="hp-preview__rating">★ {preview.vote_average.toFixed(1)}</span>}
                  {preview.release_date && <span>{preview.release_date.slice(0, 4)}</span>}
                  <span>{preview.is_serial ? 'Сериал' : 'Фильм'}</span>
                </div>
                {preview.overview && (
                  <p className="hp-preview__desc">
                    {preview.overview.length > 220 ? `${preview.overview.slice(0, 220)}…` : preview.overview}
                  </p>
                )}
              </div>
            </div>
            <div className="hp-preview__actions">
              <button
                className="hp-preview__btn hp-preview__btn--primary"
                onClick={() => { setPreview(null); navigate(`/movie/${preview.id}`); }}
              >
                ▶ Открыть
              </button>
              <button
                className={`hp-preview__btn hp-preview__btn--fav ${isFavorite(preview.id) ? 'active' : ''}`}
                onClick={() => {
                  haptic('medium');
                  if (isFavorite(preview.id)) removeFavorite(preview.id);
                  else addFavorite(preview);
                }}
              >
                {isFavorite(preview.id) ? '❤️ В избранном' : '🤍 В избранное'}
              </button>
            </div>
            <button className="hp-preview__close" onClick={() => setPreview(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;