import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
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

type Tab = 'trending' | 'liked';

/* ═══════════ Константы ═══════════ */
const APP_NAME = 'KinoZal';
const LIKED_KEY = 'mu_liked_v2';
const NOW_KEY = 'mu_now_v2';

/* Случайный жанр и период при каждом заходе — музыка всегда свежая */
const GENRES = [
  '', 'Electronic', 'Hip-Hop/Rap', 'Pop', 'Rock', 'Lo-Fi', 'House',
  'Techno', 'Deep House', 'R&B/Soul', 'Jazz', 'Ambient', 'Dubstep',
];
const TIME_RANGES = ['week', 'month', 'allTime'];
const HOSTS_FALLBACK = [
  'https://discoveryprovider.audius.co',
  'https://audius-discovery-2.altego.net',
  'https://audius-metadata-1.figment.io',
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
  id: t.id,
  title: t.title ?? 'Без названия',
  artist: t.user?.name ?? 'Неизвестный артист',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
  duration: t.duration ?? 0,
  plays: t.play_count ?? 0,
  genre: t.genre || 'Music',
  streamUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
});

/* ═══════════ SVG-иконки (единый премиум-стиль) ═══════════ */
const IconPlay = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.9c0-1.2 1.3-1.9 2.3-1.3l9.2 5.6c1 .6 1 2 0 2.6l-9.2 5.6c-1 .6-2.3-.1-2.3-1.3V5.9z" /></svg>
);
const IconPause = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.4" height="15" rx="1.6" /><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.6" /></svg>
);
const IconNext = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.8c0-1 1.1-1.6 2-1.1l8 5.2c.8.5.8 1.7 0 2.2l-8 5.2c-.9.5-2-.1-2-1.1V6.8z" /><rect x="16.5" y="5" width="2.6" height="14" rx="1.3" /></svg>
);
const IconPrev = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.8c0-1-1.1-1.6-2-1.1l-8 5.2c-.8.5-.8 1.7 0 2.2l8 5.2c.9.5 2-.1 2-1.1V6.8z" /><rect x="4.9" y="5" width="2.6" height="14" rx="1.3" /></svg>
);
const IconShuffle = ({ size = 18, active = false }: { size?: number; active?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h3.5c1.3 0 2.5.6 3.2 1.7l4.6 6.6c.7 1.1 1.9 1.7 3.2 1.7H21" /><path d="M18.5 13.5L21 16l-2.5 2.5" />
    <path d="M3 18h3.5c1.3 0 2.5-.6 3.2-1.7l1.2-1.7" /><path d="M13.1 9.4l1.2-1.7c.7-1.1 1.9-1.7 3.2-1.7H21" /><path d="M18.5 3.5L21 6l-2.5 2.5" />
  </svg>
);
const IconRepeat = ({ size = 18, active = false }: { size?: number; active?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l3.5 3.5L17 10" /><path d="M4 12V10.5A4 4 0 0 1 8 6.5h12.5" />
    <path d="M7 21l-3.5-3.5L7 14" /><path d="M20 12v1.5a4 4 0 0 1-4 4H3.5" />
  </svg>
);
const IconHeart = ({ size = 20, filled = false }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.5 5.3a5 5 0 0 0-7.1 0L12 5.7l-.4-.4a5 5 0 1 0-7.1 7.1l.4.4L12 20l7.1-7.2.4-.4a5 5 0 0 0 0-7.1z" />
  </svg>
);
const IconSearch = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16.5 16.5L21 21" /></svg>
);
const IconRefresh = ({ size = 18, spin = false }: { size?: number; spin?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={spin ? 'mu-spin' : undefined}>
    <path d="M20 5v5h-5" /><path d="M4 19v-5h5" /><path d="M20 10a8 8 0 0 0-14.9-3M4 14a8 8 0 0 0 14.9 3" />
  </svg>
);
const IconClose = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const IconChevronDown = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5l6 6 6-6" /></svg>
);
const IconNote = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17.5V6.3L20 4v11.2" /><circle cx="6.5" cy="17.5" r="2.6" /><circle cx="17.5" cy="15.2" r="2.6" /></svg>
);
const IconFire = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c-4.4 0-7.5-3-7.5-7.2 0-2.6 1.3-4.6 2.6-6.2.6-.8 1.9-.4 2 .7.1.9.4 1.7 1 2.3.3-3.5 2-6.9 5.3-8.8.9-.5 2 .2 1.9 1.2-.1 1.6.2 3.5 1.6 5.7 1.1 1.7 2.6 3.4 2.6 5.6C21.5 19 18.4 22 12 22z" /></svg>
);
const IconClock = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
const IconWave = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h.01M8 8v8M12 5v14M16 8v8M20 12h.01" /></svg>
);
const IconTrash = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" /></svg>
);

/* Артворк с фолбэком — красивый градиент вместо пустой картинки */
const Artwork: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`${className} mu-art-fallback`}>
        <IconNote size={28} />
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />;
};


/* ═══════════ Компонент ═══════════ */
const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('trending');
  const [liked, setLiked] = useState<Track[]>(() => {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'); } catch { return []; }
  });
  const [current, setCurrent] = useState<Track | null>(() => {
    try { return JSON.parse(localStorage.getItem(NOW_KEY) || 'null'); } catch { return null; }
  });
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [feedLabel, setFeedLabel] = useState('Популярное сейчас');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  /* ── Загрузка: каждый раз случайный жанр + период + страница → всегда свежая музыка ── */
  const loadFeed = useCallback(async (mode: 'init' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    const genre = pick(GENRES);
    const time = pick(TIME_RANGES);
    const offset = mode === 'refresh' ? Math.floor(Math.random() * 4) * 30 : Math.floor(Math.random() * 3) * 30;
    let host = pick(HOSTS_FALLBACK);
    try {
      const res = await fetch('https://api.audius.co', { signal: AbortSignal.timeout(5000) });
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data[0]) host = json.data[0];
    } catch {}
    hostRef.current = host;
    try {
      const params = new URLSearchParams({ 'app_name': APP_NAME, limit: '40', time, offset: String(offset) });
      if (genre) params.set('genre', genre);
      const res = await fetch(`${host}/v1/tracks/trending?${params}`, { signal: AbortSignal.timeout(9000) });
      const json = await res.json();
      const fetched = (json?.data ?? []).map((t: any) => mapTrack(t, host));
      if (fetched.length > 0) {
        /* перемешиваем — лента всегда разная */
        for (let i = fetched.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fetched[i], fetched[j]] = [fetched[j], fetched[i]];
        }
        setTracks(fetched);
        setFeedLabel(genre ? `${genre} · ${time === 'week' ? 'за неделю' : time === 'month' ? 'за месяц' : 'всё время'}` : `${time === 'week' ? 'Хиты недели' : time === 'month' ? 'Хиты месяца' : 'Лучшее всех времён'}`);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadFeed('init'); }, [loadFeed]);

  useEffect(() => {
    try { if (current) localStorage.setItem(NOW_KEY, JSON.stringify(current)); } catch {}
  }, [current]);

  /* ── Лайки ── */
  const isLiked = (t: Track | null) => !!t && liked.some((l) => l.id === t.id);
  const toggleLike = (t: Track) => {
    haptic('light');
    setLiked((prev) => {
      const has = prev.some((l) => l.id === t.id);
      const next = has ? prev.filter((l) => l.id !== t.id) : [{ ...t }, ...prev];
      try { localStorage.setItem(LIKED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  /* ── Поиск ── */
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    haptic('light');
    setLoading(true);
    try {
      const res = await fetch(`${hostRef.current}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP_NAME}&limit=30`, { signal: AbortSignal.timeout(9000) });
      const json = await res.json();
      setTracks((json?.data ?? []).map((t: any) => mapTrack(t, hostRef.current)));
      setFeedLabel(`Поиск: «${q}»`);
    } catch {}
    setLoading(false);
  };

  /* ── Плеер ── */
  const play = (t: Track) => {
    if (current?.id === t.id) { togglePlay(); return; }
    haptic('medium');
    setCurrent(t);
    setPlaying(true);
    setProgress(0);
    setDuration(t.duration || 0);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    haptic('light');
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => setPlaying(false)); setPlaying(true); }
  };

  const list = tab === 'liked' ? liked : tracks;

  const nextTrack = useCallback((auto = false) => {
    if (!list.length) return;
    if (!auto) haptic('light');
    if (shuffle) {
      const others = list.filter((t) => t.id !== current?.id);
      if (others.length) { setCurrent(others[Math.floor(Math.random() * others.length)]); setPlaying(true); setProgress(0); return; }
    }
    const idx = current ? list.findIndex((t) => t.id === current.id) : -1;
    const nxt = list[(idx + 1) % list.length];
    if (nxt) { setCurrent(nxt); setPlaying(true); setProgress(0); }
  }, [list, current, shuffle, haptic]);

  const prevTrack = () => {
    if (!list.length || !current) return;
    haptic('light');
    const idx = list.findIndex((t) => t.id === current.id);
    const prv = list[(idx - 1 + list.length) % list.length];
    if (prv) { setCurrent(prv); setPlaying(true); setProgress(0); }
  };

  const seekTo = (v: number) => {
    const a = audioRef.current;
    if (a) { a.currentTime = v; setProgress(v); }
  };

  /* Автоплей при смене трека */
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    a.src = current.streamUrl;
    a.load();
    if (playing) a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="mu">
      {/* Фоновые световые пятна */}
      <div className="mu-blob mu-blob--1" />

      <div className="mu-header">
        <div className="mu-header__brand">
          <span className="mu-header__logo"><IconNote size={20} /></span>
          <div>
            <h1 className="mu-header__title">Музыка</h1>
            <span className="mu-header__sub">{feedLabel}</span>
          </div>
        </div>
        <button className="mu-header__refresh" onClick={() => { setTab('trending'); loadFeed('refresh'); haptic('medium'); }} aria-label="Обновить">
          <IconRefresh spin={refreshing} />
        </button>
      </div>

      <div className="mu-tabs">
        <button className={`mu-tab ${tab === 'trending' ? 'active' : ''}`} onClick={() => { setTab('trending'); haptic('light'); }}>
          <IconFire size={14} /> Популярное
        </button>
        <button className={`mu-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => { setTab('liked'); haptic('light'); }}>
          <IconHeart size={13} filled={tab === 'liked'} /> Понравилось
          {liked.length > 0 && <span className="mu-tab__count">{liked.length}</span>}
        </button>
      </div>

      {tab === 'trending' && (
        <div className="mu-search">
          <span className="mu-search__icon"><IconSearch /></span>
          <input
            className="mu-search__input"
            placeholder="Трек или артист…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {query && (
            <button className="mu-search__clear" onClick={() => { setQuery(''); loadFeed('refresh'); }}>
              <IconClose size={14} />
            </button>
          )}
        </div>
      )}

      <div className="mu-list">
        {loading && (
          <div className="mu-skeletons">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="mu-skel">
                <div className="mu-skel__art" />
                <div className="mu-skel__lines"><div /><div /></div>
              </div>
            ))}
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="mu-empty">
            {tab === 'liked' ? <><IconHeart size={36} /><p>Пока пусто — жми ❤ на треках</p></> : <><IconNote size={36} /><p>Ничего не найдено</p></>}
          </div>
        )}
        {!loading && list.map((t, i) => {
          const active = current?.id === t.id;
          return (
            <button key={`${t.id}-${i}`} className={`mu-row ${active ? 'mu-row--active' : ''}`} onClick={() => play(t)}>
              <span className="mu-row__num">{active && playing ? <IconWave size={16} /> : String(i + 1).padStart(2, '0')}</span>
              <Artwork src={t.artwork} alt={t.title} className="mu-row__art" />
              <span className="mu-row__info">
                <span className="mu-row__title">{t.title}</span>
                <span className="mu-row__artist">{t.artist} · {fmtPlays(t.plays)} ▶</span>
              </span>
              <span
                className={`mu-row__like ${isLiked(t) ? 'mu-row__like--on' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleLike(t); }}
              >
                <IconHeart size={17} filled={isLiked(t)} />
              </span>
            </button>
          );
        })}
        <div className="mu-list__pad" />
      </div>
      <div className="mu-blob mu-blob--2" />
      <div className="mu-blob mu-blob--3" />

      {/* ═══ Мини-плеер над таббаром ═══ */}
      {current && (
        <div className={`mu-mini ${showFull ? 'mu-mini--hidden' : ''}`} onClick={() => { setShowFull(true); haptic('light'); }}>
          <Artwork src={current.artwork} alt={current.title} className="mu-mini__art" />
          <div className="mu-mini__info">
            <span className="mu-mini__title">{current.title}</span>
            <span className="mu-mini__artist">{current.artist}</span>
            <div className="mu-mini__bar"><span style={{ width: `${progressPct}%` }} /></div>
          </div>
          <button
            className="mu-mini__btn mu-mini__btn--play"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          >
            {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
          </button>
          <button
            className="mu-mini__btn"
            onClick={(e) => { e.stopPropagation(); nextTrack(); }}
          >
            <IconNext size={18} />
          </button>
        </div>
      )}

      {/* ═══ Полноэкранный плеер — центральная glass-карточка ═══ */}
      {current && showFull && (
        <div className="mu-full" onClick={() => setShowFull(false)}>
          <div className="mu-full__bg" style={{ backgroundImage: current.artwork ? `url(${current.artwork})` : undefined }} />
          <div className="mu-full__veil" />
          <div className="mu-full__card" onClick={(e) => e.stopPropagation()}>
            <div className="mu-full__top">
              <button className="mu-full__close" onClick={() => { setShowFull(false); haptic('light'); }}>
                <IconChevronDown />
              </button>
              <span className="mu-full__brand">KinoZal · Музыка</span>
              <button
                className={`mu-full__like ${isLiked(current) ? 'mu-full__like--on' : ''}`}
                onClick={() => toggleLike(current)}
              >
                <IconHeart size={20} filled={isLiked(current)} />
              </button>
            </div>

            <Artwork src={current.artwork} alt={current.title} className="mu-full__art" />

            <h2 className="mu-full__title">{current.title}</h2>
            <p className="mu-full__artist">{current.artist}</p>

            <div className="mu-full__tags">
              <span className="mu-tag"><IconFire size={12} /> {current.genre}</span>
              <span className="mu-tag"><IconWave size={12} /> {fmtPlays(current.plays)} прослушиваний</span>
              <span className="mu-tag"><IconClock size={12} /> {fmtTime(current.duration)}</span>
            </div>

            <div className="mu-full__progress">
              <input
                type="range"
                min={0}
                max={duration || current.duration || 100}
                value={progress}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="mu-range"
                style={{ '--pct': `${progressPct}%` } as React.CSSProperties}
              />
              <div className="mu-full__times">
                <span>{fmtTime(progress)}</span>
                <span>{fmtTime(duration || current.duration)}</span>
              </div>
            </div>

            <div className="mu-full__controls">
              <button
                className={`mu-full__side ${shuffle ? 'mu-full__side--on' : ''}`}
                onClick={() => { setShuffle(!shuffle); haptic('light'); }}
              >
                <IconShuffle active={shuffle} />
              </button>
              <button className="mu-full__skip" onClick={prevTrack}><IconPrev size={26} /></button>
              <button className="mu-full__play" onClick={togglePlay}>
                {playing ? <IconPause size={28} /> : <IconPlay size={28} />}
              </button>
              <button className="mu-full__skip" onClick={() => nextTrack()}><IconNext size={26} /></button>
              <button
                className={`mu-full__side ${repeat ? 'mu-full__side--on' : ''}`}
                onClick={() => { setRepeat(!repeat); haptic('light'); }}
              >
                <IconRepeat active={repeat} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Аудио */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => { if (repeat) { seekTo(0); audioRef.current?.play().catch(() => {}); } else nextTrack(true); }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </div>
  );
};

export default MusicPage;
