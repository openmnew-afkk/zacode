import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WatchOption } from '../types';
import { setPreferredPlayerId } from '../api/players';
import './VideoPlayer.css';

const LOAD_TIMEOUT_MS = 10000;

interface VideoPlayerProps {
  options: WatchOption[];
  loadingOptions?: boolean;
  onClose: () => void;
  title?: string;
  poster?: string;
  isSerial?: boolean;
  season?: number;
  episode?: number;
  maxEpisode?: number;
  onEpisodeChange?: (season: number, episode: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  loadingOptions = false,
  onClose,
  title,
  poster,
  isSerial = false,
  season = 1,
  episode = 1,
  maxEpisode = 1,
  onEpisodeChange,
}) => {
  const iframeOpts = options.filter((o) => o.type === 'iframe');
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [countdown, setCountdown] = useState(LOAD_TIMEOUT_MS / 1000);
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = iframeOpts[activeIdx] || iframeOpts[0] || null;

  useEffect(() => {
    if (activeIdx >= iframeOpts.length && iframeOpts.length > 0) {
      setActiveIdx(0);
    }
  }, [iframeOpts.length, activeIdx]);
  const canPrev = isSerial && episode > 1;
  const canNext = isSerial && episode < maxEpisode;

  const switchTo = useCallback((idx: number) => {
    setActiveIdx(idx);
    setLoaded(false);
    setShowSources(false);
    setCountdown(LOAD_TIMEOUT_MS / 1000);
  }, []);

  /* Запомнить выбор и сбросить загрузку при смене серии/URL */
  useEffect(() => {
    const opt = iframeOpts[activeIdx];
    if (opt) setPreferredPlayerId(opt.id);
    setLoaded(false);
    setCountdown(LOAD_TIMEOUT_MS / 1000);
  }, [active?.url]);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (loaded && !showSources) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), 3500);
    }
  }, [loaded, showSources]);

  /* Escape + body lock */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSources) setShowSources(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [onClose, showSources]);

  /* Авто-переключение при долгом ожидании */
  useEffect(() => {
    if (!active || loaded) return;
    setCountdown(LOAD_TIMEOUT_MS / 1000);
    const tick = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    const t = setTimeout(() => {
      if (activeIdx < iframeOpts.length - 1) {
        switchTo(activeIdx + 1);
      }
    }, LOAD_TIMEOUT_MS);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [activeIdx, loaded, active?.url]);

  useEffect(() => {
    if (loaded) bumpChrome();
  }, [loaded, bumpChrome]);

  useEffect(() => {
    if (showSources) setChromeVisible(true);
  }, [showSources]);

  const episodeLabel = isSerial ? `Сезон ${season} · Серия ${episode}` : null;

  return (
    <div
      className={`vp ${chromeVisible || !loaded ? 'vp--chrome' : 'vp--immersive'}`}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Плеер: ${title}` : 'Плеер'}
      tabIndex={-1}
      onPointerDown={bumpChrome}
    >
      {/* Шапка */}
      <header className="vp-bar">
        <button className="vp-bar__close" onClick={onClose} aria-label="Закрыть">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="vp-bar__meta">
          <span className="vp-bar__title">{title || 'Просмотр'}</span>
          {episodeLabel && <span className="vp-bar__ep">{episodeLabel}</span>}
        </div>
        <button
          className={`vp-bar__src ${showSources ? 'open' : ''}`}
          onClick={() => setShowSources((v) => !v)}
          aria-expanded={showSources}
          aria-haspopup="listbox"
        >
          <span className="vp-bar__src-dot" />
          {active?.label || 'Источник'}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Выбор источника */}
      {showSources && (
        <>
          <div className="vp-scrim" onClick={() => setShowSources(false)} aria-hidden />
          <div className="vp-sheet" role="listbox" aria-label="Источники">
            <div className="vp-sheet__handle" />
            <p className="vp-sheet__hint">Если не грузится — выбери другой источник</p>
            <div className="vp-sheet__list">
              {iframeOpts.map((opt, i) => (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`vp-sheet__item ${i === activeIdx ? 'active' : ''}`}
                  onClick={() => switchTo(i)}
                >
                  <span className="vp-sheet__flag">{opt.flag}</span>
                  <span className="vp-sheet__info">
                    <span className="vp-sheet__name">{opt.label}</span>
                    <span className="vp-sheet__sub">{opt.sublabel}</span>
                  </span>
                  {opt.quality && <span className="vp-sheet__q">{opt.quality}</span>}
                  {i === activeIdx && <span className="vp-sheet__check">✓</span>}
                </button>
              ))}
              {loadingOptions && iframeOpts.length === 0 && (
                <div className="vp-sheet__loading">Ищем источники…</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Кадр */}
      <div className="vp-frame">
        {!loaded && (
          <div className="vp-loading">
            {poster && (
              <img src={poster} alt="" className="vp-loading__poster" />
            )}
            <div className="vp-loading__veil" />
            <div className="vp-loading__content">
              <div className="vp-loading__spin" />
              <p className="vp-loading__title">
                {active ? `Загрузка · ${active.label}` : 'Подготовка…'}
              </p>
              {active && (
                <p className="vp-loading__hint">
                  Смена через {countdown} сек
                </p>
              )}
              <div className="vp-loading__actions">
                {activeIdx < iframeOpts.length - 1 && (
                  <button
                    className="vp-btn vp-btn--ghost"
                    onClick={() => switchTo(activeIdx + 1)}
                  >
                    Другой источник
                  </button>
                )}
                <button className="vp-btn vp-btn--solid" onClick={onClose}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {active ? (
          <iframe
            key={active.url}
            src={active.url}
            className="vp-iframe"
            style={{ opacity: loaded ? 1 : 0 }}
            title={title || 'Видео'}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          !loadingOptions && (
            <div className="vp-loading">
              <div className="vp-loading__content">
                <p className="vp-loading__title">Нет доступных источников</p>
                <button className="vp-btn vp-btn--solid" onClick={onClose}>
                  Назад
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Нижняя панель */}
      <footer className="vp-dock">
        {isSerial && onEpisodeChange && (
          <div className="vp-dock__eps">
            <button
              className="vp-dock__ep-btn"
              disabled={!canPrev}
              onClick={() => onEpisodeChange(season, episode - 1)}
              aria-label="Предыдущая серия"
            >
              ‹ Пред.
            </button>
            <span className="vp-dock__ep-label">
              С{season} · Е{episode}
            </span>
            <button
              className="vp-dock__ep-btn"
              disabled={!canNext}
              onClick={() => onEpisodeChange(season, episode + 1)}
              aria-label="Следующая серия"
            >
              След. ›
            </button>
          </div>
        )}

        <div className="vp-dock__chips" role="tablist" aria-label="Быстрый выбор">
          {iframeOpts.slice(0, 5).map((opt, i) => (
            <button
              key={opt.id}
              role="tab"
              aria-selected={i === activeIdx}
              className={`vp-chip ${i === activeIdx ? 'active' : ''}`}
              onClick={() => switchTo(i)}
            >
              {opt.label}
            </button>
          ))}
          {iframeOpts.length > 5 && (
            <button className="vp-chip vp-chip--more" onClick={() => setShowSources(true)}>
              Ещё
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default VideoPlayer;
