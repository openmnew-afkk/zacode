import React, { useEffect, useState } from 'react';
import VeloraEmblem from './VeloraEmblem';
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
        {/* Голографическая квантовая эмблема VELORA */}
        <div className="sp__prism">
          <VeloraEmblem size="hero" className="sp__prism-emblem" />
        </div>

        {/* Название VELORA */}
        <div className="sp__typography">
          <h1 className="sp__title">V E L O R A</h1>
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
