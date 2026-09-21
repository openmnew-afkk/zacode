import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore } from '../store/musicStore';
import './MusicPage.css';

/* ═══════════ Типы ═══════════ */
interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  genre: string;
  streamUrl: string;
}

type Tab = 'wave' | 'russian' | 'world' | 'audius' | 'liked';

/* ═══════════ Константы ═══════════ */
const APP_NAME = 'AURA';

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const HOSTS_FALLBACK = [
  'https://discoveryprovider.audius.co',
  'https://audius-discovery-2.altego.net',
  'https://audius-metadata-1.figment.io',
  'https://dn1.audius.l2be.net',
  'https://audius-dp.amsterdam.creatorseed.com',
];

const RUSSIAN_SEEDS = [
  'Баста', 'Miyagi & Эндшпиль', 'ANNA ASTI', 'MACAN', 'Zivert', 'JONY',
  'Хиты России', 'Три дня дождя', 'Скриптонит', 'HammAli Navai', 'Xcho', 'Markul',
];

const WORLD_SEEDS = [
  'The Weeknd', 'Billie Eilish', 'Dua Lipa', 'Drake', 'Taylor Swift',
  'Travis Scott', 'Coldplay', 'top hits', 'pop hits',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtTime = (s: number): string => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const fmtPlays = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n ?? 0}`;

const mapTrack = (t: any, host: string): Track => ({
  id: `au-${t.id}`,
  title: t.title ?? 'Без названия',
  artist: t.user?.name ?? 'Неизвестный артист',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
  duration: t.duration ?? 0,
  plays: t.play_count ?? 0,
  genre: t.genre || 'Full Track',
  streamUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
});

const mapItunes = (t: any): Track => ({
  id: `it-${t.trackId}`,
  title: t.trackName ?? 'Без названия',
  artist: t.artistName ?? 'Неизвестный артист',
  artwork: (t.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
  duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 30,
  plays: 0,
  genre: t.primaryGenreName || 'Hit',
  streamUrl: t.previewUrl || '',
});

/* ── iTunes API ── */
const fetchItunesSearch = async (term: string, country = 'US', limit = 35): Promise<Track[]> => {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=song&media=music&limit=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  return (json?.results ?? []).filter((t: any) => t.previewUrl).map(mapItunes);
};

/* ── Deezer API (JSONP fallback) ── */
const jsonp = (url: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const cb = `dz_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    const cleanup = () => { clearTimeout(timer); delete (window as any)[cb]; script.remove(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('jsonp timeout')); }, 8000);
    (window as any)[cb] = (data: any) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('jsonp error')); };
    script.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
    document.head.appendChild(script);
  });

const fetchDeezerChart = async (limit = 25): Promise<Track[]> => {
  const data = await jsonp(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
  return (data?.data ?? [])
    .filter((t: any) => t.preview)
    .map((t: any) => ({
      id: `dz-${t.id}`,
      title: t.title || '',
      artist: t.artist?.name || '',
      artwork: (t.album?.cover_medium || '').replace('cover_medium', 'cover_big'),
      duration: 30,
      plays: t.rank ? Math.round(t.rank / 1000) : 0,
      genre: 'Chart',
      streamUrl: t.preview,
    }));
};

const fetchDeezerSearch = async (q: string, limit = 20): Promise<Track[]> => {
  const data = await jsonp(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return (data?.data ?? [])
    .filter((t: any) => t.preview)
    .map((t: any) => ({
      id: `dz-${t.id}`,
      title: t.title || '',
      artist: t.artist?.name || '',
      artwork: (t.album?.cover_medium || '').replace('cover_medium', 'cover_big'),
      duration: 30,
      plays: 0,
      genre: 'Search',
      streamUrl: t.preview,
    }));
};

const dedupeTracks = (arr: Track[]): Track[] => {
  const seen = new Set<string>();
  return arr.filter((t) => {
    if (!t.title || !t.streamUrl) return false;
    const key = `${t.title.toLowerCase()}|${t.artist.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const shuffleArr = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ═══════════ SVG-иконки ═══════════ */
const IconPlay = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.5 5.9c0-1.2 1.3-1.9 2.3-1.3l9.2 5.6c1 .6 1 2 0 2.6l-9.2 5.6c-1 .6-2.3-.1-2.3-1.3V5.9z" />
  </svg>
);
const IconPause = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4.5" width="4.4" height="15" rx="1.6" />
    <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.6" />
  </svg>
);
const IconHeart = ({ size = 18, filled = false }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#ec4899' : 'none'} stroke={filled ? '#ec4899' : 'currentColor'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IconSearch = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16.5 16.5L21 21" /></svg>
);
const IconRefresh = ({ size = 18, spin = false }: { size?: number; spin?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={spin ? 'mu-spin' : undefined}>
    <path d="M20 5v5h-5" /><path d="M4 19v-5h5" /><path d="M20 10a8 8 0 0 0-14.9-3M4 14a8 8 0 0 0 14.9 3" />
  </svg>
);
const IconClose = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const IconNote = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17.5V6.3L20 4v11.2" /><circle cx="6.5" cy="17.5" r="2.6" /><circle cx="17.5" cy="15.2" r="2.6" /></svg>
);
const IconWave = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12h1M7 8v8M11 5v14M15 8v8M19 11v2M23 12h-1" /></svg>
);
const IconSparkles = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
  </svg>
);

/* Артворк с фолбэком */
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

/* ═══════════ Компонент ═══════════ */
const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const {
    currentTrack, isPlaying, progress, duration,
    setTrack, setPlaying,
    likedTracks, toggleLike: storeToggleLike, isLiked: storeIsLiked,
    setExpanded,
  } = useMusicStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('wave');
  const [feedLabel, setFeedLabel] = useState('Персональная волна');
  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  /* Загрузка Audius треков */
  const fetchAudius = useCallback(async (limit = 40): Promise<Track[]> => {
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
        return (json?.data ?? []).map((t: any) => mapTrack(t, host));
      }
    } catch {}
    return [];
  }, []);

  /* Загрузка для каждой вкладки */
  const loadTabFeed = useCallback(async (activeTab: Tab, mode: 'init' | 'refresh' = 'init') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);

    try {
      if (activeTab === 'liked') {
        setFeedLabel('Моя медиатека');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (activeTab === 'russian') {
        setFeedLabel('Русские хиты · Топ чарт');
        const [a, b] = await Promise.all([
          fetchItunesSearch(pick(RUSSIAN_SEEDS), 'RU', 25).catch(() => [] as Track[]),
          fetchItunesSearch(pick(RUSSIAN_SEEDS), 'RU', 25).catch(() => [] as Track[]),
        ]);
        const list = dedupeTracks([...shuffleArr(a), ...shuffleArr(b)]);
        setTracks(list);
      } else if (activeTab === 'world') {
        setFeedLabel('Мировые чарты · Global Hits');
        const [it, dz] = await Promise.all([
          fetchItunesSearch(pick(WORLD_SEEDS), 'US', 25).catch(() => [] as Track[]),
          fetchDeezerChart(25).catch(() => [] as Track[]),
        ]);
        const list = dedupeTracks([...shuffleArr(dz), ...shuffleArr(it)]);
        setTracks(list);
      } else if (activeTab === 'audius') {
        setFeedLabel('Полные лицензионные треки (Audius)');
        const aud = await fetchAudius(45);
        setTracks(aud.length > 0 ? shuffleArr(aud) : []);
      } else if (activeTab === 'wave') {
        setFeedLabel('Моя волна · Ваш вкус');
        // Моя волна: умная смесь из предпочтений (лайки) + хиты
        const [ru, wo, au] = await Promise.all([
          fetchItunesSearch(pick(RUSSIAN_SEEDS), 'RU', 20).catch(() => [] as Track[]),
          fetchItunesSearch(pick(WORLD_SEEDS), 'US', 20).catch(() => [] as Track[]),
          fetchAudius(15).catch(() => [] as Track[]),
        ]);
        const pool = dedupeTracks([...likedTracks, ...shuffleArr(ru), ...shuffleArr(wo), ...shuffleArr(au)]);
        setTracks(pool);
      }
    } catch (e) {
      console.error('Music feed load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAudius, likedTracks]);

  useEffect(() => {
    loadTabFeed(tab, 'init');
  }, [tab, loadTabFeed]);

  /* ── Поиск (одновременно русский + мировой + Audius) ── */
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    haptic('light');
    setLoading(true);

    try {
      const [itRu, itUs, dz, auRes] = await Promise.allSettled([
        fetchItunesSearch(q, 'RU', 20),
        fetchItunesSearch(q, 'US', 20),
        fetchDeezerSearch(q, 15),
        fetch(`${hostRef.current}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP_NAME}&limit=15`)
          .then(r => r.json())
          .then(j => (j?.data ?? []).map((t: any) => mapTrack(t, hostRef.current))),
      ]);

      const getVal = (r: PromiseSettledResult<Track[]>) => r.status === 'fulfilled' ? r.value : [];
      const merged = dedupeTracks([
        ...getVal(itRu),
        ...getVal(itUs),
        ...getVal(dz),
        ...getVal(auRes),
      ]);

      setTracks(merged);
      setFeedLabel(`Поиск: «${q}» (${merged.length})`);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  /* ── Воспроизведение ── */
  const list = tab === 'liked' ? likedTracks : tracks;

  const playTrack = (t: Track) => {
    haptic('medium');
    const idx = list.indexOf(t);
    setTrack(t, list, idx >= 0 ? idx : 0);
    setPlaying(true);
  };

  const startWave = () => {
    haptic('heavy');
    if (list.length > 0) {
      setTrack(list[0], list, 0);
      setPlaying(true);
    }
  };

  const isLiked = (t: Track | null) => !!t && storeIsLiked(t.id);
  const toggleLike = (t: Track) => {
    haptic('light');
    storeToggleLike(t);
  };

  return (
    <div className="mu">
      {/* Фоновые градиентные пятна */}
      <div className="mu-blob mu-blob--1" />
      <div className="mu-blob mu-blob--2" />

      {/* Шапка */}
      <div className="mu-header">
        <div className="mu-header__brand">
          <div className="mu-header__logo">
            <div className="mu-wave-mini mu-wave-mini--white">
              <span /><span /><span /><span />
            </div>
          </div>
          <div>
            <h1 className="mu-header__title">Музыка</h1>
            <span className="mu-header__sub">{feedLabel}</span>
          </div>
        </div>
        <button
          className="mu-header__refresh"
          onClick={() => { loadTabFeed(tab, 'refresh'); haptic('medium'); }}
          aria-label="Обновить ленту"
        >
          <IconRefresh spin={refreshing} />
        </button>
      </div>

      {/* Вкладки стриминга */}
      <div className="mu-tabs">
        <button
          className={`mu-tab ${tab === 'wave' ? 'active' : ''}`}
          onClick={() => { setTab('wave'); haptic('light'); }}
        >
          <IconWave size={14} /> Моя волна
        </button>
        <button
          className={`mu-tab ${tab === 'russian' ? 'active' : ''}`}
          onClick={() => { setTab('russian'); haptic('light'); }}
        >
          Русские хиты
        </button>
        <button
          className={`mu-tab ${tab === 'world' ? 'active' : ''}`}
          onClick={() => { setTab('world'); haptic('light'); }}
        >
          Мировые чарты
        </button>
        <button
          className={`mu-tab ${tab === 'audius' ? 'active' : ''}`}
          onClick={() => { setTab('audius'); haptic('light'); }}
        >
          Полные треки
        </button>
        <button
          className={`mu-tab ${tab === 'liked' ? 'active' : ''}`}
          onClick={() => { setTab('liked'); haptic('light'); }}
        >
          <IconHeart size={13} filled={tab === 'liked'} /> Любимое
          {likedTracks.length > 0 && <span className="mu-tab__count">{likedTracks.length}</span>}
        </button>
      </div>

      {/* Поиск */}
      <div className="mu-search">
        <span className="mu-search__icon"><IconSearch /></span>
        <input
          className="mu-search__input"
          placeholder="Поиск по артистам и трекам (РФ и мир)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {query && (
          <button className="mu-search__clear" onClick={() => { setQuery(''); loadTabFeed(tab, 'refresh'); }}>
            <IconClose />
          </button>
        )}
      </div>

      {/* Интерактивный блок «Моя волна» (только на вкладке 'wave') */}
      {tab === 'wave' && !query && (
        <div className="mu-wave-card" onClick={startWave}>
          <div className="mu-wave-card__glow" />
          <div className="mu-wave-card__content">
            <div className="mu-wave-card__badge">
              <IconSparkles size={13} />
              <span>Ваш вкус · Нейропоток</span>
            </div>
            <h2 className="mu-wave-card__title">Моя Волна</h2>
            <p className="mu-wave-card__sub">
              {likedTracks.length > 0
                ? `Подобрано на основе ваших ${likedTracks.length} любимых треков`
                : 'Непрерывный персональный поток свежей русской и мировой музыки'}
            </p>
            <div className="mu-wave-card__bar">
              <span className="mu-wave-eq"><i /><i /><i /><i /><i /></span>
              <button className="mu-wave-btn">
                <IconPlay size={16} /> Слушать волну
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список треков */}
      <div className="mu-list">
        {loading && (
          <div className="mu-skeletons">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mu-skel">
                <div className="mu-skel__art" />
                <div className="mu-skel__lines"><div /><div /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="mu-empty">
            {tab === 'liked' ? (
              <>
                <div className="mu-empty__icon"><IconHeart size={36} /></div>
                <p className="mu-empty__title">Медиатека пуста</p>
                <p className="mu-empty__sub">Нажмите сердечко на понравившихся треках, чтобы они появились здесь</p>
              </>
            ) : (
              <>
                <div className="mu-empty__icon"><IconNote size={36} /></div>
                <p className="mu-empty__title">Треки не найдены</p>
                <p className="mu-empty__sub">Попробуйте ввести другой поисковый запрос</p>
              </>
            )}
          </div>
        )}

        {!loading && list.map((t, i) => {
          const active = currentTrack?.id === t.id;
          const barW = active
            ? Math.min(100, Math.max(4, duration > 0 ? (progress / duration) * 100 : 0))
            : 20 + (hashStr(t.id) % 55);

          return (
            <div
              key={`${t.id}-${i}`}
              className={`mu-row ${active ? 'mu-row--active' : ''}`}
              onClick={() => {
                if (active) {
                  setExpanded(true);
                } else {
                  playTrack(t);
                }
              }}
            >
              <div className="mu-row__art-wrap">
                <Artwork src={t.artwork} alt={t.title} className="mu-row__art" />
                {active && isPlaying && (
                  <span className="mu-row__eq">
                    <span /><span /><span />
                  </span>
                )}
              </div>
              <div className="mu-row__info">
                <div className="mu-row__title">{t.title}</div>
                <div className="mu-row__bar"><i style={{ width: `${barW}%` }} /></div>
                <div className="mu-row__artist">
                  {t.artist}
                  {t.genre ? ` · ${t.genre}` : ''}
                  {active && duration > 0 ? ` · ${fmtTime(progress)} / ${fmtTime(duration)}` : ''}
                </div>
              </div>
              <button
                className={`mu-row__like ${isLiked(t) ? 'mu-row__like--on' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleLike(t); }}
                aria-label="В избранное"
              >
                <IconHeart size={18} filled={isLiked(t)} />
              </button>
            </div>
          );
        })}
        <div className="mu-list__pad" />
      </div>
    </div>
  );
};

export default MusicPage;
