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

  /* Плейлисты полных треков (кэш по ключу «wave:настроение» / «chart»,
     догружаются страницами при прокрутке) */
  const [playlists, setPlaylists] = useState<Record<string, MusicTrack[]>>({});
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState<Record<string, boolean>>({});

  const searchDebounceRef = useRef<any>(null);
  const iaPageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreFnRef = useRef<() => void>(() => {});
  /* Случайный стартовый offset плейлиста (запоминается для бесконечной прокрутки) */
  const baseOffsetRef = useRef<Record<string, number>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const listKey = tab === 'chart' ? 'chart' : `wave:${activeMood}`;
  const hasPlaylist = Boolean(playlists[listKey]);
  const searchMode = query.trim().length > 0;

  /* Страница плейлиста по ключу: чарт / настроение (жанр или запрос) */
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

  /* Первичная загрузка плейлиста — со случайной страницы и в случайном порядке */
  useEffect(() => {
    if ((tab !== 'wave' && tab !== 'chart') || searchMode) return;
    if (playlists[listKey]) return;

    let alive = true;
    setListLoading(true);

    // Для запросов-настроений offset не важен, для трендов — случайная страница
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

  /* Поиск: Audius (миллионный каталог) + Internet Archive (сотни тысяч) */
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
        // Audius быстрый — показываем сразу
        const audiusTracks = await searchAudius(q, PAGE).catch(() => [] as MusicTrack[]);
        setSearchResults(audiusTracks);
        setIsSearching(false);

        // Internet Archive медленнее — догружаем поверх
        const iaTracks = await searchInternetArchive(q, 1, 10).catch(() => [] as MusicTrack[]);
        if (iaTracks.length > 0) {
          setSearchResults((prev) => {
            const ids = new Set(prev.map((t) => t.id));
            return [...prev, ...iaTracks.filter((t) => !ids.has(t.id))];
          });
        }
      } catch (e) {
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

  /* ── Бесконечная прокрутка ── */

  const loadMoreList = useCallback(async () => {
    if (listLoading || loadingMore || !hasPlaylist || exhausted[listKey]) return;
    setLoadingMore(true);
    try {
      const current = playlists[listKey] || [];
      // offset = случайная база этой сессии + сколько уже загрузили
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

  /* Фильтрация треков для отображения */
  const displayedTracks = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Поиск: полные треки из Audius + Internet Archive + радиостанции
    if (q) {
      const localMatches = LIVE_RADIO_STATIONS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q)
      );

      const combined = [...localMatches, ...searchResults];
      return combined;
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

    // Вкладка 'wave' (Моя Волна): плейлист настроения + подходящие радиостанции
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

  /* Запуск Моей Волны по большой кнопке/сфере */
  const handleStartWave = () => {
    haptic('heavy');
    if (currentTrack) {
      setPlaying(!isPlaying);
      showToast(isPlaying ? '⏸ Пауза' : '▶️ Возобновлено');
      return;
    }
    if (listLoading && !hasPlaylist) {
      showToast('🌊 Подбираем треки для Волны…');
      return;
    }
    // Стартуем со случайного трека (не радио), чтобы каждое включение было новым
    const musicOnly = displayedTracks.filter((t) => !t.isLiveRadio);
    const pool = musicOnly.length > 0 ? musicOnly : displayedTracks;
    if (pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      const first = pool[idx];
      setTrack(first as any, displayedTracks as any[], displayedTracks.indexOf(first));
      setPlaying(true);
      const mood = WAVE_MOODS.find((m) => m.id === activeMood);
      showToast(`🌊 Моя Волна: ${first.artist} — ${first.title}`);
    }
  };

  const currentMoodObj = WAVE_MOODS.find((m) => m.id === activeMood) || WAVE_MOODS[0];

  /* Скелетоны при первой загрузке плейлиста */
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

  /* Сентинел для IntersectionObserver (переподключается при появлении) */
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
    <div className="music-page page ym-music-page">
      {/* ── Премиальная шапка в стиле Яндекс Музыки ── */}
      <header className="ym-header">
        <div className="ym-header__top">
          <div className="ym-brand">
            <div className="ym-brand__badge-row">
              <span className="ym-brand__badge">✦ МОЯ ВОЛНА · МИЛЛИОНЫ ТРЕКОВ</span>
              <span className="ym-source-tag">ZENOVA SOUND</span>
            </div>
            <h1 className="ym-brand__title">
              {tab === 'wave' && 'Моя Волна'}
              {tab === 'chart' && 'Топ Чарты'}
              {tab === 'radio' && 'Прямой Эфир'}
              {tab === 'library' && 'Коллекция'}
            </h1>
          </div>

          <div
            className={`ym-header__equalizer ${isPlaying ? 'playing' : ''}`}
            onClick={() => currentTrack && setExpanded(true)}
            title={currentTrack ? 'Развернуть плеер' : undefined}
          >
            <span /><span /><span /><span />
          </div>
        </div>

        {/* ── Умный поисковик ── */}
        <div className="ym-search">
          <svg className="ym-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="text"
            className="ym-search__input"
            placeholder="Любой трек мира — миллионы полных записей…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && (
            <div className="ym-search__spinner" />
          )}
          {query && !isSearching && (
            <button
              className="ym-search__clear"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Навигационные вкладки сервиса ── */}
        <div className="ym-tabs">
          <button
            className={`ym-tab ${tab === 'wave' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('wave'); }}
          >
            <span className="ym-tab__icon">🌊</span>
            <span>Моя Волна</span>
          </button>
          <button
            className={`ym-tab ${tab === 'chart' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('chart'); }}
          >
            <span className="ym-tab__icon">🔥</span>
            <span>Топ Хиты</span>
          </button>
          <button
            className={`ym-tab ${tab === 'radio' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('radio'); }}
          >
            <span className="ym-tab__icon">📻</span>
            <span>Радио 24/7</span>
          </button>
          <button
            className={`ym-tab ${tab === 'library' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('library'); }}
          >
            <span className="ym-tab__icon">💖</span>
            <span>Любимое ({likedTracks.length})</span>
          </button>
        </div>

        {/* ── Селектор настроений Моей Волны ── */}
        {tab === 'wave' && !searchMode && (
          <div className="ym-moods">
            {WAVE_MOODS.map((m) => (
              <button
                key={m.id}
                className={`ym-mood-chip ${activeMood === m.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setActiveMood(m.id);
                  showToast(`${m.icon} Режим Волны: ${m.label}`);
                }}
              >
                <span className="ym-mood-chip__icon">{m.icon}</span>
                <span className="ym-mood-chip__label">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Интерактивная живая сфера "Моя Волна" в стиле Яндекс Музыки ── */}
      {tab === 'wave' && !searchMode && (
        <section className="ym-wave-card" onClick={handleStartWave}>
          <div className="ym-wave-sphere-wrap">
            <div
              className={`ym-wave-sphere ${isPlaying ? 'playing' : ''}`}
              style={{ background: currentMoodObj.gradient }}
            >
              <div className="ym-wave-glow" />
              <div className="ym-wave-pulse" />
              <div className="ym-wave-center-icon">
                {isPlaying ? (
                  <div className="ym-wave-equalizer">
                    <span /><span /><span /><span />
                  </div>
                ) : (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
          <div className="ym-wave-card__info">
            <span className="ym-wave-card__badge">
              {currentMoodObj.icon} {currentMoodObj.label}
            </span>
            <h2 className="ym-wave-card__title">
              {isPlaying ? 'Волна звучит сейчас' : 'Включить Мою Волну'}
            </h2>
            <p className="ym-wave-card__desc">{currentMoodObj.description}</p>
          </div>
        </section>
      )}

      {/* ── Баннер радиостанций ── */}
      {tab === 'radio' && !searchMode && (
        <div className="ym-radio-banner">
          <div className="ym-radio-banner__icon">📻</div>
          <div className="ym-radio-banner__content">
            <strong>Прямой эфир топ-радиостанций в HD качестве</strong>
            <p>100% стабильные открытые HTTPS-потоки без задержек и рекламы 24/7.</p>
          </div>
        </div>
      )}

      {/* ── Баннер чарта ── */}
      {tab === 'chart' && !searchMode && (
        <div className="ym-library-banner">
          <div className="ym-library-banner__icon">🔥</div>
          <div className="ym-library-banner__content">
            <strong>Топ хиты недели — полные треки</strong>
            <p>Открытые каталоги Audius и Internet Archive: миллионы легальных треков. Листайте вниз — список бесконечный.</p>
          </div>
        </div>
      )}

      {/* ── Баннер библиотеки избранного ── */}
      {tab === 'library' && !searchMode && (
        <div className="ym-library-banner">
          <div className="ym-library-banner__icon">💖</div>
          <div className="ym-library-banner__content">
            <strong>Ваша персональная медиатека</strong>
            <p>{likedTracks.length > 0 ? `Сохранено ${likedTracks.length} треков` : 'Нажимайте на сердечко у любого трека, чтобы добавить его сюда'}</p>
          </div>
        </div>
      )}

      {/* ── Список треков / Результаты поиска ── */}
      <main className="ym-list">
        {searchMode && (
          <div className="ym-list-header">
            <span className="ym-list-header__title">
              {isSearching ? 'Ищем в миллионном каталоге…' : `Найдено: ${displayedTracks.length}+ треков`}
            </span>
          </div>
        )}

        {showSkeletons ? (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div className="ym-skeleton-row" key={i}>
              <div className="ym-skeleton-row__art skeleton-pulse" />
              <div className="ym-skeleton-row__lines">
                <div className="ym-skeleton-row__line skeleton-pulse" style={{ width: '62%' }} />
                <div className="ym-skeleton-row__line skeleton-pulse" style={{ width: '40%' }} />
              </div>
            </div>
          ))
        ) : displayedTracks.length === 0 ? (
          <div className="ym-empty">
            <div className="ym-empty__icon">🎵</div>
            <p className="ym-empty__title">Ничего не найдено</p>
            <span className="ym-empty__sub">
              {tab === 'library'
                ? 'Вы пока не сохранили ни одного трека в любимые'
                : 'Попробуйте изменить запрос или выберите другое настроение'}
            </span>
          </div>
        ) : (
          displayedTracks.map((t, idx) => {
            const isCurrent = currentTrack?.id === t.id;
            const liked = isLiked(t.id);

            return (
              <div
                key={t.id}
                className={`ym-track ${isCurrent ? 'active' : ''}`}
                onClick={() => handlePlayTrack(t, idx)}
              >
                {/* Номер в чарте */}
                {tab === 'chart' && !searchMode && (
                  <div className={`ym-track__rank ${idx < 3 ? 'ym-track__rank--top' : ''}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                )}

                {/* Обложка с кнопкой Play и эквалайзером */}
                <div className="ym-track__art-wrap">
                  <img
                    src={t.artwork}
                    alt={t.title}
                    className="ym-track__art"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className={`ym-track__overlay ${isCurrent ? 'force-show' : ''}`}>
                    {isCurrent && isPlaying ? (
                      <div className="ym-track__bars">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Метаданные трека */}
                <div className="ym-track__meta">
                  <div className="ym-track__title-row">
                    <span className="ym-track__title">{t.title}</span>
                    {t.isLiveRadio && (
                      <span className="ym-badge-live">Live</span>
                    )}
                    {t.source === 'radio' && (
                      <span className="ym-badge-source ym-badge-source--radio">FM HD</span>
                    )}
                    {t.source === 'archive' && (
                      <span className="ym-badge-source ym-badge-source--archive">Архив</span>
                    )}
                  </div>
                  <div className="ym-track__sub">
                    <span className="ym-track__artist">{t.artist}</span>
                    {t.genre && (
                      <>
                        <span className="ym-track__dot">·</span>
                        <span className="ym-track__genre">{t.genre}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Длительность или статус эфира */}
                <span className="ym-track__dur">
                  {t.isLiveRadio ? 'Эфир' : fmtTime(t.duration)}
                </span>

                {/* Кнопка "Мне нравится" (сердечко) */}
                <button
                  className={`ym-track__like ${liked ? 'liked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('medium');
                    toggleLike(t as any);
                    showToast(liked ? 'Удалено из медиатеки' : 'Добавлено в Мою Коллекцию 💖');
                  }}
                  aria-label="Мне нравится"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill={liked ? 'var(--accent, #fb7185)' : 'none'}
                    stroke={liked ? 'var(--accent, #fb7185)' : 'currentColor'}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            );
          })
        )}

        {/* Сентинел бесконечной прокрутки */}
        {showSentinel && (
          <div ref={sentinelRef} className="ym-list-more">
            {loadingMore && (
              <>
                <div className="ym-search__spinner" />
                <span>Подгружаем ещё треки…</span>
              </>
            )}
          </div>
        )}
      </main>

      {/* Быстрое тост-уведомление */}
      {toastMsg && (
        <div className="ym-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
