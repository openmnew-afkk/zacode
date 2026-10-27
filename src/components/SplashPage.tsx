import React, { useEffect, useRef, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const onDoneRef = useRef(onDone);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 2.4 + 1.6;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        timersRef.current.push(setTimeout(() => {
          setFading(true);
          timersRef.current.push(setTimeout(() => {
            setVisible(false);
            onDoneRef.current?.();
          }, 460));
        }, 220));
      }
      setProgress(Math.min(100, Math.round(current)));
    }, 30);

    return () => {
      clearInterval(interval);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`} role="status" aria-label="Загрузка ZENOVA">
      {/* Мягкое глубинное свечение */}
      <div className="sp__ambient" />
      <div className="sp__starfield" aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <div className="sp__container">
        <div className="sp__emblem-wrap">
          <div className="sp__projector-beam" aria-hidden="true" />
          <img className="sp__emblem" src="/zenova-icon.svg" alt="" />
          <span className="sp__orbit sp__orbit--one" />
          <span className="sp__orbit sp__orbit--two" />
        </div>

        <div className="sp__brand">
          <h1 className="sp__title">ZENOVA</h1>
          <p className="sp__subtitle">ТВОЙ МИР · ТВОИ ИСТОРИИ</p>
        </div>

        <div className="sp__loading">
          <div className="sp__track" role="progressbar" aria-label="Загрузка" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="sp__bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="sp__loading-label">СЛЕДУЮЩАЯ СЦЕНА УЖЕ БЛИЗКО</span>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
