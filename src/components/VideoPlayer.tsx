import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WatchOption } from '../types';
import './VideoPlayer.css';

const LOAD_TIMEOUT_MS = 12000;
const DUB_PREF_KEY = 'tc_dub_pref';

/** Запомнить выбранную озвучку */
const savePreferredDub = (label: string) => {
  try { localStorage.setItem(DUB_PREF_KEY, label); } catch {}
};

/** Получить запомненную озвучку */
const getPreferredDub = (): string => {
  try { return localStorage.getItem(DUB_PREF_KEY) || ''; } catch { return ''; }
};

export type PlayerMode = 'compact' | 'fullscreen';

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
  /** По умолчанию компактный — встроен в страницу */
  initialMode?: PlayerMode;
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
  initialMode = 'compact',
}) => {
  const iframeOpts = options.filter((o) => o.type === 'iframe');
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [countdown, setCountdown] = useState(LOAD_TIMEOUT_MS / 1000);
  const [mode, setMode] = useState<PlayerMode>(initialMode);
  const frameRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = iframeOpts[activeIdx] || iframeOpts[0] || null;
  const canPrev = isSerial && episode > 1;
  const canNext = isSerial && episode < maxEpisode;
  const isFs = mode === 'fullscreen';

  /* Группировка: озвучки Kodik отдельно от остальных плееров */
  const dubs = iframeOpts.filter((o) => o.provider === 'Kodik');
  const others = iframeOpts.filter((o) => o.provider !== 'Kodik');

  useEffect(() => {
    if (activeIdx >= iframeOpts.length && iframeOpts.length > 0) {
      setActiveIdx(0);
    }
  }, [iframeOpts.length, activeIdx]);

  const switchTo = useCallback((idx: number) => {
    // Запоминаем выбор озвучки — применим при смене серий
    const opt = iframeOpts[idx];
    if (opt?.provider === 'Kodik' && opt.label) savePreferredDub(opt.label);
    setActiveIdx(idx);
    setLoaded(false);
    setShowSources(false);
    setCountdown(LOAD_TIMEOUT_MS / 1000);
  }, [iframeOpts]);

  /* При смене серии/сезона восстанавливаем запомненную озвучку */
  useEffect(() => {
    if (iframeOpts.length === 0) return;
    const pref = getPreferredDub();
    if (!pref) return;
    const idx = iframeOpts.findIndex((o) => o.label === pref);
    if (idx > 0) {
      setActiveIdx(idx);
      setLoaded(false);
      setCountdown(LOAD_TIMEOUT_MS / 1000);
    }
  }, [iframeOpts]);

  useEffect(() => {
    setLoaded(false);
    setCountdown(LOAD_TIMEOUT_MS / 1000);
  }, [active?.url]);

  /* Блокируем скролл только в fullscreen */
  useEffect(() => {
    if (!isFs) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSources) setShowSources(false);
        else setMode('compact');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isFs, showSources]);

  /* Авто-смена источника */
  useEffect(() => {
    if (!active || loaded) return;
    setCountdown(LOAD_TIMEOUT_MS / 1000);
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const t = setTimeout(() => {
      if (activeIdx < iframeOpts.length - 1) switchTo(activeIdx + 1);
    }, LOAD_TIMEOUT_MS);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [activeIdx, loaded, active?.url]);

  const enterNativeFs = async () => {
    setMode('fullscreen');
    const el = frameRef.current;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else if ((el as any)?.webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
    } catch {
      /* Telegram WebView может не уметь — остаёмся в CSS fullscreen */
    }
  };

  const exitFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* ignore */ }
    setMode('compact');
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && mode === 'fullscreen') {
        /* остаёмся в css-fullscreen — не сбрасываем автоматически */
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [mode]);

  const episodeLabel = isSerial ? `С${season} · Е${episode}` : null;

  const controls = (
    <>
      {/* Кнопки серий показываем только когда известно количество серий */}
      {isSerial && onEpisodeChange && maxEpisode > 1 && (
        <div className="vp-dock__eps">
          <button
            className="vp-dock__ep-btn"
            disabled={!canPrev}
            onClick={() => onEpisodeChange(season, episode - 1)}
          >
            ‹ Пред.
          </button>
          <span className="vp-dock__ep-label">{episodeLabel}</span>
          <button
            className="vp-dock__ep-btn"
            disabled={!canNext}
            onClick={() => onEpisodeChange(season, episode + 1)}
          >
            След. ›
          </button>
        </div>
      )}

      <div className="vp-dock__chips" role="tablist" aria-label="Источники">
        {iframeOpts.slice(0, 5).map((opt, i) => (
          <button
            key={opt.id}
            role="tab"
            aria-selected={i === activeIdx}
            className={`vp-chip ${i === activeIdx ? 'active' : ''}`}
            onClick={() => switchTo(i)}
          >
            <span className="vp-chip__flag">{opt.flag}</span> {opt.label}
          </button>
        ))}
        {iframeOpts.length > 5 && (
          <button className="vp-chip vp-chip--more" onClick={() => setShowSources(true)}>
            Ещё {iframeOpts.length - 5}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`vp ${isFs ? 'vp--fs' : 'vp--compact'}`}
      ref={rootRef}
      role="region"
      aria-label={title ? `Плеер: ${title}` : 'Плеер'}
    >
      <header className="vp-bar">
        <button
          className="vp-bar__close"
          onClick={isFs ? () => void exitFs() : onClose}
          aria-label={isFs ? 'Свернуть' : 'Закрыть'}
        >
          {isFs ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9h10M4 9l3-3M4 9l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        <div className="vp-bar__meta">
          <span className="vp-bar__title">{title || 'Просмотр'}</span>
          {episodeLabel && <span className="vp-bar__ep">{episodeLabel}</span>}
        </div>

        <button
          className={`vp-bar__src ${showSources ? 'open' : ''}`}
          onClick={() => setShowSources((v) => !v)}
        >
          <span className="vp-bar__src-dot" />
          <span className="vp-bar__src-text">{active?.label || 'Источник'}</span>
        </button>

        {isFs ? (
          <button className="vp-bar__fs" onClick={() => void exitFs()} aria-label="Компактный">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6 3H3v3M12 3h3v3M6 15H3v-3M12 15h3v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        ) : (
          <button className="vp-bar__fs" onClick={() => void enterNativeFs()} aria-label="На весь экран">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 6V3h3M12 3h3v3M3 12v3h3M15 12v3h-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </header>

       {showSources && (
         <>
           <div className="vp-scrim" onClick={() => setShowSources(false)} aria-hidden />
           <div className="vp-sheet" role="listbox" aria-label="Источники">
             <div className="vp-sheet__handle" />
             <p className="vp-sheet__hint">
               Найдено источников: {iframeOpts.length} · Промотка и громкость — внутри плеера
             </p>
             <div className="vp-sheet__list">
               {/* Озвучки (Kodik API) */}
               {dubs.length > 0 && (
                 <>
                   <p className="vp-sheet__group-title">🎙️ Русские озвучки</p>
                   {dubs.map((opt) => {
                     const i = iframeOpts.indexOf(opt);
                     return (
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
                     );
                   })}
                 </>
               )}
               {/* Остальные плееры */}
               {others.length > 0 && (
                 <>
                   <p className="vp-sheet__group-title">📺 Плееры</p>
                   {others.map((opt) => {
                     const i = iframeOpts.indexOf(opt);
                     return (
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
                     );
                   })}
                 </>
               )}
             </div>
           </div>
         </>
       )}

      {/* Видео-кадр — без наших панелей поверх, чтобы работали seek/fullscreen внутри iframe */}
      <div className="vp-frame" ref={frameRef}>
        {/* Оверлей загрузки новых источников при смене серии */}
        {loadingOptions && (
          <div className="vp-loading vp-loading--overlay">
            <div className="vp-loading__content">
              <div className="vp-loading__spin" />
              <p className="vp-loading__title">Ищем озвучки…</p>
            </div>
          </div>
        )}

        {!loaded && (
          <div className="vp-loading">
            {poster && <img src={poster} alt="" className="vp-loading__poster" />}
            <div className="vp-loading__veil" />
            <div className="vp-loading__content">
              <div className="vp-loading__spin" />
              <p className="vp-loading__title">
                {active ? `Загрузка · ${active.label}` : 'Подготовка…'}
              </p>
              {active && <p className="vp-loading__hint">Смена через {countdown} сек</p>}
              <div className="vp-loading__actions">
                {activeIdx < iframeOpts.length - 1 && (
                  <button className="vp-btn vp-btn--ghost" onClick={() => switchTo(activeIdx + 1)}>
                    Другой источник
                  </button>
                )}
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
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
            referrerPolicy="origin"
            onLoad={() => setLoaded(true)}
          />
        ) : (
          !loadingOptions && (
            <div className="vp-loading">
              <div className="vp-loading__content">
                <p className="vp-loading__title">Нет источников</p>
                <button className="vp-btn vp-btn--solid" onClick={onClose}>Закрыть</button>
              </div>
            </div>
          )
        )}
      </div>

      <footer className="vp-dock">
        <p className="vp-dock__tip">
          {isFs
            ? 'Управление видео — в плеере · «Свернуть» сверху'
            : 'Жми ▣ чтобы на весь экран · перемотка внутри плеера'}
        </p>
        {controls}
      </footer>
    </div>
  );
};

export default VideoPlayer;
