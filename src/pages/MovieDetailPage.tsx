import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail } from '../api/omdb';
import { getWatchOptions } from '../api/players';
import type { WatchOption, MovieDetail } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import VideoPlayer from '../components/VideoPlayer';
import './MovieDetailPage.css';

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showBackButton, haptic } = useTelegram();
  const { isFavorite, addFavorite, removeFavorite, addToHistory } = useStore();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerOptions, setPlayerOptions] = useState<WatchOption[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);

  const imdbId = id || '';
  const favorite = movie ? isFavorite(movie.id) : false;

  // Загрузка деталей
  useEffect(() => {
    if (!imdbId) return;
    setLoading(true);
    setMovie(null);
    setError(null);
    getMovieDetail(imdbId)
      .then((data) => {
        if (!data) { setError('Фильм не найден'); return; }
        setMovie(data);
        window.scrollTo(0, 0);
      })
      .catch(() => setError('Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, [imdbId]);

  // Загрузка источников воспроизведения
  useEffect(() => {
    if (!movie) return;
    const isSerial = movie.is_serial || (movie.seasons?.length || 0) > 0;
    if (isSerial) {
      getWatchOptions(imdbId, activeSeason, 1).then(setPlayerOptions).catch(() => setPlayerOptions([]));
    } else {
      getWatchOptions(imdbId).then(setPlayerOptions).catch(() => setPlayerOptions([]));
    }
  }, [movie, imdbId, activeSeason]);

  // Кнопка назад Telegram
  useEffect(() => {
    const cleanup = showBackButton?.(() => {
      if (showPlayer) setShowPlayer(false);
      else navigate(-1);
    });
    return cleanup;
  }, [showBackButton, navigate, showPlayer]);

  const handleWatch = () => {
    haptic('medium');
    if (movie) addToHistory(movie);
    setShowPlayer(true);
  };

  const handleFav = () => {
    haptic('light');
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    if (movie) {
      if (favorite) removeFavorite(movie.id);
      else addFavorite(movie);
    }
  };

  // ── Загрузка ──
  if (loading) {
    return (
      <div className="dp page">
        <div className="dp-skeleton">
          <div className="dp-skeleton__poster skeleton-pulse" />
          <div className="dp-skeleton__info">
            <div className="dp-skeleton__title skeleton-pulse" />
            <div className="dp-skeleton__meta skeleton-pulse" />
            <div className="dp-skeleton__btn skeleton-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="dp dp--error page">
        <p>😕 {error || 'Фильм не найден'}</p>
        <button onClick={() => navigate(-1)}>← Назад</button>
      </div>
    );
  }

  const seasons = movie.seasons || [];
  const isSerial = movie.is_serial || seasons.length > 0;
  const poster = movie.poster_path || 'https://via.placeholder.com/300x450?text=No+Poster';

  return (
    <div className="dp page">
      {/* Фон */}
      <div className="dp-bg">
        <img src={poster} alt="" className="dp-bg__img" />
        <div className="dp-bg__grad" />
      </div>

      {/* Назад */}
      <button className="dp-back" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Постер + инфо */}
      <div className="dp-hero">
        <img className="dp-hero__poster" src={poster} alt={movie.title} />

        <div className="dp-hero__info">
          <h1 className="dp-hero__title">{movie.title}</h1>

          {movie.imdb_rating > 0 && (
            <div className="dp-rating">
              <span className="dp-rating__star">★</span>
              <span className="dp-rating__val">{movie.imdb_rating.toFixed(1)}</span>
              <span className="dp-rating__src">IMDb</span>
            </div>
          )}

          <div className="dp-meta">
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.runtime ? <span>{movie.runtime} мин</span> : null}
            {isSerial && <span className="dp-meta__serial">Сериал</span>}
          </div>

          <div className="dp-genres">
            {movie.genres?.slice(0, 3).map((g, i) => (
              <span key={i} className="dp-genre">{g}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div className="dp-actions">
        <button className="dp-watch" onClick={handleWatch}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 3l13 7-13 7V3z" fill="currentColor"/>
          </svg>
          Смотреть
        </button>
        <button
          className={`dp-fav ${favorite ? 'dp-fav--active' : ''} ${heartAnim ? 'dp-fav--anim' : ''}`}
          onClick={handleFav}
          aria-label="Избранное"
        >
          {favorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Описание */}
      {movie.overview && (
        <div className="dp-section">
          <p className="dp-desc">{movie.overview}</p>
        </div>
      )}

      {/* Сезоны (если сериал) */}
      {isSerial && seasons.length > 0 && (
        <div className="dp-section">
          <h3 className="dp-section__title">Сезоны</h3>
          <div className="dp-seasons">
            {seasons.map((s) => (
              <button
                key={s.id}
                className={`dp-season ${s.season_number === activeSeason ? 'dp-season--active' : ''}`}
                onClick={() => setActiveSeason(s.season_number)}
              >
                {s.season_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Подробности */}
      <div className="dp-section dp-details">
        {movie.countries?.length > 0 && (
          <div className="dp-detail-row">
            <span className="dp-detail-row__label">Страна</span>
            <span>{movie.countries.join(', ')}</span>
          </div>
        )}
        {movie.directors?.length > 0 && (
          <div className="dp-detail-row">
            <span className="dp-detail-row__label">Режиссёр</span>
            <span>{movie.directors.join(', ')}</span>
          </div>
        )}
        {movie.actors?.length > 0 && (
          <div className="dp-detail-row">
            <span className="dp-detail-row__label">В ролях</span>
            <span>{movie.actors.slice(0, 4).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Плеер */}
      {showPlayer && (
        <VideoPlayer
          options={playerOptions}
          onClose={() => setShowPlayer(false)}
          title={movie.title}
          poster={poster}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;
