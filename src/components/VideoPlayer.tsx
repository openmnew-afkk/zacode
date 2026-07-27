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

  // Автопропуск через 6 сек если не загрузился
  useEffect(() => {
    if (!active || loaded) return;
    const t = setTimeout(() => {
      if (!loaded && activeIdx < iframeOpts.length - 1) {
        switchTo(activeIdx + 1);
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [activeIdx, loaded, active?.url]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="vp">
      {/* ── Шапка с большим отступом от Telegram ── */}
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

      {/* ── Dropdown ── */}
      {showSources && (
        <>
          <div className="vp-overlay" onClick={() => setShowSources(false)} />
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
        </>
      )}

      {/* ── Iframe ── */}
      <div className="vp-frame">
        {!loaded && active && (
          <div className="vp-loading">
            <div className="vp-loading__spin" />
            <p>Загрузка · {active.label}</p>
            <p className="vp-loading__hint">Авто-переключение через 6 сек</p>
            <button className="vp-loading__skip" onClick={() => {
              if (activeIdx < iframeOpts.length - 1) switchTo(activeIdx + 1);
            }}>
              Следующий плеер →
            </button>
          </div>
        )}

        {active ? (
          <iframe
            key={active.url}
            src={active.url}
            className="vp-iframe"
            style={{ opacity: loaded ? 1 : 0 }}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div className="vp-loading">
            <p style={{fontSize:18}}>😕</p>
            <p>Нет доступных источников</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;