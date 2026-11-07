import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsTapForAudio, setNeedsTapForAudio] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setProgress(100);
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, 460);
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    let removeUnlockListeners: (() => void) | null = null;

    if (vid) {
      vid.volume = 1.0;
      vid.muted = false;

      vid.play().then(() => {
        setMuted(false);
        setNeedsTapForAudio(false);
      }).catch(() => {
        // Если браузер/WebView заблокировал автозапуск со звуком до первого касания —
        // запускаем видео и мгновенно включаем звук при любом касании экрана
        vid.muted = true;
        setMuted(true);
        setNeedsTapForAudio(true);
        vid.play().catch(() => {});

        const unlockAudio = () => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = false;
          v.volume = 1.0;
          setMuted(false);
          setNeedsTapForAudio(false);
          v.play().catch(() => {});
          cleanup();
        };

        const cleanup = () => {
          window.removeEventListener('pointerdown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('touchstart', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });
        removeUnlockListeners = cleanup;
      });
    }

    // Страховочный таймер на случай медленной сети (макс 9.8с)
    const fallbackTimer = setTimeout(() => {
      finishSplash();
    }, 9800);

    // Плавный прогресс синхронно с временем видео
    const progInterval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration && isFinite(v.duration) && v.currentTime > 0) {
        const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
        setProgress(pct);
      } else {
        setProgress((prev) => Math.min(96, prev + 2));
      }
    }, 100);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(progInterval);
      removeUnlockListeners?.();
    };
  }, [finishSplash]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !muted;
    v.muted = nextMuted;
    v.volume = 1.0;
    setMuted(nextMuted);
    setNeedsTapForAudio(false);
    if (!nextMuted) {
      v.play().catch(() => {});
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`sp ${fading ? 'sp--fade' : ''}`}
      role="status"
      aria-label="Загрузка ZENOVA"
      onClick={() => {
        if (muted && videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1.0;
          setMuted(false);
          setNeedsTapForAudio(false);
          videoRef.current.play().catch(() => {});
        }
      }}
    >
      {/* Амбиент-фон для широких экранов */}
      <div
        className="sp__backdrop-blur"
        style={{ backgroundImage: 'url(/zenova-splash-poster.jpg)' }}
        aria-hidden="true"
      />
      <div className="sp__backdrop-vignette" aria-hidden="true" />

      {/* Видео-контейнер */}
      <div className="sp__stage">
        <video
          ref={videoRef}
          className={`sp__video ${videoReady ? 'sp__video--ready' : ''}`}
          src="/zenova-splash.mp4"
          poster="/zenova-splash-poster.jpg"
          autoPlay
          muted={muted}
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onEnded={finishSplash}
          onError={finishSplash}
        />

        {/* Верхняя панель управления загрузкой (с учётом безопасной зоны Telegram) */}
        <div className="sp__top-bar">
          <button
            type="button"
            className={`sp__pill-btn ${needsTapForAudio ? 'sp__pill-btn--pulse' : ''}`}
            onClick={toggleSound}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
                <span>{needsTapForAudio ? 'Включить звук' : 'Без звука'}</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>Звук ON</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="sp__pill-btn sp__pill-btn--skip"
            onClick={(e) => {
              e.stopPropagation();
              finishSplash();
            }}
            aria-label="Пропустить заставку"
          >
            <span>Пропустить</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Тонкий прогресс-индикатор в самом низу */}
        <div className="sp__bottom-hud">
          <div
            className="sp__track"
            role="progressbar"
            aria-label="Загрузка"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="sp__bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
