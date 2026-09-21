import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getTrailer } from '../api/catalog';
import { buildWatchOptions, isRestrictedContent } from '../api/watch';
import type { MovieDetail, WatchStatus, WatchOption } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './MovieDetailPage.css';

/* Статусы дневника */
const STATUSES: Array<{ id: WatchStatus; label: string; icon: React.ReactNode }> = [
  {
    id: 'want',
    label: 'В планах',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'watching',
    label: 'Смотрю',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.5v13l11-6.5-11-6.5z" />
      </svg>
    ),
  },
  {
    id: 'watched',
    label: 'Просмотрено',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    id: 'dropped',
    label: 'Брошено',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
];

/* Легальные сервисы для поиска, где посмотреть — с брендовыми иконками */
const whereToWatch = (title: string) => [
  { name: 'JustWatch', brand: 'justwatch', url: `https://www.justwatch.com/ru/поиск?q=${encodeURIComponent(title)}` },
  { name: 'Кинопоиск', brand: 'kinopoisk', url: `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(title)}` },
  { name: 'Okko', brand: 'okko', url: `https://okko.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Wink', brand: 'wink', url: `https://wink.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Иви', brand: 'ivi', url: `https://www.ivi.ru/search/?q=${encodeURIComponent(title)}` },
  { name: 'Netflix', brand: 'netflix', url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}` },
  { name: 'YouTube', brand: 'youtube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}` },
];

/** Брендовые иконки-плитки сервисов */
/** Брендовые иконки-плитки официальных стримингов */
const BrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  switch (brand) {
    case 'kinopoisk':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <defs>
            <linearGradient id="kpBg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff6200" />
              <stop offset="1" stopColor="#e52600" />
            </linearGradient>
          </defs>
          <rect width="38" height="38" rx="11" fill="url(#kpBg)" />
          {/* Кинематографичная солнечная корона Кинопоиска */}
          <circle cx="19" cy="19" r="4.2" fill="#ffffff" />
          <path d="M19 8v3.5M19 26.5V30M8 19h3.5M26.5 19H30M11.2 11.2l2.5 2.5M24.3 24.3l2.5 2.5M11.2 26.8l2.5-2.5M24.3 13.7l2.5-2.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'okko':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <defs>
            <linearGradient id="okkoBg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6322ea" />
              <stop offset="1" stopColor="#3b0764" />
            </linearGradient>
          </defs>
          <rect width="38" height="38" rx="11" fill="url(#okkoBg)" />
          {/* Фирменные перекрывающиеся кольца Okko */}
          <circle cx="15.5" cy="19" r="6.8" stroke="#ffffff" strokeWidth="3" fill="none" />
          <circle cx="22.5" cy="19" r="6.8" stroke="#f43f5e" strokeWidth="3" fill="none" opacity="0.9" />
        </svg>
      );
    case 'wink':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="11" fill="#0f0c1b" />
          {/* Фирменный ленточный треугольник Wink */}
          <defs>
            <linearGradient id="winkRibbon" x1="10" y1="10" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff007a" />
              <stop offset="0.5" stopColor="#ff5500" />
              <stop offset="1" stopColor="#7928ca" />
            </linearGradient>
          </defs>
          <path d="M14 11l13 8-13 8z" fill="url(#winkRibbon)" />
          <path d="M14 11l6 8-6 8z" fill="rgba(255,255,255,0.25)" />
        </svg>
      );
    case 'ivi':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <defs>
            <linearGradient id="iviBg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ea144c" />
              <stop offset="1" stopColor="#830026" />
            </linearGradient>
          </defs>
          <rect width="38" height="38" rx="11" fill="url(#iviBg)" />
          {/* 4 округлых капсулы ivi */}
          <rect x="10" y="14" width="3.5" height="10" rx="1.75" fill="#ffffff" />
          <circle cx="11.75" cy="11.5" r="1.75" fill="#ffffff" />
          <path d="M16 14l2.5 10 2.5-10" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="24.5" y="14" width="3.5" height="10" rx="1.75" fill="#ffffff" />
          <circle cx="26.25" cy="11.5" r="1.75" fill="#ffffff" />
        </svg>
      );
    case 'netflix':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="11" fill="#0c0c0e" stroke="rgba(255,255,255,0.08)" />
          {/* Фирменная лента N Netflix */}
          <path d="M14 10v18h3V10z" fill="#b81d24" />
          <path d="M21 10v18h3V10z" fill="#b81d24" />
          <path d="M14 10l10 18h-3L14 10z" fill="#e50914" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="11" fill="#cc0000" />
          <path d="M10 14.5c0-2 1.5-3.5 3.5-3.5h11c2 0 3.5 1.5 3.5 3.5v9c0 2-1.5 3.5-3.5 3.5h-11c-2 0-3.5-1.5-3.5-3.5v-9z" fill="#ffffff" />
          <polygon points="16,15.5 24,19 16,22.5" fill="#cc0000" />
        </svg>
      );
    case 'justwatch':
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <defs>
            <linearGradient id="jwBg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5b800" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect width="38" height="38" rx="11" fill="url(#jwBg)" />
          <path d="M19 9c-5.5 0-9.5 7.5-9.5 10s4 10 9.5 10 9.5-7.5 9.5-10-4-10-9.5-10z" fill="#18181b" />
          <circle cx="19" cy="19" r="4" fill="#fbbf24" />
          <circle cx="19" cy="19" r="1.8" fill="#18181b" />
        </svg>
      );
    default:
      return (
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect width="38" height="38" rx="11" fill="rgba(255,255,255,0.08)" />
          <polygon points="15,13 25,19 15,25" fill="#ffffff" />
        </svg>
      );
  }
};

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
        setFavToast('Убрано из списков');
        haptic('medium');
      } else {
        setTrackedStatus(movie, 'want');
        setFavToast('Добавлено в «В планах»');
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
        <div className="dp-error-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
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
                  setWatchOptions(buildWatchOptions({
                    tmdbId,
                    imdbId: movie.imdbID,
                    title: movie.title,
                    isSerial,
                  }));
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
          <span className="dp-ban__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
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
              <BrandIcon brand={s.brand} />
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

      {/* ── Плеер (все студии озвучки: LostFilm, Red Head Sound, Дубляж, Резка) ── */}
      {showWatch && watchOptions.length > 0 && (
        <div className="dp-trailer-overlay" onClick={() => setShowWatch(false)}>
          <div className="dp-trailer" onClick={(e) => e.stopPropagation()}>
            <div className="dp-watch-bar">
              <div className="dp-watch-bar__info">
                <span className="dp-watch-bar__title">
                  {watchOptions[watchIdx]?.flag} {watchOptions[watchIdx]?.label} · {movie.title}
                </span>
                <span className="dp-watch-bar__sub">
                  {watchOptions[watchIdx]?.sublabel}
                </span>
              </div>
              <div className="dp-watch-bar__actions">
                <button
                  className="dp-watch-bar__btn"
                  onClick={() => {
                    haptic('light');
                    const cur = watchIdx;
                    setWatchIdx(-1);
                    setTimeout(() => setWatchIdx(cur), 50);
                  }}
                  title="Перезагрузить поток"
                  aria-label="Перезагрузить"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                </button>
                <button className="dp-watch-bar__close" onClick={() => setShowWatch(false)} aria-label="Закрыть">✕</button>
              </div>
            </div>
            <div className="dp-watch-hint">
              <span className="dp-watch-hint__badge">🌍 Режим с VPN:</span>
              <span className="dp-watch-hint__text">⚡ Серверы 1–5 работают на ура с VPN · Русская озвучка</span>
            </div>
            {watchIdx >= 0 ? (
              <iframe
                key={`${watchOptions[watchIdx]?.url}-${watchIdx}`}
                src={watchOptions[watchIdx]?.url}
                className="dp-trailer__frame"
                title="Просмотр"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write; cross-origin-isolated"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="dp-watch-loading">
                <div className="dp-watch__spinner" />
                <span>Подключение к потоку…</span>
              </div>
            )}
            <div className="dp-watch-sources-wrap">
              <span className="dp-watch-sources-title">Серверы вещания (1–5 работают с любым VPN):</span>
              <div className="dp-watch-sources">
                {watchOptions.map((o, i) => (
                  <button
                    key={o.id}
                    className={`dp-watch-src ${i === watchIdx ? 'active' : ''}`}
                    onClick={() => { haptic('light'); setWatchIdx(i); }}
                    title={o.sublabel}
                  >
                    <span className="dp-watch-src__flag">{o.flag}</span>
                    <span className="dp-watch-src__name">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {isSerial && (
              <div className="dp-watch-eps">
                <button className="dp-watch-ep" onClick={() => { haptic('light'); setWatchIdx((i) => i); }}>
                  Сезоны и серии переключаются напрямую в окне плеера
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
