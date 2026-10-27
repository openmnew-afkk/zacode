import React, { useEffect, useRef, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

type SplashSeason = 'halloween' | 'winter' | 'spring' | 'summer' | 'autumn';

const getSplashSeason = (): SplashSeason => {
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
        <circle cx="220" cy="69" r="37" fill="currentColor" />
        <circle cx="237" cy="55" r="34" fill="#17101d" />
        <path d="M66 68c10-15 22-16 32-1 10-15 22-14 32 1-13-5-21-3-32 7-11-10-19-12-32-7Zm245-30c8-12 18-13 26-1 8-12 18-11 26 1-10-4-17-2-26 6-9-8-16-10-26-6Z" fill="currentColor" />
        <path d="M106 154h47v-33l19 13v-25l22 17v-34l24 26v43h100v-34l20-21 20 21v34h16v12H106Z" fill="currentColor" opacity=".72" />
        <path d="M178 154v-20h17v20m95 0v-21h17v21m-164-2 4-17 4 17m182 0 4-17 4 17" fill="none" stroke="#17101d" strokeWidth="4" />
        <circle cx="113" cy="42" r="2" fill="#fff" />
        <circle cx="354" cy="92" r="2" fill="#fff" />
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
