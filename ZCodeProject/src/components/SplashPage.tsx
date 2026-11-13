import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(true);
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

  const toggleSound = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) {
      v.volume = 1.0;
      v.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // Сначала пробуем со звуком (если браузер позволяет)
    vid.muted = false;
    vid.volume = 1.0;

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setMuted(false);
        })
        .catch(() => {
          // Если браузер блокирует звук без жеста: гарантированно стартуем с muted
          vid.muted = true;
          setMuted(true);
          vid.play().catch(() => {});
        });
    }

    // Разблокировка звука при первом клике/касании
    const unlockAudio = () => {
      const v = videoRef.current;
      if (v && v.muted) {
        v.muted = false;
        v.volume = 1.0;
        setMuted(false);
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });

    // Страховочный таймер: максимум 12 секунд
    const fallbackTimer = setTimeout(() => {
      finishSplash();
    }, 12000);

    // Точный прогресс загрузки и воспроизведения
    const progInterval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration && isFinite(v.duration) && v.currentTime > 0) {
        const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
        setProgress(pct);
      } else {
        setProgress((prev) => Math.min(95, prev + 1.5));
      }
    }, 80);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(progInterval);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [finishSplash]);

  if (!visible) return null;

  return (
    <div
      className={`sp ${fading ? 'sp--fade' : ''}`}
      role="status"
      aria-label="Загрузка ZENOVA"
      onClick={() => {
        if (muted && videoRef.current) {
          videoRef.current.muted = false;
          setMuted(false);
        }
      }}
    >
      {/* Амбиент-фон для широких экранов */}
      <div
        className="sp__backdrop-blur"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL || './'}zenova-splash-poster.jpg)` }}
        aria-hidden="true"
      />
      <div className="sp__backdrop-vignette" aria-hidden="true" />

      {/* Видео-контейнер */}
      <div className="sp__stage">
        {/* Кнопки управления вверху */}
        <div className="sp__top-bar">
          <button
            type="button"
            className="sp__pill-btn"
            onClick={toggleSound}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? 'Включить звук 🔇' : 'Звук включен 🔊'}
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
            Пропустить ✕
          </button>
        </div>

        <video
          ref={videoRef}
          className={`sp__video ${videoReady ? 'sp__video--ready' : ''}`}
          src={`${import.meta.env.BASE_URL || './'}zenova-splash.mp4`}
          poster={`${import.meta.env.BASE_URL || './'}zenova-splash-poster.jpg`}
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onEnded={finishSplash}
          onError={() => {
            console.warn('Splash video playback error, finishing splash');
            finishSplash();
          }}
        />

        {/* Тонкий прогресс-бар в самом низу */}
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
