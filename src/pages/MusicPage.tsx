import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore } from '../store/musicStore';
import {
  WAVE_MOODS,
  LIVE_RADIO_STATIONS,
  MusicTrack,
} from '../services/yandexWave';
import { searchAudius, getAudiusTrending } from '../services/audius';
import { searchInternetArchive } from '../services/internetArchive';
import './MusicPage.css';

type Tab = 'wave' | 'chart' | 'radio' | 'library';

/** Размер страницы подгрузки (бесконечная прокрутка) */
const PAGE = 30;

const fmtTime = (s: number): string => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/** Тасовка Фишера—Йетса: каждый запуск Волны звучит по-новому */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Случайная стартовая страница трендов (0–3), чтобы при каждом открытии были новые треки */
function randomBaseOffset(): number {
  return Math.floor(Math.random() * 4) * PAGE;
}

const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const {
    currentTrack,
    isPlaying,
    setTrack,
    setPlaying,
    nextTrack,
    likedTracks,
    toggleLike,
    isLiked,
    setExpanded,
  } = useMusicStore();

  const [tab, setTab] = useState<Tab>('wave');
  const [activeMood, setActiveMood] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchExhausted, setSearchExhausted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [waveArtworkError, setWaveArtworkError] = useState(false);

  useEffect(() => {
    setWaveArtworkError(false);
  }, [currentTrack?.id]);

  /* Плейлисты полных треков (кэш по ключу «wave:настроение» / «chart») */
  const [playlists, setPlaylists] = useState<Record<string, MusicTrack[]>>({});
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState<Record<string, boolean>>({});

  const searchDebounceRef = useRef<any>(null);
  const iaPageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreFnRef = useRef<() => void>(() => {});
  const baseOffsetRef = useRef<Record<string, number>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const listKey = tab === 'chart' ? 'chart' : `wave:${activeMood}`;
  const hasPlaylist = Boolean(playlists[listKey]);
  const searchMode = query.trim().length > 0;

  /* Страница плейлиста по ключу */
  const fetchListPage = useCallback(async (key: string, offset: number): Promise<MusicTrack[]> => {
    if (key === 'chart') return getAudiusTrending(PAGE, undefined, offset);
    if (key.startsWith('wave:')) {
      const mood = WAVE_MOODS.find((m) => m.id === key.slice(5));
      if (!mood) return [];
      if (mood.query) return searchAudius(mood.query, PAGE, offset);
      return getAudiusTrending(PAGE, mood.genre, offset);
    }
    return [];
  }, []);

  /* Первичная загрузка плейлиста */
  useEffect(() => {
    if ((tab !== 'wave' && tab !== 'chart') || searchMode) return;
    if (playlists[listKey]) return;

    let alive = true;
    setListLoading(true);

    const isTrending = listKey === 'chart' || (() => {
      const mood = WAVE_MOODS.find((m) => m.id === listKey.slice(5));
      return Boolean(mood && !mood.query);
    })();
    const base = isTrending ? randomBaseOffset() : 0;
    baseOffsetRef.current[listKey] = base;

    fetchListPage(listKey, base)
      .then((tracks) => { if (alive) setPlaylists((p) => ({ ...p, [listKey]: shuffleArray(tracks) })); })
      .catch(() => { if (alive) setPlaylists((p) => ({ ...p, [listKey]: [] })); })
      .finally(() => { if (alive) setListLoading(false); });

    return () => { alive = false; };
  }, [tab, activeMood, searchMode, listKey, playlists, fetchListPage]);

  /* Поиск */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchExhausted(false);
      iaPageRef.current = 1;
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    setSearchExhausted(false);
    iaPageRef.current = 1;

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const audiusTracks = await searchAudius(q, PAGE).catch(() => [] as MusicTrack[]);
        setSearchResults(audiusTracks);
        setIsSearching(false);

        const iaTracks = await searchInternetArchive(q, 1, 10).catch(() => [] as MusicTrack[]);
        if (iaTracks.length > 0) {
          setSearchResults((prev) => {
            const ids = new Set(prev.map((t) => t.id));
            return [...prev, ...iaTracks.filter((t) => !ids.has(t.id))];
          });
        }
      } catch {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  /* Бесконечная прокрутка */
  const loadMoreList = useCallback(async () => {
    if (listLoading || loadingMore || !hasPlaylist || exhausted[listKey]) return;
    setLoadingMore(true);
    try {
      const current = playlists[listKey] || [];
      const base = baseOffsetRef.current[listKey] || 0;
      const offset = base + current.filter((t) => !t.isLiveRadio).length;
      const next = await fetchListPage(listKey, offset);
      const fresh = shuffleArray(next.filter((t) => !current.some((c) => c.id === t.id)));
      if (fresh.length === 0) {
        setExhausted((e) => ({ ...e, [listKey]: true }));
      } else {
        setPlaylists((p) => ({ ...p, [listKey]: [...current, ...fresh] }));
      }
    } catch {
      setExhausted((e) => ({ ...e, [listKey]: true }));
    } finally {
      setLoadingMore(false);
    }
  }, [listLoading, loadingMore, hasPlaylist, exhausted, listKey, playlists, fetchListPage]);

  const loadMoreSearch = useCallback(async () => {
    const q = query.trim();
    if (!q || isSearching || loadingMore || searchExhausted) return;
    setLoadingMore(true);
    try {
      const current = searchResults;
      const offset = current.filter((t) => t.source !== 'archive').length;
      const [nextAudius, nextIa] = await Promise.all([
        searchAudius(q, PAGE, offset).catch(() => [] as MusicTrack[]),
        searchInternetArchive(q, iaPageRef.current + 1, 10).catch(() => [] as MusicTrack[]),
      ]);
      if (nextIa.length > 0) iaPageRef.current += 1;
      const fresh = [...nextAudius, ...nextIa].filter(
        (t) => !current.some((c) => c.id === t.id)
      );
      if (fresh.length === 0) {
        setSearchExhausted(true);
      } else {
        setSearchResults([...current, ...fresh]);
      }
    } catch {
      setSearchExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [query, isSearching, loadingMore, searchExhausted, searchResults]);

  loadMoreFnRef.current = searchMode ? loadMoreSearch : loadMoreList;

  /* Фильтрация треков */
  const displayedTracks = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q) {
      const localMatches = LIVE_RADIO_STATIONS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );
      return [...localMatches, ...searchResults];
    }

    if (tab === 'radio') {
      return LIVE_RADIO_STATIONS;
    }

    if (tab === 'library') {
      return likedTracks as MusicTrack[];
    }

    if (tab === 'chart') {
      return playlists['chart'] || [];
    }

    const moodTracks = playlists[`wave:${activeMood}`] || [];
    const radioMatches =
      activeMood === 'all'
        ? LIVE_RADIO_STATIONS
        : LIVE_RADIO_STATIONS.filter((t) => t.mood === activeMood);
    return [...moodTracks, ...radioMatches];
  }, [tab, activeMood, query, likedTracks, searchResults, playlists]);

  /* Запуск воспроизведения трека */
  const handlePlayTrack = (track: MusicTrack, idx: number) => {
    haptic('medium');
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      setTrack(track as any, displayedTracks as any[], idx);
      setPlaying(true);
    }
  };

  /* Запуск Волны Пульс */
  const handleStartWave = () => {
    haptic('heavy');
    const localPool = displayedTracks.filter((t) => !t.isLiveRadio);
    if (currentTrack && localPool.some((track) => track.id === currentTrack.id)) {
      setPlaying(!isPlaying);
      showToast(isPlaying ? '⏸ Пауза' : '▶️ Возобновлено');
      return;
    }
    if (listLoading && !hasPlaylist) {
      showToast('✦ Подбираем треки для Пульса…');
      return;
    }
    const seen = new Set<string>();
    const pool = localPool.filter((track) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
    if (pool.length > 0) {
      const idx = 0;
      const first = pool[idx];
      setTrack(first as any, pool as any[], idx);
      setPlaying(true);
      showToast(`✦ ZENOVA Пульс: ${first.artist} — ${first.title}`);
    } else {
      showToast('В этом списке пока нет доступных треков');
    }
  };

  /* Волна дня */
  const dayWave = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 11) return { mood: 'energy', icon: '🌅', label: 'Утренний старт' };
    if (h >= 11 && h < 17) return { mood: 'chart', icon: '☀️', label: 'Дневные хиты' };
    if (h >= 17 && h < 22) return { mood: 'night', icon: '🌆', label: 'Вечерний город' };
    return { mood: 'relax', icon: '🌙', label: 'Ночная тишина' };
  }, []);

  const activateDayWave = () => {
    haptic('medium');
    setActiveMood(dayWave.mood as any);
    showToast(`${dayWave.icon} Волна дня: ${dayWave.label}`);
  };

  const currentMoodObj = WAVE_MOODS.find((m) => m.id === activeMood) || WAVE_MOODS[0];
  const currentTrackIsInWave = Boolean(
    currentTrack && displayedTracks.some((track) => !track.isLiveRadio && track.id === currentTrack.id)
  );

  const showSkeletons =
    (tab === 'wave' || tab === 'chart') && !searchMode && listLoading && !hasPlaylist;

  const isListExhausted = searchMode ? searchExhausted : Boolean(exhausted[listKey]);
  const showSentinel =
    !showSkeletons &&
    displayedTracks.length > 0 &&
    !isListExhausted &&
    (searchMode || hasPlaylist) &&
    tab !== 'radio' &&
    tab !== 'library';

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreFnRef.current();
      },
      { rootMargin: '700px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showSentinel]);

  return (
    <div className="music-page page ms-page">
      {/* ════════════ 1. МИНИМАЛИСТИЧНАЯ ШАПКА В СТИЛЕ ПРОФИЛЯ ════════════ */}
      <header className="ms-header">
        <div className="ms-header__top">
          <div className="ms-brand">
            <span className="ms-brand__badge">✦ ZENOVA SOUND PRO</span>
            <h1 className="ms-brand__title">
              {tab === 'wave' && 'ZENOVA Пульс'}
              {tab === 'chart' && 'Топ Чарты'}
              {tab === 'radio' && 'Прямой Эфир'}
              {tab === 'library' && 'Медиатека'}
            </h1>
          </div>

          <button
            type="button"
            className={`ms-header__equalizer ${isPlaying ? 'playing' : ''}`}
            onClick={() => {
              if (currentTrack) {
                haptic('medium');
                setExpanded(true);
              }
            }}
            aria-label={currentTrack ? 'Развернуть плеер' : 'Плеер выключен'}
            disabled={!currentTrack}
          >
            <span /><span /><span /><span />
          </button>
        </div>

        {/* ── Минималистичный поиск (smoked glass) ── */}
        <div className="ms-search">
          <svg className="ms-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="text"
            className="ms-search__input"
            placeholder="Трек, исполнитель или настроение…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && <div className="ms-search__spinner" />}
          {query && !isSearching && (
            <button className="ms-search__clear" onClick={() => setQuery('')} aria-label="Очистить поиск">
              ✕
            </button>
          )}
        </div>

        {/* ── Навигационные вкладки в точном стиле ProfilePage (.pf-pill-tabs) ── */}
        <div className="ms-pill-tabs">
          {([
            { id: 'wave', label: '✦ Пульс' },
            { id: 'chart', label: '🔥 Топ Хиты' },
            { id: 'radio', label: '📻 Радио' },
            { id: 'library', label: `💖 Любимое (${likedTracks.length})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ms-pill-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => {
                haptic('light');
                setTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Чипсы настроений (Минимализм) ── */}
        {tab === 'wave' && !searchMode && (
          <div className="ms-moods-rail">
            <button
              className={`ms-mood-chip ${activeMood === dayWave.mood ? 'active' : ''}`}
              onClick={activateDayWave}
            >
              <span className="ms-mood-chip__icon">{dayWave.icon}</span>
              <span>{dayWave.label}</span>
            </button>
            {WAVE_MOODS.map((m) => (
              <button
                key={m.id}
                className={`ms-mood-chip ${activeMood === m.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setActiveMood(m.id);
                  showToast(`${m.icon} ${m.label}`);
                }}
              >
                <span className="ms-mood-chip__icon">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ════════════ 2. 3D OBSIDIAN STAGE (Архитектура Профиля) ════════════ */}
      {tab === 'wave' && !searchMode && (
        <section className="ms-showcase">
          <div className="ms-stage">
            {/* Notched Corners matching ProfilePage */}
            <div className="ms-stage__notch ms-stage__notch--tl">
              <span className="ms-stage__format-tag">HI-RES</span>
            </div>

            <div className="ms-stage__notch ms-stage__notch--tr">
              <button
                type="button"
                className={`ms-stage__corner-btn ${currentTrack && isLiked(currentTrack.id) ? 'liked' : ''}`}
                onClick={() => {
                  if (currentTrack) {
                    haptic('medium');
                    toggleLike(currentTrack as any);
                    showToast(isLiked(currentTrack.id) ? 'Удалено из избранного' : 'Добавлено в Избранное 💖');
                  }
                }}
                disabled={!currentTrack}
                aria-label="В избранное"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill={currentTrack && isLiked(currentTrack.id) ? '#fb7185' : 'none'} stroke={currentTrack && isLiked(currentTrack.id) ? '#fb7185' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Ambient concentric halo */}
            <div className={`ms-stage__halo ${isPlaying ? 'pulse' : ''}`} />

            {/* Serial badge */}
            <div className="ms-stage__serial">
              <span>ZENOVA SOUND ID · <b>96kHz/24bit</b></span>
            </div>

            {/* Center Hero Pod: 3D Holographic Vinyl */}
            <div className="ms-stage__center">
              <div className="ms-stage__vinyl-pod" onClick={() => currentTrack && setExpanded(true)}>
                <div className={`ms-stage__vinyl ${isPlaying ? 'spinning' : ''}`}>
                  <div className="ms-stage__vinyl-grooves" />
                  <div className="ms-stage__vinyl-core">
                    {currentTrack?.artwork && !waveArtworkError ? (
                      <img src={currentTrack.artwork} alt="" onError={() => setWaveArtworkError(true)} />
                    ) : (
                      <span className="ms-stage__vinyl-mark">✦</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta: Title & Artist */}
              <div className="ms-stage__meta">
                <span className="ms-stage__kicker">
                  {isPlaying ? 'СЕЙЧАС В ЭФИРЕ · LOSSLESS' : currentTrack ? 'НА ПАУЗЕ' : currentMoodObj.label}
                </span>
                <h2 className="ms-stage__title">{currentTrack?.title || 'ZENOVA Пульс'}</h2>
                <p className="ms-stage__artist">{currentTrack?.artist || currentMoodObj.description}</p>
              </div>

              {/* Primary Minimalist Controls (NO surprise mix) */}
              <div className="ms-stage__controls">
                <button
                  type="button"
                  className={`ms-stage__play-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={handleStartWave}
                  aria-label={currentTrackIsInWave && isPlaying ? 'Пауза' : 'Слушать'}
                >
                  {currentTrackIsInWave && isPlaying ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {currentTrack && (
                  <button
                    type="button"
                    className="ms-stage__next-btn"
                    onClick={() => {
                      haptic('light');
                      nextTrack();
                    }}
                    aria-label="Следующий трек"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3-Cell stats bar underneath matching Profile */}
          <div className="ms-stats-row">
            <div className="ms-stat-cell">
              <span className="ms-stat-cell__val">Lossless</span>
              <span className="ms-stat-cell__lbl">Качество</span>
            </div>
            <div className="ms-stat-cell">
              <span className="ms-stat-cell__val">320 kbps</span>
              <span className="ms-stat-cell__lbl">Битрейт</span>
            </div>
            <div className="ms-stat-cell">
              <span className="ms-stat-cell__val">{displayedTracks.length}</span>
              <span className="ms-stat-cell__lbl">В подборке</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Баннеры остальных вкладок ── */}
      {tab === 'radio' && !searchMode && (
        <div className="ms-banner">
          <div className="ms-banner__icon">📻</div>
          <div className="ms-banner__text">
            <strong>Прямой эфир FM радиостанций</strong>
            <span>Стабильные открытые потоки в HD качестве 24/7 без рекламы.</span>
          </div>
        </div>
      )}

      {tab === 'chart' && !searchMode && (
        <div className="ms-banner">
          <div className="ms-banner__icon">🔥</div>
          <div className="ms-banner__text">
            <strong>Главные треки недели</strong>
            <span>Топ прослушиваний и трендов со всего мира. Листайте вниз.</span>
          </div>
        </div>
      )}

      {tab === 'library' && !searchMode && (
        <div className="ms-banner">
          <div className="ms-banner__icon">💖</div>
          <div className="ms-banner__text">
            <strong>Ваша личная медиатека</strong>
            <span>{likedTracks.length > 0 ? `Сохранено ${likedTracks.length} треков` : 'Нажмите сердечко на любом треке, чтобы сохранить его.'}</span>
          </div>
        </div>
      )}

      {/* ════════════ 3. ТРЕКЛИСТ В СТИЛЕ SMOKED BENTO КАРТОЧЕК ════════════ */}
      <main className="ms-list">
        {searchMode && (
          <div className="ms-list-header">
            <span>{isSearching ? 'Поиск треков…' : `Найдено: ${displayedTracks.length} записей`}</span>
          </div>
        )}

        {showSkeletons ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div className="ms-track-skeleton" key={i}>
              <div className="ms-track-skeleton__art" />
              <div className="ms-track-skeleton__body">
                <div className="ms-track-skeleton__line" style={{ width: '60%' }} />
                <div className="ms-track-skeleton__line" style={{ width: '38%' }} />
              </div>
            </div>
          ))
        ) : displayedTracks.length === 0 ? (
          <div className="ms-empty">
            <div className="ms-empty__icon">🎵</div>
            <strong className="ms-empty__title">Треков не найдено</strong>
            <span className="ms-empty__sub">
              {tab === 'library'
                ? 'Вы пока не сохранили ни одного трека'
                : 'Попробуйте изменить запрос или переключить настроение'}
            </span>
          </div>
        ) : (
          displayedTracks.map((t, idx) => {
            const isCurrent = currentTrack?.id === t.id;
            const liked = isLiked(t.id);

            return (
              <div
                key={t.id}
                className={`ms-track-card ${isCurrent ? 'active' : ''}`}
                onClick={() => handlePlayTrack(t, idx)}
              >
                {/* Номер трека или эквалайзер */}
                <div className="ms-track-card__index">
                  {isCurrent && isPlaying ? (
                    <div className="ms-track-card__bars">
                      <span /><span /><span />
                    </div>
                  ) : tab === 'chart' && !searchMode ? (
                    <span className={`ms-track-card__rank ${idx < 3 ? 'top' : ''}`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Обложка */}
                <div className="ms-track-card__art-wrap">
                  <img
                    src={t.artwork}
                    alt={t.title}
                    className="ms-track-card__art"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className={`ms-track-card__play-overlay ${isCurrent ? 'visible' : ''}`}>
                    {isCurrent && isPlaying ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 5h4v14H7zM15 5h4v14h-4z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Метаданные */}
                <div className="ms-track-card__info">
                  <div className="ms-track-card__title-row">
                    <span className="ms-track-card__title">{t.title}</span>
                    {t.isLiveRadio && <span className="ms-badge-live">LIVE</span>}
                  </div>
                  <div className="ms-track-card__sub-row">
                    <span className="ms-track-card__artist">{t.artist}</span>
                    {t.genre && (
                      <>
                        <span className="ms-track-card__dot">·</span>
                        <span className="ms-track-card__genre">{t.genre}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Время */}
                <span className="ms-track-card__dur">
                  {t.isLiveRadio ? 'Эфир' : fmtTime(t.duration)}
                </span>

                {/* Like Button */}
                <button
                  type="button"
                  className={`ms-track-card__like ${liked ? 'liked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('medium');
                    toggleLike(t as any);
                    showToast(liked ? 'Удалено из медиатеки' : 'Добавлено в Любимое 💖');
                  }}
                  aria-label="Мне нравится"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#fb7185' : 'none'} stroke={liked ? '#fb7185' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            );
          })
        )}

        {/* Сентинел бесконечной прокрутки */}
        {showSentinel && (
          <div ref={sentinelRef} className="ms-list-more">
            {loadingMore && (
              <>
                <div className="ms-search__spinner" />
                <span>Подгружаем ещё треки…</span>
              </>
            )}
          </div>
        )}
      </main>

      {/* Быстрое тост-уведомление */}
      {toastMsg && (
        <div className="ms-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
