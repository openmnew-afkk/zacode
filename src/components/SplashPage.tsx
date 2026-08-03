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
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 30);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 500);
    }, 1500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`splash ${fading ? 'splash--fade' : ''}`}>
      <div className="splash__bg">
        <div className="splash__orb splash__orb--1" />
        <div className="splash__orb splash__orb--2" />
        <div className="splash__orb splash__orb--3" />
      </div>

      <div className="splash__grid" />

      <div className="splash__content">
        <div className="splash__logo">
          <div className="splash__logo-ring" />
          <div className="splash__logo-inner">
            <svg viewBox="0 0 64 64" fill="none" className="splash__logo-icon">
              <rect x="10" y="16" width="44" height="32" rx="8" stroke="url(#grad1)" strokeWidth="2" fill="none"/>
              <path d="M28 24l16 8-16 8V24z" fill="url(#grad2)"/>
              <defs>
                <linearGradient id="grad1" x1="10" y1="16" x2="54" y2="48">
                  <stop stopColor="#e8b84a"/>
                  <stop offset="1" stopColor="#e23d3d"/>
                </linearGradient>
                <linearGradient id="grad2" x1="28" y1="24" x2="44" y2="40">
                  <stop stopColor="#f0c96a"/>
                  <stop offset="1" stopColor="#e23d3d"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="splash__title">
          <span className="splash__title-text">Кино</span>
          <span className="splash__title-accent">Зал</span>
        </h1>

        <p className="splash__subtitle">Фильмы · Сериалы · Аниме</p>

        <div className="splash__progress">
          <div className="splash__progress-track">
            <div className="splash__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="splash__progress-text">Загрузка…</p>
        </div>
      </div>

      <div className="splash__footer">
        <span>КИНО В ТВОЁМ TELEGRAM</span>
      </div>
    </div>
  );
};

export default SplashPage;
