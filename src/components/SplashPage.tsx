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
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv);
          return 100;
        }
        return p + Math.random() * 14 + 6;
      });
    }, 40);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 420);
    }, 1600);

    return () => {
      clearInterval(iv);
      clearTimeout(timer);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`}>
      {/* Широкоформатная подсветка, выходящая далеко за границы */}
      <div className="sp__ambient-aura" />
      {/* Мягкий рассеянный световой ореол */}
      <div className="sp__ambient-glow" />

      <div className="sp__center">
        {/* Минималистичная кинематографичная призма AURA */}
        <div className="sp__prism">
          <div className="sp__prism-beam" />
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="sp__prism-svg">
            <defs>
              <linearGradient id="auraG1" x1="0" y1="0" x2="56" y2="56">
                <stop stopColor="#ffffff" />
                <stop offset="0.6" stopColor="#c084fc" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            {/* Внешний ромб-призма */}
            <polygon points="28,4 52,28 28,52 4,28" stroke="url(#auraG1)" strokeWidth="1.8" fill="none" opacity="0.85" />
            {/* Внутренняя световая точка */}
            <circle cx="28" cy="28" r="4.5" fill="#ffffff" />
          </svg>
        </div>

        {/* Название AURA */}
        <div className="sp__typography">
          <h1 className="sp__title">A U R A</h1>
          <p className="sp__subtitle">CINEMA & SOUND</p>
        </div>

        {/* Тончайший лазерный индикатор */}
        <div className="sp__progress-track">
          <div className="sp__progress-bar" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
