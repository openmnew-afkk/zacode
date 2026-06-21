import React, { useState, useEffect } from 'react';
import MovieList from '../components/MovieList';
import { getTrending, getNowPlaying, getUpcoming, backdropUrl, hasApiKey } from '../api/tmdb';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

/* ===== Главная страница ===== */

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Загрузка данных */
  useEffect(() => {
    if (!hasApiKey()) {
      setError('API ключ TMDB не указан. Добавьте VITE_TMDB_API_KEY в .env файл.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [trendingRes, nowPlayingRes, upcomingRes] = await Promise.all([
          getTrending(),
          getNowPlaying(),
          getUpcoming(),
        ]);
        setTrending(trendingRes.results);
        setNowPlaying(nowPlayingRes.results);
        setUpcoming(upcomingRes.results);
        setHeroMovies(trendingRes.results.slice(0, 5));
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные. Проверьте подключение к интернету.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /** Автопрокрутка карусели каждые 5 секунд */
  useEffect(() => {
    if (heroMovies.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroMovies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroMovies]);

  const currentHero = heroMovies[heroIndex];

  if (error) {
    return (
      <div className="home-error">
        <div className="home-error__icon">⚠️</div>
        <p className="home-error__text">{error}</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Карусель */}
      {currentHero && (
        <div
          className="hero-carousel"
          onClick={() => navigate(`/movie/${currentHero.id}`)}
        >
          <div
            className="hero-carousel__bg"
            style={{
              backgroundImage: `url(${backdropUrl(currentHero.backdrop_path)})`,
            }}
          />
          <div className="hero-carousel__overlay" />
          <div className="hero-carousel__content">
            <h1 className="hero-carousel__title">{currentHero.title}</h1>
            <p className="hero-carousel__overview">
              {currentHero.overview?.slice(0, 120)}
              {(currentHero.overview?.length ?? 0) > 120 ? '...' : ''}
            </p>
            <div className="hero-carousel__meta">
              <span className="hero-carousel__rating">★ {currentHero.vote_average.toFixed(1)}</span>
              <span className="hero-carousel__year">
                {currentHero.release_date?.slice(0, 4)}
              </span>
            </div>
          </div>
          {/* Индикаторы */}
          <div className="hero-carousel__dots">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                className={`hero-carousel__dot ${i === heroIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroIndex(i);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Секции */}
      <MovieList title="🔥 Сейчас в тренде" movies={trending} loading={loading} />
      <MovieList title="🎬 Новинки" movies={nowPlaying} loading={loading} />
      <MovieList title="📅 Скоро выйдут" movies={upcoming} loading={loading} />
    </div>
  );
};

export default HomePage;
