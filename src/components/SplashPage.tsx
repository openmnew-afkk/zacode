import React, { useEffect, useState } from 'react';
import VeloraEmblem from './VeloraEmblem';
import { useTelegram } from '../hooks/useTelegram';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const STATUS_STEPS = [
  { threshold: 0, text: 'Подключение защищённого аудио-ядра...' },
  { threshold: 24, text: 'Калибровка звука Dolby Atmos®...' },
  { threshold: 52, text: 'Синхронизация медиатеки 2026...' },
  { threshold: 78, text: 'Оптимизация видеопотока 4K HDR...' },
  { threshold: 96, text: 'Готово к погружению' },
];

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { haptic } = useTelegram();

  useEffect(() => {
    let current = 0;
    let hasTriggeredMidHaptic = false;

    const interval = setInterval(() => {
      // Плавный кинематографичный разгон прогресса
      const step =
        current < 30
          ? Math.random() * 8 + 4
          : current < 75
          ? Math.random() * 6 + 3
          : Math.random() * 9 + 5;

      current = Math.min(100, Math.round(current + step));
      setProgress(current);

      if (current >= 50 && !hasTriggeredMidHaptic) {
        hasTriggeredMidHaptic = true;
        haptic('light');
      }

      if (current >= 100) {
        clearInterval(interval);
        haptic('medium');

        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setVisible(false);
            onDone?.();
          }, 450);
        }, 220);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [haptic, onDone]);

  if (!visible) return null;

  // Текущий статус телеметрии
  const currentStatus =
    [...STATUS_STEPS].reverse().find((s) => progress >= s.threshold)?.text ||
    'Инициализация VELORA...';

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`}>
      {/* ── Кинематографичные маркеры видоискателя (Scope 2.39:1) ── */}
      <div className="sp__hud-frame">
        <div className="sp__hud-corner sp__hud-corner--tl">
          <span className="sp__hud-bracket">┌</span>
          <span className="sp__hud-meta">SCOPE 2.39:1 • 4K ULTRA HD</span>
        </div>
        <div className="sp__hud-corner sp__hud-corner--tr">
          <span className="sp__hud-meta">VELORA NEURAL CORE v2.6</span>
          <span className="sp__hud-bracket">┐</span>
        </div>
        <div className="sp__hud-corner sp__hud-corner--bl">
          <span className="sp__hud-bracket">└</span>
          <span className="sp__hud-meta">DOLBY VISION • ATMOS SOUND</span>
        </div>
        <div className="sp__hud-corner sp__hud-corner--br">
          <span className="sp__hud-meta">LOSSLESS STREAMING</span>
          <span className="sp__hud-bracket">┘</span>
        </div>
      </div>

      {/* ── Атмосферная глубина: анаморфные лучи и космическая аура ── */}
      <div className="sp__anamorphic-flare" />
      <div className="sp__ambient-aura" />
      <div className="sp__ambient-glow" />

      {/* ── Парящие кинематографичные световые частицы (Star Dust) ── */}
      <div className="sp__particles" aria-hidden="true">
        <span className="sp__particle p1" />
        <span className="sp__particle p2" />
        <span className="sp__particle p3" />
        <span className="sp__particle p4" />
        <span className="sp__particle p5" />
        <span className="sp__particle p6" />
        <span className="sp__particle p7" />
        <span className="sp__particle p8" />
      </div>

      {/* ── Центральный премиум-блок ── */}
      <div className="sp__center">
        {/* Голографическая эмблема с ореолом отражения */}
        <div className="sp__emblem-stage">
          <div className="sp__emblem-backdrop" />
          <VeloraEmblem size="hero" className="sp__prism-emblem" />
          <div className="sp__emblem-reflection" />
        </div>

        {/* Название VELORA с бегущим металлическим светом */}
        <div className="sp__brand">
          <div className="sp__title-wrap">
            <h1 className="sp__title">VELORA</h1>
            <div className="sp__title-shimmer" />
          </div>

          <div className="sp__badge">
            <span className="sp__badge-spark">✦</span>
            <span className="sp__badge-text">CINEMA • SOUND • DISCOVERY</span>
            <span className="sp__badge-spark">✦</span>
          </div>

          {/* Премиум-чипсы спецификаций */}
          <div className="sp__specs">
            <span className="sp__spec-chip">4K HDR</span>
            <span className="sp__spec-dot">•</span>
            <span className="sp__spec-chip">DOLBY ATMOS</span>
            <span className="sp__spec-dot">•</span>
            <span className="sp__spec-chip">NEURAL AI</span>
          </div>
        </div>

        {/* ── Индикатор загрузки с телеметрией ── */}
        <div className="sp__loading-module">
          <div className="sp__telemetry-row">
            <span className="sp__telemetry-status">{currentStatus}</span>
            <span className="sp__telemetry-percent">{progress}%</span>
          </div>

          <div className="sp__progress-track">
            <div
              className="sp__progress-bar"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              {/* Светящаяся лазерная искра на острие индикатора */}
              <div className="sp__progress-spark" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
