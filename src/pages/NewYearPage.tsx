import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import './NewYearPage.css';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  celebrating: boolean;
}

function getCountdown(): Countdown {
  const now = new Date();
  const celebrating = now.getMonth() === 0 && now.getDate() === 1;
  const target = new Date(now.getFullYear() + 1, 0, 1);
  const remaining = celebrating ? 0 : Math.max(0, target.getTime() - now.getTime());
  const seconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    celebrating,
  };
}

const NewYearPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [countdown, setCountdown] = useState(getCountdown);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const openCinema = () => {
    haptic('light');
    navigate('/');
  };

  return (
    <main className="ny-page page">
      <header className="ny-header">
        <button className="ny-back" type="button" onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 18-6-6 6-6M9 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="ny-header__label">ЗИМНЯЯ СКАЗКА ZENOVA</span>
        <span className="ny-header__season" aria-hidden="true">✦</span>
      </header>

      <section className="ny-hero" aria-labelledby="ny-title">
        <div className="ny-hero__copy">
          <span className="ny-eyebrow"><i /> ВРЕМЯ ЗАГАДЫВАТЬ ЖЕЛАНИЯ</span>
          <h1 id="ny-title">
            {countdown.celebrating ? <>С Новым<br />годом!</> : <>Скоро будет<br /><em>чудо.</em></>}
          </h1>
          <p>
            {countdown.celebrating
              ? 'Пусть этот год будет полон историй, которые захочется пересматривать.'
              : 'Завари что-нибудь тёплое, выбери любимый фильм — и пусть зима будет волшебной.'}
          </p>
        </div>

        <div className="ny-tree-scene" aria-hidden="true">
          <div className="ny-tree-scene__halo" />
          <div className="ny-tree-scene__aurora" />
          <div className="ny-tree-scene__stars" aria-hidden="true">✦　·　✧　·　✦</div>
          <svg className="ny-tree" viewBox="0 0 320 380" fill="none">
            <defs>
              <linearGradient id="ny-tree-top" x1="160" y1="35" x2="160" y2="345" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5CF1C4" />
                <stop offset=".48" stopColor="#147E69" />
                <stop offset="1" stopColor="#073E43" />
              </linearGradient>
              <linearGradient id="ny-tree-shadow" x1="95" y1="100" x2="236" y2="293" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0A564E" />
                <stop offset="1" stopColor="#062D35" />
              </linearGradient>
              <linearGradient id="ny-star" x1="160" y1="7" x2="160" y2="52" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF7D6" />
                <stop offset="1" stopColor="#F7C35D" />
              </linearGradient>
              <filter id="ny-star-glow" x="126" y="-8" width="68" height="70" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <ellipse cx="160" cy="348" rx="112" ry="12" fill="#A9E9E0" fillOpacity=".13" />
            <path d="M160 35 126 88h18l-44 53h24l-53 61h35l-66 78h240l-66-78h35l-53-61h24l-44-53h18L160 35Z" fill="url(#ny-tree-top)" />
            <path d="m160 35-34 53h18l-44 53h24l-53 61h35l-66 78h120V35Z" fill="url(#ny-tree-shadow)" fillOpacity=".58" />
            <path d="m143 303 4 43h26l4-43" fill="#785342" />
            <path d="M126 88c21 10 44 10 68 0M100 141c36 13 83 13 120 0M71 202c54 17 123 17 178 0M40 280c69 20 171 20 240 0" stroke="#D9FFF5" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
            <path d="M160 11 167 28l18 1-14 11 5 17-16-10-16 10 5-17-14-11 18-1 7-17Z" fill="url(#ny-star)" filter="url(#ny-star-glow)" />
            <path d="M160 11 167 28l18 1-14 11 5 17-16-10-16 10 5-17-14-11 18-1 7-17Z" fill="url(#ny-star)" />
            <path d="M113 131c22 8 39 7 55-2 17 9 35 10 54 2M77 193c29 12 56 10 83-2 28 12 56 14 83 2M48 269c36 11 74 9 112-4 38 13 76 15 112 4" stroke="#F6D991" strokeOpacity=".86" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="137" cy="102" r="3.5" fill="#FFE7A3" />
            <circle cx="178" cy="117" r="3" fill="#B9F7E7" />
            <circle cx="113" cy="164" r="3.5" fill="#FFE7A3" />
            <circle cx="205" cy="174" r="3.5" fill="#FFE7A3" />
            <circle cx="154" cy="151" r="3" fill="#B9F7E7" />
            <circle cx="94" cy="229" r="3.5" fill="#FFE7A3" />
            <circle cx="222" cy="238" r="3.5" fill="#FFE7A3" />
            <circle cx="161" cy="219" r="3" fill="#B9F7E7" />
            <circle cx="62" cy="292" r="3" fill="#FFE7A3" />
            <circle cx="258" cy="292" r="3" fill="#FFE7A3" />
          </svg>
          <div className="ny-tree-scene__snow ny-tree-scene__snow--one" />
          <div className="ny-tree-scene__snow ny-tree-scene__snow--two" />
        </div>
      </section>

      <section className="ny-countdown" aria-label="Обратный отсчёт до Нового года">
        <div className="ny-countdown__heading">
          <span>{countdown.celebrating ? 'Праздник уже здесь' : 'До боя курантов'}</span>
          <i />
        </div>
        <div className="ny-countdown__units">
          {[
            { label: 'дней', value: countdown.days },
            { label: 'часов', value: countdown.hours },
            { label: 'минут', value: countdown.minutes },
            { label: 'секунд', value: countdown.seconds },
          ].map((unit) => (
            <div className="ny-time" key={unit.label}>
              <strong>{String(unit.value).padStart(2, '0')}</strong>
              <span>{unit.label}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="ny-note">
        <span aria-hidden="true">✧</span>
        Самое уютное время — то, что мы проводим за хорошей историей.
      </p>

      <div className="ny-actions">
        <button className="ny-action ny-action--primary" type="button" onClick={openCinema}>
          <span>Выбрать фильм</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="ny-action ny-action--secondary" type="button" onClick={() => navigate('/music')}>
          <span aria-hidden="true">♫</span>
          Музыка для вечера
        </button>
      </div>
    </main>
  );
};

export default NewYearPage;
