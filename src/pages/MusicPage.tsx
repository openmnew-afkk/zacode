import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore } from '../store/musicStore';
import {
  APPLE_CATEGORIES,
  APPLE_RADIO_STATIONS,
  APPLE_GLOBAL_TOP,
  searchAppleMusicCatalog,
  AppleTrack,
} from '../services/appleMusic';
import './MusicPage.css';

/* ═══════════ Типы ═══════════ */
export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  genre: string;
  streamUrl: string;
  isLiveStream?: boolean;
  isLossless?: boolean;
  isSpatial?: boolean;
  album?: string;
}

type Tab = 'listen' | 'chart' | 'radio' | 'library';

const APP_NAME = 'ZENOVA';

const HOSTS_FALLBACK = [
  'https://discoveryprovider.audius.co',
  'https://audius-discovery-2.altego.net',
  'https://audius-metadata-1.figment.io',
  'https://dn1.audius.l2be.net',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtTime = (s: number): string => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const mapAppleTrack = (a: AppleTrack): Track => ({
  id: a.id,
  title: a.title,
  artist: a.artist,
  artwork: a.artwork,
  duration: a.duration,
  plays: 0,
  genre: a.genre,
  streamUrl: a.streamUrl,
  isLiveStream: a.isLiveRadio,
  isLossless: a.isLossless ?? true,
  isSpatial: a.isSpatial ?? true,
  album: a.album,
});

const mapAudiusTrack = (t: any, host: string): Track => ({
  id: `au-${t.id}`,
  title: t.title ?? 'Без названия',
  artist: t.user?.name ?? 'Неизвестный артист',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
  duration: t.duration ?? 0,
  plays: t.play_count ?? 0,
  genre: t.genre || 'Lossless Stream',
  streamUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
  isLossless: true,
  isSpatial: false,
});

/* ═══════════ Артворк ═══════════ */
const Artwork: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`${className} mu-art-fallback`}>
        <div className="mu-wave-mini">
          <span /><span /><span />
        </div>
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />;
};

/* ═══════════ Компонент Apple Music ═══════════ */
const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const {
    currentTrack, isPlaying,
    setTrack, setPlaying,
    likedTracks, toggleLike: storeToggleLike, isLiked: storeIsLiked,
  } = useMusicStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('listen');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  /* Загрузка Audius треков (глобальный стриминговый бекенд) */
  const fetchAudius = useCallback(async (limit = 35): Promise<Track[]> => {
    let host = pick(HOSTS_FALLBACK);
    try {
      const res = await fetch('https://api.audius.co', { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data[0]) host = json.data[0];
    } catch {}
    hostRef.current = host;
    try {
      const res = await fetch(`${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=${limit}`, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const json = await res.json();
        return (json?.data ?? []).map((t: any) => mapAudiusTrack(t, host));
      }
    } catch {}
    return [];
  }, []);

  /* Загрузка контента в зависимости от выбранного таба */
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'listen') {
        const topCurated = APPLE_GLOBAL_TOP.map(mapAppleTrack);
        let filtered = topCurated;
        if (activeCategory !== 'all') {
          filtered = topCurated.filter(
            (t) => APPLE_GLOBAL_TOP.find((a) => a.id === t.id)?.category === activeCategory
          );
        }
        const audiusTracks = await fetchAudius(25);
        setTracks([...filtered, ...audiusTracks]);
      } else if (tab === 'chart') {
        // Официальный Топ-100 Global
        setTracks(APPLE_GLOBAL_TOP.map(mapAppleTrack));
      } else if (tab === 'radio') {
        // Прямой эфир Apple Music 1 и радиостанций 24/7
        setTracks(APPLE_RADIO_STATIONS.map(mapAppleTrack));
      } else if (tab === 'library') {
        // Медиатека пользователя
        setTracks(likedTracks);
      }
    } catch {
      setTracks(APPLE_GLOBAL_TOP.map(mapAppleTrack));
    } finally {
      setLoading(false);
    }
  }, [tab, activeCategory, likedTracks, fetchAudius]);

  useEffect(() => {
    if (!query.trim()) {
      loadContent();
    }
  }, [loadContent, query]);

  /*  Полноценный мировой поиск через Apple Music (iTunes Search API) + Audius */
  useEffect(() => {
    if (!query.trim()) return;

    const q = query.trim().toLowerCase();

    // Быстрый поиск по локальному топу Apple Music и радиостанциям
    const localHits: Track[] = [
      ...APPLE_GLOBAL_TOP.map(mapAppleTrack),
      ...APPLE_RADIO_STATIONS.map(mapAppleTrack),
    ].filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
    );

    if (localHits.length > 0) {
      setTracks(localHits);
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        // 1. Поиск по официальному Apple Music каталогу (миллионы треков)
        const appleResults = await searchAppleMusicCatalog(query.trim(), 25);
        const mappedApple = appleResults.map(mapAppleTrack);

        // 2. Дополнительный поиск по полным стримам Audius
        let audiusResults: Track[] = [];
        try {
          const host = hostRef.current || 'https://discoveryprovider.audius.co';
          const res = await fetch(
            `${host}/v1/tracks/search?query=${encodeURIComponent(query.trim())}&app_name=${APP_NAME}&limit=20`,
            { signal: AbortSignal.timeout(6000) }
          );
          if (res.ok) {
            const data = await res.json();
            audiusResults = (data?.data ?? []).map((t: any) => mapAudiusTrack(t, host));
          }
        } catch {}

        // Объединяем результаты без дубликатов
        const seen = new Set<string>();
        const combined: Track[] = [];

        for (const item of [...mappedApple, ...localHits, ...audiusResults]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            combined.push(item);
          }
        }

        if (combined.length > 0) {
          setTracks(combined);
        } else if (localHits.length === 0) {
          setTracks([]);
        }
      } catch {
        if (localHits.length > 0) {
          setTracks(localHits);
        }
      } finally {
        setLoading(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [query]);

  /* Воспроизведение */
  const handlePlayTrack = (track: Track, idx: number) => {
    haptic('medium');
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      setTrack(track, tracks, idx);
      setPlaying(true);
    }
  };

  /* Выбор категории */
  const handleCategorySelect = (catId: string) => {
    haptic('light');
    setActiveCategory(catId);
    const cat = APPLE_CATEGORIES.find((c) => c.id === catId);
    if (cat) showToast(`${cat.icon} ${cat.label}`);
  };

  return (
    <div className="music-page page apple-music-page">
      {/* ── Шапка страницы в стиле Apple Music ── */}
      <header className="mu-header apple-header">
        <div className="mu-header__top">
          <div className="apple-brand">
            <span className="apple-brand__badge"> MUSIC · LOSSLESS AUDIO</span>
            <h1 className="mu-header__title apple-title">Apple Music</h1>
          </div>
          <button
            className="mu-header__reload"
            onClick={() => {
              haptic('light');
              loadContent();
            }}
            title="Обновить каталог"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        {/* ── Поисковая строка ── */}
        <div className="mu-search apple-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="text"
            className="mu-search__input"
            placeholder="Исполнитель, трек, альбом (мировой поиск Apple Music)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="mu-search__clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* ── Вкладки разделов ── */}
        <div className="mu-tabs apple-tabs">
          <button
            className={`mu-tab apple-tab ${tab === 'listen' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('listen'); }}
          >
             Слушать сейчас
          </button>
          <button
            className={`mu-tab apple-tab ${tab === 'chart' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('chart'); }}
          >
            📈 Топ-100 Global
          </button>
          <button
            className={`mu-tab apple-tab ${tab === 'radio' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('radio'); }}
          >
            📻 Радио 24/7
          </button>
          <button
            className={`mu-tab apple-tab ${tab === 'library' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('library'); }}
          >
            💖 Медиатека ({likedTracks.length})
          </button>
        </div>

        {/* ── Селектор категорий (только для раздела "Слушать сейчас") ── */}
        {tab === 'listen' && !query && (
          <div className="apple-categories">
            {APPLE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`apple-cat-chip ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => handleCategorySelect(c.id)}
              >
                <span className="apple-cat-chip__icon">{c.icon}</span>
                <span className="apple-cat-chip__label">{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Список треков ── */}
      <main className="mu-content">
        {tab === 'radio' && !loading && (
          <div className="apple-radio-banner">
            <div className="apple-radio-banner__icon">📻</div>
            <div>
              <strong>Apple Music 1 & Curated Live Radio</strong>
              <p>Прямой эфир радиостанций в качестве Lossless без рекламы и пауз.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mu-loading">
            <div className="mu-spinner apple-spinner" />
            <span>Загрузка каталога Apple Music…</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="mu-empty">
            <p>Ничего не найдено</p>
            <span>Попробуйте ввести другого исполнителя или название трека</span>
          </div>
        ) : (
          <div className="mu-list">
            {tracks.map((t, i) => {
              const isCurrent = currentTrack?.id === t.id;
              const isLiked = storeIsLiked(t.id);

              return (
                <div key={t.id} className={`mu-track apple-track ${isCurrent ? 'active' : ''}`}>
                  {/* Номер / кнопка play */}
                  <button
                    className="mu-track__play-btn apple-track__play-btn"
                    onClick={() => handlePlayTrack(t, i)}
                    aria-label="Воспроизвести"
                  >
                    <Artwork src={t.artwork} alt={t.title} className="mu-track__cover" />
                    <div className="mu-track__play-overlay">
                      {isCurrent && isPlaying ? (
                        <div className="mu-track__playing-bars apple-playing-bars">
                          <span /><span /><span />
                        </div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Инфо о треке */}
                  <div className="mu-track__meta" onClick={() => handlePlayTrack(t, i)}>
                    <div className="mu-track__title-row">
                      <span className="mu-track__title">{t.title}</span>
                      {t.isLiveStream && (
                        <span className="mu-track__live-tag">Live 24/7</span>
                      )}
                      {t.isLossless && !t.isLiveStream && (
                        <span className="apple-badge-lossless">Lossless</span>
                      )}
                      {t.isSpatial && !t.isLiveStream && (
                        <span className="apple-badge-spatial">Spatial</span>
                      )}
                    </div>
                    <div className="mu-track__sub-row">
                      <span className="mu-track__artist">{t.artist}</span>
                      {t.album && (
                        <>
                          <span className="mu-track__dot">·</span>
                          <span className="mu-track__album">{t.album}</span>
                        </>
                      )}
                      <span className="mu-track__dot">·</span>
                      <span className="mu-track__genre">{t.genre}</span>
                    </div>
                  </div>

                  {/* Длительность */}
                  <span className="mu-track__duration">
                    {t.isLiveStream ? 'Эфир' : fmtTime(t.duration)}
                  </span>

                  <div className="mu-track__actions">
                    <button
                      className={`mu-track__like apple-like-btn ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic('medium');
                        storeToggleLike(t);
                      }}
                      title="В медиатеку"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? '#fa233b' : 'none'} stroke={isLiked ? '#fa233b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Тост уведомление */}
      {toastMsg && (
        <div className="mu-toast apple-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
