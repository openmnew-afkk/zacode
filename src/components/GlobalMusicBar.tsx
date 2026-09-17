import React, { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '../store/musicStore';
import './GlobalMusicBar.css';

/* Глобальная мини-панель музыки — показывается над TabBar */
const GlobalMusicBar: React.FC = () => {
  const {
    currentTrack, isPlaying, progress, duration,
    setPlaying, nextTrack, prevTrack, toggleLike, isLiked,
    setExpanded, setProgress, setDuration, setTrack,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  /* ── Создаём <audio> один раз ── */
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => nextTrack());
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      audioRef.current.addEventListener('durationchange', () => {
        if (audioRef.current) setDuration(audioRef.current.duration || 0);
      });
    }
  }, []);

  /* ── Смена трека ── */
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.streamUrl;
    setImgError(false);
    if (isPlaying) audioRef.current.play().catch(() => {});
  }, [currentTrack?.id]);

  /* ── Play/Pause ── */
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) { audioRef.current.play().catch(() => {}); }
    else { audioRef.current.pause(); }
  }, [isPlaying]);

  if (!currentTrack) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const pos = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = pos;
    setProgress(pos);
  };

  return (
    <div className="gbar" onClick={() => setExpanded(true)}>
      {/* Прогресс */}
      <div
        className="gbar__progress-track"
        onClick={(e) => { e.stopPropagation(); handleSeekClick(e); }}
      >
        <div className="gbar__progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="gbar__inner">
        {/* Арт */}
        <div className="gbar__art">
          {currentTrack.artwork && !imgError ? (
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="gbar__art-placeholder">🎵</div>
          )}
          {isPlaying && <div className="gbar__art-pulse" />}
        </div>

        {/* Инфо */}
        <div className="gbar__info">
          <div className="gbar__title">{currentTrack.title}</div>
          <div className="gbar__artist">{currentTrack.artist}</div>
        </div>

        {/* Кнопки */}
        <div className="gbar__controls" onClick={(e) => e.stopPropagation()}>
          <button className="gbar__btn" onClick={prevTrack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button className="gbar__btn gbar__btn--play" onClick={() => setPlaying(!isPlaying)}>
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button className="gbar__btn" onClick={nextTrack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
            </svg>
          </button>
          <button
            className={`gbar__btn ${liked ? 'gbar__btn--liked' : ''}`}
            onClick={() => toggleLike(currentTrack)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicBar;
