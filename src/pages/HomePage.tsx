import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Heart, Clock } from 'lucide-react';
import { getTrendingMovies } from '../api/omdb';
import { useStore } from '../store';
import type { Movie } from '../types';
import './HomePage.css';

/* ===== TeleCinema — ULTRA PREMIUM Home Page ===== */

const CATEGORIES = [
  { id: 'all', label: '🔥 Все', icon: '🔥' },
  { id: 'movie', label: '🎬 Фильмы', icon: '🎬' },
  { id: 'series', label: '📺 Сериалы', icon: '📺' },
  { id: 'top', label: '⭐ Топ', icon: '⭐' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, watchHistory } = useStore();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFading, setHeroFading] = useState(false);

  // Загрузка трендов
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getTrendingMovies();
        if (!cancelled) {
          setMovies(data.length > 0 ? data : []);
          setError(null);
        }
      } catch (err) {
        console.error('Home load error:', err);
        if (!cancelled) setError('Не удалось загрузить');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Авто-смена hero
  const heroMovies = movies.slice(0, 8).filter((m) => m.poster_path);

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
      {/* ═══ HERO CAROUSEL ═══ */}
      {heroMovie && (
        <div className="hero-carousel" onClick={() => handleMovieClick(heroMovie.imdbID)}>
          <div
            className={`hero-carousel__bg ${heroFading ? 'fading' : ''}`}
            style={{ backgroundImage: `url(${heroMovie.backdrop_path || heroMovie.poster_path})` }}
          />
          <div className="hero-carousel__overlay" />
          <div className="hero-carousel__vignette" />

          <div className={`hero-carousel__content ${heroFading ? 'fading' : ''}`}>
            <div className="hero-carousel__badge">
              <span className="hero-carousel__badge-dot" />
              <span className="hero-carousel__badge-text">
                {heroMovie.is_serial ? 'Сериал' : 'Фильм'} • Сейчас популярно
              </span>
            </div>

            <h2 className="hero-carousel__title">{heroMovie.title}</h2>

            <div className="hero-carousel__meta">
              {heroMovie.imdb_rating > 0 && (
                <span className="hero-carousel__rating">★ {heroMovie.imdb_rating.toFixed(1)}</span>
              )}
              {heroMovie.release_date && (
                <span className="hero-carousel__chip">{heroMovie.release_date.slice(0, 4)}</span>
              )}
              {heroMovie.genres?.slice(0, 2).map((g, i) => (
                <span key={i} className="hero-carousel__chip">{g}</span>
              ))}
            </div>

            <div className="hero-carousel__actions">
              <button className="hero-carousel__cta hero-carousel__cta--primary">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3l13 7-13 7V3z" fill="currentColor"/>
                </svg>
                Смотреть
              </button>
              <button
                className="hero-carousel__cta hero-carousel__cta--secondary"
                onClick={(e) => { e.stopPropagation(); navigate(`/movie/${heroMovie.imdbID}`); }}
              >
                Подробнее
              </button>
            </div>
          </div>

          {heroMovies.length > 1 && (
            <div className="hero-carousel__dots">
              {heroMovies.map((_, i) => (
                <button
                  key={i}
                  className={`hero-carousel__dot ${i === heroIdx ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}
                >
                  {i === heroIdx && <span className="hero-carousel__dot-progress" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="home-header">
        <div className="home-header__left">
          <h1 className="home-header__title">TeleCinema</h1>
          <span className="home-header__sub">Кино и сериалы онлайн</span>
        </div>
        <button className="home-header__avatar" onClick={() => navigate('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ═══ CATEGORIES ═══ */}
      <div className="home-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`home-category ${category === cat.id ? 'home-category--active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            <span className="home-category__icon">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ═══ ERROR ═══ */}
      {error && (
        <div className="home-error">
          <div className="home-error__icon">😕</div>
          <p className="home-error__text">{error}</p>
        </div>
      )}

      {/* ═══ MOVIES ═══ */}
      <div className="home-movies">
        {loading ? (
          <div className="home-movies__grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="movie-skeleton">
                <div className="movie-skeleton__poster skeleton-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {favorites.length > 0 && category === 'all' && (
              <div className="home-section">
                <div className="home-section__header">
                  <h2 className="home-section__title">
                    <Heart size={16} /> Избранное
                  </h2>
                  <button className="home-section__more" onClick={() => navigate('/favorites')}>Все</button>
                </div>
                <div className="home-row">
                  {favorites.slice(0, 10).map((movie) => (
                    <MiniCard key={movie.imdbID} movie={movie} onClick={() => handleMovieClick(movie.imdbID)} />
                  ))}
                </div>
              </div>
            )}

            {watchHistory.length > 0 && category === 'all' && (
              <div className="home-section">
                <div className="home-section__header">
                  <h2 className="home-section__title">
                    <Clock size={16} /> Смотрел недавно
                  </h2>
                </div>
                <div className="home-row">
                  {watchHistory.slice(0, 10).map((item) => (
                    <MiniCard key={item.movie.imdbID} movie={item.movie} onClick={() => handleMovieClick(item.movie.imdbID)} />
                  ))}
                </div>
              </div>
            )}

            <div className="home-section">
              <div className="home-section__header">
                <h2 className="home-section__title">
                  <TrendingUp size={16} /> {category === 'all' ? 'Популярное' : category === 'movie' ? 'Фильмы' : category === 'series' ? 'Сериалы' : 'Топ'}
                </h2>
              </div>
              <div className="home-movies__grid">
                {filteredMovies.map((movie) => (
                  <MiniCard key={movie.imdbID} movie={movie} onClick={() => handleMovieClick(movie.imdbID)} />
                ))}
              </div>
            </div>

            {filteredMovies.length === 0 && !loading && (
              <div className="home-empty"><p>Ничего не найдено</p></div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Mini Card ── */
interface MiniCardProps {
  movie: Movie;
  onClick: () => void;
}

const MiniCard: React.FC<MiniCardProps> = ({ movie, onClick }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="home-movie-card" onClick={onClick}>
      <div className="home-movie-card__poster">
        <img src={imgError ? 'https://via.placeholder.com/200x300?text=?' : movie.poster_path} alt={movie.title} loading="lazy" onError={() => setImgError(true)} />
        {movie.imdb_rating > 0 && <span className="home-movie-card__rating">★ {movie.imdb_rating.toFixed(1)}</span>}
      </div>
      <div className="home-movie-card__info">
        <p className="home-movie-card__title">{movie.title}</p>
        {movie.release_date && <p className="home-movie-card__year">{movie.release_date.slice(0, 4)}</p>}
      </div>
    </div>
  );
};

export default HomePage;