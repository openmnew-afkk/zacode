import React from 'react';
import './SplashPage.css';

/* ===== Загрузочная страница ===== */
const SplashPage: React.FC = () => {
  return (
    <div className="splash">
      <div className="splash__content">
        <div className="splash__logo">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="16" width="64" height="48" rx="8" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.6" />
            <path d="M34 32l14 8-14 8V32z" fill="currentColor" />
          </svg>
        </div>
        <h1 className="splash__title">
          <span>Tele</span><span>Cinema</span>
        </h1>
        <p className="splash__subtitle">Загрузка…</p>
      </div>
    </div>
  );
};

export default SplashPage;
