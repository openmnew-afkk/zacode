import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WatchOption } from '../api/players';
import { useTelegram } from '../hooks/useTelegram';
import './VideoPlayer.css';

interface VideoPlayerProps {
  options: WatchOption[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
  poster?: string;
}

const LOAD_TIMEOUT_MS = 14000;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  initialIndex = 0,
  onClose,
  title,
  poster,
}) => {
  const { haptic, openLink } = useTelegram();
  const iframeOptions = options.filter((o) => o.type === 'iframe');
  const externalOptions = options.filter((o) => o.type !== 'iframe');

  const [activeIdx, setActiveIdx] = useState(Math.min(initialIndex, Math.max(0, iframeOptions.length - 1)));
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [showPicker, setShowPicker] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSource = iframeOptions[activeIdx];

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const tryNext = useCallback(() => {
    clearTimer();
    if (activeIdx < iframeOptions.length - 1) {
      setActiveIdx((i) => i + 1);
      setPhase('loading');
    } else {
      setPhase('failed');
      setShowSites(true);
    }
  }, [activeIdx, iframeOptions.length, clearTimer]);

  useEffect(() => {
    if (!activeSource || showSites) return;
    setPhase('loading');
    clearTimer();
    timerRef.current = setTimeout(tryNext, LOAD_TIMEOUT_MS);
    return clearTimer;
  }, [activeSource?.url, showSites]);

  const handleLoad = () => {
    clearTimer();
    setPhase('ready');
  };

  const selectSource = (idx: number) => {
    haptic('medium');
    setActiveIdx(idx);
    setPhase('loading');
    setShowPicker(false);
    setShowSites(false);
  };

  const openExternal = (opt: WatchOption) => {
    haptic('medium');
    openLink(opt.url);
  };

  // Если только внешние
  if (iframeOptions.length === 0) {
    return (
      <div className="vp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="vp-modal vp-modal--sites">
          <div className="vp-header">
            <button className="vp-close" onClick={onClose} aria-label="Закрыть">✕</button>
            <span className="vp-header__title">{title}</span>
          </div>
          <div className="vp-sites-panel">
            <p className="vp-sites-panel__hint">Откройте фильм на одной из площадок</p>
            <div className="vp-sites-list">
              {externalOptions.map((opt) => (
                <button key={opt.id} className="vp-site-row" onClick={() => openExternal(opt)}>
                  <span className="vp-site-row__flag">{opt.flag}</span>
                  <div className="vp-site-row__text">
                    <span className="vp-site-row__name">{opt.label}</span>
                    <span className="vp-site-row__sub">{opt.sublabel}</span>
                  </div>
                  <span className="vp-site-row__arrow">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vp-modal">

        {/* Header */}
        <div className="vp-header">
          <button className="vp-close" onClick={onClose} aria-label="Закрыть">✕</button>
          <span className="vp-header__title" title={title}>{title}</span>
          <button
            className="vp-sites-btn"
            onClick={() => { haptic('light'); setShowSites((s) => !s); setShowPicker(false); }}
          >
            🌐
          </button>
        </div>

        {/* Iframe stage */}
        {!showSites && (
          <div className="vp-stage">
            {poster && phase !== 'ready' && (
              <div className="vp-stage__bg" style={{ backgroundImage: `url(${poster})` }} />
            )}
            {phase === 'loading' && (
              <div className="vp-stage__overlay">
                <div className="vp-spinner" />
                <p className="vp-stage__label">
                  {activeSource?.flag} {activeSource?.provider}
                  {activeSource?.label !== activeSource?.provider ? ` · ${activeSource?.label}` : ''}
                </p>
                <p className="vp-stage__sub">Загрузка плеера…</p>
              </div>
            )}
            {phase === 'failed' && (
              <div className="vp-stage__overlay">
                <p className="vp-stage__fail-icon">😕</p>
                <p className="vp-stage__label">Плеер не отвечает</p>
                <button className="vp-stage__sites-btn" onClick={() => setShowSites(true)}>
                  Открыть на сайте →
                </button>
              </div>
            )}
            {activeSource && (
              <iframe
                key={activeSource.url}
                className={`vp-iframe ${phase === 'ready' ? 'vp-iframe--visible' : ''}`}
                src={activeSource.url}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                title={title}
                onLoad={handleLoad}
              />
            )}
          </div>
        )}

        {/* Sites panel */}
        {showSites && (
          <div className="vp-sites-panel">
            <p className="vp-sites-panel__hint">Откройте на одной из площадок</p>
            <div className="vp-sites-list">
              {externalOptions.map((opt) => (
                <button key={opt.id} className="vp-site-row" onClick={() => openExternal(opt)}>
                  <span className="vp-site-row__flag">{opt.flag}</span>
                  <div className="vp-site-row__text">
                    <span className="vp-site-row__name">{opt.label}</span>
                    <span className="vp-site-row__sub">{opt.sublabel}</span>
                  </div>
                  <span className="vp-site-row__arrow">›</span>
                </button>
              ))}
            </div>
            <button className="vp-sites-panel__back" onClick={() => setShowSites(false)}>
              ← Назад к плееру
            </button>
          </div>
        )}

        {/* Dubbing picker — красивые чипы снизу */}
        {!showSites && iframeOptions.length > 1 && (
          <div className="vp-dubs">
            <p className="vp-dubs__label">Озвучка:</p>
            <div className="vp-dubs__row">
              {iframeOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  className={`vp-dub-chip ${i === activeIdx ? 'vp-dub-chip--active' : ''}`}
                  onClick={() => selectSource(i)}
                >
                  <span className="vp-dub-chip__flag">{opt.flag || (opt.lang === 'ru' ? '🇷🇺' : '🌐')}</span>
                  <span className="vp-dub-chip__name">{opt.label}</span>
                  {opt.sublabel && <span className="vp-dub-chip__sub">{opt.sublabel}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
