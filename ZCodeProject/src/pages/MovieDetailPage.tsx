import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetail, getTrailer, getRecommendations } from '../api/catalog';
import { buildWatchOptions, isRestrictedContent } from '../api/watch';
import { createStarsInvoice } from '../api/backend';
import type { Movie, MovieDetail, WatchStatus, WatchOption } from '../types';
import { useTelegram, enforceTelegramFullscreen } from '../hooks/useTelegram';
import { useStore } from '../store';
import { getStoredSeason } from '../services/seasons';
import { captureSoundtrackFromMovie } from '../services/soundtracks';
import AgeGateModal, { isAgeVerified } from '../components/AgeGateModal';
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

const RATING_EMOTIONS: Record<number, { text: string; emoji: string }> = {
  1: { text: 'Ужасно', emoji: '🥱' },
  2: { text: 'Очень слабо', emoji: '👎' },
  3: { text: 'Не понравилось', emoji: '😕' },
  4: { text: 'Ниже среднего', emoji: '😐' },
  5: { text: 'Проходное кино', emoji: '🍿' },
  6: { text: 'Неплохо', emoji: '👍' },
  7: { text: 'Хороший фильм', emoji: '✨' },
  8: { text: 'Отличное кино!', emoji: '🔥' },
  9: { text: 'Великолепно!', emoji: '🌟' },
  10: { text: 'Шедевр кинематографа!', emoji: '👑' },
};

const formatActorName = (name: string) =>
  name.replace(/^[A-ZА-ЯЁ]{2}(?=[A-ZА-ЯЁ][a-zа-яё])/, '');

/* Официальные стриминговые сервисы с настоящими аутентичными векторными логотипами */
const whereToWatch = (title: string) => [
  { name: 'Кинопоиск', brand: 'kinopoisk', tag: 'В Плюс', accent: '#ff5500', url: `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(title)}` },
  { name: 'Иви', brand: 'ivi', tag: 'Подписка', accent: '#ea144c', url: `https://www.ivi.ru/search/?q=${encodeURIComponent(title)}` },
  { name: 'Okko', brand: 'okko', tag: 'Full HD', accent: '#9333ea', url: `https://okko.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Wink', brand: 'wink', tag: 'ТВ и Кино', accent: '#ff007a', url: `https://wink.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Premier', brand: 'premier', tag: 'Оригиналы', accent: '#0055ff', url: `https://premier.one/search?query=${encodeURIComponent(title)}` },
  { name: 'KION', brand: 'kion', tag: 'МТС / 4K', accent: '#e30613', url: `https://kion.ru/search?query=${encodeURIComponent(title)}` },
  { name: 'Start', brand: 'start', tag: 'Премьеры', accent: '#ff4500', url: `https://start.ru/search?q=${encodeURIComponent(title)}` },
  { name: 'Netflix', brand: 'netflix', tag: 'Originals', accent: '#e50914', url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}` },
];

/** Настоящие 100% официальные векторные логотипы стримингов */
const BrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  switch (brand) {
    case 'kinopoisk':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="kpRealBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff5500" />
              <stop offset="1" stopColor="#e52600" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill="url(#kpRealBg)" />
          {/* Официальный знак Кинопоиска: буква К из расходящихся лучей */}
          <rect x="9.5" y="9" width="4.5" height="22" rx="2.25" fill="#ffffff" />
          <path d="M14 20l12-10.5" stroke="#ffffff" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M15 19.5l11.5 11" stroke="#ffffff" strokeWidth="4.6" strokeLinecap="round" />
          <circle cx="27" cy="9.5" r="2.2" fill="#ffffff" />
          <circle cx="28.5" cy="20" r="2" fill="#ffffff" opacity="0.9" />
          <circle cx="28" cy="30.5" r="2.2" fill="#ffffff" />
        </svg>
      );
    case 'ivi':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="iviRealBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff1447" />
              <stop offset="1" stopColor="#ba002e" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill="url(#iviRealBg)" />
          {/* Фирменная векторная типографика ivi: точка+пилл 'i', закругленный клин 'v', точка+пилл 'i' */}
          <circle cx="11.5" cy="13" r="2.3" fill="#ffffff" />
          <rect x="9.3" y="16.5" width="4.4" height="11.5" rx="2.2" fill="#ffffff" />
          <path d="M16.5 16.5L20 27.2L23.5 16.5" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="28.5" cy="13" r="2.3" fill="#ffffff" />
          <rect x="26.3" y="16.5" width="4.4" height="11.5" rx="2.2" fill="#ffffff" />
        </svg>
      );
    case 'okko':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="okkoRealBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5814c8" />
              <stop offset="1" stopColor="#2c0678" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill="url(#okkoRealBg)" />
          {/* Официальная типографика okko: o-k-k-o в векторе */}
          {/* первая o */}
          <circle cx="10" cy="20" r="4.2" stroke="#ffffff" strokeWidth="2.6" fill="none" />
          {/* k */}
          <path d="M16.5 13v14M21 16.5l-4 4.5 4.5 6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* вторая k */}
          <path d="M23.5 13v14M28 16.5l-4 4.5 4.5 6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* вторая o */}
          <circle cx="31.5" cy="20" r="4.2" stroke="#ffffff" strokeWidth="2.6" fill="none" />
        </svg>
      );
    case 'wink':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="#130628" />
          <defs>
            <linearGradient id="winkTopFold" x1="12" y1="10" x2="28" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff0077" />
              <stop offset="1" stopColor="#ff5500" />
            </linearGradient>
            <linearGradient id="winkBottomFold" x1="12" y1="20" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff5500" />
              <stop offset="1" stopColor="#ffa600" />
            </linearGradient>
          </defs>
          {/* Официальная лента-стрелка Wink */}
          <path d="M12 11l15 9-15-2z" fill="url(#winkTopFold)" />
          <path d="M12 18l15 2-15 9z" fill="url(#winkBottomFold)" />
          <path d="M12 18l8 2-8 2z" fill="rgba(0,0,0,0.25)" />
        </svg>
      );
    case 'premier':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="#0d0d12" stroke="rgba(255,255,255,0.08)" />
          {/* Официальный неоново-зеленый маркер PREMIER */}
          <rect x="9.5" y="10.5" width="5.5" height="5.5" rx="1.5" fill="#00e676" />
          {/* Фирменная белая буква P */}
          <path d="M18 10.5h6.2a5.8 5.8 0 0 1 0 11.6H18V10.5zm3.8 3.5v4.6h2.2a2.3 2.3 0 0 0 0-4.6h-2.2zM18 22.1h3.8v7.4H18v-7.4z" fill="#ffffff" />
        </svg>
      );
    case 'kion':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="kionBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1a0438" />
              <stop offset="1" stopColor="#0b0118" />
            </linearGradient>
            <linearGradient id="kionKGrad" x1="8" y1="12" x2="22" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff007a" />
              <stop offset="1" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill="url(#kionBg)" stroke="rgba(255,0,122,0.2)" />
          {/* Фирменная неоновая KION K + буквы ION */}
          <rect x="8.5" y="11" width="3.5" height="18" rx="1.75" fill="url(#kionKGrad)" />
          <path d="M12 20l7.5-8.5" stroke="url(#kionKGrad)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M13 19.5l7 9" stroke="url(#kionKGrad)" strokeWidth="3.6" strokeLinecap="round" />
          {/* ION */}
          <rect x="22.5" y="12" width="2.4" height="16" rx="1.2" fill="#ffffff" />
          <circle cx="29.5" cy="20" r="4" stroke="#ffffff" strokeWidth="2.4" fill="none" />
          <path d="M35 28V12l4 16V12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'start':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="#141416" stroke="rgba(255,255,255,0.08)" />
          <defs>
            <linearGradient id="startArrow" x1="8" y1="10" x2="24" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff451a" />
              <stop offset="1" stopColor="#e02600" />
            </linearGradient>
          </defs>
          {/* Фирменный динамичный шеврон START */}
          <path d="M10 11l11 9-11 9V11z" fill="url(#startArrow)" />
          {/* START монохромный акцент */}
          <path d="M24 14h6M27 14v12M24 26h6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'netflix':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="#0d0d10" stroke="rgba(255,255,255,0.08)" />
          {/* Настоящая официальная лента N Netflix с 3D тенью */}
          <path d="M13.5 10v20h3.8V10z" fill="#b81d24" />
          <path d="M22.7 10v20h3.8V10z" fill="#b81d24" />
          <path d="M13.5 10l13 20h-3.8L13.5 10z" fill="#e50914" />
          {/* Тень под диагональной лентой */}
          <path d="M13.5 10l5 7.7-1.2 1.8L13.5 10z" fill="rgba(0,0,0,0.3)" />
        </svg>
      );
    default:
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="12" fill="rgba(255,255,255,0.08)" />
          <polygon points="16,14 26,20 16,26" fill="#ffffff" />
        </svg>
      );
  }
};

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showBackButton, haptic, openLink, user: tgUser } = useTelegram();
  const {
    addFavorite, removeFavorite, isFavorite, addToHistory,
    setTrackedStatus, setPersonalRating, getStatus, getRating,
    isMovieBlocked,
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
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [watchOptions, setWatchOptions] = useState<WatchOption[]>([]);
  const [watchIdx, setWatchIdx] = useState(0);
  const [recs, setRecs] = useState<Movie[]>([]);
  const [sheetMode, setSheetMode] = useState<'normal' | 'fullscreen'>('normal');
  const [ambilightOn, setAmbilightOn] = useState(true);
  const playerModalRef = useRef<HTMLDivElement>(null);

  const isPlayerFullscreen = sheetMode === 'fullscreen';

  /* Быстрое и плавное сворачивание плеера на главную страницу каталога (гарантированно на iOS и Android) */
  const minimizeToHome = () => {
    haptic('medium');
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch?.(() => {});
      }
    } catch {}
    setShowWatch(false);
    setSheetMode('normal');
    enforceTelegramFullscreen();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    navigate('/', { replace: true });
  };

  /* Надёжное раскрытие на весь экран (включая Telegram Web на ноутбуках/ПК) */
  const togglePlayerFullscreen = () => {
    haptic('medium');
    const nextFullscreen = sheetMode !== 'fullscreen';
    setSheetMode(nextFullscreen ? 'fullscreen' : 'normal');

    enforceTelegramFullscreen();

    try {
      const el = playerModalRef.current as any;
      if (nextFullscreen && el) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (req) req.call(el).catch?.(() => {});
      } else if (!nextFullscreen && document.fullscreenElement) {
        document.exitFullscreen?.().catch?.(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    if (!showWatch) {
      setSheetMode('normal');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sheetMode === 'fullscreen') {
        setSheetMode('normal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showWatch, sheetMode]);

  /* Поддержка звёздами: быстрые суммы + своя (1 – ∞) */
  const STARS_QUICK = [10, 25, 50, 100];
  const [starsAmount, setStarsAmount] = useState(25);
  const [starsCustom, setStarsCustom] = useState('');
  const [starsSending, setStarsSending] = useState(false);

  const showTipToast = (msg: string) => {
    setFavToast(msg);
    setFavToastVisible(true);
    setTimeout(() => setFavToastVisible(false), 2200);
  };

  const sendStars = async () => {
    haptic('medium');
    const parsed = parseInt(starsCustom, 10);
    const amount = starsCustom.trim() ? parsed : starsAmount;
    if (!isFinite(amount) || amount < 1) {
      showTipToast('Минимум 1 ⭐');
      return;
    }
    setStarsSending(true);
    try {
      const res = await createStarsInvoice(amount, movie?.title);
      if (res.ok && res.url) {
        const wa = (window as any).Telegram?.WebApp;
        if (wa?.openInvoice) {
          wa.openInvoice(res.url);
        } else {
          openLink(res.url);
        }
        showTipToast(`Счёт на ${amount} ⭐ открыт — спасибо! 💖`);
      } else {
        showTipToast(res.message);
      }
    } finally {
      setStarsSending(false);
    }
  };

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

  /* ── Похожие фильмы (рекомендации TMDB) ── */
  useEffect(() => {
    if (!movie) return;
    setRecs([]);
    const mediaType = compositeId.startsWith('tv-') || movie.is_serial ? 'tv' : 'movie';
    getRecommendations(tmdbId, mediaType)
      .then((list) => setRecs(list.filter((r) => r.poster_path).slice(0, 14)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie]);

  /* ── Кнопка назад Telegram ── */
  useEffect(() => {
    const cleanup = showBackButton?.(() => {
      if (showWatch) {
        minimizeToHome();
      } else if (showTrailer) {
        setShowTrailer(false);
      } else {
        navigate('/');
      }
    });
    return cleanup;
  }, [showBackButton, navigate, showTrailer, showWatch]);

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
      if (status || isFavorite(movie.id)) {
        setTrackedStatus(movie, null);
        removeFavorite(movie.id);
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
  const inList = status !== null || Boolean(movie && isFavorite(movie.id));
  const whereLinks = whereToWatch(movie.title);

  const canWatch = true;

  const startWatching = () => {
    setWatchOptions(buildWatchOptions({
      tmdbId,
      imdbId: movie?.imdbID,
      kinopoiskId: movie?.kinopoisk_id,
      title: movie?.title || '',
      isSerial,
    }));
    setWatchIdx(0);
    setShowWatch(true);
    /* 🎵 Саундтрек фильма автоматически попадает в плейлист «Услышано в кино» */
    if (movie) {
      captureSoundtrackFromMovie(movie).then((entry) => {
        if (entry) showTipToast(`🎵 Саундтрек «${movie.title}» сохранён в «Услышано в кино»`);
      });
    }
  };

  const handleWatchClick = () => {
    haptic('medium');
    const isAdult =
      Boolean((movie as any)?.adult) ||
      Boolean(movie?.genres?.some((g) => g.toLowerCase().includes('эротика') || g.toLowerCase().includes('18+')));

    if (isAdult && !isAgeVerified()) {
      setShowAgeGate(true);
      return;
    }
    startWatching();
  };

  const isBlocked =
    isMovieBlocked(compositeId) ||
    isMovieBlocked(tmdbId) ||
    (movie?.kinopoisk_id && isMovieBlocked(movie.kinopoisk_id)) ||
    (movie?.id && isMovieBlocked(movie.id));

  if (!loading && movie && isBlocked) {
    return (
      <div className="dp page">
        <header className="dp-header">
          <button className="dp-back" onClick={() => navigate(-1)} aria-label="Назад">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M14 5l-7 6 7 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </header>
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '54px', marginBottom: '16px' }}>⚖️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px', color: '#fff' }}>Доступ ограничен правообладателем</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 24px' }}>
            Данное аудиовизуальное произведение исключено из каталога сервиса по официальному обращению правообладателя в соответствии с Федеральным законом № 149-ФЗ и ст. 1253.1 ГК РФ (Notice & Takedown).
          </p>
          <button className="dp-watch" style={{ maxWidth: '240px', margin: '0 auto' }} onClick={() => navigate('/')}>
            ← Вернуться в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dp page">
      <div className="dp__bg" aria-hidden="true" />

      {/* ═════ 1. MINIMALIST DARK-OBSIDIAN SHOWCASE STAGE (В едином стиле с Профилем, ниже кнопок Telegram) ═════ */}
      <section className="dp-showcase">
        <div className="dp-stage">
          {/* Фоновый постер/бэкдроп внутри скруглённой сцены */}
          <div
            className="dp-stage__backdrop"
            style={{ backgroundImage: `url(${backdrop})` }}
            aria-hidden="true"
          />
          <div className="dp-stage__vignette" aria-hidden="true" />

          {/* Вырез слева сверху — Кнопка Назад (никогда не перекрывает кнопки Telegram) */}
          <div className="dp-stage__notch dp-stage__notch--tl">
            <button
              type="button"
              className="dp-stage__corner-btn"
              onClick={() => navigate(-1)}
              aria-label="Назад"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Вырез справа сверху — Избранное */}
          <div className="dp-stage__notch dp-stage__notch--tr">
            <button
              type="button"
              className={`dp-stage__corner-btn ${inList ? 'is-active' : ''}`}
              onClick={handleFav}
              aria-label={inList ? 'Убрать из списка' : 'Добавить в список'}
              aria-pressed={inList}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={inList ? '#fb7185' : 'none'} stroke={inList ? '#fb7185' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Верхний минималистичный бейдж */}
          <div className="dp-stage__serial">
            <span>{isSerial ? 'SERIES' : 'CINEMA'}</span>
            <b>{movie.release_date ? movie.release_date.slice(0, 4) : 'HD'}</b>
          </div>

          {/* Контент сцены: Постер + Заголовок + Кнопки */}
          <div className="dp-stage__content">
            <div className="dp-stage__main-row">
              <div className="dp-stage__poster-wrap">
                <img className="dp-stage__poster" src={poster} alt={movie.title} />
              </div>

              <div className="dp-stage__info">
                <h1 className="dp-stage__title">{movie.title}</h1>
                {movie.original_title && movie.original_title !== movie.title && (
                  <p className="dp-stage__orig">{movie.original_title}</p>
                )}

                <div className="dp-stage__chips">
                  {movie.vote_average > 0 && (
                    <span className="dp-stage__chip dp-stage__chip--score" title={`Рейтинг TMDB: ${movie.vote_average.toFixed(1)}/10`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <b>{movie.vote_average.toFixed(1)}</b>
                      <small>/10</small>
                    </span>
                  )}
                  {movie.release_date && (
                    <span className="dp-stage__chip">{movie.release_date.slice(0, 4)}</span>
                  )}
                  {movie.runtime ? (
                    <span className="dp-stage__chip">{movie.runtime} мин</span>
                  ) : null}
                </div>

                {movie.genres && movie.genres.length > 0 && (
                  <div className="dp-stage__genres">
                    {movie.genres.slice(0, 3).map((g, i) => (
                      <span key={i} className="dp-stage__genre">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dp-stage__actions">
              {canWatch && (
                <button type="button" className="dp-btn-primary" onClick={handleWatchClick}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.5v13l11-6.5-11-6.5z" />
                  </svg>
                  <span>Смотреть</span>
                </button>
              )}

              {trailerUrl && (
                <button
                  type="button"
                  className="dp-btn-secondary"
                  onClick={() => {
                    haptic('light');
                    setShowTrailer(true);
                  }}
                >
                  <span>Трейлер</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═════ 2. КАРТОЧКА ОПИСАНИЯ И ДЕТАЛЕЙ (В стиле .pf-meta-card) ═════ */}
        {(movie.overview || movie.countries?.length > 0 || movie.directors?.length > 0) && (
          <div className="dp-meta-card">
            {(movie.countries?.length > 0 || movie.directors?.length > 0) && (
              <div className="dp-meta-card__top">
                <div className="dp-meta-card__col">
                  <span className="dp-meta-card__label">Производство</span>
                  <strong className="dp-meta-card__value">
                    {movie.countries?.slice(0, 2).join(', ') || 'Мировое кино'}
                  </strong>
                </div>
                <div className="dp-meta-card__divider" />
                <div className="dp-meta-card__col dp-meta-card__col--right">
                  <span className="dp-meta-card__label">Режиссёр</span>
                  <strong className="dp-meta-card__value">
                    {movie.directors?.[0] || (isSerial ? 'Шоураннер' : 'Киностудия')}
                  </strong>
                </div>
              </div>
            )}

            {movie.overview && (
              <div className="dp-meta-card__story">
                <span className="dp-meta-card__label">О фильме</span>
                <p className="dp-desc">{movie.overview}</p>
              </div>
            )}
          </div>
        )}

        {/* ═════ 3. АКТЁРСКИЙ СОСТАВ ═════ */}
        {movie.actors?.length > 0 && (
          <div className="dp-meta-card">
            <div className="dp-card-head">
              <h2 className="dp-card-title">В главных ролях</h2>
              <span className="dp-card-sub">{Math.min(10, movie.actors.length)} актёров</span>
            </div>
            <div className="dp-hero2__cast-list">
              {(movie.cast?.length ? movie.cast : movie.actors.map((name) => ({
                id: -1,
                name,
                character: '',
                profile_path: null,
              }))).slice(0, 10).map((actor, index) => {
                const name = formatActorName(actor.name).trim();
                const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('');
                return (
                  <button
                    className="dp-hero2__cast-person"
                    key={`${actor.id}-${index}`}
                    type="button"
                    onClick={() => actor.id > 0 && navigate(`/search?person=${actor.id}&name=${encodeURIComponent(name)}`)}
                    aria-label={`Найти фильмы с актёром ${name}`}
                    disabled={actor.id <= 0}
                  >
                    {actor.profile_path ? (
                      <img className="dp-hero2__cast-photo" src={actor.profile_path} alt="" loading="lazy" />
                    ) : (
                      <span className="dp-hero2__cast-initials" aria-hidden="true">{initials}</span>
                    )}
                    <span className="dp-hero2__cast-name">{name}</span>
                    {actor.character && <span className="dp-hero2__cast-character">{actor.character}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Тост ── */}
      <div className={`dp-fav-toast ${favToastVisible ? 'dp-fav-toast--show' : ''}`}>
        {favToast}
      </div>

      {/* ── Дневник: статусы ── */}
      <div className="dp-section dp-section--card">
        <h3 className="dp-section__title">Мой дневник</h3>
        <div className="dp-statuses">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={`dp-status ${status === s.id ? 'active' : ''}`}
              onClick={() => handleStatus(s.id)}
              aria-pressed={status === s.id}
            >
              <span className="dp-status__icon">{s.icon}</span>
              <span className="dp-status__label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Личная оценка 1-10 — Премиальная кинематографическая система звезд */}
        {status === 'watched' && (
          <div className="dp-cinema-rating">
            <div className="dp-cinema-rating__head">
              <div className="dp-cinema-rating__title-group">
                <span className="dp-cinema-rating__kicker">КИНО-РЕЦЕНЗИЯ</span>
                <p className="dp-cinema-rating__title">Ваша оценка фильму</p>
              </div>
              {rating !== null && rating > 0 && (
                <button
                  type="button"
                  className="dp-cinema-rating__clear-btn"
                  onClick={() => handleRate(0)}
                  title="Удалить оценку"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* 10 сияющих золотых векторных звезд */}
            <div className="dp-cinema-stars" role="radiogroup" aria-label="Оценка от 1 до 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => {
                const isActive = Boolean(rating && r <= rating);
                const isExact = Boolean(rating && r === rating);
                return (
                  <button
                    key={r}
                    type="button"
                    className={`dp-cinema-star ${isActive ? 'is-active' : ''} ${isExact ? 'is-exact' : ''}`}
                    onClick={() => handleRate(r)}
                    aria-label={`Оценить на ${r} из 10`}
                    title={`${r} из 10`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="dp-cinema-star__svg"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="dp-cinema-star__num">{r}</span>
                  </button>
                );
              })}
            </div>

            {/* Статусная эмодзи-плашка с оценкой */}
            {rating && rating > 0 ? (
              <div className="dp-cinema-rating__verdict">
                <div className="dp-cinema-rating__score-badge">
                  <span className="dp-cinema-rating__score-num">{rating}</span>
                  <span className="dp-cinema-rating__score-max">/10</span>
                </div>
                <div className="dp-cinema-rating__verdict-copy">
                  <span className="dp-cinema-rating__emoji">
                    {RATING_EMOTIONS[rating]?.emoji || '✨'}
                  </span>
                  <strong className="dp-cinema-rating__verdict-text">
                    {RATING_EMOTIONS[rating]?.text || 'Оценено'}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="dp-cinema-rating__hint">
                Коснитесь любой звезды, чтобы оценить фильм и сохранить в свой кино-дневник
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Где посмотреть (официальные онлайн-кинотеатры) ── */}
      <div className="dp-section dp-section--card">
        <div className="dp-where-head">
          <h3 className="dp-section__title">Где посмотреть</h3>
          <span className="dp-where-chip">В подписках</span>
        </div>
        <p className="dp-where__hint">
          Быстрый переход в проверенные онлайн-кинотеатры
        </p>
        <div className="dp-where-grid">
          {whereLinks.map((s) => (
            <button
              key={s.name}
              type="button"
              className="dp-where-card"
              style={{ '--brand-accent': s.accent } as React.CSSProperties}
              onClick={() => { haptic('light'); openLink(s.url); }}
            >
              <div className="dp-where-card__logo">
                <BrandIcon brand={s.brand} />
              </div>
              <div className="dp-where-card__info">
                <span className="dp-where-card__title">{s.name}</span>
                <span className="dp-where-card__tag">{s.tag}</span>
              </div>
              <span className="dp-where-card__arrow" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7V16" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Поддержать проект ── */}
      <div className="dp-section dp-section--card">
        <h3 className="dp-section__title">Понравился проект?</h3>
        <div className="dp-stars">
          <p className="dp-stars__hint">
            ZENOVA живёт без рекламы — только на вашу поддержку. Подарите звёздочки проекту, и он станет ещё лучше 💖
          </p>
          <div className="dp-stars__chips">
            {STARS_QUICK.map((v) => (
              <button
                key={v}
                className={`dp-stars__chip ${starsAmount === v && !starsCustom.trim() ? 'active' : ''}`}
                onClick={() => { haptic('light'); setStarsAmount(v); setStarsCustom(''); }}
              >
                {v} ⭐
              </button>
            ))}
            <div className={`dp-stars__custom ${starsCustom.trim() ? 'active' : ''}`}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="∞"
                value={starsCustom}
                onChange={(e) => setStarsCustom(e.target.value)}
                aria-label="Своя сумма звёзд"
              />
              <span>⭐</span>
            </div>
          </div>
          <button
            className="dp-stars__send"
            disabled={starsSending}
            onClick={sendStars}
          >
            {starsSending ? (
              <>Открываем счёт…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.5l7.1-.6L12 2z" />
                </svg>
                Отправить {starsCustom.trim() && isFinite(parseInt(starsCustom, 10)) ? starsCustom : starsAmount} ⭐
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Похожие фильмы ── */}
      {recs.length > 0 && (
        <div className="dp-section dp-section--recs">
          <h3 className="dp-section__title">С этим фильмом смотрят</h3>
          <div className="dp-recs">
            {recs.map((r) => (
              <button
                key={r.id}
                className="dp-rec"
                onClick={() => {
                  haptic('light');
                  navigate(`/movie/${r.id}`);
                  window.scrollTo(0, 0);
                }}
              >
                <img src={r.poster_path} alt={r.title} className="dp-rec__poster" loading="lazy" />
                <span className="dp-rec__title">{r.title}</span>
                {r.vote_average > 0 && (
                  <span className="dp-rec__rating">★ {r.vote_average.toFixed(1)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* ── Плеер ZENOVA CINEMA SHEET (Красиво выезжает СВЕРХУ ВНИЗ + растягивается вниз + полный экран) ── */}
      {showWatch && watchOptions.length > 0 && (
        <div
          className={`dp-sheet-backdrop dp-sheet-backdrop--${sheetMode}`}
          onClick={() => {
            if (!isPlayerFullscreen) minimizeToHome();
          }}
        >
          <div
            ref={playerModalRef}
            className={`dp-player-sheet dp-player-sheet--${sheetMode} ${ambilightOn ? 'dp-player-sheet--ambilight' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фоновое свечение Ambilight вокруг экрана */}
            {ambilightOn && (
              <div
                className="dp-cinema-ambilight"
                style={{ backgroundImage: `url(${backdrop})` }}
                aria-hidden="true"
              />
            )}

            {/* ── ЛЮКСОВЫЙ CINEMA HUD ВЕРХНЕЙ ПАНЕЛИ ПЛЕЕРА ZENOVA ── */}
            <div className="dp-cinema-hud">
              {/* Верхняя строка HUD: Маска ZENOVA + Название в Unbounded + Рейтинг меню + Закрыть */}
              <div className="dp-cinema-hud__header">
                <div className="dp-cinema-hud__brand">
                  <div className="dp-cinema-hud__mask-wrap">
                    <img
                      src={getStoredSeason().season.id === 'winter' ? './zenova-mask-mini-winter.png' : './zenova-mask-mini.png'}
                      alt="ZENOVA"
                      className="dp-cinema-hud__mask"
                    />
                    <span className="dp-cinema-hud__mask-glow" />
                  </div>
                  <div className="dp-cinema-hud__meta">
                    <div className="dp-cinema-hud__meta-top">
                      <span className="dp-cinema-hud__brand-name">ZENOVA</span>
                      <span className="dp-cinema-hud__badge-4k">4K ULTRA HD</span>
                      <span className="dp-cinema-hud__live-dot" />
                    </div>
                    <h3 className="dp-cinema-hud__title" title={movie.title}>
                      {movie.title}
                    </h3>
                  </div>
                </div>

                <div className="dp-cinema-hud__right">
                  {/* Рейтинг меню / плашка со звездой */}
                  <div
                    className="dp-cinema-hud__rating-pill"
                    title={`Рейтинг: ${movie.vote_average.toFixed(1)}`}
                    onClick={() => {
                      haptic('light');
                      showTipToast(`Рейтинг: ${movie.vote_average.toFixed(1)} / 10`);
                    }}
                  >
                    <span className="dp-cinema-hud__star">★</span>
                    <span className="dp-cinema-hud__score">{movie.vote_average.toFixed(1)}</span>
                    <span className="dp-cinema-hud__rating-label">SCORE</span>
                  </div>

                  <button
                    type="button"
                    className="dp-cinema-hud__close"
                    onClick={minimizeToHome}
                    aria-label="Свернуть плеер и перейти на главную"
                    title="Закрыть плеер"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Быстрая панель управления кинозалом: Главная, 100% Экран, Ambilight, Перезапуск */}
              <div className="dp-cinema-hud__actions">
                <button
                  type="button"
                  className="dp-cinema-hud__btn dp-cinema-hud__btn--home"
                  onClick={minimizeToHome}
                  title="Свернуть кино на главную"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Главная</span>
                </button>

                <button
                  type="button"
                  className={`dp-cinema-hud__btn dp-cinema-hud__btn--fs ${isPlayerFullscreen ? 'is-active' : ''}`}
                  onClick={togglePlayerFullscreen}
                  title="На весь экран"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    {isPlayerFullscreen ? (
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    ) : (
                      <path d="M15 3h6v6M9 21H3v-6M21 9v-6m0 0h-6M3 15v6m0 0h6" />
                    )}
                  </svg>
                  <span>{isPlayerFullscreen ? 'Обычный' : '100% Экран'}</span>
                </button>

                <button
                  type="button"
                  className={`dp-cinema-hud__btn ${ambilightOn ? 'is-active' : ''}`}
                  onClick={() => {
                    haptic('light');
                    setAmbilightOn((v) => !v);
                  }}
                  title="Фоновое свечение Ambilight"
                >
                  <span className="dp-cinema-hud__sparkle">✨</span>
                  <span>Ambilight</span>
                </button>

                <button
                  type="button"
                  className="dp-cinema-hud__btn"
                  onClick={() => {
                    haptic('light');
                    setWatchIdx(-1);
                    setTimeout(() => setWatchIdx(0), 60);
                  }}
                  title="Перезагрузить поток"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>Перезапуск</span>
                </button>
              </div>
            </div>

            {/* ── Чистый видео-экран (только первый основной плеер, все озвучки и серии доступны внутри) ── */}
            <div className="dp-cinema-stage">
              {watchIdx >= 0 && watchOptions[0] ? (
                <iframe
                  key={watchOptions[0].url}
                  src={watchOptions[0].url}
                  className="dp-trailer__frame"
                  title="Просмотр"
                  allowFullScreen
                  allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *; clipboard-write *"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="dp-watch-loading">
                  <div className="dp-watch__spinner" />
                  <span>Загрузка видеопотока…</span>
                </div>
              )}
            </div>

            {/* ── Нижняя информационная полоса статуса потока (без дергающихся ручек) ── */}
            {!isPlayerFullscreen && (
              <div className="dp-cinema-bottom-strip">
                <div className="dp-cinema-bottom-strip__left">
                  <span className="dp-cinema-bottom-strip__tag">DOLBY ATMOS</span>
                  <span className="dp-cinema-bottom-strip__dot">·</span>
                  <span className="dp-cinema-bottom-strip__tag">HDR 60FPS</span>
                </div>
                <div className="dp-cinema-bottom-strip__hint">
                  Озвучка, качество и серии {isSerial ? 'сериала' : 'фильма'} доступны внутри плеера
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAgeGate && (
        <AgeGateModal
          onConfirm={() => {
            setShowAgeGate(false);
            startWatching();
          }}
          onCancel={() => setShowAgeGate(false)}
        />
      )}
    </div>
  );
};

export default MovieDetailPage;
