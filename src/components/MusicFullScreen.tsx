import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, 
  HeartIcon, MusicNoteIcon, VolumeIcon, TrackRunningIcon
} from './MusicIcons';

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  streamUrl: string;
}

interface MusicFullScreenProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  likedTracks: Track[];
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (position: number) => void;
  onToggleLike: (track: Track) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  shuffleOn: boolean;
  repeatOn: boolean;
  onVolumeChange: (volume: number) => void;
  volume: number;
}

const formatTime = (seconds: number) => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MusicFullScreen: React.FC<MusicFullScreenProps> = ({
  currentTrack,
  isPlaying,
  progress,
  duration,
  likedTracks,
  onClose,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onToggleLike,
  onShuffle,
  onRepeat,
  shuffleOn,
  repeatOn,
  onVolumeChange,
  volume
}) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  if (!currentTrack) return null;

    const isLiked = likedTracks.some(t => t.id === currentTrack.id);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div 
      className={`mu-full-overlay ${visible ? 'visible' : ''} ${closing ? 'closing' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      {/* Фоновое изображение */}
      <div 
        className="mu-full-overlay__bg" 
        style={{ backgroundImage: currentTrack.artwork ? `url(${currentTrack.artwork})` : undefined }} 
      />
      <div className="mu-full-overlay__shade" />
      
      {/* Центрированная панель */}
      <div 
        className="mu-full-overlay__panel mu-full__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Верхняя панель */}
        <div className="mu-full-overlay__topbar mu-full__topbar">
          <button 
            className="mu-full-overlay__btn mu-full__collapse" 
            onClick={handleClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button 
            className={`mu-full-overlay__btn mu-full__like ${isLiked ? 'on' : ''}`}
            onClick={() => onToggleLike(currentTrack)}
          >
            <HeartIcon size={20} filled={isLiked} />
          </button>
        </div>

        {/* Артворк с анимацией */}
        <div className={`mu-full-overlay__art mu-full__art-wrap ${isPlaying ? 'playing' : ''}`}>
          {currentTrack.artwork ? (
            <img src={currentTrack.artwork} alt={currentTrack.title} className="mu-full__art" />
          ) : (
            <span className="mu-full__art mu-full__art--ph">
              <MusicNoteIcon size={70} />
            </span>
          )}
        </div>

        {/* Название и исполнитель */}
        <p className="mu-full__title">{currentTrack.title}</p>
        <p className="mu-full__artist">{currentTrack.artist}</p>

        {/* Эквалайзер */}
        <div className={`mu-eq ${isPlaying ? 'on' : ''}`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.13}s` }} />
          ))}
        </div>

        {/* Ползунок позиции */}
        <div className="mu-full-overlay__seek-container">
          <span className="mu-full__time-label">{formatTime(progress)}</span>
          <div className="mu-full__seek-wrapper">
            <input
              className="mu-seek mu-full__seek"
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              style={{ 
                backgroundSize: `${progressPercent}% 100%` 
              }}
            />
          </div>
          <span className="mu-full__time-label">{formatTime(duration || currentTrack.duration)}</span>
        </div>

        {/* Управление воспроизведением */}
        <div className="mu-full-overlay__controls mu-full__controls">
          <button 
            className={`mu-full-overlay__btn ${shuffleOn ? 'on' : ''}`}
            onClick={onShuffle}
            aria-label="Shuffle"
          >
            <ShuffleIcon size={20} active={shuffleOn} />
          </button>
          
          <button 
            className="mu-full-overlay__btn mu-full-overlay__btn--prev"
            onClick={onPrev}
            aria-label="Previous"
          >
            <PrevIcon size={22} />
          </button>
          
          <button 
            className="mu-full-overlay__btn mu-full-overlay__btn--play mu-full__play"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon size={26} /> : <PlayIcon size={26} active={!isPlaying} />}
          </button>
          
          <button 
            className="mu-full-overlay__btn mu-full-overlay__btn--next"
            onClick={onNext}
            aria-label="Next"
          >
            <NextIcon size={22} />
          </button>
          
          <button 
            className={`mu-full-overlay__btn ${repeatOn ? 'on' : ''}`}
            onClick={onRepeat}
            aria-label="Repeat"
          >
            <RepeatIcon size={20} active={repeatOn} />
          </button>
        </div>

        {/* Дополнительные элементы управления */}
        <div className="mu-full-overlay__extra">
          <div className="mu-full-overlay__volume">
            <VolumeIcon size={16} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="mu-full__volume-seek"
            />
          </div>
          
          <div className="mu-full-overlay__queue">
            <TrackRunningIcon size={16} active={true} />
            <span className="mu-full-overlay__queue-label">Очередь</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicFullScreen;