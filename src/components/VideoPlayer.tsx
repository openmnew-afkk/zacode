import React, { useState, useRef, useCallback, useEffect } from 'react';
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

  const [activeIdx, setActiveIdx] = useState(Math.min(initialIndex, Math.max(0, iframeOpts.length - 1)));
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [errored, setErrored] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const active = iframeOpts[activeIdx];

  // Сброс при смене источника
  const switchTo = useCallback((idx: number) => {
    haptic('light');
    setActiveIdx(idx);
    setLoaded(false);
    setErrored(false);
    setShowSources(false);
  }, [haptic]);

  const tryNext = useCallback(() => {
    if (activeIdx < iframeOpts.length - 1) {
      switchTo(activeIdx + 1);
    } else {
      setErrored(true);
      setShowSources(true);
    }
  }, [activeIdx, iframeOpts.length, switchTo]);

  // Блокируем скролл страницы пока плеер открыт
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="vp" role="dialog" aria-label="Видеоплеер">
      {/* ── Header ── */}
      <div className="vp-header">
        <button className="vp-header__close" onClick={onClose} aria-label="Закрыть">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 5l12 12M17 5L5 17" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="vp-header__title">{title || 'Плеер'}</span>
        <button
          className={`vp-header__sources ${showSources ? 'active' : ''}`}
          onClick={() => { haptic('light'); setShowSources(s => !s); }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* ── Iframe ── */}
      <div className="vp-frame-wrap">
        {!loaded && !errored && (
          <div className="vp-loading">
            <div className="vp-loading__spinner" />
            <p className="vp-loading__label">Загрузка плеера…</p>
            {active && <p className="vp-loading__src">{active.flag} {active.label}</p>}
          </div>
        )}

        {errored && (
          <div className="vp-error">
            <div className="vp-error__icon">📡</div>
            <p className="vp-error__title">Нет доступных источников</p>
            <p className="vp-error__sub">Попробуйте открыть на внешнем сайте</p>
          </div>
        )}

        {active && !errored && (
          <iframe
            ref={iframeRef}
            key={active.url}
            src={active.url}
            className="vp-frame"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => setLoaded(true)}
            onError={tryNext}
          />
        )}
      </div>

      {/* ── Панель выбора источника ── */}
      {showSources && (
        <div className="vp-sources">
          <div className="vp-sources__inner">
            <div className="vp-sources__section-label">Встроенный плеер</div>
            <div className="vp-sources__list">
              {iframeOpts.map((opt, i) => (
                <button
                  key={opt.id}
                  className={`vp-src-btn ${i === activeIdx ? 'active' : ''}`}
                  onClick={() => switchTo(i)}
                >
                  <span className="vp-src-btn__flag">{opt.flag}</span>
                  <span className="vp-src-btn__info">
                    <span className="vp-src-btn__name">{opt.label}</span>
                    <span className="vp-src-btn__sub">{opt.sublabel}</span>
                  </span>
                  {opt.quality && <span className="vp-src-btn__q">{opt.quality}</span>}
                  {i === activeIdx && (
                    <span className="vp-src-btn__check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {externalOpts.length > 0 && (
              <>
                <div className="vp-sources__section-label">Внешние сайты</div>
                <div className="vp-sources__list">
                  {externalOpts.map((opt) => (
                    <button
                      key={opt.id}
                      className="vp-src-btn vp-src-btn--ext"
                      onClick={() => {
                        haptic('medium');
                        openLink(opt.url);
                      }}
                    >
                      <span className="vp-src-btn__flag">{opt.flag}</span>
                      <span className="vp-src-btn__info">
                        <span className="vp-src-btn__name">{opt.label}</span>
                        <span className="vp-src-btn__sub">{opt.sublabel}</span>
                      </span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="vp-src-btn__ext-ico">
                        <path d="M3 11L11 3M11 3H6M11 3v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Нижние чипы источника (когда панель закрыта) ── */}
      {!showSources && iframeOpts.length > 1 && (
        <div className="vp-chips">
          {iframeOpts.slice(0, 5).map((opt, i) => (
            <button
              key={opt.id}
              className={`vp-chip ${i === activeIdx ? 'active' : ''}`}
              onClick={() => switchTo(i)}
            >
              {opt.flag} {opt.label}
            </button>
          ))}
          {iframeOpts.length > 5 && (
            <button
              className="vp-chip vp-chip--more"
              onClick={() => setShowSources(true)}
            >
              +{iframeOpts.length - 5}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;