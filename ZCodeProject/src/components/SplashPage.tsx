import React, { useEffect, useRef, useState, useCallback } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

function publicAsset(file: string) {
  const base = import.meta.env.BASE_URL || './';
  return `${base}${file}`;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const retriedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const poster = publicAsset('zenova-splash-poster.jpg');
  const primarySrc = publicAsset('zenova-splash.mp4');

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

  const playMuted = useCallback((vid: HTMLVideoElement) => {
    vid.defaultMuted = true;
    vid.muted = true;
    vid.volume = 1;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', 'true');
    return vid.play();
  }, []);

  const toggleSound = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) {
      v.volume = 1;
      v.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const start = () => {
      playMuted(vid)
        .then(() => setVideoReady(true))
        .catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
    };

    if (vid.readyState >= 2) start();
    else vid.addEventListener('canplay', start, { once: true });

    const unlockAudio = () => {
      const v = videoRef.current;
      if (!v || !v.muted) return;
      v.muted = false;
      v.volume = 1;
      setMuted(false);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
      });
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });

    const fallbackTimer = setTimeout(() => {
      finishSplash();
    }, 14000);

    const progInterval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration && isFinite(v.duration) && v.currentTime > 0) {
        const pct = Math.min(100, Math.round((v.currentTime / v.duration) * 100));
        setProgress(pct);
      } else {
        setProgress((prev) => Math.min(92, prev + 0.8));
      }
    }, 80);

    return () => {
      clearTimeout(fallbackTimer);
      clearInterval(progInterval);
      vid.removeEventListener('canplay', start);
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, [finishSplash, playMuted]);

  const handleVideoError = () => {
    const vid = videoRef.current;
    if (!vid || finishedRef.current) return;
    if (!retriedRef.current) {
      retriedRef.current = true;
      const fallback = `${primarySrc}${primarySrc.includes('?') ? '&' : '?'}retry=1`;
      if (vid.getAttribute('src') !== fallback) {
        vid.src = fallback;
        vid.load();
        playMuted(vid).catch(() => {});
        return;
      }
    }
    finishSplash();
  };

  if (!visible) return null;

  return (
    <div
      className={`sp ${fading ? 'sp--fade' : ''}`}
      role="status"
      aria-label="Загрузка ZENOVA"
    >
      <div
        className="sp__backdrop-blur"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden="true"
      />
      <div className="sp__backdrop-vignette" aria-hidden="true" />

      <div className="sp__stage">
        <div className="sp__top-bar">
          <button
            type="button"
            className="sp__pill-btn"
            onClick={toggleSound}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? 'Включить звук' : 'Звук включен'}
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
            Пропустить
          </button>
        </div>

        <video
          ref={videoRef}
          className={`sp__video ${videoReady ? 'sp__video--ready' : ''}`}
          src={primarySrc}
          poster={poster}
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          onEnded={finishSplash}
          onError={handleVideoError}
        />

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
