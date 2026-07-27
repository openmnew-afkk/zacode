import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import './PremiumPage.css';

const features = [
  { icon: '🎬', title: 'Все новинки', desc: 'Доступ к фильмам в день выхода' },
  { icon: '🎙️', title: 'Все озвучки', desc: 'LostFilm, ColdFilm, RedHead Sound, Кубик в Кубе' },
  { icon: '📺', title: '4K Ultra HD', desc: 'Максимальное качество видео' },
  { icon: '🚫', title: 'Без рекламы', desc: 'Никаких прерываний во время просмотра' },
  { icon: '⬇️', title: 'Скачивание', desc: 'Смотри офлайн без интернета' },
  { icon: '👨‍👩‍👧‍👦', title: 'До 5 устройств', desc: 'Смотри на всех своих устройствах' },
];

const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('month');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubscribe = () => {
    haptic('medium');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="pm page">
      {/* Фоновые эффекты */}
      <div className="pm-bg">
        <div className="pm-bg__orb pm-bg__orb--1" />
        <div className="pm-bg__orb pm-bg__orb--2" />
      </div>

      <div className="pm-content">
        {/* Корона */}
        <div className="pm-crown">
          <span className="pm-crown__icon">👑</span>
          <div className="pm-crown__ring" />
        </div>

        <h1 className="pm-title">TeleCinema<span>Premium</span></h1>
        <p className="pm-subtitle">Кино без границ и рекламы</p>

        {/* Фичи */}
        <div className="pm-features">
          {features.map((f, i) => (
            <div key={i} className="pm-feature">
              <span className="pm-feature__icon">{f.icon}</span>
              <div className="pm-feature__text">
                <span className="pm-feature__title">{f.title}</span>
                <span className="pm-feature__desc">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Планы */}
        <div className="pm-plans">
          <button
            className={`pm-plan ${selectedPlan === 'month' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('month'); haptic('light'); }}
          >
            <span className="pm-plan__period">1 месяц</span>
            <span className="pm-plan__price">100 ₽</span>
            <span className="pm-plan__per">/ мес</span>
          </button>
          <button
            className={`pm-plan ${selectedPlan === 'year' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('year'); haptic('light'); }}
          >
            <span className="pm-plan__badge">-40%</span>
            <span className="pm-plan__period">12 месяцев</span>
            <span className="pm-plan__price">720 ₽</span>
            <span className="pm-plan__per">60 ₽/мес</span>
          </button>
        </div>

        {/* Кнопка подписки */}
        <button className="pm-subscribe" onClick={handleSubscribe}>
          Подписаться · {selectedPlan === 'month' ? '100 ₽/мес' : '720 ₽/год'}
        </button>

        <p className="pm-terms">
          Отмена в любой момент · Первые 3 дня бесплатно
        </p>

        {/* Успех */}
        {showSuccess && (
          <div className="pm-success">
            <span>✅</span> Подписка оформлена!
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
