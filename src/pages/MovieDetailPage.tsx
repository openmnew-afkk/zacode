import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail } from '../api/movies';
import { getWatchOptions } from '../api/players';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import VideoPlayer from '../components/VideoPlayer';
import type { WatchOption, MovieDetail } from '../types';
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

  const movieId = id || '';
  const favorite = movie ? isFavorite(movie.id) : false;

  useEffect(() => {
    if (!movieId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setMovie(null);
    setError(null);

    getMovieDetail(movieId).then((data) => {
      if (cancelled) return;
      if (!data) { setError('Фильм не найден'); return; }
      setMovie(data);
    }).catch(() => { if (!cancelled) setError('Не удалось загрузить'); })
    .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [movieId]);

  useEffect(() => {
    if (!movie) return;
    const isSerial = movie.is_serial || (movie.seasons?.length || 0) > 0;
    if (isSerial) {
      getWatchOptions(movieId, activeSeason, 1).then(setPlayerOptions).catch(() => setPlayerOptions([]));
    } else {
      getWatchOptions(movieId).then(setPlayerOptions).catch(() => setPlayerOptions([]));
    }
  }, [movie, movieId, activeSeason]);

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

  if (loading) return (
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

  if (error || !movie) return (
    <div className="dp dp--error page">
      <p>😕 {error || 'Не найдено'}</p>
      <button onClick={() => navigate(-1)}>← Назад</button>
    </div>
  );

  const seasons = movie.seasons || [];
  const isSerial = movie.is_serial || seasons.length > 0;
  const poster = movie.poster_path || 'https://via.placeholder.com/300x450?text=?';
  const backdrop = movie.backdrop_path || poster;

  return (
    <div className="dp page">
      {/* Фон */}
      <div className="dp-bg">
        <img src={backdrop} alt="" className="dp-bg__img" loading="lazy" />
        <div className="dp-bg__grad" />
      </div>

      {/* Назад */}
      <button className="dp-back" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Hero */}
      <div className="dp-hero">
        <img className="dp-hero__poster" src={poster} alt={movie.title} loading="lazy" />
        <div className="dp-hero__info">
          <h1 className="dp-hero__title">{movie.title}</h1>
          {movie.original_title && movie.original_title !== movie.title && (
            <p className="dp-hero__orig">{movie.original_title}</p>
          )}
          {movie.vote_average > 0 && (
            <div className="dp-rating">
              <span className="dp-rating__star">★</span>
              <span className="dp-rating__val">{movie.vote_average.toFixed(1)}</span>
              <span className="dp-rating__src">IMDb</span>
            </div>
          )}
          <div className="dp-meta">
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.runtime ? <span>{movie.runtime} мин</span> : null}
            {isSerial && <span className="dp-meta__serial">Сериал</span>}
          </div>
          {movie.genres?.length > 0 && (
            <div className="dp-genres">
              {movie.genres.slice(0, 3).map((g, i) => (
                <span key={i} className="dp-genre">{g}</span>
              ))}
            </div>
          )}
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
        <button className={`dp-fav ${favorite ? 'dp-fav--active' : ''} ${heartAnim ? 'dp-fav--anim' : ''}`} onClick={handleFav}>
          {favorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Описание */}
      {movie.overview && (
        <div className="dp-section">
          <p className="dp-desc">{movie.overview}</p>
        </div>
      )}

      {/* Сезоны */}
      {isSerial && seasons.length > 0 && (
        <div className="dp-section">
          <h3 className="dp-section__title">Сезоны</h3>
          <div className="dp-seasons">
            {seasons.map((s) => (
              <button key={s.id} className={`dp-season ${s.season_number === activeSeason ? 'dp-season--active' : ''}`}
                onClick={() => setActiveSeason(s.season_number)}>
                {s.season_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Эпизоды */}
      {isSerial && (
        <div className="dp-section">
          <h3 className="dp-section__title">Сезон {activeSeason}</h3>
          <div className="dp-episodes">
            {Array.from({ length: 12 }).map((_, i) => (
              <button key={i} className="dp-episode" onClick={() => {
                setShowPlayer(true);
                getWatchOptions(movieId, activeSeason, i + 1).then(setPlayerOptions);
              }}>
                <span className="dp-episode__num">{i + 1}</span>
                <span className="dp-episode__title">Эпизод {i + 1}</span>
                <span className="dp-episode__play">▶</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Детали */}
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
            <span className="dp-detail-row__label">Актёры</span>
            <span>{movie.actors.slice(0, 5).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Плеер */}
      {showPlayer && (
        <VideoPlayer options={playerOptions} onClose={() => setShowPlayer(false)} title={movie.title} poster={poster} />
      )}
    </div>
  );
};

export default MovieDetailPage;