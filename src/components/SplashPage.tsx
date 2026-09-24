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
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 18 + 12;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => {
          setFading(true);
          setTimeout(() => {
            setVisible(false);
            onDone?.();
          }, 350);
        }, 180);
      }
      setProgress(Math.min(100, Math.round(current)));
    }, 45);

    return () => clearInterval(interval);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`}>
      {/* Мягкое глубинное свечение */}
      <div className="sp__ambient" />

      <div className="sp__container">
        {/* Квантовая эмблема */}
        <div className="sp__emblem-wrap">
          <VeloraEmblem size="hero" className="sp__emblem" />
        </div>

        {/* Минималистичная премиум-типографика */}
        <div className="sp__brand">
          <h1 className="sp__title">VELORA</h1>
          <p className="sp__subtitle">CINEMA & SOUND</p>
        </div>

        {/* Ультра-тонкий аккуратный прогресс-бар */}
        <div className="sp__track">
          <div className="sp__bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
