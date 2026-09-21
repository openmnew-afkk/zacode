import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getTrailer } from '../api/catalog';
import { buildForeignWatchOptions, isRestrictedContent, switchSourceUrl } from '../api/watch';
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
const BrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  const tile = (bg: string, content: React.ReactNode) => (
    <svg width="38" height="38" viewBox="0 0 38 38">
      <rect width="38" height="38" rx="11" fill={bg} />
      {content}
    </svg>
  );
  switch (brand) {
    case 'kinopoisk':
      // Кинопоиск: оранжево-красная лента с белым «КП»
      return tile('url(#kpGrad)', (
        <>
          <defs>
            <linearGradient id="kpGrad" x1="0" y1="0" x2="38" y2="38">
              <stop stopColor="#ff5b00"/><stop offset="1" stopColor="#e23d00"/>
            </linearGradient>
          </defs>
          <text x="19" y="24" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Arial">КП</text>
        </>
      ));
    case 'okko':
      // Okko: оранжевый градиент, белый круг-о
      return tile('url(#okkoGrad)', (
        <>
          <defs>
            <linearGradient id="okkoGrad" x1="0" y1="0" x2="38" y2="38">
              <stop stopColor="#ff9500"/><stop offset="1" stopColor="#ff6a00"/>
            </linearGradient>
          </defs>
          <circle cx="19" cy="19" r="9" stroke="#fff" strokeWidth="3.4" fill="none"/>
        </>
      ));
    case 'wink':
      // Wink: фиолетовый ТВ с бликом
      return tile('url(#winkGrad)', (
        <>
          <defs>
            <linearGradient id="winkGrad" x1="0" y1="0" x2="38" y2="38">
              <stop stopColor="#a960ee"/><stop offset="1" stopColor="#7b2ff7"/>
            </linearGradient>
          </defs>
          <path d="M11 13h16v12H11z" rx="3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round"/>
          <path d="M15 16.5l6 3.5-6 3.5v-7z" fill="#fff"/>
        </>
      ));
    case 'ivi':
      // Иви: синяя плитка, белое «иви»
      return tile('#0a6cff', (
        <text x="19" y="24" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Arial" fontStyle="italic">иви</text>
      ));
    case 'netflix':
      // Netflix: чёрная плитка, красная N
      return tile('#141414', (
        <>
          <rect width="38" height="38" rx="11" fill="#141414" stroke="rgba(255,255,255,0.12)"/>
          <text x="19" y="25" textAnchor="middle" fontSize="17" fontWeight="900" fill="#e50914" fontFamily="Arial">N</text>
        </>
      ));
    case 'youtube':
      // YouTube: красная плитка, белый play
      return tile('#ff0000', (
        <path d="M14 12.5l11 6.5-11 6.5v-13z" fill="#fff"/>
      ));
    case 'justwatch':
      // JustWatch: жёлто-оранжевая плитка с глазом-таймером
      return tile('url(#jwGrad)', (
        <>
          <defs>
            <linearGradient id="jwGrad" x1="0" y1="0" x2="38" y2="38">
              <stop stopColor="#ffd200"/><stop offset="1" stopColor="#ffb800"/>
            </linearGradient>
          </defs>
          <path d="M19 10c-5.5 0-9 9-9 9s3.5 9 9 9 9-9 9-9-3.5-9-9-9z" fill="none" stroke="#1a1a1a" strokeWidth="2.4"/>
          <circle cx="19" cy="19" r="3.4" fill="#1a1a1a"/>
        </>
      ));
    default:
      return tile('rgba(255,255,255,0.1)', <span>▶</span>);
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
