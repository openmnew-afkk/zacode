import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getPlayerUrl, posterUrl, backdropUrl } from '../api/catalog';
import type { PlayerSource } from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
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
  const [error, setError] = useState<string | null>(null);
  const [playerSources, setPlayerSources] = useState<PlayerSource[]>([]);
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

  const buildSources = async (seasonNum?: number, episodeNum?: number) => {
    const isSerial = movie?.is_serial || (movie?.seasons?.length ?? 0) > 0;
    const rawSources = await getPlayerUrl(movieId, movie?.title || '', isSerial);
    if (!isSerial) return rawSources;
    // Для сериалов добавляем ?s=&e= к URL
    const s = seasonNum ?? (activeSeason + 1);
    const e = episodeNum ?? activeEpisode;
    return rawSources.map(src => {
      const url = src.url;
      // vidsrc.xyz и vidsrc.pro принимают ?s=1&e=1
      const sep = url.includes('?') ? '&' : '?';
      return { ...src, url: `${url}${sep}s=${s}&e=${e}` };
    });
  };

  const handleWatch = async (seasonNum?: number, episodeNum?: number) => {
    haptic('medium');
    if (movie) addToHistory(movie);
    setWatchLoading(true);
    setPlayerSources([]);
    try {
      const sources = await buildSources(seasonNum, episodeNum);
      if (sources.length > 0) {
        setPlayerSources(sources);
        setShowPlayer(true);
      } else {
        setError('Источники воспроизведения не найдены.');
      }
    } catch {
      setError('Ошибка загрузки плеера.');
    } finally {
      setWatchLoading(false);
    }
  };

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

  const seasons = movie.seasons || [];
  const currentSeason = seasons[activeSeason];
  const isSerial = movie.is_serial || seasons.length > 0;

  // Генерируем список эпизодов если есть episodes_count но нет episodes
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
      {/* Фоновый постер */}
      <div className="detail-backdrop">
        <img
          src={backdropUrl(movie.backdrop_path) || posterUrl(movie.poster_path)}
          alt=""
          className="detail-backdrop__img"
        />
        <div className="detail-backdrop__overlay" />
        <div className="detail-backdrop__blur" />
      </div>

      {/* Кнопка назад */}
      <button className="detail-back-btn" onClick={() => navigate(-1)} aria-label="Назад">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Основной контент */}
      <div className="detail-content">

        {/* Hero-постер */}
        <div className="detail-hero">
          <div className="detail-hero__poster-wrap">
            <img
              className="detail-hero__poster"
              src={posterUrl(movie.poster_path)}
              alt={movie.title}
            />
            {movie.quality && <span className="detail-hero__quality">{movie.quality}</span>}
          </div>

          <div className="detail-hero__info">
            <h1 className="detail-hero__title">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="detail-hero__original">{movie.original_title}</p>
            )}

            {/* Рейтинги */}
            <div className="detail-hero__ratings">
              {movie.imdb_rating > 0 && (
                <div className="detail-hero__rating detail-hero__rating--imdb">
                  <span className="detail-hero__rating-star">★</span>
                  <span className="detail-hero__rating-val">{movie.imdb_rating.toFixed(1)}</span>
                  <span className="detail-hero__rating-src">IMDb</span>
                </div>
              )}
            </div>

            {/* Мета */}
            <div className="detail-hero__meta">
              {movie.release_date && <span className="detail-hero__meta-chip">{movie.release_date?.slice(0, 4)}</span>}
              {movie.runtime ? <span className="detail-hero__meta-chip">{movie.runtime} мин</span> : null}
              {movie.quality && <span className="detail-hero__meta-chip detail-hero__meta-chip--quality">{movie.quality}</span>}
              {isSerial && <span className="detail-hero__meta-chip detail-hero__meta-chip--serial">Сериал</span>}
            </div>

            {/* Жанры */}
            <div className="detail-hero__genres">
              {movie.genres?.slice(0, 3).map((g) => (
                <span key={g.id} className="detail-genre-tag">{g.name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
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
            {watchLoading ? 'Загрузка…' : isSerial ? `▶ Смотреть С${activeSeason + 1}:Е${activeEpisode}` : 'Смотреть'}
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

          <button
            className="detail-actions__share"
            onClick={() => { haptic('light'); }}
            aria-label="Поделиться"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M7 9l6-3M7 11l6 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Ошибка плеера */}
        {error && (
          <div className="detail-player-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Описание */}
        {movie.overview && (
          <div className="detail-section">
            <h3 className="detail-section__title">Описание</h3>
            <p className="detail-section__text">{movie.overview}</p>
          </div>
        )}

        {/* Сезоны и серии */}
        {isSerial && seasons.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">Сезоны и серии</h3>
            <div className="seasons-block">
              {/* Вкладки сезонов */}
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
              {/* Список серий */}
              {episodeList.length > 0 && (
                <div className="episodes-list">
                  {episodeList.map((ep) => (
                    <button
                      key={ep.id}
                      className={`episode-item ${activeEpisode === ep.episode ? 'episode-item--active' : ''}`}
                      onClick={() => {
                        haptic('medium');
                        setActiveEpisode(ep.episode);
                        handleWatch(currentSeason.season_number, ep.episode);
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

        {/* Информация */}
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
            {movie.imdb_rating > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">IMDb</span>
                <span className="detail-info-item__value">{movie.imdb_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Актёры */}
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

      {/* Видеоплеер */}
      {showPlayer && playerSources.length > 0 && (
        <VideoPlayer
          url={playerSources[0].url}
          sources={playerSources}
          onClose={() => setShowPlayer(false)}
          title={movie.title}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;
