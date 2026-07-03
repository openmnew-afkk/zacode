import React, { useState, useEffect } from 'react';
import './VideoPlayer.css';

/* ===== Модальный видеоплеер — авто-переключение источников ===== */

export interface PlayerSource {
  label: string;
  url: string;
  type: string;
}

interface VideoPlayerProps {
  url: string;
  sources?: PlayerSource[];
  onClose: () => void;
  title?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, sources = [], onClose, title }) => {
  const allSources: PlayerSource[] = sources.length > 0
    ? sources
    : [{ label: 'Плеер', url, type: 'embed' }];

  const [srcIndex, setSrcIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(false);

  const activeSource = allSources[srcIndex];

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [srcIndex]);

  // Авто-переключение на следующий источник при ошибке
  const handleError = () => {
    setLoading(false);
    if (srcIndex < allSources.length - 1) {
      setAutoSwitched(true);
      setTimeout(() => {
        setSrcIndex((i) => i + 1);
        setAutoSwitched(false);
      }, 1200);
    } else {
      setError(true);
    }
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const nextSource = () => {
    if (srcIndex < allSources.length - 1) setSrcIndex((i) => i + 1);
    else setSrcIndex(0);
  };

  return (
    <div className="vp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vp-modal">

        {/* Header */}
        <div className="vp-header">
          <span className="vp-title">{title || 'Просмотр'}</span>
          <button className="vp-close" onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Player */}
        <div className="vp-player-wrap">
          {(loading || autoSwitched) && (
            <div className="vp-loading">
              <div className="vp-spinner" />
              <p>{autoSwitched ? `Переключаем на ${allSources[srcIndex + 1]?.label}…` : 'Загрузка плеера…'}</p>
            </div>
          )}
          {error ? (
            <div className="vp-error">
              <span>😕</span>
              <p>Все источники недоступны</p>
              <button className="vp-error-btn" onClick={() => { setSrcIndex(0); setError(false); }}>
                Попробовать снова
              </button>
            </div>
          ) : (
            <iframe
              key={activeSource.url}
              className="vp-iframe"
              src={activeSource.url}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title={title || 'Плеер'}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </div>

        {/* Source switcher */}
        {allSources.length > 1 && (
          <div className="vp-sources">
            <span className="vp-sources__label">Источник:</span>
            <div className="vp-sources__list">
              {allSources.map((src, i) => (
                <button
                  key={src.url}
                  className={`vp-source-btn ${i === srcIndex ? 'active' : ''}`}
                  onClick={() => setSrcIndex(i)}
                >
                  {i === srcIndex && '▶ '}{src.label}
                </button>
              ))}
            </div>
            {srcIndex < allSources.length - 1 && (
              <button className="vp-next-btn" onClick={nextSource}>
                Следующий →
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="vp-footer">
          <span className="vp-current-src">🎬 {activeSource.label}</span>
          <span className="vp-hint">
            {srcIndex + 1} из {allSources.length} · Если не грузит — смените источник
          </span>
        </div>

      </div>
    </div>
  );
};

export default VideoPlayer;
