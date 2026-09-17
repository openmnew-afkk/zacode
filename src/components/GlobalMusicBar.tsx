import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMusicStore } from '../store/musicStore';
import './GlobalMusicBar.css';

const GlobalMusicBar: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, progress, duration,
    setPlaying, nextTrack, toggleLike, isLiked,
    setProgress, setDuration, seekSignal, closeTrack, setExpanded,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener('ended', () => {
        const { repeatOn: rep, nextTrack: next } = useMusicStore.getState();
        if (rep && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          return;
        }
        next();
      });
      audio.addEventListener('timeupdate', () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      audio.addEventListener('durationchange', () => {
        if (audioRef.current) setDuration(audioRef.current.duration || 0);
      });
      audioRef.current = audio;
    }
  }, []);

  /* Перемотка из полноэкранного плеера */
  useEffect(() => {
    if (!audioRef.current || !seekSignal) return;
    try { audioRef.current.currentTime = seekSignal.value; } catch {}
  }, [seekSignal?.tick]);

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

  return (
    <div className="gbar">
      <div className="gbar__bar" onClick={() => { navigate('/music'); setExpanded(true); }}>
        {/* Компактная обложка */}
        <div className="gbar__cover">
          {currentTrack.artwork && !imgError
            ? <img src={currentTrack.artwork} alt="" onError={() => setImgError(true)} />
            : <span>🎵</span>
          }
          {/* Бегущая полоса прогресса по нижнему краю */}
          <div className="gbar__line"><span style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="gbar__info">
          <div className="gbar__title">{currentTrack.title}</div>
          <div className="gbar__artist">{currentTrack.artist}</div>
        </div>

        <button
          className={`gbar__btn ${liked ? 'gbar__btn--liked' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
          aria-label="Нравится"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M19.5 5.3a5 5 0 0 0-7.1 0L12 5.7l-.4-.4a5 5 0 1 0-7.1 7.1l.4.4L12 20l7.1-7.2.4-.4a5 5 0 0 0 0-7.1z" />
          </svg>
        </button>

        <button
          className="gbar__btn gbar__btn--play"
          onClick={(e) => { e.stopPropagation(); setPlaying(!isPlaying); }}
          aria-label={isPlaying ? 'Пауза' : 'Играть'}
        >
          {isPlaying
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.4" height="15" rx="1.6" /><rect x="13.6" y="4.5" width="4.4" height="15" rx="1.6" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.9c0-1.2 1.3-1.9 2.3-1.3l9.2 5.6c1 .6 1 2 0 2.6l-9.2 5.6c-1 .6-2.3-.1-2.3-1.3V5.9z" /></svg>
          }
        </button>

        <button
          className="gbar__btn gbar__btn--next"
          onClick={(e) => { e.stopPropagation(); nextTrack(); }}
          aria-label="Следующий"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.8c0-1 1.1-1.6 2-1.1l8 5.2c.8.5.8 1.7 0 2.2l-8 5.2c-.9.5-2-.1-2-1.1V6.8z" /><rect x="16.5" y="5" width="2.6" height="14" rx="1.3" /></svg>
        </button>

        {/* Закрыть плеер — останавливает музыку и прячет бар */}
        <button
          className="gbar__btn gbar__btn--close"
          onClick={(e) => { e.stopPropagation(); closeTrack(); }}
          aria-label="Закрыть плеер"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
};

export default GlobalMusicBar;
