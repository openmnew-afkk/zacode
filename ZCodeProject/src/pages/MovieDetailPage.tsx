import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getPlayerUrl, posterUrl, backdropUrl } from '../api/catalog';
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
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  // Сезоны/серии (для сериалов)
  const [activeSeason, setActiveSeason] = useState<number>(0);
  const [activeEpisode, setActiveEpisode] = useState<string | number | null>(null);

  const movieId = id || '0';
  const favorite = movie ? isFavorite(movie.id) : false;

  /** Загрузка деталей фильма */
  useEffect(() => {
    if (!movieId || movieId === '0') return;
    setLoading(true);
    setMovie(null);
    setError(null);

    getMovieDetail(movieId)
      .then((data) => {
        setMovie(data);
        setActiveSeason(0);
        setActiveEpisode(null);
        window.scrollTo(0, 0);
      })
      .catch((err) => {
        console.error('Ошибка загрузки фильма:', err);
        setError('Не удалось загрузить фильм. Проверьте токен источника.');
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
    if (movie) addToHistory(movie);

    if (playerUrl) { setShowPlayer(true); return; }

    try {
      const sources = await getPlayerUrl(movieId, movie?.title || 'фильм');
      const first = sources.find((s) => s.type === 'embed') || sources[0];
      if (first?.url) {
        setPlayerUrl(first.url);
        setShowPlayer(true);
      } else {
        setError('Плеер не найден.');
      }
    } catch {
      setError('Ошибка загрузки плеера.');
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

  if (error) {
    return (
      <div className="detail-error">
        <span>⚠️</span>
        <p>{error}</p>
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

  const seasons = movie.seasons || [];
  const currentSeason = seasons[activeSeason];
  const isSerial = movie.is_serial || seasons.length > 0;

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
            src={posterUrl(movie.poster_path)}
            alt={movie.title}
          />
          <div className="detail-hero__info">
            <h1 className="detail-hero__title">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="detail-hero__original">{movie.original_title}</p>
            )}
            <div className="detail-hero__meta">
              <span className="detail-hero__rating">★ {movie.vote_average.toFixed(1)}</span>
              {movie.release_date && <span>{movie.release_date?.slice(0, 4)}</span>}
              {movie.runtime ? <span>{movie.runtime} мин</span> : null}
              {movie.quality && <span>{movie.quality}</span>}
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
            ▶ {isSerial && activeEpisode === null ? 'Открыть плеер' : 'Смотреть'}
          </button>
          <button
            className={`detail-actions__fav ${favorite ? 'active' : ''} ${heartAnim ? 'animate' : ''}`}
            onClick={handleFavorite}
          >
            {favorite ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Сезоны и серии (только для сериалов) */}
        {isSerial && seasons.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">Сезоны и серии</h3>
            <div className="seasons-block">
              {/* Табы сезонов */}
              <div className="seasons-block__tabs">
                {seasons.map((s, i) => (
                  <button
                    key={s.id}
                    className={`season-tab ${i === activeSeason ? 'season-tab--active' : ''}`}
                    onClick={() => {
                      setActiveSeason(i);
                      setActiveEpisode(null);
                      haptic('light');
                    }}
                  >
                    Сезон {s.season_number}
                  </button>
                ))}
              </div>

              {/* Список серий */}
              {currentSeason && (
                <div className="episodes-list">
                  {currentSeason.episodes.map((ep) => (
                    <button
                      key={ep.id}
                      className={`episode-item ${activeEpisode === ep.id ? 'episode-item--active' : ''}`}
                      onClick={() => {
                        setActiveEpisode(ep.id);
                        haptic('light');
                      }}
                    >
                      <span className="episode-item__num">{ep.episode}</span>
                      <span className="episode-item__title">{ep.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
                <span className="detail-info-item__label">Год</span>
                <span className="detail-info-item__value">
                  {movie.release_date.slice(0, 4)}
                </span>
              </div>
            )}
            {movie.countries?.length > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Страна</span>
                <span className="detail-info-item__value">
                  {movie.countries.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
            {movie.directors?.length > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Режиссёр</span>
                <span className="detail-info-item__value">
                  {movie.directors.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
            {movie.kinopoisk_rating > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Кинопоиск</span>
                <span className="detail-info-item__value">{movie.kinopoisk_rating.toFixed(1)}</span>
              </div>
            )}
            {movie.imdb_rating > 0 && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">IMDb</span>
                <span className="detail-info-item__value">{movie.imdb_rating.toFixed(1)}</span>
              </div>
            )}
            {movie.translator && (
              <div className="detail-info-item">
                <span className="detail-info-item__label">Озвучка</span>
                <span className="detail-info-item__value">{movie.translator}</span>
              </div>
            )}
          </div>
        </div>

        {/* Актёры */}
        {movie.actors && movie.actors.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">В ролях</h3>
            <div className="detail-cast">
              {movie.actors.slice(0, 15).map((actor, i) => (
                <div key={`${actor}-${i}`} className="detail-cast__item">
                  <div className="detail-cast__photo">
                    <div className="detail-cast__placeholder">🎭</div>
                  </div>
                  <p className="detail-cast__name">{actor}</p>
                </div>
              ))}
            </div>
          </div>
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
