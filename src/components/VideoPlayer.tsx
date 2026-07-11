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

const LOAD_TIMEOUT_MS = 12000;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  initialIndex = 0,
  onClose,
  title,
  poster,
}) => {
  const { haptic, openLink } = useTelegram();

  const iframeOpts  = options.filter((o) => o.type === 'iframe');
  const externalOpts = options.filter((o) => o.type !== 'iframe');

  const [activeIdx, setActiveIdx] = useState(
    Math.min(initialIndex, Math.max(0, iframeOpts.length - 1))
  );
  const [phase, setPhase]       = useState<'loading' | 'ready' | 'failed'>('loading');
  const [showSites, setShowSites] = useState(false);
  const [showDubs, setShowDubs]   = useState(true);
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
    timerRef.current = setTimeout(tryNext, LOAD_TIMEOUT_MS);
    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.url, showSites]);

  const handleLoad = () => { clearTimer(); setPhase('ready'); };

  const selectDub = (idx: number) => {
    if (idx === activeIdx) return;
    haptic('medium');
    setActiveIdx(idx);
    setPhase('loading');
    setShowSites(false);
  };

  // Открываем ссылку через Telegram (встроенный браузер)
  const openInTelegram = (opt: WatchOption) => {
    haptic('medium');
    openLink(opt.url);
  };

  // Если нет iframe-источников — сразу показываем площадки
  const hasSites = externalOpts.length > 0;

  return (
    <div className="vp-root">
      {/* Кнопка закрыть */}
      <button className="vp-close" onClick={onClose} aria-label="Закрыть">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Кнопка сайты */}
      {hasSites && (
        <button
          className={`vp-sites-toggle ${showSites ? 'vp-sites-toggle--active' : ''}`}
          onClick={() => { haptic('light'); setShowSites((s) => !s); }}
          aria-label="Где смотреть"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 1.5C9 1.5 6 5 6 9s3 7.5 3 7.5M9 1.5C9 1.5 12 5 12 9s-3 7.5-3 7.5M1.5 9h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Сайты</span>
        </button>
      )}

      {/* Iframe плеер — занимает весь экран */}
      {!showSites && active && (
        <>
          {/* Постер-фон пока грузится */}
          {poster && phase !== 'ready' && (
            <div className="vp-bg" style={{ backgroundImage: `url(${poster})` }} />
          )}

          {/* Оверлей загрузки */}
          {phase === 'loading' && (
            <div className="vp-loading">
              <div className="vp-loading__ring" />
              <p className="vp-loading__src">
                {active.flag || (active.lang === 'ru' ? '🇷🇺' : '🌐')} {active.provider}
              </p>
              <p className="vp-loading__label">Загружаем плеер…</p>
              {activeIdx < iframeOpts.length - 1 && (
                <button className="vp-loading__skip" onClick={tryNext}>
                  Следующий источник →
                </button>
              )}
            </div>
          )}

          {/* Сбой */}
          {phase === 'failed' && (
            <div className="vp-loading">
              <p style={{ fontSize: 40 }}>😕</p>
              <p className="vp-loading__src">Плеер не отвечает</p>
              <button className="vp-loading__skip" onClick={() => setShowSites(true)}>
                Открыть на сайте →
              </button>
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

      {/* Сайты — открытие через Telegram */}
      {showSites && (
        <div className="vp-sites">
          <p className="vp-sites__title">Где смотреть</p>
          <p className="vp-sites__sub">Откроется в Telegram — не покидая приложение</p>
          <div className="vp-sites__list">
            {externalOpts.map((opt) => (
              <button key={opt.id} className="vp-site-item" onClick={() => openInTelegram(opt)}>
                <span className="vp-site-item__icon">{opt.flag}</span>
                <div className="vp-site-item__info">
                  <span className="vp-site-item__name">{opt.label}</span>
                  <span className="vp-site-item__sub">{opt.sublabel}</span>
                </div>
                <span className="vp-site-item__arrow">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>
            ))}
          </div>
          {iframeOpts.length > 0 && (
            <button className="vp-sites__back" onClick={() => setShowSites(false)}>
              ← Вернуться к плееру
            </button>
          )}
        </div>
      )}

      {/* Чипы озвучки — поверх видео снизу (только в режиме плеера) */}
      {!showSites && iframeOpts.length > 1 && (
        <div className={`vp-dubs ${showDubs ? '' : 'vp-dubs--hidden'}`}>
          <button className="vp-dubs__toggle" onClick={() => setShowDubs((s) => !s)}>
            {showDubs ? '▾ Озвучка' : '▸ Озвучка'}
          </button>
          {showDubs && (
            <div className="vp-dubs__chips">
              {iframeOpts.map((opt, i) => (
                <button
                  key={opt.id}
                  className={`vp-chip ${i === activeIdx ? 'vp-chip--active' : ''}`}
                  onClick={() => selectDub(i)}
                >
                  <span>{opt.flag || (opt.lang === 'ru' ? '🇷🇺' : '🌐')}</span>
                  <span className="vp-chip__name">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Заголовок сверху */}
      <div className="vp-title-bar">
        <span className="vp-title-bar__text">{title}</span>
      </div>
    </div>
  );
};

export default VideoPlayer;
