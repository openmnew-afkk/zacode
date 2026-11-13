import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, ArrowLeft, Sparkles, Cpu, Film, Layers } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface SynthaxAiStudioProps {
  onBackToOracle?: () => void;
}

export const SynthaxAiStudio: React.FC<SynthaxAiStudioProps> = ({ onBackToOracle }) => {
  const { haptic } = useTelegram();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? './zenova-mask-mini-winter.png' : './zenova-mask-mini.png';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const handleBack = () => {
    haptic('light');
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (onBackToOracle) {
      onBackToOracle();
    }
  };

  const togglePlay = () => {
    haptic('medium');
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
      }).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const restartVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().then(() => {
      setIsPlaying(true);
      setHasStarted(true);
    }).catch(() => {});
  };

  return (
    <div className="syn-studio">
      {/* ── Шапка студии SYNTHAX-9 ── */}
      <header className="syn-header">
        <div className="syn-brand">
          <div className="syn-brand__mask-wrap">
            <img src={maskSrc} alt="SYNTHAX-9" className="syn-brand__mask" />
            <span className="syn-brand__mask-pulse" />
          </div>
          <div className="syn-brand__info">
            <div className="syn-brand__kicker-row">
              <span className="syn-brand__kicker">ZENOVA NEURAL CORE</span>
              <span className="syn-brand__badge-dev">ЗАКРЫТ НА РАЗРАБОТКУ</span>
            </div>
            <h2 className="syn-brand__title">SYNTHAX-9</h2>
          </div>
        </div>

        <button
          type="button"
          className="syn-header-back-btn"
          onClick={handleBack}
          aria-label="Вернуться к Оракулу"
        >
          <ArrowLeft size={14} />
          <span>Оракул</span>
        </button>
      </header>

      {/* ── Главная карточка: Видео-демонстрация работы нейросети ── */}
      <section className="syn-dev-card">
        <div className="syn-video-shell">
          <div className="syn-video-container" onClick={togglePlay}>
            <video
              ref={videoRef}
              src="/zenova-splash.mp4"
              poster="/zenova-splash-poster.jpg"
              playsInline
              loop
              muted={isMuted}
              className="syn-video-element"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Кибернетический HUD поверх видео */}
            <div className="syn-video-hud">
              <div className="syn-video-hud__top">
                <span className="syn-video-tag">
                  <span className="syn-video-dot" />
                  R&D PREVIEW · v1.0
                </span>
                <span className="syn-video-res">4K KINETICS</span>
              </div>

              {!isPlaying && (
                <div className="syn-video-play-pod">
                  <div className="syn-video-play-btn">
                    <Play size={28} className="syn-video-play-icon" />
                  </div>
                  <span className="syn-video-play-label">
                    {hasStarted ? 'Продолжить просмотр' : 'Смотреть презентацию работы'}
                  </span>
                </div>
              )}

              <div className="syn-video-hud__bottom" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="syn-hud-ctrl-btn"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <button
                  type="button"
                  className="syn-hud-ctrl-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <button
                  type="button"
                  className="syn-hud-ctrl-btn"
                  onClick={restartVideo}
                  aria-label="Сначала"
                >
                  <RotateCcw size={15} />
                </button>

                <span className="syn-video-status-text">
                  {isPlaying ? 'ВОСПРОИЗВЕДЕНИЕ ДЕМО…' : 'ПАУЗА'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Описание статуса и работы нейросети */}
        <div className="syn-dev-content">
          <div className="syn-dev-status-badge">
            <span className="syn-dev-status-spark">⚡</span>
            <span>СТУДИЙНОЕ НЕЙРОСЕТЕВОЕ ЯДРО ZENOVA</span>
          </div>

          <h3 className="syn-dev-title">Раздел закрыт на время разработки</h3>

          <p className="syn-dev-desc">
            Мы отказались от сторонних медленных решений и создаём собственную высокоскоростную мультимодальную нейросеть. В видео выше продемонстрирована работа кинематографичной кинетики и рендеринга живых кино-сцен будущего ядра <strong>SYNTHAX-9</strong>.
          </p>

          {/* Технические спецификации будущего движка */}
          <div className="syn-specs-grid">
            <div className="syn-spec-card">
              <div className="syn-spec-icon-wrap text-purple">
                <Cpu size={18} />
              </div>
              <div className="syn-spec-info">
                <div className="syn-spec-val">9.4B</div>
                <div className="syn-spec-label">Параметров кино-модели</div>
              </div>
            </div>

            <div className="syn-spec-card">
              <div className="syn-spec-icon-wrap text-cyan">
                <Film size={18} />
              </div>
              <div className="syn-spec-info">
                <div className="syn-spec-val">4K HDR</div>
                <div className="syn-spec-label">Diffusion рендеринг сцен</div>
              </div>
            </div>

            <div className="syn-spec-card">
              <div className="syn-spec-icon-wrap text-amber">
                <Sparkles size={18} />
              </div>
              <div className="syn-spec-info">
                <div className="syn-spec-val">60 FPS</div>
                <div className="syn-spec-label">Генерация видеопотока</div>
              </div>
            </div>

            <div className="syn-spec-card">
              <div className="syn-spec-icon-wrap text-emerald">
                <Layers size={18} />
              </div>
              <div className="syn-spec-info">
                <div className="syn-spec-val">PRO Core</div>
                <div className="syn-spec-label">Приоритет без очередей</div>
              </div>
            </div>
          </div>

          {/* Этапы готовности */}
          <div className="syn-dev-timeline">
            <div className="syn-dev-step syn-dev-step--done">
              <span className="syn-dev-step-dot">✓</span>
              <div className="syn-dev-step-copy">
                <strong>Архитектура и видео-движок</strong>
                <small>Пайплайн генерации и интеграция плеера готовы</small>
              </div>
            </div>

            <div className="syn-dev-step syn-dev-step--active">
              <span className="syn-dev-step-dot syn-dev-step-dot--pulse">●</span>
              <div className="syn-dev-step-copy">
                <strong>Обучение собственной кинематографичной модели</strong>
                <small>Синтез фотореалистичных постеров, персонажей и трейлеров</small>
              </div>
            </div>

            <div className="syn-dev-step">
              <span className="syn-dev-step-dot">○</span>
              <div className="syn-dev-step-copy">
                <strong>Релиз студии для пользователей ZENOVA</strong>
                <small>Мгновенная генерация арт-постеров и персонажей прямо в приложении</small>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="syn-dev-back-btn"
            onClick={handleBack}
          >
            <span className="syn-dev-back-arrow">←</span>
            <span>Вернуться к Кино-Оракулу</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default SynthaxAiStudio;
