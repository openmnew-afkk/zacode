import React, { useState, useEffect } from 'react';
import MovieList from '../components/MovieList';
import { getCatalog, backdropUrl, getNovelty } from '../api/catalog';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

/* ===== Главная страница ===== */

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getCatalog({ page: 1, limit: 20 });
        if (res.results && res.results.length > 0) {
          setMovies(res.results);
        } else {
          // Fallback встроенный
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

  // Автопрокрутка
  const heroMovies = movies.filter((m) => m.backdrop_path).slice(0, 5);
  useEffect(() => {
    if (heroMovies.length === 0) return;
    const iv = setInterval(() => setHeroIndex((p) => (p + 1) % heroMovies.length), 5000);
    return () => clearInterval(iv);
  }, [heroMovies]);

  const hero = heroMovies[heroIndex];

  return (
    <div className="home-page">
      {/* Шапка */}
      <div className="home-header">
        <div>
          <h1 className="home-header__title">TeleCinema</h1>
          <p className="home-header__sub">Кино и сериалы онлайн</p>
        </div>
      </div>

      {/* Карусель */}
      {hero && (
        <div className="hero-carousel" onClick={() => navigate(`/movie/${hero.id}`)}>
          <div
            className="hero-carousel__bg"
            style={{ backgroundImage: `url(${backdropUrl(hero.backdrop_path || hero.poster_path)})` }}
          />
          <div className="hero-carousel__overlay" />
          <div className="hero-carousel__content">
            <h1 className="hero-carousel__title">{hero.title}</h1>
            <p className="hero-carousel__overview">
              {hero.overview?.slice(0, 140)}{hero.overview?.length > 140 ? '…' : ''}
            </p>
            <div className="hero-carousel__meta">
              <span className="hero-carousel__rating">★ {hero.vote_average.toFixed(1)}</span>
              <span className="hero-carousel__year">{hero.release_date?.slice(0, 4)}</span>
            </div>
          </div>
          <div className="hero-carousel__dots">
            {heroMovies.map((_, i) => (
              <button key={i} className={`hero-carousel__dot ${i === heroIndex ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setHeroIndex(i); }} />
            ))}
          </div>
        </div>
      )}

      {/* Список фильмов */}
      <MovieList title="Популярное" movies={movies} loading={loading} />
      <MovieList title="Рекомендуем" movies={[...movies].reverse()} loading={loading} />

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
