import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WatchOption } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import './VideoPlayer.css';

interface VideoPlayerProps {
  options: WatchOption[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
  poster?: string;
}

const LOAD_TIMEOUT_MS = 10000;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  initialIndex = 0,
  onClose,
  title,
  poster,
}) => {
  const { haptic, openLink } = useTelegram();

  const iframeOpts = options.filter((o) => o.type === 'iframe');
  const externalOpts = options.filter((o) => o.type !== 'iframe');

  const startIdx = Math.min(initialIndex, Math.max(0, iframeOpts.length - 1));
  const [activeIdx, setActiveIdx] = useState(startIdx);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [showSites, setShowSites] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = iframeOpts[activeIdx];

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const tryNext = useCallback(() => {
    clearTimer();
    if (activeIdx < iframeOpts.length - 1) {
      setActiveIdx((i) => i + 1);
      setPhase('loading');
    } else {
      setPhase('failed');
      setShowSites(true);
    }
  }, [activeIdx, iframeOpts.length, clearTimer]);

  useEffect(() => {
    if (!active || showSites) return;
    setPhase('loading');
    clearTimer();
    const id = setTimeout(tryNext, LOAD_TIMEOUT_MS);
    timerRef.current = id;
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.url, showSites]);

  const handleLoad = () => { clearTimer(); setPhase('ready'); };

  const selectSource = (idx: number) => {
    if (idx === activeIdx) return;
    haptic('medium');
    setActiveIdx(idx);
    setPhase('loading');
  };

  const openExternal = (opt: WatchOption) => {
    haptic('medium');
    openLink(opt.url);
  };

  const hasSites = externalOpts.length > 0;

  if (options.length === 0) {
    return (
      <div className="vp-root">
        <button className="vp-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="vp-loading" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <p style={{ fontSize: 40 }}>😕</p>
          <p className="vp-loading__src">Нет доступных плееров</p>
          <button className="vp-loading__skip" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vp-root">
      <button className="vp-close" onClick={onClose} aria-label="Закрыть">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>

      {hasSites && (
        <button
          className={`vp-sites-toggle ${showSites ? 'vp-sites-toggle--active' : ''}`}
          onClick={() => { haptic('light'); setShowSites((s) => !s); }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 1.5C9 1.5 6 5 6 9s3 7.5 3 7.5M9 1.5C9 1.5 12 5 12 9s-3 7.5-3 7.5M1.5 9h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Сайты</span>
        </button>
      )}

      {/* Iframe */}
      {!showSites && active && (
        <>
          {poster && phase !== 'ready' && (
            <div className="vp-bg" style={{ backgroundImage: `url(${poster})` }} />
          )}

          {phase === 'loading' && (
            <div className="vp-loading">
              <div className="vp-loading__ring" />
              <p className="vp-loading__src">{active.flag || '🌐'} {active.provider}</p>
              <p className="vp-loading__label">Загрузка плеера...</p>
              {activeIdx < iframeOpts.length - 1 && (
                <button className="vp-loading__skip" onClick={tryNext}>Следующий →</button>
              )}
            </div>
          )}

          {phase === 'failed' && (
            <div className="vp-loading">
              <p style={{ fontSize: 40 }}>😕</p>
              <p className="vp-loading__src">Плеер не отвечает</p>
              <button className="vp-loading__skip" onClick={() => setShowSites(true)}>Открыть на сайте →</button>
            </div>
          )}

          <iframe
            key={active.url}
            className={`vp-iframe ${phase === 'ready' ? 'vp-iframe--visible' : ''}`}
            src={active.url}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            title={title}
            onLoad={handleLoad}
          />
        </>
      )}

      {/* Сайты */}
      {showSites && (
        <div className="vp-sites">
          <p className="vp-sites__title">Где смотреть</p>
          <p className="vp-sites__sub">Откроется в Telegram / браузере</p>
          <div className="vp-sites__list">
            {options.map((opt) => (
              <button key={opt.id} className="vp-site-item" onClick={() => openExternal(opt)}>
                <span className="vp-site-item__icon">{opt.flag}</span>
                <div className="vp-site-item__info">
                  <span className="vp-site-item__name">{opt.label}</span>
                  <span className="vp-site-item__sub">{opt.sublabel}</span>
                </div>
                <span className="vp-site-item__arrow">→</span>
              </button>
            ))}
          </div>
          {iframeOpts.length > 0 && (
            <button className="vp-sites__back" onClick={() => setShowSites(false)}>← Вернуться к плееру</button>
          )}
        </div>
      )}

      {/* Чипы источников */}
      {!showSites && iframeOpts.length > 1 && (
        <div className="vp-dubs">
          <div className="vp-dubs__chips">
            {iframeOpts.map((opt, i) => (
              <button
                key={opt.id}
                className={`vp-chip ${i === activeIdx ? 'vp-chip--active' : ''}`}
                onClick={() => selectSource(i)}
              >
                <span>{opt.flag || '🌐'}</span>
                <span className="vp-chip__name">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="vp-title-bar">
        <span className="vp-title-bar__text">{title}</span>
      </div>
    </div>
  );
};

export default VideoPlayer;