import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getStoredSeason } from '../services/seasons';
import SeasonalMask from './SeasonalMask';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

type SplashSeason = 'winter' | 'spring' | 'summer' | 'autumn';

const getSplashSeason = (): SplashSeason => {
  const stored = getStoredSeason();
  if (!stored.auto && stored.season.id !== 'none') {
    return stored.season.id as SplashSeason;
  }
  const month = new Date().getMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
};

const SEASON_LABEL: Record<SplashSeason, { label: string; icon: string }> = {
  winter: { label: 'Зима', icon: '❄️' },
  spring: { label: 'Весна', icon: '🌸' },
  summer: { label: 'Лето', icon: '☀️' },
  autumn: { label: 'Осень', icon: '🍁' },
};

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [maskRevealed, setMaskRevealed] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const season = getSplashSeason();

  const loadingText = progress < 30 ? 'ЗАГРУЗКА СЕЗОНА…'
    : progress < 60 ? 'МАСКА ГОТОВИТСЯ…'
    : progress < 90 ? 'ПОЧТИ ГОТОВО…'
    : 'ВСЁ ГОТОВО';

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 2.2 + 1.4;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setMaskRevealed(true);
        timersRef.current.push(setTimeout(() => {
          setFading(true);
          timersRef.current.push(setTimeout(() => {
            setVisible(false);
            onDoneRef.current?.();
          }, 460));
        }, 900));
      }
      setProgress(Math.min(100, Math.round(current)));
    }, 30);

    return () => {
      clearInterval(interval);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleMaskClick = useCallback(() => {
    if (!maskRevealed && progress < 100) {
      setProgress(100);
      setMaskRevealed(true);
      timersRef.current.push(setTimeout(() => {
        setFading(true);
        timersRef.current.push(setTimeout(() => {
          setVisible(false);
          onDoneRef.current?.();
        }, 460));
      }, 300));
    }
  }, [progress, maskRevealed]);

  if (!visible) return null;

  return (
    <div
      className={`sp sp--${season} ${fading ? 'sp--fade' : ''}`}
      role="status"
      aria-label="Загрузка ZENOVA"
    >
      {/* Глубинное фоновое свечение */}
      <div className="sp__ambient" />
      <div className="sp__starfield" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>

      {/* Сезонный акцент в углу */}
      <div className="sp__season-tag">
        {SEASON_LABEL[season].icon} {SEASON_LABEL[season].label}
      </div>

      <div className="sp__container">
        <div className="sp__identity">
          <div className="sp__emblem-wrap" onClick={handleMaskClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleMaskClick()}>
            {/* Проекторный луч */}
            <div className="sp__projector-beam" aria-hidden="true" />
            {/* Сезонная маска с сиянием */}
            <SeasonalMask
              season={season === 'autumn' ? 'autumn' : season}
              className="sp__emblem seasonal-mask--focus"
              size={132}
            />
            <span className="sp__orbit sp__orbit--one" />
            <span className="sp__orbit sp__orbit--two" />
          </div>

          <div className="sp__brand">
            <div className="sp__title-wrap">
              <h1 className="sp__title">ZENOVA</h1>
              <svg className="sp__blood" viewBox="0 0 260 22" aria-hidden="true" focusable="false">
                {season === 'winter' ? (
                  <path d="M4 2h252v3h-18l-3 5-2-5h-20v9l-3 5-3-5V5h-25l-2 4-2-4h-18v11l-3 5-3-5V5h-22l-2 4-2-4h-18v8l-3 5-3-5V5h-24l-2 4-2-4H4z" />
                ) : (
                  <path d="M5 2h28l-3 10c-.6 2-3.4 2-4 0L24 6h-8l-1 12c-.2 3-4.8 3-5 0L9 6H5V2Zm54 0h32l-2 7c-.6 2-3.4 2-4 0l-1-3H74l-1 12c-.2 3-4.8 3-5 0L67 6h-8V2Zm53 0h36l-2 12c-.4 3-4.6 3-5 0l-1-8h-8l-1 13c-.2 3-4.8 3-5 0l-1-13h-11l-1 8c-.4 3-4.6 3-5 0l-1-12Zm59 0h32l-2 8c-.6 2-3.4 2-4 0l-1-4h-9l-1 10c-.3 3-4.7 3-5 0l-1-10h-8l-1 12c-.2 3-4.8 3-5 0l-1-16Zm51 0h33l-2 11c-.4 3-4.6 3-5 0l-1-7h-8l-1 13c-.2 3-4.8 3-5 0l-1-13h-10V2Z" />
                )}
              </svg>
            </div>
            <p className="sp__subtitle">ТВОЙ МИР · ТВОИ ИСТОРИИ</p>
          </div>
        </div>

        <div className="sp__loading">
          <div className="sp__track" role="progressbar" aria-label="Загрузка" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="sp__bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="sp__loading-label">{loadingText}</span>
          {maskRevealed && <span className="sp__hint">Нажмите на эмблему, чтобы продолжить</span>}
        </div>
      </div>
    </div>
  );
};

export default SplashPage;

