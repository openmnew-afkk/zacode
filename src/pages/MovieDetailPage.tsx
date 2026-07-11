import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getPlayerUrl, posterUrl, backdropUrl } from '../api/catalog';
import type { WatchOption } from '../api/players';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import VideoPlayer from '../components/VideoPlayer';
import type { MovieDetail } from '../types';
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

  const [activeSeason, setActiveSeason] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState(1);

  const movieId = id || '0';
  const favorite = movie ? isFavorite(movie.id) : false;

  // Загрузка фильма
  useEffect(() => {
    if (!movieId || movieId === '0') return;
    setLoading(true);
    setMovie(null);
    setError(null);
    getMovieDetail(movieId)
      .then((data) => {
        setMovie(data);
        setActiveSeason(0);
        setActiveEpisode(1);
        window.scrollTo(0, 0);
      })
      .catch(() => setError('Не удалось загрузить'))
      .finally(() => setLoading(false));
  }, [movieId]);

  const seasons = movie?.seasons || [];
  const currentSeason = seasons[activeSeason];
  const isSerial = movie?.is_serial || seasons.length > 0;
  const seasonNum = currentSeason?.season_number ?? activeSeason + 1;

  // Загрузка источников
  useEffect(() => {
    if (!movie) return;
    getPlayerUrl(movieId, movie.title, isSerial, seasonNum, activeEpisode)
      .then((opts) => setPlayerOptions(opts))
      .catch(() => setPlayerOptions([]));
  }, [movie, movieId, isSerial, seasonNum, activeEpisode]);

  // Кнопка назад Telegram
  useEffect(() => {
    const cleanup = showBackButton(() => {
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

  if (error && !movie) {
    return (
      <div className="dp dp--error page">
        <p>⚠️ {error}</p>
        <button onClick={() => navigate(-1)}>← Назад</button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="dp dp--error page">
        <p>😕 Фильм не найден</p>
        <button onClick={() => navigate(-1)}>← Назад</button>
      </div>
    );
  }

  // ── Эпизоды сериала ──
  const episodes = currentSeason
    ? (currentSeason.episodes?.length
      ? currentSeason.episodes
      : Array.from({ length: currentSeason.episodes_count || 0 }, (_, i) => ({
          id: i + 1, episode: i + 1, title: `Серия ${i + 1}`, season: currentSeason.season_number,
        })))
    : [];

  const poster = posterUrl(movie.poster_path, movie.imdb_id);
  const backdrop = backdropUrl(movie.backdrop_path, movie.imdb_id) || poster;

  return (
    <div className="dp page">
      {/* ── Фон ── */}
      <div className="dp-bg">
        <img src={backdrop} alt="" className="dp-bg__img" />
        <div className="dp-bg__grad" />
      </div>

      {/* ── Кнопка назад ── */}
      <button className="dp-back" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l-6 6 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Постер + Инфо ── */}
      <div className="dp-hero">
        <img className="dp-hero__poster" src={poster} alt={movie.title} />

        <div className="dp-hero__info">
          <h1 className="dp-hero__title">{movie.title}</h1>
          {movie.original_title && movie.original_title !== movie.title && (
            <p className="dp-hero__orig">{movie.original_title}</p>
          )}

          {/* Рейтинг */}
          {movie.imdb_rating > 0 && (
            <div className="dp-rating">
              <span className="dp-rating__star">★</span>
              <span className="dp-rating__val">{movie.imdb_rating.toFixed(1)}</span>
              <span className="dp-rating__src">IMDb</span>
            </div>
          )}

          {/* Мета-инфо */}
          <div className="dp-meta">
            {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
            {movie.runtime ? <span>{movie.runtime} мин</span> : null}
            {isSerial && <span className="dp-meta__serial">Сериал</span>}
          </div>

          {/* Жанры */}
          <div className="dp-genres">
            {movie.genres?.slice(0, 3).map((g) => (
              <span key={g.id} className="dp-genre">{g.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Кнопки действий ── */}
      <div className="dp-actions">
        <button className="dp-watch" onClick={handleWatch}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M6 3.5l13 7.5-13 7.5V3.5z" fill="currentColor"/>
          </svg>
          {isSerial ? `Смотреть С${seasonNum}:Е${activeEpisode}` : 'Смотреть'}
        </button>

        <button
          className={`dp-fav ${favorite ? 'dp-fav--active' : ''} ${heartAnim ? 'dp-fav--anim' : ''}`}
          onClick={handleFav}
          aria-label="Избранное"
        >
          {favorite ? '❤️' : '🤍'}
        </button>
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
            {seasons.map((s, i) => (
              <button
                key={s.id}
                className={`dp-season ${i === activeSeason ? 'dp-season--active' : ''}`}
                onClick={() => { setActiveSeason(i); setActiveEpisode(1); }}
              >
                {s.season_number}
              </button>
            ))}
          </div>

          {/* Эпизоды */}
          {episodes.length > 0 && (
            <div className="dp-episodes">
              {episodes.map((ep: any) => (
                <button
                  key={ep.id}
                  className={`dp-episode ${ep.episode === activeEpisode ? 'dp-episode--active' : ''}`}
                  onClick={() => { setActiveEpisode(ep.episode); handleWatch(); }}
                >
                  <span className="dp-episode__num">{ep.episode}</span>
                  <span className="dp-episode__title">{ep.title || `Серия ${ep.episode}`}</span>
                  <span className="dp-episode__play">▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Инфо ── */}
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
            <span>{movie.actors.slice(0, 5).join(', ')}</span>
          </div>
        )}
      </div>

      {/* ── Плеер ── */}
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
