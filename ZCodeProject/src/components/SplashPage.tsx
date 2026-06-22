import React from 'react';
import './SplashPage.css';

/* ===== Анимированная загрузочная страница ===== */
const SplashPage: React.FC = () => {
  return (
    <div className="splash">
      {/* Aurora background is already on body */}
      <div className="splash__content">
        {/* Иконка-логотип */}
        <div className="splash__logo-wrap">
          <svg className="splash__logo" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cff" />
                <stop offset="50%" stopColor="#21d4fd" />
                <stop offset="100%" stopColor="#ff5c93" />
              </linearGradient>
            </defs>
            {/* Киноплёнка */}
            <rect x="8" y="16" width="64" height="48" rx="8" stroke="url(#splashGrad)" strokeWidth="3" fill="none" />
            <rect x="4" y="12" width="72" height="56" rx="10" stroke="url(#splashGrad)" strokeWidth="1.5" fill="none" opacity="0.4" />
            {/* Кадры плёнки */}
            <rect x="14" y="22" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.8" className="splash__frame splash__frame--1" />
            <rect x="30" y="22" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.6" className="splash__frame splash__frame--2" />
            <rect x="46" y="22" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.4" className="splash__frame splash__frame--3" />
            <rect x="22" y="36" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.7" className="splash__frame splash__frame--4" />
            <rect x="38" y="36" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.5" className="splash__frame splash__frame--5" />
            <rect x="54" y="36" width="12" height="9" rx="2" fill="url(#splashGrad)" opacity="0.3" className="splash__frame splash__frame--6" />
            {/* Звезда */}
            <path d="M40 20L43 30H53L45 36L48 46L40 40L32 46L35 36L27 30H37L40 20Z" fill="url(#splashGrad)" className="splash__star" />
          </svg>
        </div>

        {/* Название */}
        <h1 className="splash__title">
          <span className="splash__title-t">Tele</span><span className="splash__title-c">Cinema</span>
        </h1>

        {/* Теглайн */}
        <p className="splash__tagline">Кино и сериалы онлайн</p>

        {/* Точки */}
        <div className="splash__dots">
          <span className="splash__dot" />
          <span className="splash__dot" />
          <span className="splash__dot" />
          <span className="splash__dot" />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
