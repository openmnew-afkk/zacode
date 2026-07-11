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
  const [selectedSource, setSelectedSource] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);

  const [activeSeason, setActiveSeason] = useState<number>(0);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);

  const movieId = id || '0';
  const favorite = movie ? isFavorite(movie.id) : false;

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
      .catch((err) => {
        console.error('Ошибка загрузки фильма:', err);
        setError('Не удалось загрузить фильм.');
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  const seasons = movie?.seasons || [];
  const currentSeason = seasons[activeSeason];
  const isSerial = movie?.is_serial || seasons.length > 0;
  const seasonNum = currentSeason?.season_number ?? activeSeason + 1;

  useEffect(() => {
    if (!movie) return;
    getPlayerUrl(movieId, movie.title, isSerial, seasonNum, activeEpisode)
      .then((opts) => {
        setPlayerOptions(opts);
        setSelectedSource(0);
      })
      .catch(() => setPlayerOptions([]));
  }, [movie, movieId, isSerial, seasonNum, activeEpisode]);

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

  const handleWatch = async (sourceIndex = selectedSource) => {
    haptic('medium');
    if (movie) addToHistory(movie);
    // Открываем плеер сразу — если источники ещё грузятся, плеер покажет лоадер
    setSelectedSource(sourceIndex);
    setShowPlayer(true);
  };

  const handleFavorite = () => {
    haptic('light');
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    if (movie) {
      if (favorite) removeFavorite(movie.id);
      else addFavorite(movie);
    }
  };

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

  if (error && !movie) {
    return (
      <div className="detail-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="detail-error__back">← Назад</button>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="detail-error">
        <span>😕</span>
        <p>Фильм не найден</p>
        <button onClick={() => navigate(-1)} className="detail-error__back">← Назад</button>
      </div>
    );
  }

  const episodeList = currentSeason
    ? (currentSeason.episodes && currentSeason.episodes.length > 0
      ? currentSeason.episodes
      : Array.from({ length: currentSeason.episodes_count || 0 }, (_, i) => ({
          id: i + 1,
          episode: i + 1,
          title: `Серия ${i + 1}`,
          season: currentSeason.season_number,
        }))
    )
    : [];

  return (
    <div className="detail-page page">
      <div className="detail-backdrop">
        <img
          src={backdropUrl(movie.backdrop_path, movie.imdb_id) || posterUrl(movie.poster_path, movie.imdb_id)}
          alt=""
          className="detail-backdrop__img"
        />
        <div className="detail-backdrop__overlay" />
        <div className="detail-backdrop__blur" />
      </div>

      <button className="detail-back-btn" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="detail-content">
        <div className="detail-hero">
          <div className="detail-hero__poster-wrap">
            <img
              className="detail-hero__poster"
              src={posterUrl(movie.poster_path, movie.imdb_id)}
              alt={movie.title}
            />
            {movie.quality && <span className="detail-hero__quality">{movie.quality}</span>}
          </div>

          <div className="detail-hero__info">
            <h1 className="detail-hero__title">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="detail-hero__original">{movie.original_title}</p>
            )}

            <div className="detail-hero__ratings">
              {movie.imdb_rating > 0 && (
                <div className="detail-hero__rating detail-hero__rating--imdb">
                  <span className="detail-hero__rating-star">★</span>
                  <span className="detail-hero__rating-val">{movie.imdb_rating.toFixed(1)}</span>
                  <span className="detail-hero__rating-src">IMDb</span>
                </div>
              )}
            </div>

            <div className="detail-hero__meta">
              {movie.release_date && <span className="detail-hero__meta-chip">{movie.release_date?.slice(0, 4)}</span>}
              {movie.runtime ? <span className="detail-hero__meta-chip">{movie.runtime} мин</span> : null}
              {movie.quality && <span className="detail-hero__meta-chip detail-hero__meta-chip--quality">{movie.quality}</span>}
              {isSerial && <span className="detail-hero__meta-chip detail-hero__meta-chip--serial">Сериал</span>}
            </div>

            <div className="detail-hero__genres">
              {movie.genres?.slice(0, 3).map((g) => (
                <span key={g.id} className="detail-genre-tag">{g.name}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-actions">
          <button
            className={`detail-actions__watch ${watchLoading ? 'loading' : ''}`}
            onClick={() => handleWatch()}
            disabled={watchLoading}
          >
            {watchLoading ? (
              <span className="detail-actions__spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M5 3l11 6-11 6V3z" fill="currentColor"/>
              </svg>
            )}
            {watchLoading ? 'Загрузка…' : isSerial ? `▶ Смотреть С${seasonNum}:Е${activeEpisode}` : 'Смотреть'}
          </button>

          <button
            className={`detail-actions__fav ${favorite ? 'active' : ''} ${heartAnim ? 'animate' : ''}`}
            onClick={handleFavorite}
            aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M17.3 4.4a5 5 0 0 0-7.1 0L10 4.6l-.2-.2a5 5 0 0 0-7.1 7.1l.2.2L10 19l7.1-7.3.2-.2a5 5 0 0 0 0-7.1z"
                fill={favorite ? 'url(#fav-grad)' : 'none'}
                stroke={favorite ? 'none' : 'currentColor'}
                strokeWidth="1.6"
              />
              <defs>
                <linearGradient id="fav-grad" x1="3" y1="3" x2="17" y2="19" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f472b6"/>
                  <stop offset="1" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>

        {playerOptions.length > 0 && (
          <div className="watch-sources">
            <div className="watch-sources__header">
              <h3 className="watch-sources__title">Где смотреть</h3>
              <span className="watch-sources__hint">Выберите озвучку</span>
            </div>
            <div className="watch-sources__grid">
              {playerOptions.map((src, i) => (
                <button
                  key={src.url}
                  className={`watch-source-card ${i === selectedSource ? 'watch-source-card--active' : ''} watch-source-card--${src.lang}`}
                  onClick={() => {
                    haptic('light');
                    setSelectedSource(i);
                  }}
                >
                  <span className="watch-source-card__flag">{src.lang === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                  <span className="watch-source-card__name">{src.label.replace(/^🇷🇺 |^🇬🇧 /, '')}</span>
                  <span className="watch-source-card__lang">{src.lang === 'ru' ? 'Русская' : 'Оригинал'}</span>
                  {i === selectedSource && <span className="watch-source-card__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="detail-player-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {movie.overview && (
          <div className="detail-section">
            <h3 className="detail-section__title">Описание</h3>
            <p className="detail-section__text">{movie.overview}</p>
          </div>
        )}

        {isSerial && seasons.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">Сезоны и серии</h3>
            <div className="seasons-block">
              <div className="seasons-block__tabs">
                {seasons.map((s, i) => (
                  <button
                    key={s.id}
                    className={`season-tab ${i === activeSeason ? 'season-tab--active' : ''}`}
                    onClick={() => { setActiveSeason(i); setActiveEpisode(1); haptic('light'); }}
                  >
                    Сезон {s.season_number}
                  </button>
                ))}
              </div>
              {episodeList.length > 0 && (
                <div className="episodes-list">
                  {episodeList.map((ep) => (
                    <button
                      key={ep.id}
                      className={`episode-item ${activeEpisode === ep.episode ? 'episode-item--active' : ''}`}
                      onClick={() => {
                        haptic('medium');
                        setActiveEpisode(ep.episode);
                      }}
                    >
                      <span className="episode-item__num">Серия {ep.episode}</span>
                      <span className="episode-item__title">{ep.title !== `Серия ${ep.episode}` ? ep.title : ''}</span>
                      <span className="episode-item__play">▶</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3 className="detail-section__title">Информация</h3>
          <div className="detail-info-grid">
            {movie.release_date && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Год</span>
                <span className="detail-info-item__value">{movie.release_date.slice(0, 4)}</span>
              </div>
            )}
            {movie.countries?.length > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Страна</span>
                <span className="detail-info-item__value">{movie.countries.slice(0, 2).join(', ')}</span>
              </div>
            )}
            {movie.directors?.length > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Режиссёр</span>
                <span className="detail-info-item__value">{movie.directors.slice(0, 2).join(', ')}</span>
              </div>
            )}
            {movie.runtime && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Длительность</span>
                <span className="detail-info-item__value">{movie.runtime} мин</span>
              </div>
            )}
          </div>
        </div>

        {movie.actors && movie.actors.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">В ролях</h3>
            <div className="detail-cast">
              {movie.actors.slice(0, 12).map((actor, i) => (
                <div key={`${actor}-${i}`} className="detail-cast__item">
                  <div className="detail-cast__avatar">
                    <span>{actor.charAt(0)}</span>
                  </div>
                  <p className="detail-cast__name">{actor}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPlayer && playerOptions.length > 0 && (
        <VideoPlayer
          options={playerOptions}
          initialIndex={selectedSource}
          onClose={() => setShowPlayer(false)}
          title={movie.title}
          poster={posterUrl(movie.poster_path, movie.imdb_id)}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;
