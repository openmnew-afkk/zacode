import React, { useEffect, useState, useRef } from 'react';
import './SplashPage.css';

interface SplashPageProps {
  onDone?: () => void;
}

/* Постеры топ-фильмов для фона splash (TMDB) */
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

const SplashPage: React.FC<SplashPageProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logoReady, setLogoReady] = useState(false);
  const [textReady, setTextReady] = useState(false);

  useEffect(() => {
    // Прогресс-бар
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return p + Math.random() * 6 + 2;
      });
    }, 50);

    // Анимация появления
    const t1 = setTimeout(() => setLogoReady(true), 200);
    const t2 = setTimeout(() => setTextReady(true), 600);

    // Закрытие
    const t3 = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 500);
    }, 2200);

    return () => { clearInterval(iv); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`sp ${fading ? 'sp--fade' : ''}`}>
      {/* Фон — постеры фильмов с blur */}
      <div className="sp__posters">
        {POSTERS.map((p, i) => (
          <div key={i} className="sp__poster" style={{ backgroundImage: `url(${p})` }} />
        ))}
      </div>
      <div className="sp__overlay" />

      {/* Светящиеся частицы */}
      <div className="sp__particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="sp__particle" style={{
            left: `${8 + Math.random() * 84}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2.5 + Math.random() * 2}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }} />
        ))}
      </div>

      {/* Контент */}
      <div className="sp__content">
        {/* Логотип */}
        <div className={`sp__logo ${logoReady ? 'sp__logo--in' : ''}`}>
          <div className="sp__logo-glow" />
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="sp__logo-icon">
            <defs>
              <linearGradient id="spg1" x1="0" y1="0" x2="72" y2="72">
                <stop stopColor="#c084fc"/><stop offset="1" stopColor="#f472b6"/>
              </linearGradient>
              <linearGradient id="spg2" x1="24" y1="22" x2="52" y2="52">
                <stop stopColor="#f0abfc"/><stop offset="1" stopColor="#ec4899"/>
              </linearGradient>
            </defs>
            {/* Film frame */}
            <rect x="12" y="16" width="48" height="40" rx="10" stroke="url(#spg1)" strokeWidth="2.5" fill="rgba(255,255,255,0.03)"/>
            {/* Play triangle */}
            <path d="M30 26l18 10-18 10V26z" fill="url(#spg2)"/>
            {/* Film holes top */}
            <circle cx="20" cy="16" r="2" fill="rgba(192,132,252,0.4)"/>
            <circle cx="28" cy="16" r="2" fill="rgba(192,132,252,0.3)"/>
            <circle cx="44" cy="16" r="2" fill="rgba(192,132,252,0.3)"/>
            <circle cx="52" cy="16" r="2" fill="rgba(192,132,252,0.4)"/>
            {/* Film holes bottom */}
            <circle cx="20" cy="56" r="2" fill="rgba(192,132,252,0.4)"/>
            <circle cx="28" cy="56" r="2" fill="rgba(192,132,252,0.3)"/>
            <circle cx="44" cy="56" r="2" fill="rgba(192,132,252,0.3)"/>
            <circle cx="52" cy="56" r="2" fill="rgba(192,132,252,0.4)"/>
          </svg>
        </div>

        {/* Название */}
        <div className={`sp__brand ${textReady ? 'sp__brand--in' : ''}`}>
          <h1 className="sp__title">
            <span className="sp__title-kin">КИНО</span>
            <span className="sp__title-va">ВА</span>
          </h1>
          <p className="sp__tagline">Лучшее кино. Один клик.</p>
        </div>

        {/* Прогресс */}
        <div className={`sp__progress ${textReady ? 'sp__progress--in' : ''}`}>
          <div className="sp__bar">
            <div className="sp__bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="sp__footer">КИНОВА · Telegram Mini App</div>
    </div>
  );
};

export default SplashPage;
