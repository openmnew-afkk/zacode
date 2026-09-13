import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, PauseIcon, NextIcon, PrevIcon, ShuffleIcon, RepeatIcon, 
  HeartIcon, MusicNoteIcon, ChevronDownIcon, VolumeIcon, TrackRunningIcon
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

interface MusicPlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  likedTracks: Track[];
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (position: number) => void;
  onToggleLike: (track: Track) => void;
  onExpand: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  shuffleOn: boolean;
  repeatOn: boolean;
}

const formatTime = (seconds: number) => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  progress,
  duration,
  likedTracks,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onToggleLike,
  onExpand,
  onShuffle,
  onRepeat,
  shuffleOn,
  repeatOn
}) => {
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Плавное появление
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!currentTrack) return null;

  const isLiked = likedTracks.some(t => t.id === currentTrack.id);
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className={`music-bar ${visible ? 'music-bar--visible' : ''}`} ref={barRef}>
      {/* Фоновой градиент */}
      <div className="music-bar__bg" />
      
      {/* Полоска прогресса */}
      <div className="music-bar__progress-container">
        <div 
          className="music-bar__progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <div className="music-bar__content">
        {/* Артворк и информация */}
        <div className="music-bar__track" onClick={onExpand}>
          <div className="music-bar__art">
            {currentTrack.artwork ? (
              <img src={currentTrack.artwork} alt={currentTrack.title} />
            ) : (
              <MusicNoteIcon size={24} />
            )}
          </div>
          <div className="music-bar__info">
            <div className="music-bar__title">{currentTrack.title}</div>
            <div className="music-bar__artist">{currentTrack.artist}</div>
          </div>
        </div>

        {/* Управляющие кнопки */}
        <div className="music-bar__controls">
          <button 
            className={`music-bar__btn ${shuffleOn ? 'active' : ''}`}
            onClick={onShuffle}
            aria-label="Shuffle"
          >
            <ShuffleIcon size={18} active={shuffleOn} />
          </button>
          
          <button 
            className="music-bar__btn music-bar__btn--prev"
            onClick={onPrev}
            aria-label="Previous"
          >
            <PrevIcon size={20} />
          </button>
          
          <button 
            className="music-bar__btn music-bar__btn--play"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} active={!isPlaying} />}
          </button>
          
          <button 
            className="music-bar__btn music-bar__btn--next"
            onClick={onNext}
            aria-label="Next"
          >
            <NextIcon size={20} />
          </button>
          
          <button 
            className={`music-bar__btn ${isLiked ? 'active' : ''}`}
            onClick={() => onToggleLike(currentTrack)}
            aria-label="Like"
          >
            <HeartIcon size={18} filled={isLiked} />
          </button>
        </div>

        {/* Кнопка разворачивания */}
        <button 
          className="music-bar__expand"
          onClick={onExpand}
          aria-label="Expand"
        >
          <VolumeIcon size={18} />
          <ChevronDownIcon size={14} />
        </button>
      </div>
    </div>
  );
};

export default MusicPlayerBar;