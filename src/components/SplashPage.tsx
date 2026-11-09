import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
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
    }, 450);
  }, []);

  const handleUnlockAudio = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = 1.0;
      if (v.paused) {
        v.play().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    let removeUnlockListeners: (() => void) | null = null;

    if (vid) {
      vid.volume = 1.0;
      vid.muted = false;

      // Пытаемся воспроизвести сразу со звуком на полную громкость
      const p = vid.play();
      if (p !== undefined) {
        p.catch(() => {
          // Если строгая политика браузера временно заблокировала звук:
          // Запускаем видео и моментально разблокируем звук при первом касании экрана
          vid.muted = true;
          vid.play().catch(() => {});

          const unlockAudio = () => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false;
            v.volume = 1.0;
            cleanup();
          };

          const cleanup = () => {
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
          };

          window.addEventListener('pointerdown', unlockAudio, { passive: true });
          window.addEventListener('touchstart', unlockAudio, { passive: true });
          window.addEventListener('click', unlockAudio, { passive: true });
          window.addEventListener('keydown', unlockAudio, { passive: true });
          removeUnlockListeners = cleanup;
        });
      }
    }

    // Страховочный таймер (30 сек) ТОЛЬКО на случай критического сбоя сети
    // Ни при каких обстоятельствах не прерывает проигрываемое видео!
    const fallbackTimer = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !v.ended && v.currentTime > 0) {
        // Видео ещё играет — даём доиграть до конца!
        return;
      }
      finishSplash();
    }, 30000);

    // Точный прогресс синхронно с реальным временем воспроизведения видео
    const progInterval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration && isFinite(v.duration) && v.currentTime > 0) {
        const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
        setProgress(pct);
      }
    }, 50);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(progInterval);
      removeUnlockListeners?.();
    };
  }, [finishSplash]);

  if (!visible) return null;

  return (
    <div
      className={`sp ${fading ? 'sp--fade' : ''}`}
      role="status"
      aria-label="Загрузка ZENOVA"
      onClick={handleUnlockAudio}
      onTouchStart={handleUnlockAudio}
    >
      {/* Амбиент-фон для широких экранов */}
      <div
        className="sp__backdrop-blur"
        style={{ backgroundImage: 'url(/zenova-splash-poster.jpg)' }}
        aria-hidden="true"
      />
      <div className="sp__backdrop-vignette" aria-hidden="true" />

      {/* Видео-контейнер (видео идет от начала до самого конца со звуком без прерываний) */}
      <div className="sp__stage">
        <video
          ref={videoRef}
          className={`sp__video ${videoReady ? 'sp__video--ready' : ''}`}
          src="/zenova-splash.mp4"
          poster="/zenova-splash-poster.jpg"
          autoPlay
          muted={false}
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onEnded={finishSplash}
          onError={finishSplash}
        />

        {/* Тонкий минималистичный индикатор загрузки в самом низу */}
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
