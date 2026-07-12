import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail } from '../api/catalog';
import { getWatchOptions } from '../api/players';
import type { WatchOption, MovieDetail } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
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
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [sourceLoading, setSourceLoading] = useState(false);

  const tmdbId = id || '';
  const favorite = movie ? isFavorite(movie.id) : false;

  /* ── Загрузка деталей фильма ── */
  useEffect(() => {
    if (!tmdbId) return;
    setLoading(true);
    setMovie(null);
    setError(null);
    setPlayerOptions([]);
    getMovieDetail(tmdbId)
      .then((data) => {
        if (!data) { setError('Фильм не найден'); return; }
        setMovie(data);
        setActiveSeason(1);
        setActiveEpisode(1);
        window.scrollTo(0, 0);
      })
      .catch(() => setError('Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  /* ── Загрузка источников ── */
  useEffect(() => {
    if (!movie) return;
    setSourceLoading(true);
    const isSerial = movie.is_serial || (movie.seasons?.length ?? 0) > 0;
    getWatchOptions({
      tmdbId,
      imdbId: movie.imdbID || undefined,
      isSerial,
      season: isSerial ? activeSeason : undefined,
      episode: isSerial ? activeEpisode : undefined,
      title: movie.title,
    })
      .then(setPlayerOptions)
      .catch(() => setPlayerOptions([]))
      .finally(() => setSourceLoading(false));
  }, [movie, tmdbId, activeSeason, activeEpisode]);

  /* ── Кнопка назад Telegram ── */
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

  const handleEpisodeWatch = (season: number, episode: number) => {
    setActiveSeason(season);
    setActiveEpisode(episode);
    haptic('medium');
    if (movie) addToHistory(movie);
    setShowPlayer(true);
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="dp page">
        <div className="dp-skeleton">
          <div className="dp-skeleton__poster skeleton-pulse" />
          <div className="dp-skeleton__info">
            <div className="dp-skeleton__line skeleton-pulse" style={{ width: '75%', height: 26 }} />
            <div className="dp-skeleton__line skeleton-pulse" style={{ width: '55%', height: 16 }} />
            <div className="dp-skeleton__line skeleton-pulse" style={{ width: '90%', height: 16 }} />
            <div className="dp-skeleton__line skeleton-pulse" style={{ width: '60%', height: 48 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="dp dp--error page">
        <div className="dp-error-icon">😕</div>
        <p>{error || 'Фильм не найден'}</p>
        <button className="dp-error-btn" onClick={() => navigate(-1)}>← Назад</button>
      </div>
    );
  }

  const seasons = movie.seasons || [];
  const isSerial = movie.is_serial || seasons.length > 0;
  const poster = movie.poster_path;
  const backdrop = movie.backdrop_path || poster;

  /* Эпизоды текущего сезона */
  const currentSeason = seasons.find(s => s.season_number === activeSeason);
  const episodesCount = currentSeason?.episodes_count || 0;

  return (
    <div className="dp page">
      {/* ── Фон ── */}
      <div className="dp-bg">
        <img src={backdrop} alt="" className="dp-bg__img" />
        <div className="dp-bg__grad" />
      </div>

      {/* ── Кнопка назад ── */}
      <button className="dp-back" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M14 5l-7 6 7 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Hero: постер + основная инфа ── */}
      <div className="dp-hero">
        <div className="dp-hero__poster-wrap">
          <img className="dp-hero__poster" src={poster} alt={movie.title} />
          {movie.vote_average > 0 && (
            <div className="dp-hero__score">
              <span>★</span> {movie.vote_average.toFixed(1)}
            </div>
          )}
        </div>

        <div className="dp-hero__info">
          <h1 className="dp-hero__title">{movie.title}</h1>
          {movie.original_title && movie.original_title !== movie.title && (
            <p className="dp-hero__orig">{movie.original_title}</p>
          )}

          <div className="dp-meta">
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.runtime ? <span>{movie.runtime} мин</span> : null}
            {isSerial && <span className="dp-meta--serial">Сериал</span>}
            {movie.quality && <span className="dp-meta--quality">{movie.quality}</span>}
          </div>

          <div className="dp-genres">
            {movie.genres?.slice(0, 3).map((g, i) => (
              <span key={i} className="dp-genre">{g}</span>
            ))}
          </div>

          {/* Кнопки действий */}
          <div className="dp-actions">
            <button
              className={`dp-watch ${sourceLoading ? 'dp-watch--loading' : ''}`}
              onClick={handleWatch}
            >
              {sourceLoading ? (
                <span className="dp-watch__spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 2.5l12 6.5-12 6.5V2.5z" fill="currentColor"/>
                </svg>
              )}
              {isSerial ? `С${activeSeason}:Е${activeEpisode}` : 'Смотреть'}
            </button>

            <button
              className={`dp-fav ${favorite ? 'dp-fav--on' : ''} ${heartAnim ? 'dp-fav--anim' : ''}`}
              onClick={handleFav}
              aria-label="Избранное"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M17.3 4.4a5 5 0 0 0-7.1 0L10 4.6l-.2-.2A5 5 0 0 0 2.7 11.5l.2.2L10 19l7.1-7.3.2-.2a5 5 0 0 0 0-7.1z"
                  fill={favorite ? '#f472b6' : 'none'}
                  stroke={favorite ? 'none' : 'rgba(255,255,255,0.6)'}
                  strokeWidth="1.7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Описание ── */}
      {movie.overview && (
        <div className="dp-section">
          <p className="dp-desc">{movie.overview}</p>
        </div>
      )}

      {/* ── Сезоны ── */}
      {isSerial && seasons.length > 0 && (
        <div className="dp-section">
          <h3 className="dp-section__title">Сезоны</h3>
          <div className="dp-seasons">
            {seasons.map((s) => (
              <button
                key={s.id}
                className={`dp-season-btn ${s.season_number === activeSeason ? 'active' : ''}`}
                onClick={() => { setActiveSeason(s.season_number); setActiveEpisode(1); }}
              >
                С{s.season_number}
              </button>
            ))}
          </div>

          {/* Эпизоды */}
          {episodesCount > 0 && (
            <div className="dp-episodes">
              {Array.from({ length: episodesCount }, (_, i) => i + 1).map((ep) => (
                <button
                  key={ep}
                  className={`dp-ep ${ep === activeEpisode ? 'active' : ''}`}
                  onClick={() => handleEpisodeWatch(activeSeason, ep)}
                >
                  <span className="dp-ep__num">{ep}</span>
                  <span className="dp-ep__label">Серия {ep}</span>
                  <svg className="dp-ep__play" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Детали ── */}
      <div className="dp-section dp-details">
        {movie.countries?.length > 0 && (
          <div className="dp-row">
            <span className="dp-row__label">Страна</span>
            <span className="dp-row__val">{movie.countries.join(', ')}</span>
          </div>
        )}
        {movie.directors?.length > 0 && (
          <div className="dp-row">
            <span className="dp-row__label">Режиссёр</span>
            <span className="dp-row__val">{movie.directors.join(', ')}</span>
          </div>
        )}
        {movie.actors?.length > 0 && (
          <div className="dp-row">
            <span className="dp-row__label">В ролях</span>
            <span className="dp-row__val">{movie.actors.slice(0, 5).join(', ')}</span>
          </div>
        )}
        {movie.imdbID && (
          <div className="dp-row">
            <span className="dp-row__label">IMDB</span>
            <span className="dp-row__val dp-row__imdb">{movie.imdbID}</span>
          </div>
        )}
      </div>

      {/* ── Плеер ── */}
      {showPlayer && (
        <VideoPlayer
          options={playerOptions}
          loadingOptions={sourceLoading}
          onClose={() => setShowPlayer(false)}
          title={movie.title}
          poster={poster}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;