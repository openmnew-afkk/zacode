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

const fmtTime = (s: number) => {
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
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  /* Резолв хоста Audius + тренды */
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
    haptic('medium');
    if (audioRef.current) audioRef.current.pause();
    setCurrent(t);
    setPlaying(true);
    setProgress(0);
    setDuration(t.duration);
    setTimeout(() => {
      audioRef.current?.play().catch(() => setPlaying(false));
    }, 50);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    haptic('light');
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  const nextTrack = () => {
    if (!current) return;
    const idx = tracks.findIndex((t) => t.id === current.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) play(next);
  };
  const prevTrack = () => {
    if (!current) return;
    const idx = tracks.findIndex((t) => t.id === current.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prev) play(prev);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
  };
  const onEnded = () => nextTrack();
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

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

      <div className="mu-list">
        {loading && (
          <div className="mu-empty">
            <div className="mu-spinner" />
            <p>Загружаю музыку…</p>
          </div>
        )}
        {!loading && tracks.length === 0 && (
          <div className="mu-empty">
            <span className="mu-empty__icon">🎧</span>
            <p>Ничего не нашлось</p>
            <p className="mu-empty__sub">Попробуй другой запрос</p>
          </div>
        )}
        {!loading && tracks.map((t) => (
          <div key={t.id} className={`mu-track ${current?.id === t.id ? 'active' : ''}`} onClick={() => play(t)}>
            {t.artwork && <img src={t.artwork} alt="" className="mu-track__art" loading="lazy" />}
            {!t.artwork && <span className="mu-track__art mu-track__art--ph">🎵</span>}
            <div className="mu-track__info">
              <p className="mu-track__title">{t.title}</p>
              <p className="mu-track__artist">{t.artist} · ▶ {fmtPlays(t.plays)} · {fmtTime(t.duration)}</p>
            </div>
            <span className={`mu-track__btn ${current?.id === t.id && playing ? 'playing' : ''}`}>
              {current?.id === t.id && playing ? '⏸' : '▶'}
            </span>
          </div>
        ))}
      </div>

      {/* Мини-плеер */}
      {current && (
        <div className="mu-player">
          <div className="mu-player__top">
            {current.artwork && <img src={current.artwork} alt="" className="mu-player__art" />}
            <div className="mu-player__meta">
              <p className="mu-player__title">{current.title}</p>
              <p className="mu-player__artist">{current.artist}</p>
            </div>
            <div className="mu-player__controls">
              <button onClick={prevTrack}>⏮</button>
              <button className="mu-player__play" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
              <button onClick={nextTrack}>⏭</button>
            </div>
          </div>
          <div className="mu-player__bar" onClick={seek}>
            <div className="mu-player__progress" style={{ width: `${progress}%` }} />
          </div>
          <div className="mu-player__time">
            <span>{fmtTime((progress / 100) * (duration || 0))}</span>
            <span>{fmtTime(duration)}</span>
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
