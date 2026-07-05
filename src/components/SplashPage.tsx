import React from 'react';
import './SplashPage.css';

const SplashPage: React.FC = () => {
  return (
    <div className="splash">
      <div className="splash__aurora" />
      <div className="splash__film-strip">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="splash__film-frame" />
        ))}
      </div>

      <div className="splash__particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="splash__particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      <div className="splash__content">
        <div className="splash__logo-wrap">
          <div className="splash__logo-orbit" />
          <div className="splash__logo-ring" />
          <div className="splash__logo">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="14" width="40" height="28" rx="5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" fill="none"/>
              <path d="M24 22l14 6-14 6V22z" fill="url(#splash-play)"/>
              <defs>
                <linearGradient id="splash-play" x1="24" y1="22" x2="38" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0a84ff"/>
                  <stop offset="1" stopColor="#64d2ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h1 className="splash__title">
          <span className="splash__title-main">Tele</span>
          <span className="splash__title-accent">Cinema</span>
        </h1>
        <p className="splash__tagline">Кино и сериалы онлайн</p>

        <div className="splash__loader">
          <div className="splash__loader-track">
            <div className="splash__loader-bar" />
          </div>
          <span className="splash__loader-text">Загрузка…</span>
        </div>
      </div>
    </div>
  );
};

export default SplashPage;
