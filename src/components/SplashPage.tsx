import React, { useEffect, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Анимация прогресса
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 60);

    // Таймер закрытия
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 800);
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`splash ${fading ? 'splash--fade' : ''}`}>
      {/* Фон с градиентами */}
      <div className="splash__bg">
        <div className="splash__orb splash__orb--1" />
        <div className="splash__orb splash__orb--2" />
        <div className="splash__orb splash__orb--3" />
      </div>

      {/* Сетка */}
      <div className="splash__grid" />

      {/* Частицы */}
      <div className="splash__particles">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="splash__particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 5 + 4}s`,
              animationDelay: `${Math.random() * 4}s`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
            }}
          />
        ))}
      </div>

      {/* Контент */}
      <div className="splash__content">
        {/* Логотип с кольцом */}
        <div className="splash__logo">
          <div className="splash__logo-ring" />
          <div className="splash__logo-inner">
            <svg viewBox="0 0 64 64" fill="none" className="splash__logo-icon">
              <rect x="10" y="16" width="44" height="32" rx="8" stroke="url(#grad1)" strokeWidth="2" fill="none"/>
              <path d="M28 24l16 8-16 8V24z" fill="url(#grad2)"/>
              <defs>
                <linearGradient id="grad1" x1="10" y1="16" x2="54" y2="48">
                  <stop stopColor="#8b5cf6"/>
                  <stop offset="1" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="grad2" x1="28" y1="24" x2="44" y2="40">
                  <stop stopColor="#a78bfa"/>
                  <stop offset="1" stopColor="#38bdf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Название */}
        <h1 className="splash__title">
          <span className="splash__title-text">Tele</span>
          <span className="splash__title-accent">Cinema</span>
        </h1>

        <p className="splash__subtitle">Фильмы • Сериалы • Аниме</p>

        {/* Прогресс бар */}
        <div className="splash__progress">
          <div className="splash__progress-track">
            <div className="splash__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="splash__progress-text">Загрузка...</p>
        </div>
      </div>

      {/* Футер */}
      <div className="splash__footer">
        <span>✦ КИНО В ТВОЁМ TELEGRAM ✦</span>
      </div>
    </div>
  );
};

export default SplashPage;