import React, { useState, useEffect } from 'react';
import MovieList from '../components/MovieList';
import { getCatalog, backdropUrl, getNovelty } from '../api/catalog';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

/* ===== ULTRA PREMIUM — Главная страница ===== */

const CATEGORIES = [
  { id: 'all',    label: 'Всё',        icon: '🎬' },
  { id: 'movie',  label: 'Фильмы',     icon: '🎥' },
  { id: 'series', label: 'Сериалы',    icon: '📺' },
  { id: 'anime',  label: 'Аниме',      icon: '⚡' },
  { id: 'new',    label: 'Новинки',    icon: '🔥' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getCatalog({ page: 1, limit: 20 });
        if (res.results && res.results.length > 0) {
          setMovies(res.results);
        } else {
          const nov = await getNovelty();
          setMovies(nov.results || []);
        }
      } catch (err) {
        console.error('Ошибка:', err);
        setError('Не удалось загрузить фильмы.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Автопрокрутка Hero
  const heroMovies = movies.filter((m) => m.backdrop_path || m.poster_path).slice(0, 5);
  useEffect(() => {
    if (heroMovies.length === 0) return;
    const iv = setInterval(() => setHeroIndex((p) => (p + 1) % heroMovies.length), 5000);
    return () => clearInterval(iv);
  }, [heroMovies.length]);

  const hero = heroMovies[heroIndex];
  const bgUrl = hero ? backdropUrl(hero.backdrop_path || hero.poster_path) : '';

  const popularMovies = movies.slice(0, 12);
  const recommendedMovies = [...movies].reverse().slice(0, 12);

  return (
    <div className="home-page page">

      {/* ── Шапка ── */}
      <div className="home-header">
        <div className="home-header__left">
          <span className="home-header__eyebrow">Добро пожаловать</span>
          <h1 className="home-header__title">TeleCinema</h1>
          <p className="home-header__sub">Кино и сериалы онлайн</p>
        </div>
        <div className="home-header__avatar" onClick={() => navigate('/profile')} aria-label="Профиль">
          🎭
        </div>
      </div>

      {/* ── Hero-карусель ── */}
      {hero && (
        <div className="hero-carousel" onClick={() => navigate(`/movie/${hero.id}`)}>
          <div
            className="hero-carousel__bg"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div className="hero-carousel__overlay" />

          <div className="hero-carousel__content">
            {/* Лайв-бейдж */}
            <div className="hero-carousel__badge">
              <span className="hero-carousel__badge-dot" />
              <span className="hero-carousel__badge-text">В тренде</span>
            </div>

            <h2 className="hero-carousel__title">{hero.title}</h2>

            {hero.overview && (
              <p className="hero-carousel__overview">
                {hero.overview.slice(0, 120)}{hero.overview.length > 120 ? '…' : ''}
              </p>
            )}

            {/* Мета-чипы */}
            <div className="hero-carousel__meta">
              <span className="hero-carousel__rating">
                ★ {hero.vote_average.toFixed(1)}
              </span>
              {hero.release_date && (
                <span className="hero-carousel__year">
                  {hero.release_date.slice(0, 4)}
                </span>
              )}
              {hero.is_serial && (
                <span className="hero-carousel__genre">Сериал</span>
              )}
            </div>

            {/* CTA */}
            <button
              className="hero-carousel__cta"
              onClick={(e) => { e.stopPropagation(); navigate(`/movie/${hero.id}`); }}
            >
              <span className="hero-carousel__cta-icon">▶</span>
              Смотреть
            </button>
          </div>

          {/* Dots */}
          <div className="hero-carousel__dots">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                className={`hero-carousel__dot${i === heroIndex ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setHeroIndex(i); }}
                aria-label={`Слайд ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Категории ── */}
      <div className="home-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`home-category${activeCategory === cat.id ? ' home-category--active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="home-category__icon">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Списки фильмов ── */}
      <MovieList title="🔥 Популярное" movies={popularMovies} loading={loading} />
      <MovieList title="⭐ Рекомендуем" movies={recommendedMovies} loading={loading} />

      {/* ── Ошибка ── */}
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
