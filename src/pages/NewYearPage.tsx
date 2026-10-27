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
          <div className="ny-tree-scene__globe"><span /></div>
          <div className="ny-tree-scene__globe-base" />
          <div className="ny-tree-scene__stars">✦　·　✧　　·　✦</div>
          <svg className="ny-tree" viewBox="0 0 280 340" fill="none">
            <defs>
              <linearGradient id="ny-tree-top" x1="140" y1="35" x2="140" y2="135" gradientUnits="userSpaceOnUse">
                <stop stopColor="#66E3B2" />
                <stop offset="1" stopColor="#117B68" />
              </linearGradient>
              <linearGradient id="ny-tree-mid" x1="140" y1="92" x2="140" y2="228" gradientUnits="userSpaceOnUse">
                <stop stopColor="#40C89A" />
                <stop offset="1" stopColor="#075B53" />
              </linearGradient>
              <linearGradient id="ny-tree-base" x1="140" y1="163" x2="140" y2="292" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2DB88A" />
                <stop offset="1" stopColor="#06443F" />
              </linearGradient>
              <linearGradient id="ny-star" x1="140" y1="13" x2="140" y2="58" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF7D6" />
                <stop offset="1" stopColor="#F4B95F" />
              </linearGradient>
              <filter id="ny-star-glow" x="106" y="0" width="68" height="70" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <ellipse cx="140" cy="311" rx="91" ry="13" fill="#A9E9E0" fillOpacity=".15" />
            <path d="m140 38-42 71h23l-43 68h34l-51 78h158l-51-78h34l-43-68h23l-42-71Z" fill="url(#ny-tree-base)" />
            <path d="m140 38-42 71h23l-43 68h34l-51 78h79V38Z" fill="url(#ny-tree-top)" fillOpacity=".45" />
            <path d="m119 274 5 38h32l5-38" fill="#9A5E45" />
            <path d="M110 105c16 10 38 10 57 0M92 176c31 14 67 14 97 0M78 253c40 17 85 17 124 0" stroke="#D7FFF0" strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />
            <path d="M140 14 147 31l18 1-14 11 5 17-16-10-16 10 5-17-14-11 18-1 7-17Z" fill="url(#ny-star)" filter="url(#ny-star-glow)" />
            <path d="M140 14 147 31l18 1-14 11 5 17-16-10-16 10 5-17-14-11 18-1 7-17Z" fill="url(#ny-star)" />
            <path d="M106 119c23 13 48 13 69 0M93 191c31 17 63 17 94 0M80 267c38 17 82 17 120 0" stroke="#F9DDA8" strokeOpacity=".8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="117" cy="91" r="5" fill="#F5C774" />
            <circle cx="158" cy="112" r="4" fill="#F4A8B5" />
            <circle cx="97" cy="163" r="5" fill="#B5C9FF" />
            <circle cx="176" cy="167" r="5" fill="#F5C774" />
            <circle cx="132" cy="147" r="4" fill="#F4A8B5" />
            <circle cx="113" cy="225" r="5" fill="#F4A8B5" />
            <circle cx="164" cy="231" r="5" fill="#B5C9FF" />
            <circle cx="144" cy="205" r="4" fill="#F5C774" />
            <circle cx="95" cy="245" r="3" fill="#F5C774" />
            <circle cx="188" cy="245" r="3" fill="#F4A8B5" />
            <path d="M45 95h8m-4-4v8m170 19h8m-4-4v8M57 213h7m-3.5-3.5v7" stroke="#D8EDFF" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="ny-tree-scene__snow ny-tree-scene__snow--one" />
          <div className="ny-tree-scene__snow ny-tree-scene__snow--two" />
          <div className="ny-tree-scene__gift ny-tree-scene__gift--one"><i /></div>
          <div className="ny-tree-scene__gift ny-tree-scene__gift--two"><i /></div>
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
