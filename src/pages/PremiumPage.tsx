import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { claimPremium, getApiBase } from '../api/backend';
import AuraEmblem from '../components/AuraEmblem';
import './PremiumPage.css';
import './PremiumRoulette.css';

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
    desc: 'LostFilm, Red Head Sound, HDRezka и дубляж без очередей',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    ),
    title: 'Безлимитный Aura AI',
    desc: 'Персональный кино-сомелье с подбором под ваше настроение',
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
    desc: 'Чистый звук без ограничений, мировые и российские релизы',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    title: 'Никакой навязчивой рекламы',
    desc: 'Только кино, музыка и абсолютный комфорт',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Золотой статус AURA VIP',
    desc: 'Эксклюзивное оформление профиля и значок участника',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Календарь релизов и серий',
    desc: 'Мгновенные уведомления о выходе новых серий и переводов',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Приоритетный CDN доступ',
    desc: 'Высочайшая скорость буферизации видео без пауз',
  },
];

const ROULETTE_PRIZES = [3, 5, 7, 3, 5, 3, 7, 3];
const ROULETTE_LABELS = ['3 дня', '5 дней', '7 дней', '3 дня', '5 дней', '3 дня', '7 дней', '3 дня'];

const PremiumPage: React.FC = () => {
  const { haptic } = useTelegram();
  const {
    isPremium, setPremium, activatePremiumDays, activatePremiumForever,
    premiumExpiry, telegramUsername, requisites, prices, applyRemotePremium,
  } = useStore();
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('year');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* Оплата по реквизитам */
  const [showPayModal, setShowPayModal] = useState(false);
  const [payName, setPayName] = useState(telegramUsername);
  const [payMsg, setPayMsg] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Рулетка
  const [spinning, setSpinning] = useState(false);
  const [rouletteUsed, setRouletteUsed] = useState(() => {
    try { return localStorage.getItem('tc_roulette_used') === 'true'; } catch { return false; }
  });
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const isAdmin = telegramUsername === 'MikySauce';
  const [isFirstPurchase] = useState(() => {
    try { return !localStorage.getItem('tc_first_purchase_done'); } catch { return true; }
  });

  /* Остаток дней премиума */
  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  /* Проверка истечения срока */
  useEffect(() => {
    if (isPremium && premiumExpiry && Date.now() > premiumExpiry) {
      setPremium(false);
    }
  }, [isPremium, premiumExpiry, setPremium]);

  const handleSpin = () => {
    if (spinning || rouletteUsed) return;
    haptic('medium');
    setSpinning(true);

    const rand = Math.random();
    let prizeIdx: number;
    if (rand < 0.5) prizeIdx = 0;
    else if (rand < 0.8) prizeIdx = 1;
    else prizeIdx = 2;

    const prizeDays = ROULETTE_PRIZES[prizeIdx];
    const segAngle = 360 / ROULETTE_PRIZES.length;
    const targetAngle = 360 * 5 + (360 - prizeIdx * segAngle - segAngle / 2);

    setRouletteAngle(targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setRouletteResult(prizeDays);
      setRouletteUsed(true);
      try { localStorage.setItem('tc_roulette_used', 'true'); } catch {}
      activatePremiumDays(prizeDays);
      haptic('heavy');
    }, 4000);
  };

  const handleSubscribe = () => {
    haptic('medium');
    if (isAdmin) {
      activatePremiumForever();
      setSuccessMsg('VIP доступ активирован навсегда!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }
    setPayName(telegramUsername || payName);
    setPayMsg('');
    setShowPayModal(true);
  };

  const handlePaid = async () => {
    if (!payName.trim()) {
      setPayMsg('Укажите ваше имя или @username');
      return;
    }
    setPayLoading(true);
    setPayMsg('Проверяем поступление средств…');
    const res = await claimPremium(payName.trim().replace(/^@/, ''), selectedPlan);
    setPayLoading(false);
    setPayMsg(res.message || '');
    if (res.ok && res.activated) {
      if (res.expiry) {
        applyRemotePremium(res.expiry);
      } else {
        activatePremiumDays(selectedPlan === 'year' ? 365 : 30);
      }
      haptic('heavy');
      setTimeout(() => setShowPayModal(false), 2500);
    }
  };

  const monthPrice = isFirstPurchase ? (prices.monthFirst ?? 99) : (prices.month ?? 199);
  const yearPrice = isFirstPurchase ? (prices.yearFirst ?? 1600) : (prices.year ?? 2400);
  const yearMonthly = Math.round(yearPrice / 12);

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
              <span>Персональный дневник, календарь и расширенная статистика</span>
            </div>
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
        {/* Верхняя эмблема и бейдж */}
        <div className="pm-header-wrap">
          <AuraEmblem size="md" className="pm-top-emblem" />
          <div className="pm-badge">
            <span className="pm-badge__text">AURA VIP</span>
          </div>
        </div>

        <h1 className="pm-title">
          Кино & Звук <span>без ограничений</span>
        </h1>
        <p className="pm-subtitle">
          4K потоки, озвучки LostFilm и Red Head Sound, музыка Lossless и нейросеть
        </p>

        {/* 🎰 Рулетка */}
        {!rouletteUsed && !rouletteResult && (
          <div className="pm-roulette">
            <div className="pm-roulette__head">
              <span className="pm-roulette__badge">Колесо Фортуны</span>
              <h2 className="pm-roulette__title">Испытай удачу</h2>
              <p className="pm-roulette__desc">Крути и получи бесплатные дни AURA VIP</p>
            </div>
            <div className="pm-roulette__wheel-wrap">
              <div
                className="pm-roulette__wheel"
                ref={wheelRef}
                style={{
                  transform: `rotate(${rouletteAngle}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                }}
              >
                {ROULETTE_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="pm-roulette__seg"
                    style={{
                      transform: `rotate(${i * (360 / ROULETTE_LABELS.length)}deg)`,
                      background: i % 2 === 0 ? 'rgba(168,85,247,0.32)' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="pm-roulette__pointer">▼</div>
            </div>
            <button
              className="pm-roulette__spin"
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? 'Вращение…' : 'Крутить колесо'}
            </button>
          </div>
        )}

        {rouletteResult && (
          <div className="pm-roulette-result">
            <div className="pm-roulette-result__icon">
              <AuraEmblem size="sm" />
            </div>
            <p className="pm-roulette-result__text">
              Поздравляем! Вам начислено <strong>{rouletteResult} дней</strong> AURA VIP бесплатно!
            </p>
          </div>
        )}

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

        {/* Тарифы */}
        {isFirstPurchase && (
          <div className="pm-promo">
            <span className="pm-promo__spark">✦</span>
            Специальная скидка на первую покупку
          </div>
        )}

        <div className="pm-plans">
          <button
            className={`pm-plan ${selectedPlan === 'month' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('month'); haptic('light'); }}
          >
            <span className="pm-plan__period">1 месяц</span>
            {isFirstPurchase && <span className="pm-plan__old-price">199 ₽</span>}
            <span className="pm-plan__price">{monthPrice} ₽</span>
            <span className="pm-plan__per">в месяц</span>
          </button>
          <button
            className={`pm-plan ${selectedPlan === 'year' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('year'); haptic('light'); }}
          >
            <span className="pm-plan__badge">{isFirstPurchase ? 'Лучшая цена' : 'Экономия 35%'}</span>
            <span className="pm-plan__period">12 месяцев</span>
            {isFirstPurchase && <span className="pm-plan__old-price">2 400 ₽</span>}
            <span className="pm-plan__price">{yearPrice} ₽</span>
            <span className="pm-plan__per">{yearMonthly} ₽ / мес</span>
            {selectedPlan === 'year' && <span className="pm-plan__bonus">+ 1 месяц в подарок</span>}
          </button>
        </div>

        <button className="pm-subscribe" onClick={handleSubscribe}>
          {isAdmin
            ? 'Активировать бесплатно (Admin)'
            : `Оформить подписку · ${selectedPlan === 'month' ? `${monthPrice} ₽/мес` : `${yearPrice} ₽/год`}`}
        </button>

        <p className="pm-terms">
          {selectedPlan === 'year'
            ? '13 месяцев доступа · Отмена в любой момент'
            : 'Мгновенная активация · Отмена в любой момент'}
        </p>

        {/* Модалка оплаты по реквизитам */}
        {showPayModal && (
          <div className="pm-pay-overlay" onClick={() => !payLoading && setShowPayModal(false)}>
            <div className="pm-pay" onClick={(e) => e.stopPropagation()}>
              <div className="pm-pay__handle" />
              <h2 className="pm-pay__title">
                Оплата AURA VIP · {selectedPlan === 'year' ? `${yearPrice} ₽ / год` : `${monthPrice} ₽ / мес`}
              </h2>
              <div className="pm-pay__req">
                {requisites.card && (
                  <div className="pm-pay__row" onClick={() => { navigator.clipboard?.writeText(requisites.card); haptic('light'); }}>
                    <div className="pm-pay__row-left">
                      <span className="pm-pay__label">Банковская карта</span>
                      <span className="pm-pay__value">{requisites.card}</span>
                    </div>
                    <span className="pm-pay__copy">Скопировать</span>
                  </div>
                )}
                {requisites.sbp && (
                  <div className="pm-pay__row" onClick={() => { navigator.clipboard?.writeText(requisites.sbp); haptic('light'); }}>
                    <div className="pm-pay__row-left">
                      <span className="pm-pay__label">Перевод СБП</span>
                      <span className="pm-pay__value">{requisites.sbp}</span>
                    </div>
                    <span className="pm-pay__copy">Скопировать</span>
                  </div>
                )}
                {requisites.crypto && (
                  <div className="pm-pay__row" onClick={() => { navigator.clipboard?.writeText(requisites.crypto); haptic('light'); }}>
                    <div className="pm-pay__row-left">
                      <span className="pm-pay__label">Криптовалюта (USDT)</span>
                      <span className="pm-pay__value">{requisites.crypto}</span>
                    </div>
                    <span className="pm-pay__copy">Скопировать</span>
                  </div>
                )}
                {requisites.note && <p className="pm-pay__note">{requisites.note}</p>}
                {!requisites.card && !requisites.sbp && !requisites.crypto && (
                  <p className="pm-pay__note">
                    Реквизиты пока не заданы — напишите администратору {getApiBase() ? '' : 'или настройте API-сервер'}.
                  </p>
                )}
              </div>

              <div className="pm-pay__instruction">
                <p>1. Переведите точную сумму по указанным реквизитам выше.</p>
                <p>2. Укажите ваш Telegram @username и нажмите подтверждение.</p>
              </div>

              <input
                className="pm-pay__input"
                type="text"
                placeholder="Ваше имя или @username"
                value={payName}
                onChange={(e) => { setPayName(e.target.value); setPayMsg(''); }}
                spellCheck={false}
                autoComplete="off"
              />

              <button className="pm-pay__btn" onClick={handlePaid} disabled={payLoading}>
                {payLoading ? 'Проверка оплаты…' : 'Подтвердить оплату'}
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
