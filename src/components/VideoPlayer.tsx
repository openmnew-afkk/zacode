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
  const allOpts = options;
  const iframeOpts = allOpts.filter(o => o.type === 'iframe');
  const linkOpts = allOpts.filter(o => o.type === 'external');

  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const active = iframeOpts[activeIdx] || null;

  const switchTo = (idx: number) => {
    setActiveIdx(idx);
    setLoaded(false);
    setIframeError(false);
    setShowSources(false);
  };

  // Автоматически пробуем следующий если не загрузился за 12с
  useEffect(() => {
    if (!active) return;
    setIframeError(false);
    const timeout = setTimeout(() => {
      if (!loaded && activeIdx < iframeOpts.length - 1) {
        setActiveIdx(prev => prev + 1);
        setLoaded(false);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [activeIdx, active?.url]);

  // Блокируем скролл body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const openLink = (url: string) => {
    // Используем Telegram openLink если доступен
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div className="vp">
      {/* ── Шапка ── */}
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

      {/* ── Dropdown источников ── */}
      {showSources && (
        <div className="vp-dropdown" onClick={() => setShowSources(false)}>
          <div className="vp-dropdown__scroll" onClick={e => e.stopPropagation()}>
            {/* Iframe источники */}
            {iframeOpts.length > 0 && (
              <div className="vp-dropdown__group">
                <span className="vp-dropdown__group-title">📺 Плееры</span>
              </div>
            )}
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

            {/* Link источники (Rutube и т.д.) */}
            {linkOpts.length > 0 && (
              <>
                <div className="vp-dropdown__group">
                  <span className="vp-dropdown__group-title">🇷🇺 Русские сервисы</span>
                </div>
                {linkOpts.map((opt) => (
                  <button
                    key={opt.id}
                    className="vp-dropdown__item vp-dropdown__item--link"
                    onClick={() => openLink(opt.url)}
                  >
                    <span className="vp-dropdown__flag">{opt.flag}</span>
                    <div className="vp-dropdown__info">
                      <span className="vp-dropdown__name">{opt.label}</span>
                      <span className="vp-dropdown__sub">{opt.sublabel}</span>
                    </div>
                    <span className="vp-dropdown__arrow">↗</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Iframe ── */}
      <div className="vp-frame">
        {!loaded && active && (
          <div className="vp-loading">
            <div className="vp-loading__spin" />
            <p>Загрузка · {active.label}</p>
            <p className="vp-loading__hint">
              Не грузится? Нажмите ▾ для смены плеера
            </p>
          </div>
        )}

        {active ? (
          <iframe
            key={active.url}
            src={active.url}
            className="vp-iframe"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setIframeError(true)}
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