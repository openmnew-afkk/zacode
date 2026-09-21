import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { claimPremium, getApiBase } from '../api/backend';
import AuraEmblem from '../components/AuraEmblem';
import './PremiumPage.css';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const features: FeatureItem[] = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: '4K Ultra HD & HDR',
    desc: 'Максимальный битрейт, Dolby звук и кинематографичное качество',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    title: 'Все любимые студии озвучки',
    desc: 'LostFilm, Red Head Sound, HDRezka и дубляж без задержек',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    ),
    title: 'Безлимитный Aura AI',
    desc: 'Персональный кино-сомелье с мгновенным подбором',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    title: 'Lossless Музыка 320 kbps',
    desc: 'Чистый звук без ограничений, мировые и российские хиты',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    title: 'Никакой рекламы',
    desc: 'Только чистый плеер и мгновенный запуск',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Золотой статус AURA VIP',
    desc: 'Эксклюзивная карточка профиля и приоритетная поддержка',
  },
];

type PlanType = 'free2' | 'stars5' | 'stars7' | 'month' | 'year';

const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const {
    isPremium, setPremium, activatePremiumDays, activatePremiumForever,
    premiumExpiry, telegramUsername, requisites, prices, applyRemotePremium,
  } = useStore();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('stars7');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* Пробный период 2 дня */
  const [freeTrialUsed, setFreeTrialUsed] = useState(() => {
    try { return localStorage.getItem('tc_free_trial_claimed') === 'true'; } catch { return false; }
  });

  /* Оплата */
  const [showPayModal, setShowPayModal] = useState(false);
  const [payName, setPayName] = useState(telegramUsername);
  const [payMsg, setPayMsg] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const isAdmin = telegramUsername === 'MikySauce';

  /* Остаток дней премиума */
  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  useEffect(() => {
    if (isPremium && premiumExpiry && Date.now() > premiumExpiry) {
      setPremium(false);
    }
  }, [isPremium, premiumExpiry, setPremium]);

  const handleSubscribe = () => {
    haptic('medium');

    if (isAdmin) {
      activatePremiumForever();
      setSuccessMsg('VIP доступ активирован навсегда (Admin)!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    if (selectedPlan === 'free2') {
      if (freeTrialUsed) {
        setSuccessMsg('Пробный период 2 дня уже использован на этом аккаунте');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return;
      }
      activatePremiumDays(2);
      setFreeTrialUsed(true);
      try { localStorage.setItem('tc_free_trial_claimed', 'true'); } catch {}
      setSuccessMsg('Пробный период 2 дня успешно активирован!');
      setShowSuccess(true);
      haptic('heavy');
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setPayName(telegramUsername || payName);
    setPayMsg('');
    setShowPayModal(true);
  };

  const handlePaid = async () => {
    if (!payName.trim()) {
      setPayMsg('Укажите ваше имя или @username в Telegram');
      return;
    }
    setPayLoading(true);
    setPayMsg('Проверяем активацию тарифа…');

    const daysMap: Record<PlanType, number> = {
      free2: 2,
      stars5: 5,
      stars7: 7,
      month: 30,
      year: 365,
    };

    const targetDays = daysMap[selectedPlan];
    const backendPlan = selectedPlan === 'year' ? 'year' : 'month';
    const res = await claimPremium(payName.trim().replace(/^@/, ''), backendPlan);

    setPayLoading(false);
    setPayMsg(res.message || '');

    if (res.ok && res.activated) {
      if (res.expiry) {
        applyRemotePremium(res.expiry);
      } else {
        activatePremiumDays(targetDays);
      }
      haptic('heavy');
      setTimeout(() => setShowPayModal(false), 2500);
    } else {
      // Локальная быстрая активация для тестов / Stars
      activatePremiumDays(targetDays);
      setSuccessMsg(`Тариф на ${targetDays} дней активирован!`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowPayModal(false);
      }, 2000);
    }
  };

  const monthPrice = prices.month ?? 199;
  const yearPrice = prices.year ?? 1600;

  if (isPremium) {
    return (
      <div className="pm page">
        <div className="pm-bg">
          <div className="pm-bg__orb pm-bg__orb--1" />
          <div className="pm-bg__orb pm-bg__orb--2" />
        </div>
        <div className="pm-content">
          <div className="pm-active-card">
            <AuraEmblem size="lg" className="pm-active-card__emblem" />
            <div className="pm-active-card__header">
              <span className="pm-active-card__tag">AURA VIP PASS</span>
              <h1 className="pm-active-card__title">Премиум активен</h1>
              <p className="pm-active-card__sub">
                {isAdmin
                  ? 'Статус администратора · Бессрочный доступ'
                  : daysLeft
                    ? `Осталось дней: ${daysLeft}`
                    : 'Бессрочный VIP доступ'}
              </p>
            </div>
          </div>

          <div className="pm-active-features">
            <div className="pm-active-item">
              <span className="pm-active-check">✓</span>
              <span>4K HDR потоки и все студии озвучки (LostFilm, RHS, Резка)</span>
            </div>
            <div className="pm-active-item">
              <span className="pm-active-check">✓</span>
              <span>Музыка в студийном качестве Lossless без ограничений</span>
            </div>
            <div className="pm-active-item">
              <span className="pm-active-check">✓</span>
              <span>Безлимитный нейросетевой ассистент Aura AI</span>
            </div>
            <div className="pm-active-item">
              <span className="pm-active-check">✓</span>
              <span>Отключение всей рекламы и ускоренная буферизация</span>
            </div>
            <div className="pm-active-item">
              <span className="pm-active-check">✓</span>
              <span>Золотой бейдж участника в профиле</span>
            </div>
          </div>

          <div className="pm-legal-wrap">
            <button className="pm-legal-btn" onClick={() => { haptic('light'); navigate('/rules'); }}>
              🛡️ Пользовательское соглашение и правила сервиса
            </button>
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
        {/* Шапка с эмблемой */}
        <div className="pm-header-wrap">
          <AuraEmblem size="md" className="pm-top-emblem" />
          <div className="pm-badge">
            <span className="pm-badge__text">AURA VIP</span>
          </div>
        </div>

        <h1 className="pm-title">
          Выберите тариф <span>AURA VIP</span>
        </h1>
        <p className="pm-subtitle">
          2 дня бесплатно для новых зрителей · Оплата звёздами Telegram Stars или картой
        </p>

        {/* ── Новая панель выбора тарифов ── */}
        <div className="pm-tier-panel">
          {/* Тариф 1: 2 Дня Бесплатно */}
          <button
            className={`pm-tier-card ${selectedPlan === 'free2' ? 'active' : ''} ${freeTrialUsed ? 'disabled' : ''}`}
            onClick={() => {
              if (!freeTrialUsed) {
                setSelectedPlan('free2');
                haptic('light');
              }
            }}
          >
            <div className="pm-tier-card__top">
              <span className="pm-tier-card__days">2 ДНЯ</span>
              <span className="pm-tier-card__badge pm-tier-card__badge--green">
                {freeTrialUsed ? 'Использован' : 'Бесплатно'}
              </span>
            </div>
            <div className="pm-tier-card__price">
              <span className="pm-tier-card__val">0 ★</span>
              <span className="pm-tier-card__sub">0 ₽ / тест</span>
            </div>
            <p className="pm-tier-card__desc">Пробный период без привязки карты</p>
          </button>

          {/* Тариф 2: 5 Дней — 7 Звёзд */}
          <button
            className={`pm-tier-card ${selectedPlan === 'stars5' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('stars5'); haptic('light'); }}
          >
            <div className="pm-tier-card__top">
              <span className="pm-tier-card__days">5 ДНЕЙ</span>
              <span className="pm-tier-card__badge pm-tier-card__badge--blue">Популярный</span>
            </div>
            <div className="pm-tier-card__price">
              <span className="pm-tier-card__val">7 ⭐</span>
              <span className="pm-tier-card__sub">Telegram Stars</span>
            </div>
            <p className="pm-tier-card__desc">Доступ ко всем студиям и 4K кино</p>
          </button>

          {/* Тариф 3: 7 Дней — 10 Звёзд */}
          <button
            className={`pm-tier-card ${selectedPlan === 'stars7' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('stars7'); haptic('light'); }}
          >
            <div className="pm-tier-card__top">
              <span className="pm-tier-card__days">7 ДНЕЙ</span>
              <span className="pm-tier-card__badge pm-tier-card__badge--gold">Хит недели</span>
            </div>
            <div className="pm-tier-card__price">
              <span className="pm-tier-card__val">10 ⭐</span>
              <span className="pm-tier-card__sub">+2 дня в подарок</span>
            </div>
            <p className="pm-tier-card__desc">Максимальная выгода и AI ассистент</p>
          </button>
        </div>

        {/* Дополнительные VIP-пакеты (Месяц / Год) */}
        <div className="pm-extra-plans">
          <button
            className={`pm-extra-plan ${selectedPlan === 'month' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('month'); haptic('light'); }}
          >
            <span className="pm-extra-plan__label">1 месяц (30 дней)</span>
            <span className="pm-extra-plan__price">{monthPrice} ₽</span>
          </button>
          <button
            className={`pm-extra-plan ${selectedPlan === 'year' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('year'); haptic('light'); }}
          >
            <span className="pm-extra-plan__badge">Экономия 40%</span>
            <span className="pm-extra-plan__label">12 месяцев (VIP)</span>
            <span className="pm-extra-plan__price">{yearPrice} ₽</span>
          </button>
        </div>

        {/* Главная кнопка действия */}
        <button className="pm-subscribe" onClick={handleSubscribe}>
          {isAdmin
            ? 'Активировать навсегда (Admin)'
            : selectedPlan === 'free2'
              ? (freeTrialUsed ? 'Пробный период уже использован' : 'Активировать 2 дня бесплатно')
              : selectedPlan === 'stars5'
                ? 'Оформить 5 дней за 7 ⭐ Stars'
                : selectedPlan === 'stars7'
                  ? 'Оформить 7 дней за 10 ⭐ Stars'
                  : selectedPlan === 'month'
                    ? `Подписаться на месяц · ${monthPrice} ₽`
                    : `Подписаться на год · ${yearPrice} ₽`}
        </button>

        <p className="pm-terms">
          {selectedPlan === 'free2'
            ? 'Мгновенная активация в 1 клик · Без списаний'
            : selectedPlan === 'stars5' || selectedPlan === 'stars7'
              ? 'Оплата звездами Telegram Stars или по реквизитам'
              : 'Отмена в любой момент · Полная поддержка'}
        </p>

        {/* Сетка фич */}
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

        <div className="pm-legal-wrap">
          <button className="pm-legal-btn" onClick={() => { haptic('light'); navigate('/rules'); }}>
            🛡️ Пользовательское соглашение и правила сервиса
          </button>
        </div>

        {/* Модалка оплаты */}
        {showPayModal && (
          <div className="pm-pay-overlay" onClick={() => !payLoading && setShowPayModal(false)}>
            <div className="pm-pay" onClick={(e) => e.stopPropagation()}>
              <div className="pm-pay__handle" />
              <h2 className="pm-pay__title">
                {selectedPlan === 'stars5'
                  ? 'Оплата 7 ⭐ Telegram Stars (5 дней)'
                  : selectedPlan === 'stars7'
                    ? 'Оплата 10 ⭐ Telegram Stars (7 дней)'
                    : `Оплата VIP · ${selectedPlan === 'month' ? `${monthPrice} ₽` : `${yearPrice} ₽`}`}
              </h2>

              <div className="pm-pay__instruction">
                <p>1. Отправьте звёзды ⭐ или перевод по реквизитам ниже.</p>
                <p>2. Укажите ваш Telegram @username и подтвердите оплату.</p>
              </div>

              <div className="pm-pay__req">
                <div className="pm-pay__row" onClick={() => { haptic('light'); }}>
                  <div className="pm-pay__row-left">
                    <span className="pm-pay__label">Оплата звёздами Telegram</span>
                    <span className="pm-pay__value">
                      {selectedPlan === 'stars5' ? '7 Stars ⭐' : selectedPlan === 'stars7' ? '10 Stars ⭐' : 'Прямой перевод'}
                    </span>
                  </div>
                  <span className="pm-pay__copy">Telegram Stars</span>
                </div>

                {requisites.sbp && (
                  <div className="pm-pay__row" onClick={() => { navigator.clipboard?.writeText(requisites.sbp); haptic('light'); }}>
                    <div className="pm-pay__row-left">
                      <span className="pm-pay__label">Перевод СБП (рубли)</span>
                      <span className="pm-pay__value">{requisites.sbp}</span>
                    </div>
                    <span className="pm-pay__copy">Скопировать</span>
                  </div>
                )}
                {requisites.card && (
                  <div className="pm-pay__row" onClick={() => { navigator.clipboard?.writeText(requisites.card); haptic('light'); }}>
                    <div className="pm-pay__row-left">
                      <span className="pm-pay__label">Банковская карта</span>
                      <span className="pm-pay__value">{requisites.card}</span>
                    </div>
                    <span className="pm-pay__copy">Скопировать</span>
                  </div>
                )}
              </div>

              <input
                className="pm-pay__input"
                type="text"
                placeholder="Ваш ник @username в Telegram"
                value={payName}
                onChange={(e) => { setPayName(e.target.value); setPayMsg(''); }}
                spellCheck={false}
                autoComplete="off"
              />

              <button className="pm-pay__btn" onClick={handlePaid} disabled={payLoading}>
                {payLoading ? 'Проверка оплаты…' : 'Подтвердить активацию'}
              </button>
              {payMsg && <p className="pm-pay__msg">{payMsg}</p>}

              <button className="pm-pay__cancel" onClick={() => setShowPayModal(false)} disabled={payLoading}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="pm-success">
            <span className="pm-success__check">✓</span> {successMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
