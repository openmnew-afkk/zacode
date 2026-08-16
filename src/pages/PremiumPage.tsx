import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './PremiumPage.css';

const features = [
  { icon: '🔥', title: 'LostFilm озвучка', desc: 'Эксклюзивная озвучка LostFilm для сериалов' },
  { icon: '🔴', title: 'RedHeadSound', desc: 'Профессиональный перевод RedHeadSound' },
  { icon: '❄️', title: 'ColdFilm', desc: 'Озвучка ColdFilm для фильмов и сериалов' },
  { icon: '🚫', title: 'Без рекламы', desc: 'Смотри без прерываний и баннеров' },
  { icon: '⬇️', title: 'Скачивание', desc: 'Сохраняй фильмы для офлайн просмотра' },
  { icon: '📺', title: 'Full HD / 4K', desc: 'Максимальное качество без ограничений' },
  { icon: '🎬', title: 'Ранний доступ', desc: 'Новинки за 24ч до общего доступа' },
  { icon: '👨‍👩‍👧‍👦', title: 'До 5 устройств', desc: 'Телефон, планшет, ноутбук и ТВ' },
];

const PremiumPage: React.FC = () => {
  const { haptic } = useTelegram();
  const { isPremium, setPremium, telegramUsername } = useStore();
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('year');
  const [showSuccess, setShowSuccess] = useState(false);

  const isAdmin = telegramUsername === 'MikySauce';

  const handleSubscribe = () => {
    haptic('medium');
    // Для @MikySauce — бесплатно
    if (isAdmin) {
      setPremium(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }
    // Для остальных — показать что нужно оплатить
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  if (isPremium) {
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
          <h1 className="pm-title">Премиум <span>активен</span></h1>
          <p className="pm-subtitle">Все функции разблокированы</p>
          <div className="pm-active-features">
            <div className="pm-active-item">✅ LostFilm, RedHeadSound, ColdFilm</div>
            <div className="pm-active-item">✅ Без рекламы</div>
            <div className="pm-active-item">✅ Скачивание</div>
            <div className="pm-active-item">✅ Full HD / 4K</div>
            <div className="pm-active-item">✅ Ранний доступ к новинкам</div>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="pm-plan__price">199 ₽</span>
            <span className="pm-plan__per">/ мес</span>
          </button>
          <button
            className={`pm-plan ${selectedPlan === 'year' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('year'); haptic('light'); }}
          >
            <span className="pm-plan__badge">Выгодно</span>
            <span className="pm-plan__period">12 месяцев</span>
            <span className="pm-plan__price">2 400 ₽</span>
            <span className="pm-plan__per">200 ₽/мес</span>
          </button>
        </div>

        <button className="pm-subscribe" onClick={handleSubscribe}>
          {isAdmin ? '👑 Активировать бесплатно' : `Подписаться · ${selectedPlan === 'month' ? '199 ₽/мес' : '2 400 ₽/год'}`}
        </button>

        <p className="pm-terms">
          Отмена в любой момент · Первые 3 дня бесплатно
        </p>

        {showSuccess && (
          <div className="pm-success">
            <span>✓</span> {isAdmin ? 'Премиум активирован!' : 'Оплата будет доступна в ближайшее время!'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
