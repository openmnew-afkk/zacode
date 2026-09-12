import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getTrailer } from '../api/catalog';
import { buildForeignWatchOptions, isRestrictedContent, switchSourceUrl } from '../api/watch';
import type { MovieDetail, WatchStatus, WatchOption } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './MovieDetailPage.css';

/* Статусы дневника */
const STATUSES: Array<{ id: WatchStatus; label: string; icon: string }> = [
  { id: 'want', label: 'Буду смотреть', icon: '🔖' },
  { id: 'watching', label: 'Смотрю', icon: '▶️' },
  { id: 'watched', label: 'Просмотрено', icon: '✅' },
  { id: 'dropped', label: 'Брошено', icon: '🚫' },
];

/* Легальные сервисы для поиска, где посмотреть */
const whereToWatch = (title: string) => [
  { name: 'JustWatch', icon: '🔎', url: `https://www.justwatch.com/ru/поиск?q=${encodeURIComponent(title)}` },
  { name: 'Кинопоиск', icon: '🎬', url: `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(title)}` },
  { name: 'Okko', icon: '🟠', url: `https://okko.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Wink', icon: '🟣', url: `https://wink.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Иви', icon: '📺', url: `https://www.ivi.ru/search/?q=${encodeURIComponent(title)}` },
  { name: 'Netflix', icon: '🅽', url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}` },
  { name: 'YouTube', icon: '▶️', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}` },
];

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showBackButton, haptic, openLink } = useTelegram();
  const {
    addFavorite, removeFavorite, addToHistory,
    setTrackedStatus, setPersonalRating, getStatus, getRating,
  } = useStore();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favToast, setFavToast] = useState('');
  const [favToastVisible, setFavToastVisible] = useState(false);
  const [status, setStatusState] = useState<WatchStatus | null>(null);
  const [rating, setRatingState] = useState<number | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showWatch, setShowWatch] = useState(false);
  const [watchOptions, setWatchOptions] = useState<WatchOption[]>([]);
  const [watchIdx, setWatchIdx] = useState(0);

  const compositeId = id || '';
  const tmdbId = compositeId.replace(/^(tv|movie)-/, '');

  /* ── Загрузка деталей фильма ── */
  useEffect(() => {
    if (!compositeId) return;
    setLoading(true);
    setMovie(null);
    setError(null);
    setShowTrailer(false);
    setTrailerUrl(null);
    getMovieDetail(compositeId)
      .then((data) => {
        if (!data) { setError('Фильм не найден'); return; }
        setMovie(data);
        setStatusState(getStatus(data.id));
        setRatingState(getRating(data.id));
        window.scrollTo(0, 0);
      })
      .catch(() => setError('Не удалось загрузить'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositeId]);

  /* ── Трейлер (официальный YouTube) ── */
  useEffect(() => {
    if (!movie) return;
    const isSerial = movie.is_serial || (movie.seasons?.length ?? 0) > 0;
    getTrailer(tmdbId, isSerial).then((url) => setTrailerUrl(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, tmdbId]);

  /* ── Кнопка назад Telegram ── */
  useEffect(() => {
    const cleanup = showBackButton?.(() => {
      if (showTrailer) setShowTrailer(false);
      else navigate(-1);
    });
    return cleanup;
  }, [showBackButton, navigate, showTrailer]);

  const handleStatus = (s: WatchStatus) => {
    if (!movie) return;
    haptic('medium');
    const newStatus = status === s ? null : s;
    setTrackedStatus(movie, newStatus);
    setStatusState(newStatus);
    if (newStatus === 'watched') addToHistory(movie);
  };

  const handleRate = (r: number) => {
    if (!movie) return;
    haptic('light');
    if (!status) {
      setTrackedStatus(movie, 'watched');
      setStatusState('watched');
      addToHistory(movie);
    }
    setPersonalRating(movie.id, r);
    setRatingState(r);
  };

  const handleFav = () => {
    haptic('light');
    if (movie) {
      if (status) {
        setTrackedStatus(movie, null);
        setFavToast('Убрано из списков 💔');
        haptic('medium');
      } else {
        setTrackedStatus(movie, 'want');
        setFavToast('Добавлено в «Буду смотреть» 🔖');
        haptic('heavy');
      }
      setStatusState(getStatus(movie.id));
      setFavToastVisible(true);
      setTimeout(() => setFavToastVisible(false), 1800);
    }
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

  const isSerial = movie.is_serial || (movie.seasons?.length ?? 0) > 0;
  const poster = movie.poster_path;
  const backdrop = movie.backdrop_path || poster;
  const inList = status !== null;
  const whereLinks = whereToWatch(movie.title);
  /* РФ/СНГ контент → только ссылки, зарубежный → плеер доступен */
  const restricted = isRestrictedContent(movie.countries);
  const canWatch = !restricted;

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

      {/* ── Hero ── */}
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
          </div>

          <div className="dp-genres">
            {movie.genres?.slice(0, 3).map((g, i) => (
              <span key={i} className="dp-genre">{g}</span>
            ))}
          </div>

          <div className="dp-actions">
            {canWatch ? (
              <button
                className="dp-watch"
                onClick={() => {
                  haptic('medium');
                  setWatchOptions(buildForeignWatchOptions(tmdbId, isSerial));
                  setWatchIdx(0);
                  setShowWatch(true);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 2.5l12 6.5-12 6.5V2.5z" fill="currentColor"/>
                </svg>
                Смотреть
              </button>
            ) : (
              <button
                className="dp-watch"
                onClick={() => {
                  if (!trailerUrl) return;
                  haptic('medium');
                  setShowTrailer(true);
                }}
                disabled={!trailerUrl}
                style={!trailerUrl ? { opacity: 0.5 } : undefined}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 2.5l12 6.5-12 6.5V2.5z" fill="currentColor"/>
                </svg>
                Трейлер
              </button>
            )}

            <button
              className={`dp-fav ${inList ? 'dp-fav--on' : ''}`}
              onClick={handleFav}
              aria-label="Буду смотреть"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M17.3 4.4a5 5 0 0 0-7.1 0L10 4.6l-.2-.2A5 5 0 0 0 2.7 11.5l.2.2L10 19l7.1-7.3.2-.2a5 5 0 0 0 0-7.1z"
                  fill={inList ? '#e23d3d' : 'none'}
                  stroke={inList ? 'none' : 'rgba(255,255,255,0.6)'}
                  strokeWidth="1.7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Тост ── */}
      <div className={`dp-fav-toast ${favToastVisible ? 'dp-fav-toast--show' : ''}`}>
        {favToast}
      </div>

      {movie.overview && (
        <div className="dp-section">
          <p className="dp-desc">{movie.overview}</p>
        </div>
      )}

      {/* ── Плашка запрета для РФ/СНГ контента ── */}
      {restricted && (
        <div className="dp-ban">
          <span className="dp-ban__icon">🔒</span>
          <div className="dp-ban__text">
            <b>Онлайн-показ ограничен</b>
            <span>
              {isSerial ? 'Сериал' : 'Фильм'} российского/СНГ производства недоступен
              к просмотру в приложении. Смотрите на легальных площадках ниже.
            </span>
          </div>
        </div>
      )}

      {/* ── Дневник: статусы ── */}
      <div className="dp-section">
        <h3 className="dp-section__title">Мой дневник</h3>
        <div className="dp-statuses">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={`dp-status ${status === s.id ? 'active' : ''}`}
              onClick={() => handleStatus(s.id)}
            >
              <span className="dp-status__icon">{s.icon}</span>
              <span className="dp-status__label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Личная оценка 1-10 */}
        {status === 'watched' && (
          <div className="dp-rate">
            <p className="dp-rate__title">Моя оценка</p>
            <div className="dp-rate__stars">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                <button
                  key={r}
                  className={`dp-rate__star ${rating && r <= rating ? 'on' : ''}`}
                  onClick={() => handleRate(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            {rating !== null && <p className="dp-rate__value">Моя оценка: {rating}/10</p>}
          </div>
        )}
      </div>

      {/* ── Где посмотреть (легальные сервисы) ── */}
      <div className="dp-section">
        <h3 className="dp-section__title">Где посмотреть</h3>
        <p className="dp-where__hint">
          {restricted ? 'Легальные площадки для этого тайтла' : 'Поиск по легальным сервисам'}
        </p>
        <div className="dp-where">
          {whereLinks.map((s) => (
            <button
              key={s.name}
              className="dp-where__item"
              onClick={() => { haptic('light'); openLink(s.url); }}
            >
              <span className="dp-where__icon">{s.icon}</span>
              <span className="dp-where__name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Плеер трейлера ── */}
      {showTrailer && trailerUrl && (
        <div className="dp-trailer-overlay" onClick={() => setShowTrailer(false)}>
          <div className="dp-trailer" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={trailerUrl}
              className="dp-trailer__frame"
              title="Трейлер"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
            <button className="dp-trailer__close" onClick={() => setShowTrailer(false)}>✕ Закрыть</button>
          </div>
        </div>
      )}

      {/* ── Плеер (зарубежный контент, рус. озвучка) ── */}
      {showWatch && watchOptions.length > 0 && (
        <div className="dp-trailer-overlay" onClick={() => setShowWatch(false)}>
          <div className="dp-trailer" onClick={(e) => e.stopPropagation()}>
            <div className="dp-watch-bar">
              <span className="dp-watch-bar__title">
                {watchOptions[watchIdx]?.flag} {watchOptions[watchIdx]?.label} · {movie.title}
              </span>
              <button className="dp-watch-bar__close" onClick={() => setShowWatch(false)}>✕</button>
            </div>
            <iframe
              key={watchOptions[watchIdx]?.url}
              src={watchOptions[watchIdx]?.url}
              className="dp-trailer__frame"
              title="Просмотр"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
            />
            <div className="dp-watch-sources">
              {watchOptions.map((o, i) => (
                <button
                  key={o.id}
                  className={`dp-watch-src ${i === watchIdx ? 'active' : ''}`}
                  onClick={() => setWatchIdx(i)}
                >
                  {o.flag} {o.label}
                </button>
              ))}
            </div>
            {isSerial && (
              <div className="dp-watch-eps">
                <button className="dp-watch-ep" onClick={() => { haptic('light'); setWatchIdx((i) => i); }}>
                  Сезон/серия выбираются внутри плеера
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
      </div>
    </div>
  );
};

export default MovieDetailPage;
