import React, { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

/* ===== Модальный видеоплеер с переключением источников ===== */

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
  const [activeUrl, setActiveUrl] = useState(url);
  const [activeLabel, setActiveLabel] = useState(sources[0]?.label || 'Плеер');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const allSources: PlayerSource[] = sources.length > 0
    ? sources
    : [{ label: 'Плеер', url, type: 'embed' }];

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [activeUrl]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSource = (src: PlayerSource) => {
    setActiveUrl(src.url);
    setActiveLabel(src.label);
  };

  return (
    <div className="vp-overlay" onClick={handleOverlayClick}>
      <div className="vp-modal">
        {/* Header */}
        <div className="vp-header">
          {title && <span className="vp-title">{title}</span>}
          <button className="vp-close" onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Player area */}
        <div className="vp-player-wrap">
          {loading && (
            <div className="vp-loading">
              <div className="vp-spinner" />
              <p>Загрузка плеера…</p>
            </div>
          )}
          {error ? (
            <div className="vp-error">
              <span>⚠️</span>
              <p>Источник недоступен. Попробуйте другой.</p>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              className="vp-iframe"
              src={activeUrl}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title={title || 'Плеер'}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          )}
        </div>

        {/* Source switcher */}
        {allSources.length > 1 && (
          <div className="vp-sources">
            <span className="vp-sources__label">Источники:</span>
            <div className="vp-sources__list">
              {allSources.map((src) => (
                <button
                  key={src.url}
                  className={`vp-source-btn ${src.url === activeUrl ? 'active' : ''}`}
                  onClick={() => handleSource(src)}
                >
                  {src.url === activeUrl ? '▶ ' : ''}{src.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current source info */}
        <div className="vp-footer">
          <span className="vp-current-src">🎬 {activeLabel}</span>
          <span className="vp-hint">Если не загружается — смените источник выше</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
