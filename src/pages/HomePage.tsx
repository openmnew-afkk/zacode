import React, { useState, useEffect, useRef } from 'react';
import MovieList from '../components/MovieList';
import { getCatalog, backdropUrl, posterUrl } from '../api/catalog';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

/* ===== ULTRA PREMIUM — Главная страница ===== */

const CATEGORIES = [
  { id: 'all',     label: 'Всё',     icon: '🎬' },
  { id: 'movie',   label: 'Фильмы',  icon: '🎥' },
  { id: 'series',  label: 'Сериалы', icon: '📺' },
  { id: 'anime',   label: 'Аниме',   icon: '⚡' },
  { id: 'new',     label: 'Новинки', icon: '🔥' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [heroTransition, setHeroTransition] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < 50 || heroMovies.length === 0) return;
    if (diff < 0) goToHero((heroIndex + 1) % heroMovies.length);
    else goToHero((heroIndex - 1 + heroMovies.length) % heroMovies.length);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const typeMap: Record<string, string> = {
          movie: 'movie', series: 'serial', all: '', anime: '', new: ''
        };
        const type = typeMap[activeCategory] || '';
        const res = await getCatalog({ page: 1, type: type || undefined });
        if (res.results && res.results.length > 0) {
          let items = res.results;
          if (activeCategory === 'anime') items = res.results.filter(m => m.type === 'anime');
          if (activeCategory === 'new') items = [...res.results].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
          setMovies(items);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error('Ошибка:', err);
        setError('Не удалось загрузить контент.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeCategory]);

  const heroMovies = movies.filter((m) => {
    const p = posterUrl(m.poster_path, m.imdb_id);
    return p && !p.includes('no-poster');
  }).slice(0, 6);

  const goToHero = (i: number) => {
    setHeroTransition(true);
    setTimeout(() => {
      setHeroIndex(i);
      setHeroTransition(false);
    }, 220);
  };

  // Автопрокрутка Hero
  useEffect(() => {
    if (heroMovies.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setHeroTransition(true);
      setTimeout(() => {
        setHeroIndex((p) => (p + 1) % heroMovies.length);
        setHeroTransition(false);
      }, 220);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [heroMovies.length]);

  const hero = heroMovies[heroIndex];
  const bgUrl = hero ? (backdropUrl(hero.backdrop_path, hero.imdb_id) || posterUrl(hero.poster_path, hero.imdb_id)) : '';

  const topMovies = movies.slice(0, 12);
  const recommendedMovies = [...movies].reverse().slice(0, 12);

  return (
    <div className="home-page page">

      {/* ── Hero-карусель ── */}
      {hero && (
        <div
          className="hero-carousel"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Bg Image */}
          <div
            className={`hero-carousel__bg ${heroTransition ? 'fading' : ''}`}
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          {/* Оверлеи */}
          <div className="hero-carousel__overlay" />
          <div className="hero-carousel__vignette" />

          {/* Content */}
          <div className={`hero-carousel__content ${heroTransition ? 'fading' : ''}`}>
            {/* Бейдж В тренде */}
            <div className="hero-carousel__badge">
              <span className="hero-carousel__badge-dot" />
              <span className="hero-carousel__badge-text">В тренде #{heroIndex + 1}</span>
            </div>

            <h2 className="hero-carousel__title">{hero.title}</h2>

            {/* Мета */}
            <div className="hero-carousel__meta">
              {hero.vote_average > 0 && (
                <span className="hero-carousel__rating">★ {hero.vote_average.toFixed(1)}</span>
              )}
              {hero.release_date && (
                <span className="hero-carousel__chip">{hero.release_date.slice(0, 4)}</span>
              )}
              {hero.is_serial && <span className="hero-carousel__chip">Сериал</span>}
              {hero.genres?.[0] && <span className="hero-carousel__chip">{hero.genres[0].name}</span>}
            </div>

            {/* CTA */}
            <div className="hero-carousel__actions">
              <button
                className="hero-carousel__cta hero-carousel__cta--primary"
                onClick={(e) => { e.stopPropagation(); navigate(`/movie/${hero.id}`); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2l10 6-10 6V2z" fill="currentColor"/>
                </svg>
                Смотреть
              </button>
              <button
                className="hero-carousel__cta hero-carousel__cta--secondary"
                onClick={(e) => { e.stopPropagation(); navigate(`/movie/${hero.id}`); }}
              >
                ℹ Подробнее
              </button>
            </div>
          </div>

          {/* Dots — навигация по карусели */}
          <div className="hero-carousel__dots">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                className={`hero-carousel__dot ${i === heroIndex ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); goToHero(i); }}
                aria-label={`Слайд ${i + 1}`}
              >
                {i === heroIndex && <span className="hero-carousel__dot-progress" key={heroIndex} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Шапка ── */}
      <div className="home-header">
        <div className="home-header__left">
          <h1 className="home-header__title">Кино</h1>
          <p className="home-header__sub">Смотреть онлайн бесплатно</p>
        </div>
        <button className="home-header__avatar" onClick={() => navigate('/profile')} aria-label="Профиль">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M3 19c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Категории ── */}
      <div className="home-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`home-category ${activeCategory === cat.id ? 'home-category--active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="home-category__icon">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Списки фильмов ── */}
      <MovieList title="🔥 Популярное" movies={topMovies} loading={loading} />
      <MovieList title="⭐ Рекомендуем" movies={recommendedMovies} loading={loading} />

      {error && (
        <div className="home-error">
          <div className="home-error__icon">⚠️</div>
          <p className="home-error__text">{error}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
