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
  poster,
}) => {
  const iframeOpts = options.filter(o => o.type === 'iframe');
  const ruOpts = iframeOpts.filter(o => o.lang === 'ru');
  const enOpts = iframeOpts.filter(o => o.lang !== 'ru');

  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'ru' | 'en'>('ru');

  const visibleOpts = tab === 'ru' ? ruOpts : enOpts;
  const active = visibleOpts[activeIdx] || iframeOpts[0];

  // Сбрасываем индекс при смене таба
  useEffect(() => { setActiveIdx(0); setLoaded(false); }, [tab]);

  const switchTo = (idx: number) => {
    setActiveIdx(idx);
    setLoaded(false);
  };

  // Блокируем скролл
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="vp">
      {/* ── Шапка ── */}
      <div className="vp-top">
        <div className="vp-top__row">
          <button className="vp-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3l12 12M15 3L3 15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="vp-title">{title || 'Плеер'}</span>
          <span className="vp-src-label">
            {active ? `${active.flag} ${active.label}` : ''}
          </span>
        </div>

        {/* Табы РУ / EN */}
        <div className="vp-lang-tabs">
          <button
            className={`vp-lang-tab ${tab === 'ru' ? 'active' : ''}`}
            onClick={() => setTab('ru')}
          >
            🇷🇺 Русские ({ruOpts.length})
          </button>
          <button
            className={`vp-lang-tab ${tab === 'en' ? 'active' : ''}`}
            onClick={() => setTab('en')}
          >
            🌐 Другие ({enOpts.length})
          </button>
        </div>

        {/* Список источников — горизонтальный скролл */}
        <div className="vp-sources-row">
          {loadingOptions && visibleOpts.length === 0 && (
            <div className="vp-loading-chip">
              <span className="vp-mini-spin" /> Поиск…
            </div>
          )}
          {visibleOpts.map((opt, i) => (
            <button
              key={opt.id}
              className={`vp-src-chip ${i === activeIdx ? 'active' : ''}`}
              onClick={() => switchTo(i)}
            >
              <span className="vp-src-chip__flag">{opt.flag}</span>
              <span className="vp-src-chip__name">{opt.label}</span>
            </button>
          ))}
          {visibleOpts.length === 0 && !loadingOptions && (
            <span className="vp-no-sources">
              {tab === 'ru' ? 'Нет русских источников' : 'Нет источников'}
            </span>
          )}
        </div>
      </div>

      {/* ── Плеер ── */}
      <div className="vp-player">
        {!loaded && (
          <div className="vp-loader">
            {poster && <img src={poster} alt="" className="vp-loader__bg" />}
            <div className="vp-loader__overlay" />
            <div className="vp-loader__body">
              <div className="vp-spinner" />
              <p>Загрузка плеера…</p>
              {active && <p className="vp-loader__src">{active.flag} {active.label}</p>}
            </div>
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
          <div className="vp-empty">
            <div className="vp-empty__icon">🔌</div>
            <p>Источники недоступны</p>
            <p className="vp-empty__sub">Попробуйте другой таб</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;