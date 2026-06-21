import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, posterUrl, backdropUrl } from '../api/tmdb';
import { getPlayerUrl } from '../api/kodik';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import MovieList from '../components/MovieList';
import VideoPlayer from '../components/VideoPlayer';
import type { MovieDetail } from '../types';
import './MovieDetailPage.css';

/* ===== Детальная страница фильма ===== */

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showBackButton, haptic } = useTelegram();
  const { isFavorite, addFavorite, removeFavorite, addToHistory } = useStore();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  const movieId = parseInt(id || '0');
  const favorite = movie ? isFavorite(movie.id) : false;

  /** Загрузка деталей фильма */
  useEffect(() => {
    if (!movieId) return;
    setLoading(true);
    setMovie(null);

    getMovieDetail(movieId)
      .then((data) => {
        setMovie(data);
        window.scrollTo(0, 0);
      })
      .catch((err) => {
        console.error('Ошибка загрузки фильма:', err);
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  /** Кнопка "Назад" в Telegram */
  useEffect(() => {
    const cleanup = showBackButton(() => {
      if (showPlayer) {
        setShowPlayer(false);
      } else {
        navigate(-1);
      }
    });
    return cleanup;
  }, [showBackButton, navigate, showPlayer]);

  /** Открыть плеер */
  const handleWatch = async () => {
    haptic('medium');
    if (movie) {
      addToHistory(movie);
    }

    if (playerUrl) {
      setShowPlayer(true);
      return;
    }

    try {
      const url = await getPlayerUrl(movieId);
      if (url) {
        setPlayerUrl(url);
        setShowPlayer(true);
      } else {
        alert('Видео не найдено. Попробуйте позже.');
      }
    } catch {
      alert('Ошибка загрузки плеера.');
    }
  };

  /** Переключить избранное */
  const handleFavorite = () => {
    haptic('light');
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    if (movie) {
      if (favorite) {
        removeFavorite(movie.id);
      } else {
        addFavorite(movie);
      }
    }
  };

  const director = movie?.credits?.crew.find((c) => c.job === 'Director');
  const cast = movie?.credits?.cast.slice(0, 10) || [];

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="detail-loading__backdrop skeleton-pulse" />
        <div className="detail-loading__content">
          <div className="detail-loading__title skeleton-pulse" />
          <div className="detail-loading__meta skeleton-pulse" />
          <div className="detail-loading__desc skeleton-pulse" />
          <div className="detail-loading__desc2 skeleton-pulse" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="detail-error">
        <span>😕</span>
        <p>Фильм не найден</p>
      </div>
    );
  }

  return (
    <div className="detail-page">
      {/* Фоновый постер */}
      <div className="detail-backdrop">
        <img
          src={backdropUrl(movie.backdrop_path) || posterUrl(movie.poster_path)}
          alt=""
          className="detail-backdrop__img"
        />
        <div className="detail-backdrop__overlay" />
      </div>

      {/* Основной контент */}
      <div className="detail-content">
        <div className="detail-hero">
          <img
            className="detail-hero__poster"
            src={posterUrl(movie.poster_path, 'w342')}
            alt={movie.title}
          />
          <div className="detail-hero__info">
            <h1 className="detail-hero__title">{movie.title}</h1>
            {movie.original_title !== movie.title && (
              <p className="detail-hero__original">{movie.original_title}</p>
            )}
            <div className="detail-hero__meta">
              <span className="detail-hero__rating">★ {movie.vote_average.toFixed(1)}</span>
              <span>{movie.release_date?.slice(0, 4)}</span>
              {movie.runtime && <span>{movie.runtime} мин</span>}
            </div>
            <div className="detail-hero__genres">
              {movie.genres?.map((g) => (
                <span key={g.id} className="detail-genre-tag">{g.name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="detail-actions">
          <button className="detail-actions__watch" onClick={handleWatch}>
            ▶ Смотреть
          </button>
          <button
            className={`detail-actions__fav ${favorite ? 'active' : ''} ${heartAnim ? 'animate' : ''}`}
            onClick={handleFavorite}
          >
            {favorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Описание */}
        {movie.overview && (
          <div className="detail-section">
            <h3 className="detail-section__title">Описание</h3>
            <p className="detail-section__text">{movie.overview}</p>
          </div>
        )}

        {/* Информация */}
        <div className="detail-section">
          <h3 className="detail-section__title">Информация</h3>
          <div className="detail-info-grid">
            {movie.release_date && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Дата выхода</span>
                <span className="detail-info-item__value">
                  {new Date(movie.release_date).toLocaleDateString('ru-RU')}
                </span>
              </div>
            )}
            {movie.production_countries?.length > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Страна</span>
                <span className="detail-info-item__value">
                  {movie.production_countries.map((c) => c.name).join(', ')}
                </span>
              </div>
            )}
            {director && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Режиссёр</span>
                <span className="detail-info-item__value">{director.name}</span>
              </div>
            )}
            {movie.budget > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Бюджет</span>
                <span className="detail-info-item__value">
                  ${movie.budget.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Актёры */}
        {cast.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">Актёры</h3>
            <div className="detail-cast">
              {cast.map((actor) => (
                <div key={actor.id} className="detail-cast__item">
                  <div className="detail-cast__photo">
                    {actor.profile_path ? (
                      <img
                        src={posterUrl(actor.profile_path, 'w185')}
                        alt={actor.name}
                      />
                    ) : (
                      <div className="detail-cast__placeholder">👤</div>
                    )}
                  </div>
                  <p className="detail-cast__name">{actor.name}</p>
                  <p className="detail-cast__character">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Похожие фильмы */}
        {movie.similar && movie.similar.results.length > 0 && (
          <MovieList
            title="Похожие фильмы"
            movies={movie.similar.results}
          />
        )}
      </div>

      {/* Видеоплеер */}
      {showPlayer && playerUrl && (
        <VideoPlayer url={playerUrl} onClose={() => setShowPlayer(false)} />
      )}
    </div>
  );
};

export default MovieDetailPage;
