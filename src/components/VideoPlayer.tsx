import React, { useState, useEffect } from 'react';
import type { WatchOption } from '../types';
import './VideoPlayer.css';

interface VideoPlayerProps {
  options: WatchOption[];
  loadingOptions?: boolean;
  onClose: () => void;
  title?: string;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  loadingOptions = false,
  onClose,
  title,
}) => {
  const iframeOpts = options.filter(o => o.type === 'iframe');
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const active = iframeOpts[activeIdx] || null;

  const switchTo = (idx: number) => {
    setActiveIdx(idx);
    setLoaded(false);
    setShowSources(false);
  };

  // Блокируем скролл body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="vp">
      {/* ── Минимальная шапка ── */}
      <div className="vp-bar">
        <button className="vp-bar__close" onClick={onClose}>✕</button>
        <span className="vp-bar__title">{title || 'Плеер'}</span>
        <button
          className={`vp-bar__src-btn ${showSources ? 'open' : ''}`}
          onClick={() => setShowSources(!showSources)}
        >
          {active ? `${active.flag} ${active.label}` : '📺'}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Выпадающий список источников ── */}
      {showSources && (
        <div className="vp-dropdown">
          <div className="vp-dropdown__scroll">
            {iframeOpts.map((opt, i) => (
              <button
                key={opt.id}
                className={`vp-dropdown__item ${i === activeIdx ? 'active' : ''}`}
                onClick={() => switchTo(i)}
              >
                <span className="vp-dropdown__flag">{opt.flag}</span>
                <div className="vp-dropdown__info">
                  <span className="vp-dropdown__name">{opt.label}</span>
                  <span className="vp-dropdown__sub">{opt.sublabel}</span>
                </div>
                {i === activeIdx && <span className="vp-dropdown__check">✓</span>}
              </button>
            ))}
            {loadingOptions && iframeOpts.length === 0 && (
              <div className="vp-dropdown__loading">Поиск источников…</div>
            )}
          </div>
        </div>
      )}

      {/* ── Iframe на всё пространство ── */}
      <div className="vp-frame">
        {!loaded && (
          <div className="vp-loading">
            <div className="vp-loading__spin" />
            <p>Загрузка{active ? ` · ${active.label}` : ''}…</p>
          </div>
        )}

        {active ? (
          <iframe
            key={active.url}
            src={active.url.startsWith('//') ? `https:${active.url}` : active.url}
            className="vp-iframe"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div className="vp-loading">
            <p>🔌 Нет доступных источников</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;