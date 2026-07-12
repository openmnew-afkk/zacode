import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllTrending, getTrendingMovies, getTrendingSeries,
  getTopRated, getNowPlaying, getPopularByGenre, searchMovies,
} from '../api/catalog';
import { useStore } from '../store';
import type { Movie } from '../types';
import './HomePage.css';

/* ──────────────────────────────────────────────────────── */
/*  Мини-карточка фильма                                   */
/* ──────────────────────────────────────────────────────── */
const Card: React.FC<{ movie: Movie; onClick: () => void }> = ({ movie, onClick }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="hp-card" onClick={onClick}>
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
}> = ({ title, icon, movies, loading, onMovieClick }) => {
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
              <Card key={m.id} movie={m} onClick={() => onMovieClick(m.id)} />
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

  const next = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setIdx(i => (i + 1) % Math.max(heroMovies.length, 1));
      setFading(false);
    }, 250);
  }, [heroMovies.length]);

  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [heroMovies.length, next]);

  const m = heroMovies[idx];
  if (!m) return null;

  return (
    <div className="hp-hero" onClick={() => onWatch(m.id)}>
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
        <div className="hp-hero__dots">
          {heroMovies.map((_, i) => (
            <button key={i} className={`hp-hero__dot ${i === idx ? 'active' : ''}`} onClick={e => { e.stopPropagation(); setIdx(i); }} />
          ))}
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
  const { favorites } = useStore();
  const [tab, setTab] = useState('home');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const go = (id: string) => navigate(`/movie/${id}`);

  /* Загрузка главных данных */
  useEffect(() => {
    let alive = true;
    setLoadingMain(true);

    const load = async () => {
      try {
        const [tr, tm, ts, top_m, top_s, np] = await Promise.all([
          getAllTrending(),
          getTrendingMovies(),
          getTrendingSeries(),
          getTopRated('movie'),
          getTopRated('series'),
          getNowPlaying(),
        ]);
        if (!alive) return;
        setTrending(tr);
        setTrendMovies(tm);
        setTrendSeries(ts);
        setTopMovies(top_m);
        setTopSeries(top_s);
        setNowPlaying(np);
      } catch (e) {
        console.error('Home load error:', e);
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
  }, []);

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
            {searchResults.map(m => <Card key={m.id} movie={m} onClick={() => go(m.id)} />)}
          </div>
        </div>
      );
    }

    if (tab === 'home') {
      return (
        <>
          <Hero movies={heroMovies} onWatch={go} />
          {favorites.length > 0 && (
            <Row title="Мои избранные" icon="❤️" movies={favorites.slice(0, 20)} onMovieClick={go} />
          )}
          <Row title="Тренды недели" icon="🔥" movies={trending} loading={loadingMain} onMovieClick={go} />
          <Row title="Сейчас в кино" icon="🎬" movies={nowPlaying} loading={loadingMain} onMovieClick={go} />
          <Row title="Топ фильмов всех времён" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} />
          <Row title="Лучшие сериалы" icon="📺" movies={topSeries} loading={loadingMain} onMovieClick={go} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} />
          ))}
        </>
      );
    }

    if (tab === 'movies') {
      return (
        <>
          <Row title="Тренды — Фильмы" icon="🔥" movies={trendMovies} loading={loadingMain} onMovieClick={go} />
          <Row title="Сейчас в кино" icon="🎬" movies={nowPlaying} loading={loadingMain} onMovieClick={go} />
          <Row title="Лучшие фильмы" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} />
          {GENRES_MOVIES.map(g => (
            <Row key={g.id} title={g.name} movies={genreRows[g.id] || []} loading={!genreRows[g.id] && loadingMain} onMovieClick={go} />
          ))}
        </>
      );
    }

    if (tab === 'series') {
      return (
        <>
          <Row title="Тренды — Сериалы" icon="🔥" movies={trendSeries} loading={loadingMain} onMovieClick={go} />
          <Row title="Топ сериалов" icon="🏆" movies={topSeries} loading={loadingMain} onMovieClick={go} />
        </>
      );
    }

    if (tab === 'top') {
      return (
        <>
          <Row title="Лучшие фильмы всех времён" icon="🏆" movies={topMovies} loading={loadingMain} onMovieClick={go} />
          <Row title="Лучшие сериалы" icon="🏆" movies={topSeries} loading={loadingMain} onMovieClick={go} />
        </>
      );
    }

    if (tab === 'new') {
      return (
        <>
          <Row title="Новинки в кино" icon="🆕" movies={nowPlaying} loading={loadingMain} onMovieClick={go} />
          <Row title="Тренды" icon="🔥" movies={trending} loading={loadingMain} onMovieClick={go} />
        </>
      );
    }

    return null;
  };

  return (
    <div className="hp page">
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
                <h1 className="hp-header__title">TeleCinema</h1>
                <span className="hp-header__sub">Миллионы фильмов</span>
              </div>
            </div>
            <div className="hp-header__actions">
              <button className="hp-header__btn" onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="hp-header__btn" onClick={() => navigate('/profile')}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
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
    </div>
  );
};

export default HomePage;