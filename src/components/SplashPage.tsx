import React, { useEffect, useState } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

/* Постеры культовых шедевров для фона splash (TMDB) */
const POSTERS = [
  'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', // Inception
  'https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', // Shawshank
  'https://image.tmdb.org/t/p/w342/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg', // The Dark Knight
  'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', // Fight Club
  'https://image.tmdb.org/t/p/w342/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', // Dune
  'https://image.tmdb.org/t/p/w342/t9XkeE7HzOsdQcDDDapDYh8Rrmt.jpg', // Spider-Man
  'https://image.tmdb.org/t/p/w342/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', // Deadpool
  'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911BWtQlMM7CKhT.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w342/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', // Gladiator
  'https://image.tmdb.org/t/p/w342/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', // LOTR
  'https://image.tmdb.org/t/p/w342/7WsyChQLEftFiDhRkUUaT4C2RKg.jpg', // Matrix
];

const HINTS = [
  'Синхронизация с серверами…',
  'Подготовка 4K каталога…',
  'Загрузка музыки и трендов…',
  'Добро пожаловать в KINOVERSE',
];

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logoReady, setLogoReady] = useState(false);
  const [textReady, setTextReady] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    // Прогресс загрузки
    const iv = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(iv);
          return 100;
        }
        return p + Math.random() * 8 + 3;
      });
    }, 45);

    // Смена статусов
    const hIv = setInterval(() => {
      setHintIndex((i) => (i < HINTS.length - 1 ? i + 1 : i));
    }, 550);

    // Появление элементов
    const t1 = setTimeout(() => setLogoReady(true), 150);
    const t2 = setTimeout(() => setTextReady(true), 500);

    // Завершение сплеша
    const t3 = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 480);
    }, 2100);

    return () => {
      clearInterval(iv);
      clearInterval(hIv);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`}>
      {/* Фон — плавающий кинематографичный коллаж */}
      <div className="sp__posters">
        {POSTERS.map((p, i) => (
          <div key={i} className="sp__poster" style={{ backgroundImage: `url(${p})` }} />
        ))}
      </div>
      <div className="sp__overlay" />

      {/* Светящиеся звездные частицы */}
      <div className="sp__particles">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="sp__particle"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${8 + Math.random() * 84}%`,
              animationDelay: `${Math.random() * 2.5}s`,
              animationDuration: `${2 + Math.random() * 2.5}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>

      {/* Контент сплеша */}
      <div className="sp__content">
        {/* Логотип KINOVERSE: объектив + орбита + призма */}
        <div className={`sp__logo ${logoReady ? 'sp__logo--in' : ''}`}>
          <div className="sp__logo-glow" />
          <svg width="84" height="84" viewBox="0 0 84 84" fill="none" className="sp__logo-icon">
            <defs>
              <linearGradient id="kinoverseGrad1" x1="0" y1="0" x2="84" y2="84">
                <stop stopColor="#a855f7" />
                <stop offset="0.5" stopColor="#ec4899" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="kinoverseGrad2" x1="28" y1="26" x2="60" y2="58">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#c084fc" />
              </linearGradient>
              <filter id="neonBloom" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Внешнее кольцо орбиты */}
            <circle cx="42" cy="42" r="34" stroke="url(#kinoverseGrad1)" strokeWidth="2.5" opacity="0.6" />
            <ellipse cx="42" cy="42" rx="38" ry="14" stroke="url(#kinoverseGrad1)" strokeWidth="1.5" transform="rotate(-25 42 42)" opacity="0.85" />
            
            {/* Внутренняя кинолинза */}
            <rect x="22" y="24" width="40" height="36" rx="12" fill="rgba(255, 255, 255, 0.05)" stroke="url(#kinoverseGrad1)" strokeWidth="2" />
            {/* Кнопка Play / Призма */}
            <path d="M36 32L54 42L36 52V32Z" fill="url(#kinoverseGrad2)" filter="url(#neonBloom)" />
            {/* Квантовые искры */}
            <circle cx="28" cy="24" r="1.8" fill="#38bdf8" />
            <circle cx="56" cy="24" r="1.8" fill="#f472b6" />
            <circle cx="28" cy="60" r="1.8" fill="#c084fc" />
            <circle cx="56" cy="60" r="1.8" fill="#38bdf8" />
          </svg>
        </div>

        {/* Название KINOVERSE */}
        <div className={`sp__brand ${textReady ? 'sp__brand--in' : ''}`}>
          <h1 className="sp__title">
            <span className="sp__title-kino">KINO</span>
            <span className="sp__title-verse">VERSE</span>
          </h1>
          <p className="sp__tagline">Вселенная кино и музыки</p>
        </div>

        {/* Прогресс-бар с живым статусом */}
        <div className={`sp__progress ${textReady ? 'sp__progress--in' : ''}`}>
          <div className="sp__bar">
            <div className="sp__bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className="sp__hint">{HINTS[hintIndex]}</span>
        </div>
      </div>

      <div className="sp__footer">KINOVERSE · PREMIUM CINEMA PLATFORM</div>
    </div>
  );
};

export default SplashPage;
