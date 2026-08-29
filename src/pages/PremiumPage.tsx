import React, { useState, useEffect, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { claimPremium, getApiBase } from '../api/backend';
import './PremiumPage.css';
import './PremiumRoulette.css';

const features = [
  { icon: '🔥', title: 'LostFilm озвучка', desc: 'Эксклюзивная озвучка LostFilm' },
  { icon: '🔴', title: 'RedHeadSound', desc: 'Профессиональный перевод' },
  { icon: '❄️', title: 'ColdFilm', desc: 'Озвучка ColdFilm' },
  { icon: '🚫', title: 'Без рекламы', desc: 'Без прерываний и баннеров' },
  { icon: '⬇️', title: 'Скачивание', desc: 'Офлайн просмотр' },
  { icon: '📺', title: 'Full HD / 4K', desc: 'Максимальное качество' },
  { icon: '🎬', title: 'Ранний доступ', desc: 'Новинки за 24ч раньше' },
  { icon: '👨‍👩‍👧‍👦', title: '5 устройств', desc: 'Телефон, планшет, ТВ' },
];

const ROULETTE_PRIZES = [3, 5, 7, 3, 5, 3, 7, 3]; // дни бесплатного премиума
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

  /* Проверка истечения срока — в useEffect, а не во время рендера */
  useEffect(() => {
    if (isPremium && premiumExpiry && Date.now() > premiumExpiry) {
      setPremium(false);
    }
  }, [isPremium, premiumExpiry, setPremium]);

  const handleSpin = () => {
    if (spinning || rouletteUsed) return;
    haptic('medium');
    setSpinning(true);

    // Случайный приз (3/5/7 дней) с разной вероятностью
    // 3 дня = 50%, 5 дней = 30%, 7 дней = 20%
    const rand = Math.random();
    let prizeIdx: number;
    if (rand < 0.5) prizeIdx = 0; // 3 дня
    else if (rand < 0.8) prizeIdx = 1; // 5 дней
    else prizeIdx = 2; // 7 дней

    const prizeDays = ROULETTE_PRIZES[prizeIdx];
    const segAngle = 360 / ROULETTE_PRIZES.length;
    const targetAngle = 360 * 5 + (360 - prizeIdx * segAngle - segAngle / 2);

    setRouletteAngle(targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setRouletteResult(prizeDays);
      setRouletteUsed(true);
      try { localStorage.setItem('tc_roulette_used', 'true'); } catch {}
      // Активируем премиум на N дней (с продлением, если уже активен)
      activatePremiumDays(prizeDays);
      haptic('heavy');
    }, 4000);
  };

  const handleSubscribe = () => {
    haptic('medium');
    if (isAdmin) {
      activatePremiumForever();
      setSuccessMsg('👑 Премиум активирован навсегда!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }
    /* Оплата по реквизитам */
    setPayName(telegramUsername || payName);
    setPayMsg('');
    setShowPayModal(true);
  };

  /* «Я оплатил» → авто-активация премиума на сервере */
  const handlePaid = async () => {
    if (!payName.trim()) {
      setPayMsg('❌ Укажите ваше имя или @username');
      return;
    }
    setPayLoading(true);
    setPayMsg('⏳ Проверяю оплату…');
    const res = await claimPremium(payName.trim().replace(/^@/, ''), selectedPlan);
    setPayLoading(false);
    setPayMsg(res.message || '');
    if (res.ok && res.activated) {
      // Премиум активирован на сервере — включаем локально
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
        <div className="pm-bg"><div className="pm-bg__orb pm-bg__orb--1" /><div className="pm-bg__orb pm-bg__orb--2" /></div>
        <div className="pm-content">
          <div className="pm-crown"><span className="pm-crown__icon">👑</span><div className="pm-crown__ring" /></div>
          <h1 className="pm-title">Премиум <span>активен</span></h1>
          <p className="pm-subtitle">
            {isAdmin
              ? '👑 Администратор · бессрочно'
              : daysLeft
                ? `Осталось дней: ${daysLeft}`
                : 'Бессрочный доступ'}
          </p>
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
      <div className="pm-bg"><div className="pm-bg__orb pm-bg__orb--1" /><div className="pm-bg__orb pm-bg__orb--2" /></div>

      <div className="pm-content">
        <div className="pm-crown"><span className="pm-crown__icon">👑</span><div className="pm-crown__ring" /></div>

        <h1 className="pm-title">КиноЗал<span>Премиум</span></h1>
        <p className="pm-subtitle">Кино без границ и рекламы</p>

        {/* 🎰 Рулетка */}
        {!rouletteUsed && !rouletteResult && (
          <div className="pm-roulette">
            <h2 className="pm-roulette__title">🎰 Крутани рулетку!</h2>
            <p className="pm-roulette__desc">Получи бесплатные дни Премиум</p>
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
                      background: i % 2 === 0 ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
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
              {spinning ? '🎰 Крутится…' : '🎰 Крутить!'}
            </button>
          </div>
        )}

        {rouletteResult && (
          <div className="pm-roulette-result">
            <span className="pm-roulette-result__emoji">🎉</span>
            <p className="pm-roulette-result__text">
              Поздравляем! Вы выиграли <strong>{rouletteResult} дней</strong> Премиум бесплатно!
            </p>
          </div>
        )}

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

        {/* Тарифы */}
        {isFirstPurchase && (
          <div className="pm-promo">🔥 Акция на первую покупку!</div>
        )}

        <div className="pm-plans">
          <button
            className={`pm-plan ${selectedPlan === 'month' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('month'); haptic('light'); }}
          >
            <span className="pm-plan__period">1 месяц</span>
            {isFirstPurchase && <span className="pm-plan__old-price">199 ₽</span>}
            <span className="pm-plan__price">{monthPrice} ₽</span>
            <span className="pm-plan__per">/ мес</span>
          </button>
          <button
            className={`pm-plan ${selectedPlan === 'year' ? 'active' : ''}`}
            onClick={() => { setSelectedPlan('year'); haptic('light'); }}
          >
            <span className="pm-plan__badge">{isFirstPurchase ? '🔥 Акция' : 'Выгодно'}</span>
            <span className="pm-plan__period">12 месяцев</span>
            {isFirstPurchase && <span className="pm-plan__old-price">2 400 ₽</span>}
            <span className="pm-plan__price">{yearPrice} ₽</span>
            <span className="pm-plan__per">{yearMonthly} ₽/мес</span>
            {selectedPlan === 'year' && <span className="pm-plan__bonus">+ 1 месяц в подарок 🎁</span>}
          </button>
        </div>

        <button className="pm-subscribe" onClick={handleSubscribe}>
          {isAdmin
            ? '👑 Активировать бесплатно'
            : `Подписаться · ${selectedPlan === 'month' ? `${monthPrice} ₽/мес` : `${yearPrice} ₽/год`}`}
        </button>

        <p className="pm-terms">
          {selectedPlan === 'year'
            ? '13 месяцев за цену 12 · Отмена в любой момент'
            : 'Первые 3 дня бесплатно · Отмена в любой момент'}
        </p>

        {/* Модалка оплаты по реквизитам */}
        {showPayModal && (
          <div className="pm-pay-overlay" onClick={() => !payLoading && setShowPayModal(false)}>
            <div className="pm-pay" onClick={(e) => e.stopPropagation()}>
              <h2 className="pm-pay__title">
                💳 Оплата · {selectedPlan === 'year' ? `${yearPrice} ₽ / год` : `${monthPrice} ₽ / мес`}
              </h2>
              <div className="pm-pay__req">
                {requisites.card && (
                  <div className="pm-pay__row" onClick={() => navigator.clipboard?.writeText(requisites.card)}>
                    <span className="pm-pay__label">💳 Карта</span>
                    <span className="pm-pay__value">{requisites.card} 📋</span>
                  </div>
                )}
                {requisites.sbp && (
                  <div className="pm-pay__row" onClick={() => navigator.clipboard?.writeText(requisites.sbp)}>
                    <span className="pm-pay__label">🏦 СБП</span>
                    <span className="pm-pay__value">{requisites.sbp} 📋</span>
                  </div>
                )}
                {requisites.crypto && (
                  <div className="pm-pay__row" onClick={() => navigator.clipboard?.writeText(requisites.crypto)}>
                    <span className="pm-pay__label">🪙 Крипта</span>
                    <span className="pm-pay__value">{requisites.crypto} 📋</span>
                  </div>
                )}
                {requisites.note && <p className="pm-pay__note">{requisites.note}</p>}
                {!requisites.card && !requisites.sbp && !requisites.crypto && (
                  <p className="pm-pay__note">
                    Реквизиты пока не заданы — напишите админу: {getApiBase() ? '' : 'и попросите настроить API-сервер'}
                  </p>
                )}
              </div>

              <p className="pm-pay__hint">
                1. Оплатите выбранную сумму по реквизитам выше<br />
                2. Укажите ваше имя/@username и нажмите «Я оплатил»
              </p>

              <input
                className="pm-pay__input"
                type="text"
                placeholder="Ваше имя или @username"
                value={payName}
                onChange={e => { setPayName(e.target.value); setPayMsg(''); }}
                spellCheck={false}
                autoComplete="off"
              />

              <button className="pm-pay__btn" onClick={handlePaid} disabled={payLoading}>
                {payLoading ? '⏳ Проверяю…' : '✅ Я оплатил'}
              </button>
              {payMsg && <p className="pm-pay__msg">{payMsg}</p>}

              <button className="pm-pay__cancel" onClick={() => setShowPayModal(false)} disabled={payLoading}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="pm-success"><span>✓</span> {successMsg}</div>
        )}
      </div>
    </div>
  );
};

export default PremiumPage;
