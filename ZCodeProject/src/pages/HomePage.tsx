import React, { useState, useEffect } from 'react';
import MovieList from '../components/MovieList';
import {
  getCatalog,
  getNovelty,
  getTop,
  backdropUrl,
} from '../api/catalog';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

/* ===== Главная страница ===== */

interface Category {
  id: string;
  title: string;
  icon: string;
}

const CATEGORIES: Category[] = [
  { id: '', title: 'Всё', icon: '✨' },
  { id: 'movie', title: 'Фильмы', icon: '🎬' },
  { id: 'serial', title: 'Сериалы', icon: '📺' },
  { id: 'anime', title: 'Аниме', icon: '🍥' },
  { id: 'tvshow', title: 'ТВ-шоу', icon: '🎙️' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<Movie[]>([]);
  const [novelty, setNovelty] = useState<Movie[]>([]);
  const [categoryItems, setCategoryItems] = useState<Movie[]>([]);
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');

  /** Загрузка дефолтных секций */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topRes, novRes] = await Promise.all([getTop(), getNovelty()]);
        setTrending(topRes.results || []);
        setNovelty(novRes.results || []);
        // Hero — фильмы с лучшим рейтингом и постером
        const heroes = (topRes.results || [])
          .filter((m) => m.backdrop_path || m.poster_path)
          .slice(0, 5);
        setHeroMovies(heroes);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные. Проверьте токен и подключение.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /** Загрузка по выбранной категории */
  useEffect(() => {
    setLoading(true);
    getCatalog({ sort: 'rating', limit: 20 })
      .then((res) => setCategoryItems(res.results || []))
      .catch((err) => console.error('Ошибка категории:', err))
      .finally(() => setLoading(false));
  }, [category]);

  /** Автопрокрутка карусели */
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
      {/* Шапка */}
      <div className="home-header">
        <div>
          <h1 className="home-header__title">TeleCinema</h1>
          <p className="home-header__sub">Кино и сериалы онлайн</p>
        </div>
      </div>

      {/* Быстрое меню категорий */}
      <div className="home-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id || 'all'}
            className={`home-category ${category === cat.id ? 'home-category--active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            <span className="home-category__icon">{cat.icon}</span>
            {cat.title}
          </button>
        ))}
      </div>

      {/* Карусель */}
      {currentHero && (
        <div
          className="hero-carousel"
          onClick={() => navigate(`/movie/${currentHero.id}`)}
        >
          <div
            className="hero-carousel__bg"
            style={{
              backgroundImage: `url(${backdropUrl(currentHero.backdrop_path || currentHero.poster_path)})`,
            }}
          />
          <div className="hero-carousel__overlay" />
          <div className="hero-carousel__content">
            <h1 className="hero-carousel__title">{currentHero.title}</h1>
            <p className="hero-carousel__overview">
              {currentHero.overview?.slice(0, 140)}
              {(currentHero.overview?.length ?? 0) > 140 ? '…' : ''}
            </p>
            <div className="hero-carousel__meta">
              <span className="hero-carousel__rating">★ {currentHero.vote_average.toFixed(1)}</span>
              <span className="hero-carousel__year">
                {currentHero.release_date?.slice(0, 4)}
              </span>
              {(currentHero.is_serial || currentHero.type === 'anime') && (
                <span className="hero-carousel__year">
                  {currentHero.type === 'anime' ? 'Аниме' : 'Сериал'}
                </span>
              )}
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
      {category ? (
        <MovieList title="По категории" movies={categoryItems} loading={loading} />
      ) : (
        <>
          <MovieList title="🔥 Сейчас в тренде" movies={trending} loading={loading} />
          <MovieList title="🆕 Новинки" movies={novelty} loading={loading} />
        </>
      )}
    </div>
  );
};

export default HomePage;
