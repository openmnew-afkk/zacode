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
      }, 600);
    }, 2800);

    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`splash ${fading ? 'splash--fade' : ''}`}>
      {/* Фоновое сияние */}
      <div className="splash__aurora" />

      {/* Плавающие частицы */}
      <div className="splash__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="splash__particle"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--d': `${Math.random() * 3 + 2}s`,
              '--delay': `${Math.random() * 2}s`,
              '--size': `${Math.random() * 3 + 1}px`,
              '--color': ['rgba(139,92,246,0.8)', 'rgba(6,182,212,0.8)', 'rgba(244,114,182,0.8)', 'rgba(251,191,36,0.6)'][i % 4],
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Кинолента */}
      <div className="splash__film-strip">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="splash__film-frame" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* Основной контент */}
      <div className="splash__content">
        <div className="splash__logo-wrap">
          <div className="splash__logo-glow" />
          <div className="splash__logo-ring" />
          <div className="splash__logo">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="14" width="40" height="28" rx="6" stroke="url(#splash-border)" strokeWidth="1.5" fill="none"/>
              <path d="M24 22l14 6-14 6V22z" fill="url(#splash-play)"/>
              <defs>
                <linearGradient id="splash-border" x1="8" y1="14" x2="48" y2="42">
                  <stop stopColor="#8b5cf6"/>
                  <stop offset="1" stopColor="#06b6d4"/>
                </linearGradient>
                <linearGradient id="splash-play" x1="24" y1="22" x2="38" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0a84ff"/>
                  <stop offset="1" stopColor="#64d2ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="splash__title">
          <span className="splash__title-tele">Tele</span>
          <span className="splash__title-cinema">Cinema</span>
        </h1>

        <p className="splash__tagline">Фильмы и сериалы онлайн</p>

        <div className="splash__progress">
          <div className="splash__progress-track">
            <div className="splash__progress-bar" />
          </div>
          <span className="splash__progress-text">Загрузка...</span>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;