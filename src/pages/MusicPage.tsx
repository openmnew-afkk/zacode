import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import './MusicPage.css';

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  streamUrl: string;
}

const APP_NAME = 'KinoZal';
const HOSTS_FALLBACK = ['https://discoveryprovider.audius.co', 'https://audius-discovery-1.altego.net'];
const LIKED_KEY = 'tc_mu_liked';

type Tab = 'trending' | 'liked';

const fmtTime = (s: number) => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};
const fmtPlays = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;

const mapTrack = (t: any, host: string): Track => ({
  id: t.id,
  title: t.title ?? 'Без названия',
  artist: t.user?.name ?? 'Неизвестный артист',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
  duration: t.duration ?? 0,
  plays: t.play_count ?? 0,
  streamUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
});

const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<Tab>('trending');
  const [liked, setLiked] = useState<Track[]>(() => {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'); } catch { return []; }
  });
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let host = HOSTS_FALLBACK[0];
      try {
        const res = await fetch('https://api.audius.co', { signal: AbortSignal.timeout(6000) });
        const json = await res.json();
        if (Array.isArray(json?.data) && json.data[0]) host = json.data[0];
      } catch {}
      hostRef.current = host;
      try {
        const res = await fetch(`${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=40`, { signal: AbortSignal.timeout(9000) });
        const json = await res.json();
        if (cancelled) return;
        setTracks((json?.data ?? []).map((t: any) => mapTrack(t, host)));
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

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

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    haptic('light');
    setSearching(true);
    try {
      const res = await fetch(`${hostRef.current}/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=${APP_NAME}&limit=30`, { signal: AbortSignal.timeout(9000) });
      const json = await res.json();
      setTracks((json?.data ?? []).map((t: any) => mapTrack(t, hostRef.current)));
    } catch {}
    setSearching(false);
  };

  const play = (t: Track) => {
    if (current?.id === t.id && audioRef.current) {
      togglePlay();
      return;
    }
    haptic('medium');
    if (audioRef.current) audioRef.current.pause();
    setCurrent(t);
    setPlaying(true);
    setProgress(0);
    setDuration(t.duration);
    setTimeout(() => {
      audioRef.current?.play().catch(() => setPlaying(false));
    }, 60);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    haptic('light');
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  const nextTrack = () => {
    const list = tracks.length ? tracks : liked;
    if (!current) return;
    haptic('light');
    if (shuffle) {
      const others = list.filter((t) => t.id !== current.id);
      if (others.length) play(others[Math.floor(Math.random() * others.length)]);
      return;
    }
    const idx = list.findIndex((t) => t.id === current.id);
    const next = list[(idx + 1) % list.length];
    if (next) play(next);
  };
  const prevTrack = () => {
    const list = tracks.length ? tracks : liked;
    if (!current) return;
    haptic('light');
    const idx = list.findIndex((t) => t.id === current.id);
    const prev = list[(idx - 1 + list.length) % list.length];
    if (prev) play(prev);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration) setProgress(a.currentTime);
  };
  const onEnded = () => nextTrack();
  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = Number(e.target.value);
    setProgress(a.currentTime);
  };

  const list = tab === 'liked' ? liked : tracks;

  return (
    <div className="mu page">
      <div className="mu-header">
        <div className="mu-header__brand">
          <span className="mu-header__logo">🎵</span>
          <div>
            <h1 className="mu-header__title">Музыка</h1>
            <span className="mu-header__sub">Онлайн-плеер · стриминг</span>
          </div>
        </div>
      </div>

      {/* Вкладки: Популярное / Понравилось */}
      <div className="mu-tabs">
        <button className={`mu-tab ${tab === 'trending' ? 'active' : ''}`} onClick={() => { setTab('trending'); haptic('light'); }}>
          🔥 Популярное
        </button>
        <button className={`mu-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => { setTab('liked'); haptic('light'); }}>
          ❤️ Понравилось{liked.length > 0 && <span className="mu-tab__count">{liked.length}</span>}
        </button>
      </div>

      {tab === 'trending' && (
        <div className="mu-search">
          <input
            className="mu-search__input"
            placeholder="Поиск трека или артиста…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="mu-search__btn" onClick={handleSearch}>
            {searching ? '⏳' : '🔍'}
          </button>
        </div>
      )}

      <div className="mu-list">
        {loading && tab === 'trending' && (
          <div className="mu-empty">
            <div className="mu-spinner" />
            <p>Загружаю музыку…</p>
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="mu-empty">
            <span className="mu-empty__icon">{tab === 'liked' ? '💜' : '🎧'}</span>
            <p>{tab === 'liked' ? 'Пока нет понравившихся' : 'Ничего не нашлось'}</p>
            <p className="mu-empty__sub">
              {tab === 'liked' ? 'Жми ♥ на треке — он появится здесь' : 'Попробуй другой запрос'}
            </p>
          </div>
        )}
        {list.map((t) => (
          <div key={t.id} className={`mu-track ${current?.id === t.id ? 'active' : ''}`} onClick={() => play(t)}>
            {t.artwork && <img src={t.artwork} alt="" className="mu-track__art" loading="lazy" />}
            {!t.artwork && <span className="mu-track__art mu-track__art--ph">🎵</span>}
            <div className="mu-track__info">
              <p className="mu-track__title">{t.title}</p>
              <p className="mu-track__artist">{t.artist} · ▶ {fmtPlays(t.plays)}</p>
            </div>
            <button
              className={`mu-like ${isLiked(t) ? 'on' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleLike(t); }}
              aria-label="Понравилось"
            >
              {isLiked(t) ? '❤️' : '🤍'}
            </button>
            <span className="mu-track__dur">{fmtTime(t.duration)}</span>
          </div>
        ))}
      </div>

      {/* Мини-плеер (бар) */}
      {current && !expanded && (
        <div className="mu-player">
          <div className="mu-player__main" onClick={() => { setExpanded(true); haptic('light'); }}>
            {current.artwork
              ? <img src={current.artwork} alt="" className="mu-player__art" />
              : <span className="mu-player__art mu-player__art--ph">🎵</span>}
            <div className="mu-player__meta">
              <p className="mu-player__title">{current.title}</p>
              <p className="mu-player__artist">{current.artist}</p>
            </div>
            <div className="mu-player__controls">
              <button onClick={(e) => { e.stopPropagation(); prevTrack(); }}>⏮</button>
              <button className="mu-player__play" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>{playing ? '⏸' : '▶'}</button>
              <button onClick={(e) => { e.stopPropagation(); nextTrack(); }}>⏭</button>
            </div>
          </div>
          <div className="mu-player__bar">
            <div
              className="mu-player__progress"
              style={{ width: `${(progress / (duration || current.duration || 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Полноэкранный плеер */}
      {current && expanded && (
        <div className="mu-full" onClick={() => setExpanded(false)}>
          <div className="mu-full__bg" style={{ backgroundImage: current.artwork ? `url(${current.artwork})` : undefined }} />
          <div className="mu-full__shade" />
          <div className="mu-full__panel" onClick={(e) => e.stopPropagation()}>
            <div className="mu-full__topbar">
              <button className="mu-full__collapse" onClick={() => { setExpanded(false); haptic('light'); }}>⌄</button>
              <button
                className={`mu-full__like ${isLiked(current) ? 'on' : ''}`}
                onClick={() => toggleLike(current)}
              >
                {isLiked(current) ? '❤️' : '🤍'}
              </button>
            </div>

            <div className={`mu-full__art-wrap ${playing ? 'playing' : ''}`}>
              {current.artwork
                ? <img src={current.artwork} alt="" className="mu-full__art" />
                : <span className="mu-full__art mu-full__art--ph">🎵</span>}
            </div>

            <p className="mu-full__title">{current.title}</p>
            <p className="mu-full__artist">{current.artist}</p>

            {/* Эквалайзер */}
            <div className={`mu-eq ${playing ? 'on' : ''}`}>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.13}s` }} />
              ))}
            </div>

            <input
              className="mu-seek"
              type="range"
              min={0}
              max={duration || current.duration || 100}
              value={progress}
              onChange={seekTo}
              style={{ backgroundSize: `${(progress / (duration || current.duration || 1)) * 100}% 100%` }}
            />
            <div className="mu-player__time mu-full__time">
              <span>{fmtTime(progress)}</span>
              <span>{fmtTime(duration || current.duration)}</span>
            </div>

            <div className="mu-full__controls">
              <button
                className={shuffle ? 'on' : ''}
                onClick={() => { setShuffle(!shuffle); haptic('light'); }}
              >🔀</button>
              <button onClick={prevTrack}>⏮</button>
              <button className="mu-full__play" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
              <button onClick={nextTrack}>⏭</button>
              <button
                className={repeat ? 'on' : ''}
                onClick={() => { setRepeat(!repeat); haptic('light'); }}
              >🔁</button>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={current?.streamUrl}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || current?.duration || 0)}
        preload="none"
      />
    </div>
  );
};

export default MusicPage;
