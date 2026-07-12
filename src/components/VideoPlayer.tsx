import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { WatchOption } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import './VideoPlayer.css';

interface VideoPlayerProps {
  options: WatchOption[];
  loadingOptions?: boolean;   // true пока источники ещё грузятся с API
  initialIndex?: number;
  onClose: () => void;
  title?: string;
  poster?: string;
}

/* Группируем по провайдеру */
function groupByProvider(options: WatchOption[]): { provider: string; flag: string; items: WatchOption[] }[] {
  const map = new Map<string, WatchOption[]>();
  for (const o of options) {
    const key = o.provider || o.label;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return Array.from(map.entries()).map(([provider, items]) => ({
    provider,
    flag: items[0].flag || '🎬',
    items,
  }));
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  options,
  loadingOptions = false,
  initialIndex = 0,
  onClose,
  title,
  poster,
}) => {
  const { haptic, openLink } = useTelegram();

  const iframeOpts = options.filter(o => o.type === 'iframe');
  const externalOpts = options.filter(o => o.type !== 'iframe');

  const [activeIdx, setActiveIdx] = useState(Math.min(initialIndex, Math.max(0, iframeOpts.length - 1)));
  const [loaded, setLoaded] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const active = iframeOpts[activeIdx];

  // Когда подгрузились источники — сбрасываем на первый
  useEffect(() => {
    if (iframeOpts.length > 0 && activeIdx === 0) {
      setLoaded(false);
    }
  }, [iframeOpts.length]);

  const switchTo = useCallback((idx: number) => {
    haptic('light');
    setActiveIdx(idx);
    setLoaded(false);
    setShowSources(false);
  }, [haptic]);

  // Блокируем скролл
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const groups = groupByProvider(iframeOpts);

  // Определяем провайдер активного источника
  const activeOpt = iframeOpts[activeIdx];
  const isKodik = activeOpt?.provider === 'Kodik';

  return (
    <div className="vp" role="dialog" aria-label="Видеоплеер">

      {/* ── Header ── */}
      <div className="vp-header">
        <button className="vp-header__close" onClick={onClose} aria-label="Закрыть">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="vp-header__center">
          <span className="vp-header__title">{title || 'Плеер'}</span>
          {activeOpt && (
            <span className="vp-header__src">
              {activeOpt.flag} {activeOpt.label}
              {activeOpt.provider === 'Kodik' && ' · выбор озвучки внутри ▼'}
            </span>
          )}
        </div>

        <button
          className={`vp-header__list-btn ${showSources ? 'active' : ''}`}
          onClick={() => { haptic('light'); setShowSources(s => !s); }}
          aria-label="Источники"
        >
          {loadingOptions
            ? <span className="vp-mini-spin" />
            : <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor"/>
                <rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor"/>
              </svg>
          }
        </button>
      </div>

      {/* ── Frame ── */}
      <div className="vp-frame-wrap">
        {!loaded && (
          <div className="vp-loading">
            {poster && <img src={poster} alt="" className="vp-loading__poster" />}
            <div className="vp-loading__overlay" />
            <div className="vp-loading__body">
              <div className="vp-loading__spinner" />
              <p className="vp-loading__label">
                {loadingOptions && iframeOpts.length === 0
                  ? 'Поиск озвучек…'
                  : `Загрузка плеера…`
                }
              </p>
              {activeOpt && (
                <p className="vp-loading__src">{activeOpt.flag} {activeOpt.label} · {activeOpt.sublabel}</p>
              )}
              {isKodik && (
                <p className="vp-loading__hint">Kodik: выберите озвучку прямо в плеере</p>
              )}
            </div>
          </div>
        )}

        {active && (
          <iframe
            key={active.url}
            src={active.url}
            className="vp-frame"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            onLoad={() => setLoaded(true)}
          />
        )}

        {!active && !loadingOptions && (
          <div className="vp-error">
            <div className="vp-error__icon">🔌</div>
            <p className="vp-error__title">Источники недоступны</p>
            <p className="vp-error__sub">Попробуйте внешние сайты ниже</p>
          </div>
        )}
      </div>

      {/* ── Нижние чипы — быстрое переключение (когда панель закрыта) ── */}
      {!showSources && (
        <div className="vp-chips">
          {loadingOptions && iframeOpts.length === 0 && (
            <div className="vp-chips__loading">
              <span className="vp-mini-spin" /> Ищем озвучки…
            </div>
          )}
          {iframeOpts.slice(0, 6).map((opt, i) => (
            <button
              key={opt.id}
              className={`vp-chip ${i === activeIdx ? 'active' : ''} ${opt.lang === 'ru' ? 'ru' : ''}`}
              onClick={() => switchTo(i)}
            >
              {opt.flag} {opt.label}
            </button>
          ))}
          {iframeOpts.length > 6 && (
            <button className="vp-chip vp-chip--more" onClick={() => setShowSources(true)}>
              ещё {iframeOpts.length - 6}
            </button>
          )}
        </div>
      )}

      {/* ── Панель всех источников ── */}
      {showSources && (
        <div className="vp-sources" onClick={() => setShowSources(false)}>
          <div className="vp-sources__sheet" onClick={e => e.stopPropagation()}>
            <div className="vp-sources__handle" />
            <div className="vp-sources__head">
              <span className="vp-sources__title">Выберите озвучку</span>
              <button className="vp-sources__close" onClick={() => setShowSources(false)}>✕</button>
            </div>

            {loadingOptions && (
              <div className="vp-sources__loading">
                <span className="vp-mini-spin" /> Поиск русских озвучек…
              </div>
            )}

            {/* Русские источники */}
            {groups.filter(g => g.items.some(i => i.lang === 'ru')).length > 0 && (
              <>
                <div className="vp-sources__label">🇷🇺 Русская озвучка</div>
                {groups.filter(g => g.items.some(i => i.lang === 'ru')).map(group => (
                  <div key={group.provider} className="vp-source-group">
                    {group.items.map((opt) => {
                      const idx = iframeOpts.findIndex(o => o.id === opt.id);
                      return (
                        <button
                          key={opt.id}
                          className={`vp-src-btn ${idx === activeIdx ? 'active' : ''}`}
                          onClick={() => switchTo(idx)}
                        >
                          <span className="vp-src-btn__flag">{opt.flag}</span>
                          <span className="vp-src-btn__info">
                            <span className="vp-src-btn__name">{opt.label}</span>
                            <span className="vp-src-btn__sub">{opt.sublabel}</span>
                          </span>
                          {opt.quality && <span className="vp-src-btn__q">{opt.quality}</span>}
                          {idx === activeIdx && <span className="vp-src-btn__check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* Международные */}
            {groups.filter(g => g.items.every(i => i.lang !== 'ru')).length > 0 && (
              <>
                <div className="vp-sources__label">🌐 Международные</div>
                {groups.filter(g => g.items.every(i => i.lang !== 'ru')).map(group => (
                  group.items.map((opt) => {
                    const idx = iframeOpts.findIndex(o => o.id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        className={`vp-src-btn ${idx === activeIdx ? 'active' : ''}`}
                        onClick={() => switchTo(idx)}
                      >
                        <span className="vp-src-btn__flag">{opt.flag}</span>
                        <span className="vp-src-btn__info">
                          <span className="vp-src-btn__name">{opt.label}</span>
                          <span className="vp-src-btn__sub">{opt.sublabel}</span>
                        </span>
                        {opt.quality && <span className="vp-src-btn__q">{opt.quality}</span>}
                        {idx === activeIdx && <span className="vp-src-btn__check">✓</span>}
                      </button>
                    );
                  })
                ))}
              </>
            )}

            {/* Внешние сайты */}
            {externalOpts.length > 0 && (
              <>
                <div className="vp-sources__label">🔗 Внешние сайты</div>
                {externalOpts.map(opt => (
                  <button
                    key={opt.id}
                    className="vp-src-btn vp-src-btn--ext"
                    onClick={() => { haptic('medium'); openLink(opt.url); }}
                  >
                    <span className="vp-src-btn__flag">{opt.flag}</span>
                    <span className="vp-src-btn__info">
                      <span className="vp-src-btn__name">{opt.label}</span>
                      <span className="vp-src-btn__sub">{opt.sublabel}</span>
                    </span>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 11L11 2M11 2H6M11 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;