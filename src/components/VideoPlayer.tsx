import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import './VideoPlayer.css';

export interface PlayerSource {
  label: string;
  url: string;
  type: string;
  lang?: 'ru' | 'en';
}

interface VideoPlayerProps {
  url: string;
  sources?: PlayerSource[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
  poster?: string;
}

const LOAD_TIMEOUT_MS = 9000;

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  sources = [],
  initialIndex = 0,
  onClose,
  title,
  poster,
}) => {
  const { haptic, openLink } = useTelegram();
  const allSources: PlayerSource[] = sources.length > 0
    ? sources
    : [{ label: 'Плеер', url, type: 'embed' }];

  const [srcIndex, setSrcIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeSource = allSources[srcIndex];

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    timerRef.current = null;
    progressRef.current = null;
  }, []);

  const tryNextSource = useCallback(() => {
    clearTimers();
    if (srcIndex < allSources.length - 1) {
      setSrcIndex((i) => i + 1);
      setPhase('loading');
      setProgress(0);
    } else {
      setPhase('error');
    }
  }, [srcIndex, allSources.length, clearTimers]);

  useEffect(() => {
    setPhase('loading');
    setProgress(0);
    clearTimers();

    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(92, (elapsed / LOAD_TIMEOUT_MS) * 92));
    }, 120);

    timerRef.current = setTimeout(() => {
      tryNextSource();
    }, LOAD_TIMEOUT_MS);

    return clearTimers;
  }, [srcIndex, activeSource.url, clearTimers, tryNextSource]);

  const handleLoad = () => {
    clearTimers();
    setProgress(100);
    setTimeout(() => setPhase('ready'), 200);
  };

  const switchSource = (i: number) => {
    haptic('light');
    setSrcIndex(i);
  };

  const openExternal = () => {
    haptic('medium');
    openLink(activeSource.url);
  };

  return (
    <div className="vp-overlay">
      <div className="vp-modal">
        <div className="vp-topbar">
          <button className="vp-close" onClick={onClose} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="vp-topbar__title">{title || 'Просмотр'}</span>
          <button className="vp-external" onClick={openExternal} aria-label="Открыть в браузере">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 3H3v12h12v-4M10 2h6v6M8 10l8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="vp-stage">
          {poster && phase !== 'ready' && (
            <div
              className="vp-stage__poster"
              style={{ backgroundImage: `url(${poster})` }}
            />
          )}

          {phase === 'loading' && (
            <div className="vp-stage__loader">
              <div className="vp-stage__play-ring">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M10 7l12 7-12 7V7z" fill="currentColor"/>
                </svg>
              </div>
              <p className="vp-stage__status">Подключаем {activeSource.label.replace(/^🇷🇺 |^🇬🇧 /, '')}…</p>
              <div className="vp-stage__bar">
                <div className="vp-stage__bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="vp-stage__error">
              <div className="vp-stage__error-icon">📡</div>
              <p>Не удалось загрузить в приложении</p>
              <span>Откройте во внешнем браузере — там обычно работает</span>
              <button className="vp-stage__error-btn" onClick={openExternal}>
                Открыть в браузере
              </button>
              <button className="vp-stage__retry-btn" onClick={() => { setSrcIndex(0); setPhase('loading'); }}>
                Попробовать снова
              </button>
            </div>
          )}

          {phase !== 'error' && (
            <iframe
              key={activeSource.url}
              className={`vp-iframe ${phase === 'ready' ? 'vp-iframe--visible' : ''}`}
              src={activeSource.url}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; gyroscope; accelerometer"
              allowFullScreen
              referrerPolicy="no-referrer"
              title={title || 'Плеер'}
              onLoad={handleLoad}
            />
          )}
        </div>

        {allSources.length > 1 && (
          <div className="vp-dubbing">
            <span className="vp-dubbing__label">Озвучка</span>
            <div className="vp-dubbing__list">
              {allSources.map((src, i) => (
                <button
                  key={src.url}
                  className={`vp-dubbing__chip ${i === srcIndex ? 'active' : ''} ${src.lang === 'en' ? 'en' : 'ru'}`}
                  onClick={() => switchSource(i)}
                >
                  <span className="vp-dubbing__flag">{src.lang === 'en' ? '🇬🇧' : '🇷🇺'}</span>
                  {src.label.replace(/^🇷🇺 |^🇬🇧 /, '')}
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
