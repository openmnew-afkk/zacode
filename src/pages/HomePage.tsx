import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Heart, Clock, Film, Tv, Star } from 'lucide-react';
import { getAllTrending } from '../api/catalog';
import { useStore } from '../store';
import type { Movie } from '../types';
import './HomePage.css';

/* ===== TeleCinema — PREMIUM HOME ===== */

const CATEGORIES = [
  { id: 'all', label: '🔥 Всё', icon: '🔥' },
  { id: 'movie', label: '🎬 Фильмы', icon: '🎬' },
  { id: 'series', label: '📺 Сериалы', icon: '📺' },
  { id: 'top', label: '⭐ Топ', icon: '⭐' },
  { id: 'new', label: '🆕 Новинки', icon: '🆕' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, watchHistory } = useStore();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFading, setHeroFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAllTrending();
        if (!cancelled) setMovies(data);
      } catch (err) {
        console.error('Home load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const heroMovies = movies.slice(0, 8).filter((m) => m.backdrop_path);

  const rotateHero = useCallback(() => {
    setHeroFading(true);
    setTimeout(() => {
      setHeroIdx((prev) => (prev + 1) % Math.max(heroMovies.length, 1));
      setHeroFading(false);
    }, 300);
  }, [heroMovies.length]);

  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const id = setInterval(rotateHero, 5000);
    return () => clearInterval(id);
  }, [heroMovies.length, rotateHero]);

  const heroMovie = heroMovies[heroIdx] || null;

  const filteredMovies = category === 'all' ? movies
    : category === 'movie' ? movies.filter((m) => !m.is_serial)
    : category === 'series' ? movies.filter((m) => m.is_serial)
    : category === 'top' ? [...movies].sort((a, b) => b.vote_average - a.vote_average)
    : movies;

  const handleMovieClick = (id: string) => navigate(`/movie/${id}`);

  return (
    <div className="home-page page">
      {/* ═══ HERO ═══ */}
      {heroMovie && (
        <div className="hero" onClick={() => handleMovieClick(heroMovie.id)}>
          <div className={`hero__bg ${heroFading ? 'fading' : ''}`} style={{ backgroundImage: `url(${heroMovie.backdrop_path})` }} />
          <div className="hero__overlay" />
          <div className={`hero__content ${heroFading ? 'fading' : ''}`}>
            <div className="hero__badge">
              <span className="hero__badge-dot" />
              <span>{heroMovie.is_serial ? 'Сериал' : 'Фильм'} • Популярное</span>
            </div>
            <h2 className="hero__title">{heroMovie.title}</h2>
            <div className="hero__meta">
              {heroMovie.vote_average > 0 && (
                <span className="hero__rating">★ {heroMovie.vote_average.toFixed(1)}</span>
              )}
              {heroMovie.release_date && <span className="hero__chip">{heroMovie.release_date.slice(0, 4)}</span>}
            </div>
            <div className="hero__actions">
              <button className="hero__btn hero__btn--primary" onClick={(e) => { e.stopPropagation(); handleMovieClick(heroMovie.id); }}>
                ▶ Смотреть
              </button>
            </div>
          </div>
          {heroMovies.length > 1 && (
            <div className="hero__dots">
              {heroMovies.map((_, i) => (
                <button key={i} className={`hero__dot ${i === heroIdx ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}>
                  {i === heroIdx && <span className="hero__dot-progress" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="home-header">
        <div>
          <h1 className="home-header__title">TeleCinema</h1>
          <span className="home-header__sub">Миллионы фильмов и сериалов</span>
        </div>
        <button className="home-header__avatar" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* ═══ CATEGORIES ═══ */}
      <div className="home-cats">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} className={`home-cat ${category === cat.id ? 'active' : ''}`} onClick={() => setCategory(cat.id)}>
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* ═══ MOVIES ═══ */}
      <div className="home-content">
        {loading ? (
          <div className="home-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-card__poster skeleton-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {favorites.length > 0 && category === 'all' && (
              <div className="home-section">
                <div className="home-section__head">
                  <h3><Heart size={16} /> Избранное</h3>
                  <button onClick={() => navigate('/favorites')}>Все</button>
                </div>
                <div className="home-row">
                  {favorites.slice(0, 10).map((m) => (
                    <MovieCard key={m.id} movie={m} onClick={() => handleMovieClick(m.id)} />
                  ))}
                </div>
              </div>
            )}

            {watchHistory.length > 0 && category === 'all' && (
              <div className="home-section">
                <div className="home-section__head">
                  <h3><Clock size={16} /> Смотрел недавно</h3>
                </div>
                <div className="home-row">
                  {watchHistory.slice(0, 10).map((item) => (
                    <MovieCard key={item.movie.id} movie={item.movie} onClick={() => handleMovieClick(item.movie.id)} />
                  ))}
                </div>
              </div>
            )}

            <div className="home-section">
              <div className="home-section__head">
                <h3><TrendingUp size={16} /> {category === 'all' ? 'Популярное' : category === 'movie' ? 'Фильмы' : category === 'series' ? 'Сериалы' : category === 'top' ? 'Топ' : 'Новинки'}</h3>
              </div>
              <div className="home-grid">
                {filteredMovies.map((m) => (
                  <MovieCard key={m.id} movie={m} onClick={() => handleMovieClick(m.id)} />
                ))}
              </div>
            </div>

            {filteredMovies.length === 0 && <div className="home-empty">Ничего не найдено</div>}
          </>
        )}
      </div>
    </div>
  );
};

/* ── MovieCard ── */
interface CardProps { movie: Movie; onClick: () => void; }

const MovieCard: React.FC<CardProps> = ({ movie, onClick }) => {
  const [err, setErr] = useState(false);
  return (
    <div className="movie-card" onClick={onClick}>
      <div className="movie-card__poster">
        <img src={err ? 'https://via.placeholder.com/200x300?text=?' : movie.poster_path} alt={movie.title} loading="lazy" onError={() => setErr(true)} />
        {movie.vote_average > 0 && <span className="movie-card__rating">★ {movie.vote_average.toFixed(1)}</span>}
        {movie.is_serial && <span className="movie-card__type">Сериал</span>}
      </div>
      <div className="movie-card__info">
        <p className="movie-card__title">{movie.title}</p>
        {movie.release_date && <p className="movie-card__year">{movie.release_date.slice(0, 4)}</p>}
      </div>
    </div>
  );
};

export default HomePage;