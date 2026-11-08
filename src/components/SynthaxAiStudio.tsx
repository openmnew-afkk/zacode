import React from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface SynthaxAiStudioProps {
  onBackToOracle?: () => void;
}

export const SynthaxAiStudio: React.FC<SynthaxAiStudioProps> = ({ onBackToOracle }) => {
  const { haptic } = useTelegram();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';

  const handleBack = () => {
    haptic('light');
    if (onBackToOracle) {
      onBackToOracle();
    }
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
              <span className="syn-brand__badge-dev">В РАЗРАБОТКЕ</span>
            </div>
            <h2 className="syn-brand__title">SYNTHAX-9</h2>
          </div>
        </div>

        <div className="syn-status-chip">
          <span className="syn-status-dot is-dev" />
          <span className="syn-status-text">R&D LAB</span>
        </div>
      </header>

      {/* ── Экран: Раздел временно закрыт на разработку собственной нейросети ── */}
      <section className="syn-dev-card">
        {/* Анимированный кибернетический арт / иллюстрация разработки */}
        <div className="syn-dev-art-box">
          <div className="syn-dev-art-grid" aria-hidden="true" />
          <div className="syn-dev-art-halo" aria-hidden="true" />

          <div className="syn-dev-art-center">
            <div className="syn-dev-art-icon-ring">
              <img src="/zenova-mask-icon.png" alt="" className="syn-dev-art-mask" />
              <div className="syn-dev-art-spinner" />
            </div>

            <div className="syn-dev-art-pills">
              <span className="syn-dev-art-pill">
                <span className="syn-dev-art-pill-spark">⚡</span>
                PRO NEURAL CORE
              </span>
              <span className="syn-dev-art-pill syn-dev-art-pill--cinema">
                4K ULTRA CINEMA
              </span>
            </div>
          </div>
        </div>

        <div className="syn-dev-content">
          <div className="syn-dev-status-badge">
            <span className="syn-dev-status-spark">🛠️</span>
            <span>ИДЁТ ПРОЕКТИРОВАНИЕ СОБСТВЕННОГО ИИ</span>
          </div>

          <h3 className="syn-dev-title">Раздел находится в разработке</h3>

          <p className="syn-dev-desc">
            Мы отказались от сторонних медленных сервисов низкого качества. Сейчас команда ZENOVA проектирует собственное нейросетевое ядро студийного уровня: генерация 4K-постеров, живых кино-сцен и видеороликов без компромиссов в скорости и детализации.
          </p>

          <div className="syn-dev-timeline">
            <div className="syn-dev-step syn-dev-step--done">
              <span className="syn-dev-step-dot">✓</span>
              <div className="syn-dev-step-copy">
                <strong>Архитектура и дизайн</strong>
                <small>Интерфейс студии и PRO-привилегии готовы</small>
              </div>
            </div>

            <div className="syn-dev-step syn-dev-step--active">
              <span className="syn-dev-step-dot syn-dev-step-dot--pulse">●</span>
              <div className="syn-dev-step-copy">
                <strong>Подключение скоростного движка</strong>
                <small>Тестирование топовых моделей генерации фото и видео</small>
              </div>
            </div>

            <div className="syn-dev-step">
              <span className="syn-dev-step-dot">○</span>
              <div className="syn-dev-step-copy">
                <strong>Релиз для резидентов ZENOVA</strong>
                <small>Мгновенный студийный рендеринг без очередей</small>
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
