import React, { useEffect, useRef, useState } from 'react';
import VeloraEmblem from './VeloraEmblem';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

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
            onDoneRef.current?.();
          }, 350);
        }, 180);
      }
      setProgress(Math.min(100, Math.round(current)));
    }, 45);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`} role="status" aria-label="Загрузка ZENOVA">
      {/* Мягкое глубинное свечение */}
      <div className="sp__ambient" />

      <div className="sp__container">
        <div className="sp__emblem-wrap">
          <VeloraEmblem size="hero" className="sp__emblem" />
        </div>

        <div className="sp__brand">
          <h1 className="sp__title">ZENOVA</h1>
          <p className="sp__subtitle">КИНО · СЕРИАЛЫ · МУЗЫКА</p>
        </div>

        <div className="sp__track" role="progressbar" aria-label="Загрузка" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="sp__bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
