import React from 'react';
import './SplashPage.css';

/* ===== ULTRA PREMIUM Загрузочная страница ===== */
const SplashPage: React.FC = () => {
  return (
    <div className="splash">
      {/* Aurora background is handled by CSS ::before */}

      {/* Floating particles */}
      <div className="splash__particles">
        <div className="splash__particle" />
        <div className="splash__particle" />
        <div className="splash__particle" />
        <div className="splash__particle" />
        <div className="splash__particle" />
      </div>

      <div className="splash__content">
        {/* Logo with spinning ring */}
        <div className="splash__logo-wrap">
          <div className="splash__logo-glow" />
          <div className="splash__logo-ring" />
          <div className="splash__logo">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Film frame */}
              <rect x="6" y="12" width="44" height="32" rx="6"
                stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none" />
              {/* Sprocket holes */}
              <rect x="2" y="16" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="2" y="26" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="2" y="36" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="50" y="16" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="50" y="26" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="50" y="36" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              {/* Play triangle */}
              <path d="M23 21l14 7-14 7V21z" fill="url(#pg)" />
              <defs>
                <linearGradient id="pg" x1="23" y1="21" x2="37" y2="35" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="splash__title">
          <span className="splash__title-tele">Tele</span><span className="splash__title-cinema">Cinema</span>
        </h1>

        {/* Tagline */}
        <p className="splash__tagline">Кино и сериалы онлайн</p>

        {/* Progress bar */}
        <div className="splash__progress-wrap">
          <div className="splash__progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
