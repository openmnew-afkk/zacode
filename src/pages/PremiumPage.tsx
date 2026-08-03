import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import './PremiumPage.css';

const features = [
  { icon: '🎬', title: 'Все новинки', desc: 'Фильмы и сериалы в день премьеры' },
  { icon: '🎙️', title: 'Русская озвучка', desc: 'Несколько источников с русской дорожкой' },
  { icon: '📺', title: 'Full HD', desc: 'Чёткая картинка без тормозов' },
  { icon: '🚫', title: 'Без рекламы', desc: 'Смотри без прерываний' },
  { icon: '⬇️', title: 'Офлайн', desc: 'Сохраняй и смотри без интернета' },
  { icon: '👨‍👩‍👧‍👦', title: 'До 5 устройств', desc: 'Телефон, планшет и ТВ' },
];

const PremiumPage: React.FC = () => {
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
      <div className="pm-bg">
        <div className="pm-bg__orb pm-bg__orb--1" />
        <div className="pm-bg__orb pm-bg__orb--2" />
      </div>

      <div className="pm-content">
        <div className="pm-crown">
          <span className="pm-crown__icon">👑</span>
          <div className="pm-crown__ring" />
        </div>

        <h1 className="pm-title">КиноЗал<span>Премиум</span></h1>
        <p className="pm-subtitle">Кино без границ и рекламы</p>

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
            <span className="pm-plan__badge">−40%</span>
            <span className="pm-plan__period">12 месяцев</span>
            <span className="pm-plan__price">720 ₽</span>
            <span className="pm-plan__per">60 ₽/мес</span>
          </button>
        </div>

        <button className="pm-subscribe" onClick={handleSubscribe}>
          Подписаться · {selectedPlan === 'month' ? '100 ₽/мес' : '720 ₽/год'}
        </button>

        <p className="pm-terms">
          Отмена в любой момент · Первые 3 дня бесплатно
        </p>

        {showSuccess && (
          <div className="pm-success">
            <span>✓</span> Подписка оформлена!
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
