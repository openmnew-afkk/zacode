import React, { useEffect, useRef, useState } from 'react';
import { getStoredSeason } from '../services/seasons';
import SeasonalMask from './SeasonalMask';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

type SplashSeason = 'halloween' | 'winter' | 'spring' | 'summer' | 'autumn';

const getSplashSeason = (): SplashSeason => {
  const stored = getStoredSeason();
  if (!stored.auto && stored.season.id !== 'none') {
    return stored.season.id === 'autumn' ? 'halloween' : stored.season.id;
  }
  const month = new Date().getMonth() + 1;
  if (month === 10) return 'halloween';
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
};

const SeasonArtwork: React.FC<{ season: SplashSeason }> = ({ season }) => {
  const artwork = {
    halloween: (
      <>
        <path d="M58 167c50-13 100-7 144 1 61-12 115-10 180 2" fill="none" stroke="#f08a58" strokeOpacity=".22" strokeWidth="2" />
        <circle cx="220" cy="69" r="37" fill="currentColor" />
        <circle cx="237" cy="55" r="34" fill="#17101d" />
        <path d="M66 68c10-15 22-16 32-1 10-15 22-14 32 1-13-5-21-3-32 7-11-10-19-12-32-7Zm245-30c8-12 18-13 26-1 8-12 18-11 26 1-10-4-17-2-26 6-9-8-16-10-26-6Z" fill="currentColor" />
        <path d="M276 157V96l36-28 37 28v61h-73Z" fill="#1d1727" stroke="currentColor" strokeOpacity=".65" strokeWidth="2" />
        <path d="m267 99 45-37 47 37h-14l-33-26-31 26h-14Z" fill="#282033" stroke="currentColor" strokeOpacity=".72" strokeWidth="2" />
        <path d="M302 157v-25a10 10 0 0 1 20 0v25m-37-40h11v13h-11Zm39 0h11v13h-11Z" fill="#f3a45f" fillOpacity=".8" />
        <path d="M108 157c0-23 13-38 30-38 18 0 29 15 29 38l-8 9h-42l-9-9Z" fill="#e9e2ef" fillOpacity=".9" />
        <circle cx="129" cy="145" r="3" fill="#272033" />
        <circle cx="143" cy="145" r="3" fill="#272033" />
        <path d="M130 153q6 6 12 0" fill="none" stroke="#272033" strokeLinecap="round" strokeWidth="2" />
        <path d="M202 158c0-12 9-21 20-21s20 9 20 21c0 3-1 6-2 8h-36c-1-2-2-5-2-8Z" fill="#e98145" />
        <path d="M218 139c-2-5 1-9 5-12 5 5 6 9 3 13" fill="#83a86b" />
        <path d="m213 153-3 5 7-1m9-4 3 5-7-1" fill="#261b27" />
        <path d="M225 165v7m-13-7v7m21-5 6 4m-33-4-6 4" stroke="#e98145" strokeLinecap="round" strokeWidth="2" />
        <path d="M95 175h237" stroke="#100d16" strokeLinecap="round" strokeWidth="5" opacity=".8" />
        <circle cx="113" cy="42" r="2" fill="#fff" />
        <circle cx="354" cy="92" r="2" fill="#fff" />
        <circle cx="184" cy="109" r="1.5" fill="#fff" opacity=".75" />
      </>
    ),
    winter: (
      <>
        <path d="M54 132c42-31 70-34 108-8 39-41 79-46 118-10 33-27 67-28 106-3v53H54Z" fill="currentColor" opacity=".2" />
        <path d="m140 134 34-33 34 33v35h-68Zm13 0v-20h17v20Zm42 22h12v13h-12Zm-43-4h14v14h-14Z" fill="currentColor" opacity=".75" />
        <path d="M88 165c22-13 43-12 64 0m118-1c23-16 49-15 77 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".6" />
        <path d="m290 97 6 13 13 1-10 9 3 13-12-7-11 7 3-13-10-9 13-1 5-13ZM94 58l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 10-1 3-9Z" fill="currentColor" opacity=".78" />
        <circle cx="344" cy="58" r="2.5" fill="currentColor" />
        <circle cx="243" cy="45" r="2" fill="currentColor" />
      </>
    ),
    spring: (
      <>
        <path d="M120 159c45-28 55-68 97-101 26-20 54-22 86-12M190 117c-7-28-25-38-48-38m98 3c6-27 24-37 49-39m-77 89c27-3 43 7 52 27" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" opacity=".75" />
        <g fill="currentColor">
          <circle cx="144" cy="79" r="8" /><circle cx="134" cy="89" r="8" /><circle cx="154" cy="89" r="8" /><circle cx="144" cy="99" r="8" /><circle cx="144" cy="89" r="5" fill="#fff1d9" />
          <circle cx="291" cy="40" r="8" /><circle cx="281" cy="50" r="8" /><circle cx="301" cy="50" r="8" /><circle cx="291" cy="60" r="8" /><circle cx="291" cy="50" r="5" fill="#fff1d9" />
          <circle cx="299" cy="150" r="7" /><circle cx="290" cy="159" r="7" /><circle cx="308" cy="159" r="7" /><circle cx="299" cy="168" r="7" /><circle cx="299" cy="159" r="4" fill="#fff1d9" />
        </g>
        <path d="M98 123c7-8 15-8 22 0-7 8-15 8-22 0Zm212-63c7-8 15-8 22 0-7 8-15 8-22 0Z" fill="currentColor" opacity=".56" />
      </>
    ),
    summer: (
      <>
        <circle cx="222" cy="79" r="31" fill="currentColor" opacity=".8" />
        <path d="M40 143c38-24 70-24 108 0 37-24 73-24 111 0 39-24 78-24 119 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" opacity=".66" />
        <path d="M57 161c40-19 73-18 109 1 36-19 72-19 108 0 35-19 71-20 109-1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".42" />
        <path d="M222 32V22m0 115v-10m47-48h11m-126 0h11m90-34 8-8m-82 82 8-8m0-66-8-8m82 82-8-8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".65" />
        <circle cx="103" cy="72" r="2" fill="currentColor" />
        <circle cx="336" cy="94" r="2" fill="currentColor" />
      </>
    ),
    autumn: (
      <>
        <path d="M109 145c23-50 67-73 132-69-9 59-42 97-96 105 13-27 31-48 59-67-31 11-59 24-95 31Z" fill="currentColor" opacity=".68" />
        <path d="M144 168c30-28 56-46 91-66" fill="none" stroke="#1b1218" strokeWidth="2" opacity=".45" />
        <path d="M270 63c10-25 34-36 70-31-5 33-23 53-54 57 8-15 19-27 35-38-18 6-34 13-51 12Z" fill="currentColor" opacity=".48" />
        <path d="M293 84c15-14 28-23 45-33" fill="none" stroke="#1b1218" strokeWidth="1.5" opacity=".45" />
        <circle cx="91" cy="69" r="2" fill="currentColor" />
        <circle cx="357" cy="120" r="2" fill="currentColor" />
        <path d="M340 62c-4 9-4 16 1 23m-230 5c-5 9-5 16 0 23" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".55" />
      </>
    ),
  }[season];

  return (
    <svg className="sp__season-artwork" viewBox="0 0 440 190" aria-hidden="true" focusable="false">
      {artwork}
    </svg>
  );
};

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const season = getSplashSeason();
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
    <div className={`sp sp--${season} ${fading ? 'sp--fade' : ''}`} role="status" aria-label="Загрузка ZENOVA">
      {/* Мягкое глубинное свечение */}
      <SeasonArtwork season={season} />
      <div className="sp__ambient" />
      <div className="sp__starfield" aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <div className="sp__container">
        <div className="sp__identity">
          <div className="sp__emblem-wrap">
            <div className="sp__projector-beam" aria-hidden="true" />
            <SeasonalMask
              season={season === 'halloween' ? 'autumn' : season}
              className="sp__emblem"
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
          <span className="sp__loading-label">СЛЕДУЮЩАЯ СЦЕНА УЖЕ БЛИЗКО</span>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
