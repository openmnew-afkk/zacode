import React, { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '../store/musicStore';
import './GlobalMusicBar.css';

const GlobalMusicBar: React.FC = () => {
  const {
    currentTrack, isPlaying, progress, duration,
    setPlaying, nextTrack, prevTrack, toggleLike, isLiked,
    setProgress, setDuration,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener('ended', () => nextTrack());
      audio.addEventListener('timeupdate', () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      audio.addEventListener('durationchange', () => {
        if (audioRef.current) setDuration(audioRef.current.duration || 0);
      });
      audioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.streamUrl;
    setImgError(false);
    if (isPlaying) audioRef.current.play().catch(() => {});
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  if (!currentTrack) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);
  const timeLeft = duration > progress ? duration - progress : 0;

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const neg = s < 0;
    const abs = Math.abs(s);
    return `${neg ? '-' : ''}${Math.floor(abs / 60)}:${Math.floor(abs % 60).toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const pos = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = pos;
    setProgress(pos);
  };

  const artBg = currentTrack.artwork && !imgError
    ? `url(${currentTrack.artwork})`
    : 'linear-gradient(135deg, #4c1d95, #1e1b4b)';

  return (
    <div className="gbar">
      {/* Card */}
      <div className="gbar__card">
        {/* BG blur from art */}
        <div className="gbar__bg" style={{ backgroundImage: artBg }} />
        <div className="gbar__bg-overlay" />

        {/* Top row: avatar + info + actions */}
        <div className="gbar__top">
          <div className="gbar__avatar">
            {currentTrack.artwork && !imgError
              ? <img src={currentTrack.artwork} alt="" onError={() => setImgError(true)} />
              : <span>🎵</span>
            }
          </div>
          <div className="gbar__info">
            <div className="gbar__title">{currentTrack.title}</div>
            <div className="gbar__artist">{currentTrack.artist}</div>
          </div>
          <button
            className={`gbar__icon-btn ${liked ? 'gbar__icon-btn--liked' : ''}`}
            onClick={() => toggleLike(currentTrack)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        {/* Big art cover */}
        <div className="gbar__art">
          {currentTrack.artwork && !imgError
            ? <img src={currentTrack.artwork} alt={currentTrack.title} onError={() => setImgError(true)} />
            : <div className="gbar__art-ph">🎵</div>
          }
        </div>

        {/* Progress */}
        <div className="gbar__seek" onClick={handleSeek}>
          <div className="gbar__seek-fill" style={{ width: `${pct}%` }}>
            <div className="gbar__seek-thumb" />
          </div>
        </div>
        <div className="gbar__times">
          <span>{fmt(progress)}</span>
          <span>-{fmt(timeLeft)}</span>
        </div>

        {/* Controls */}
        <div className="gbar__controls">
          <button className="gbar__ctrl" onClick={prevTrack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </button>
          <button className="gbar__ctrl gbar__ctrl--play" onClick={() => setPlaying(!isPlaying)}>
            {isPlaying
              ? <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button className="gbar__ctrl" onClick={nextTrack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicBar;
