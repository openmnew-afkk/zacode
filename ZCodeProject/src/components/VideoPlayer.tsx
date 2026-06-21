import React from 'react';
import './VideoPlayer.css';

/* ===== Модальный видеоплеер ===== */

interface VideoPlayerProps {
  url: string;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onClose }) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="video-player-overlay" onClick={handleOverlayClick}>
      <div className="video-player">
        <button className="video-player__close" onClick={onClose} aria-label="Закрыть плеер">
          ✕
        </button>
        <iframe
          className="video-player__iframe"
          src={url}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          frameBorder="0"
          title="Видеоплеер"
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
