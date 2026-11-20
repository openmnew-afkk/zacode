import React, { useCallback, useEffect, useRef, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

type PlaybackStatus = 'loading' | 'playing' | 'buffering' | 'blocked' | 'error';

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('loading');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const playbackStatusRef = useRef<PlaybackStatus>('loading');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const changePlaybackStatus = useCallback((nextStatus: PlaybackStatus) => {
    if (finishedRef.current) return;
    playbackStatusRef.current = nextStatus;
    setPlaybackStatus(nextStatus);
  }, []);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFading(true);
    finishTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, 450);
  }, []);

  const handlePlayFailure = useCallback((error: unknown) => {
    if (finishedRef.current) return;
    const errorName = error instanceof DOMException
      ? error.name
      : (error as { name?: string } | null)?.name;

    // A newer play()/load() request superseded this one.
    if (errorName === 'AbortError') return;

    if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
      changePlaybackStatus('blocked');
      return;
    }

    console.warn('Splash video playback failed:', error);
    changePlaybackStatus('error');
  }, [changePlaybackStatus]);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || finishedRef.current) return;

    try {
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => {
            if (finishedRef.current || videoRef.current !== video || video.paused) return;
            changePlaybackStatus(video.readyState >= 3 ? 'playing' : 'buffering');
          })
          .catch((error: unknown) => {
            if (videoRef.current === video) handlePlayFailure(error);
          });
      }
    } catch (error) {
      handlePlayFailure(error);
    }
  }, [changePlaybackStatus, handlePlayFailure]);

  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const actualProgress = (video.currentTime / video.duration) * 100;
    setProgress(Math.min(100, Math.max(0, actualProgress)));
  }, []);

  const toggleSound = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    video.volume = 1;
    setMuted(nextMuted);

    if (!nextMuted && video.paused && playbackStatusRef.current !== 'error') {
      changePlaybackStatus('loading');
      attemptPlay();
    }
  }, [attemptPlay, changePlaybackStatus]);

  const retryPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || finishedRef.current) return;

    setVideoReady(false);
    setProgress(0);
    changePlaybackStatus('loading');
    video.load();
    attemptPlay();
  }, [attemptPlay, changePlaybackStatus]);

  const startFromGesture = useCallback(() => {
    changePlaybackStatus('loading');
    attemptPlay();
  }, [attemptPlay, changePlaybackStatus]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Muted inline autoplay is the fastest reliable path; sound remains opt-in.
    video.muted = true;
    video.volume = 1;
    setMuted(true);
    attemptPlay();
  }, [attemptPlay]);

  useEffect(() => {
    if (playbackStatus !== 'loading' && playbackStatus !== 'buffering') return;

    // A missing error event must not trap users on an endless loading screen.
    const stallTimer = window.setTimeout(() => {
      const currentStatus = playbackStatusRef.current;
      if (currentStatus === 'loading' || currentStatus === 'buffering') {
        changePlaybackStatus('error');
      }
    }, 15000);

    return () => window.clearTimeout(stallTimer);
  }, [changePlaybackStatus, playbackStatus]);

  useEffect(() => () => {
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
  }, []);

  if (!visible) return null;

  const assetBase = import.meta.env.BASE_URL && import.meta.env.BASE_URL.startsWith('/') ? import.meta.env.BASE_URL : '/';
  const isLoading = playbackStatus === 'loading' || playbackStatus === 'buffering';

  return (
    <div
      className={`sp ${fading ? 'sp--fade' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Заставка ZENOVA"
      onClick={() => {
        const video = videoRef.current;
        if (video && video.muted && playbackStatusRef.current === 'playing') {
          video.muted = false;
          video.volume = 1;
          setMuted(false);
        }
      }}
    >
      <div
        className="sp__backdrop-blur"
        style={{ backgroundImage: `url(${assetBase}zenova-splash-poster.jpg)` }}
        aria-hidden="true"
      />
      <div className="sp__backdrop-vignette" aria-hidden="true" />

      <div className="sp__stage">
        <img
          className="sp__poster"
          src={`${assetBase}zenova-splash-poster.jpg`}
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <div className="sp__top-bar">
          <button
            type="button"
            className="sp__pill-btn"
            onClick={toggleSound}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            aria-pressed={!muted}
          >
            {muted ? 'Звук выкл' : 'Звук вкл'}
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
          poster={`${assetBase}zenova-splash-poster.jpg`}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-label="Видеозаставка ZENOVA"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => {
            setVideoReady(true);
            const video = videoRef.current;
            if (video?.paused && isLoading) attemptPlay();
          }}
          onPlaying={() => {
            setVideoReady(true);
            changePlaybackStatus('playing');
          }}
          onTimeUpdate={() => {
            updateProgress();
            const video = videoRef.current;
            if (video && !video.paused && playbackStatusRef.current === 'buffering') {
              changePlaybackStatus('playing');
            }
          }}
          onDurationChange={updateProgress}
          onWaiting={() => {
            if (playbackStatusRef.current !== 'blocked' && playbackStatusRef.current !== 'error') {
              changePlaybackStatus('buffering');
            }
          }}
          onStalled={() => {
            if (playbackStatusRef.current !== 'blocked' && playbackStatusRef.current !== 'error') {
              changePlaybackStatus('buffering');
            }
          }}
          onEnded={() => {
            setProgress(100);
            finishSplash();
          }}
          onError={() => {
            console.warn('Splash video media/network error');
            changePlaybackStatus('error');
          }}
        >
          <source src={`${assetBase}zenova-splash.mp4`} type="video/mp4" />
        </video>

        {isLoading && (
          <div className="sp__state" role="status" aria-live="polite">
            <div className="sp__loading-indicator">
              <span className="sp__spinner" aria-hidden="true" />
              <span>{playbackStatus === 'buffering' ? 'Буферизация видео…' : 'Загрузка видео…'}</span>
            </div>
          </div>
        )}

        {playbackStatus === 'blocked' && (
          <div className="sp__state sp__state--interactive">
            <button type="button" className="sp__play-button" onClick={startFromGesture}>
              <span className="sp__play-icon" aria-hidden="true" />
              <span>Воспроизвести заставку</span>
              <small>Нажмите, чтобы начать или продолжить</small>
            </button>
          </div>
        )}

        {playbackStatus === 'error' && (
          <div className="sp__state sp__state--interactive sp__state--error" role="alert">
            <div className="sp__error-panel">
              <strong>Не удалось воспроизвести видео</strong>
              <p>Проверьте подключение к сети и попробуйте ещё раз.</p>
              <div className="sp__error-actions">
                <button type="button" className="sp__action-button" onClick={retryPlayback}>
                  Повторить
                </button>
                <button
                  type="button"
                  className="sp__action-button sp__action-button--escape"
                  onClick={finishSplash}
                >
                  Открыть приложение без заставки
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sp__bottom-hud">
          <div
            className="sp__track"
            role="progressbar"
            aria-label="Прогресс видеозаставки"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className="sp__bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
