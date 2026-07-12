import React, { useEffect, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 800);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`splash ${fading ? 'splash--fade' : ''}`}>
      {/* Кинематографичный фон с градиентом */}
      <div className="splash__bg">
        <div className="splash__gradient-orb splash__gradient-orb--1" />
        <div className="splash__gradient-orb splash__gradient-orb--2" />
        <div className="splash__gradient-orb splash__gradient-orb--3" />
      </div>

      {/* Сетка линий как в кинотеатре */}
      <div className="splash__grid" />

      {/* Плавающие частицы */}
      <div className="splash__particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="splash__particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 4 + 3}s`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      {/* Вертикальные линии сканирования */}
      <div className="splash__scanlines" />

      {/* Контент */}
      <div className="splash__content">
        {/* Лого с эффектом голограммы */}
        <div className="splash__logo-wrapper">
          <div className="splash__logo-glow" />
          <div className="splash__logo-ring" />
          <div className="splash__logo-inner">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="splash__logo-svg">
              <rect x="10" y="16" width="44" height="32" rx="8" stroke="url(#splash-border-gradient)" strokeWidth="1.8" fill="none"/>
              <path d="M28 24l16 8-16 8V24z" fill="url(#splash-play-gradient)"/>
              <defs>
                <linearGradient id="splash-border-gradient" x1="10" y1="16" x2="54" y2="48">
                  <stop stopColor="#8b5cf6"/>
                  <stop offset="0.5" stopColor="#06b6d4"/>
                  <stop offset="1" stopColor="#f472b6"/>
                </linearGradient>
                <linearGradient id="splash-play-gradient" x1="28" y1="24" x2="44" y2="40">
                  <stop stopColor="#a78bfa"/>
                  <stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Название с градиентом */}
        <h1 className="splash__title">
          <span className="splash__title-part">Tele</span>
          <span className="splash__title-part splash__title-part--accent">Cinema</span>
        </h1>

        <p className="splash__subtitle">Фильмы, сериалы, аниме</p>

        {/* Прогресс-бар */}
        <div className="splash__progress">
          <div className="splash__progress-track">
            <div className="splash__progress-fill" />
          </div>
          <span className="splash__progress-text">Подготовка к просмотру...</span>
        </div>
      </div>

      {/* Нижняя плашка с копирайтом */}
      <div className="splash__footer">
        <span>✦ КИНО В ТВОЁМ TELEGRAM ✦</span>
      </div>
    </div>
  );
};

export default SplashPage;