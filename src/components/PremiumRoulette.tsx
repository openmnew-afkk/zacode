import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crown, Flame, Snowflake, Sparkles, Star, X } from 'lucide-react';
import {
  createRouletteInvoice,
  DEFAULT_ROULETTE_PRIZES,
  fetchRouletteConfig,
  fetchRouletteSpin,
  getApiBase,
  readRouletteCycleStats,
  spinRoulette,
  spinRouletteLocal,
  type RouletteCycleStats,
  type RoulettePrize,
  type RouletteSpin,
} from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import '../pages/PremiumRoulette.css';

const PENDING_KEY = 'zenova_roulette_pending';
const TICKETS_KEY = 'zenova_giftfest_tickets';
const SPIN_COST_TICKETS = 100;

const SLICE_GRADIENTS = [
  ['#16263f', '#0b1322'], // 0: 1 день PRO (Сапфир)
  ['#1e1d44', '#0f0e25'], // 1: 2 дня PRO (Индиго)
  ['#11343a', '#091b1f'], // 2: 3 дня PRO (Арктик)
  ['#2f1a46', '#160b24'], // 3: 5 дней PRO (Аметист)
  ['#14372c', '#0a1c16'], // 4: 7 дней PRO (Изумруд)
  ['#6e4d16', '#2a1b07'], // 5: 25 дней PRO (Королевский джекпот)
];

interface PremiumRouletteProps {
  onPremium?: (expiry: number | null) => void;
  onSpinComplete?: (spin: RouletteSpin) => void;
  tickets?: number;
  onTicketsChange?: (nextTickets: number) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

const PremiumRoulette: React.FC<PremiumRouletteProps> = ({
  onPremium,
  onSpinComplete,
  tickets: externalTickets,
  onTicketsChange,
}) => {
  const { tg, haptic } = useTelegram();
  const { activatePremiumDays } = useStore();
  const [prizes, setPrizes] = useState<RoulettePrize[]>(DEFAULT_ROULETTE_PRIZES);
  const [phase, setPhase] = useState<'idle' | 'invoice' | 'waiting' | 'spinning' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<RouletteSpin | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [localTickets, setLocalTickets] = useState<number>(() => {
    try { return Number(localStorage.getItem(TICKETS_KEY) || 0); } catch { return 0; }
  });
  const [cycleStats, setCycleStats] = useState<RouletteCycleStats>(() => readRouletteCycleStats());

  const finishTimer = useRef<number | null>(null);
  const busy = phase !== 'idle' && phase !== 'done';
  const currentTickets = externalTickets !== undefined ? externalTickets : localTickets;
  const hasServer = Boolean(getApiBase());

  useEffect(() => {
    fetchRouletteConfig()
      .then((config) => {
        if (config.prizes?.length >= 6 && config.prizes.every((p) => !p.gift && !p.tickets && p.days > 0)) {
          setPrizes(config.prizes);
        } else {
          setPrizes(DEFAULT_ROULETTE_PRIZES);
        }
      })
      .catch(() => {});

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<{
        tickets?: number;
        rouletteTotalSpins?: number;
        rouletteWonCycle?: number;
      }>).detail;
      if (detail && typeof detail.tickets === 'number') setLocalTickets(detail.tickets);
      setCycleStats(readRouletteCycleStats());
    };
    window.addEventListener('zenova-giftfest-sync', onSync);

    return () => {
      window.removeEventListener('zenova-giftfest-sync', onSync);
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    };
  }, []);

  const updateTickets = (val: number) => {
    setLocalTickets(val);
    try { localStorage.setItem(TICKETS_KEY, String(val)); } catch {}
    onTicketsChange?.(val);
    window.dispatchEvent(new CustomEvent('zenova-giftfest-sync', { detail: { tickets: val } }));
  };

  const count = prizes.length || 6;
  const stepAngle = 360 / count;

  const animateSpinResult = (spin: RouletteSpin, extraTicketDelta = 0) => {
    setResult(spin);
    setPhase('spinning');
    setMessage('');
    const targetAngle = spin.segment * stepAngle;
    setRotation((current) => {
      const turns = Math.ceil(current / 360) * 360 + 2160;
      return turns + (360 - targetAngle);
    });
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    finishTimer.current = window.setTimeout(() => {
      setPhase('done');
      setShowPrizeModal(true);
      if (spin.days && spin.days > 0) {
        activatePremiumDays(spin.days);
        const updatedExpiry = useStore.getState().premiumExpiry;
        onPremium?.(updatedExpiry ?? spin.expiry ?? null);
      } else if (spin.expiry) {
        onPremium?.(spin.expiry);
      }
      if (spin.tickets && spin.tickets > 0) {
        updateTickets(Math.max(0, currentTickets + extraTicketDelta + spin.tickets));
      }
      onSpinComplete?.(spin);
      haptic('heavy');
    }, 4500);
  };

  const runPaidSpin = async (spinId: string) => {
    setPhase('waiting');
    setMessage('Подтверждаем платёж…');
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const status = await fetchRouletteSpin(spinId);
        if (status.spin) {
          animateSpinResult(status.spin);
          return;
        }
        if (status.paid) break;
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      const response = await spinRoulette(spinId);
      animateSpinResult(response.spin);
    } catch (error) {
      setPhase('idle');
      setMessage(
        error instanceof Error
          ? `${error.message}`
          : 'Не удалось завершить вращение.'
      );
    }
  };

  useEffect(() => {
    if (!hasServer) return;
    try {
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) void runPaidSpin(pending);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTicketSpin = () => {
    if (busy) return;
    if (currentTickets >= SPIN_COST_TICKETS) {
      haptic('medium');
      const nextAfterCost = currentTickets - SPIN_COST_TICKETS;
      updateTickets(nextAfterCost);
      const spin = spinRouletteLocal(prizes);
      setCycleStats(readRouletteCycleStats());
      animateSpinResult(spin, -SPIN_COST_TICKETS);
      return;
    }
    const missing = SPIN_COST_TICKETS - currentTickets;
    setMessage(`Не хватает ${missing} ❄️ морозных. Открывайте Снежный бокс, подарки под ёлкой и кино-ачивки!`);
  };

  const handleStarsSpin = async () => {
    haptic('medium');
    setResult(null);
    setShowPrizeModal(false);
    setMessage('');

    if (!hasServer || !tg?.openInvoice) {
      handleTicketSpin();
      return;
    }

    let pending = '';
    try { pending = localStorage.getItem(PENDING_KEY) || ''; } catch {}
    if (pending) {
      await runPaidSpin(pending);
      return;
    }
    setPhase('invoice');
    try {
      const invoice = await createRouletteInvoice();
      try { localStorage.setItem(PENDING_KEY, invoice.spinId); } catch {}
      setPhase('waiting');
      setMessage('Открываем счёт Telegram Stars…');
      tg.openInvoice(invoice.url, (status) => {
        if (status === 'paid' || status === 'pending') {
          void runPaidSpin(invoice.spinId);
        } else {
          try { localStorage.removeItem(PENDING_KEY); } catch {}
          setPhase('idle');
          setMessage(status === 'cancelled' ? 'Оплата отменена.' : 'Платёж не завершён.');
        }
      });
    } catch {
      handleTicketSpin();
    }
  };

  const readyToSpin = currentTickets >= SPIN_COST_TICKETS;
  const frostPct = Math.min(100, Math.round((currentTickets / SPIN_COST_TICKETS) * 100));

  const mainButtonText = phase === 'invoice'
    ? 'Создаём счёт…'
    : phase === 'waiting'
      ? 'Проверяем оплату…'
      : phase === 'spinning'
        ? 'Крутим колесо…'
        : readyToSpin
          ? `Крутить за ${SPIN_COST_TICKETS} ❄️`
          : `Нужно ${SPIN_COST_TICKETS} ❄️ (сейчас ${currentTickets})`;

  return (
    <section className="pm-roulette" aria-labelledby="roulette-title">
      <div className="pm-roulette__head">
        <span className="pm-roulette__badge"><Crown size={11} /> PRO-Рулетка GiftFest</span>
        <h2 id="roulette-title" className="pm-roulette__title">Колесо Фортуны PRO</h2>
        <p className="pm-roulette__desc">
          Только дни ZENOVA PRO без пустых секторов. Каждая крутка — 100 ❄️ морозных.
        </p>
      </div>

      {/* Баланс морозных + трекер супер-приза 1 на 100 круток */}
      <div className="pm-roulette__telemetry">
        <div className="pm-roulette__meter">
          <div className="pm-roulette__meter-top">
            <span><Snowflake size={12} /> Баланс морозных</span>
            <strong>{currentTickets} / {SPIN_COST_TICKETS} ❄️</strong>
          </div>
          <div className="pm-roulette__meter-track">
            <div className="pm-roulette__meter-fill" style={{ width: `${frostPct}%` }} />
          </div>
        </div>
        <div className={`pm-roulette__super-pill ${cycleStats.superAvailableInCycle ? 'is-live' : 'is-claimed'}`}>
          <Flame size={12} />
          <span>
            Супер-приз <strong>25Д PRO</strong> · {cycleStats.superAvailableInCycle ? 'доступен' : 'выбит в сотне ✓'}
          </span>
          <b>{cycleStats.spinsDoneInCycle}/100</b>
        </div>
      </div>

      <div className={`pm-roulette__stage ${phase === 'spinning' ? 'is-spinning' : ''}`}>
        <div className="pm-roulette__pointer" aria-hidden="true">
          <span />
        </div>

        <div className="pm-roulette__bezel">
          {Array.from({ length: 24 }, (_, idx) => (
            <span
              key={idx}
              className="pm-roulette__bulb"
              style={{ transform: `rotate(${idx * 15}deg) translateY(-105px)` }}
            />
          ))}

          <div
            className="pm-roulette__wheel"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label={result ? `Результат: ${result.label}` : 'Колесо фортуны PRO'}
          >
            <svg viewBox="0 0 240 240" className="pm-roulette__svg">
              <defs>
                {SLICE_GRADIENTS.map(([c1, c2], idx) => (
                  <linearGradient key={idx} id={`pmSliceGrad${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                  </linearGradient>
                ))}
              </defs>
              {prizes.map((prize, i) => {
                const start = i * stepAngle - stepAngle / 2;
                const end = start + stepAngle;
                const midAngle = i * stepAngle;
                const textPos = polarToCartesian(120, 120, 76, midAngle);
                const isSuper = prize.id === 'pro_25' || prize.days >= 25;
                const shortLabel = isSuper ? '★ 25Д' : `${prize.days}Д PRO`;
                return (
                  <g key={prize.id}>
                    <path
                      d={slicePath(120, 120, 117, start, end)}
                      fill={`url(#pmSliceGrad${i % SLICE_GRADIENTS.length})`}
                      stroke={isSuper ? 'rgba(244, 223, 174, 0.78)' : 'rgba(186, 230, 253, 0.34)'}
                      strokeWidth={isSuper ? '1.6' : '1.1'}
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill={isSuper ? '#fde68a' : '#f0f9ff'}
                      fontSize={isSuper ? '12' : '10.5'}
                      fontWeight="850"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}
              <circle cx="120" cy="120" r="116" fill="none" stroke="rgba(231, 199, 137, 0.72)" strokeWidth="2.5" />
            </svg>

            <button
              type="button"
              className="pm-roulette__hub"
              onClick={handleTicketSpin}
              disabled={busy}
              aria-label="Крутить за 100 морозных"
            >
              <span>100❄️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Превью всех PRO-секторов */}
      <div className="pm-roulette__chips" aria-label="Секторы рулетки">
        {prizes.map((prize) => {
          const isSuper = prize.id === 'pro_25' || prize.days >= 25;
          return (
            <span key={prize.id} className={`pm-roulette__chip ${isSuper ? 'is-super' : ''}`}>
              {isSuper ? '🔥 25Д PRO' : `${prize.days}Д PRO`}
            </span>
          );
        })}
      </div>

      <div className="pm-roulette__actions">
        <button
          type="button"
          className={`pm-roulette__spin ${!readyToSpin && phase === 'idle' ? 'is-muted' : ''}`}
          onClick={handleTicketSpin}
          disabled={busy}
        >
          <Snowflake size={16} />
          <span>{mainButtonText}</span>
        </button>

        {hasServer && (
          <button
            type="button"
            className="pm-roulette__spin-stars"
            onClick={handleStarsSpin}
            disabled={busy}
          >
            <Star size={14} fill="currentColor" />
            <span>Крутить за 10 Stars</span>
          </button>
        )}
      </div>

      {message && <p className="pm-roulette__message" role="status">{message}</p>}

      {phase === 'done' && result && !showPrizeModal && (
        <button
          type="button"
          className="pm-roulette-result"
          onClick={() => setShowPrizeModal(true)}
        >
          <span className="pm-roulette-result__icon"><Check size={20} /></span>
          <span className="pm-roulette-result__text">Выигрыш: <strong>{result.label}</strong></span>
        </button>
      )}

      <details className="pm-roulette__odds">
        <summary>Призы и шансы выпадения</summary>
        <div className="pm-roulette__odds-list">
          {prizes.map((prize) => (
            <div key={prize.id}>
              <span>{prize.label}</span>
              <strong>{prize.chance}%</strong>
            </div>
          ))}
        </div>
        <p>1 крутка стоит 100 ❄️ морозных (или 10 Stars). Выигрываются только дни ZENOVA PRO — они сразу суммируются с вашим профилем. Супер-приз 25 дней PRO может выпасть 1 раз на каждые 100 круток с человека.</p>
      </details>

      {/* Всплывающий pop-up экран выигрыша */}
      {showPrizeModal && result && createPortal(
        <div className="pm-prize-overlay" onClick={() => setShowPrizeModal(false)}>
          <div className="pm-prize-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-prize-modal__rays" aria-hidden="true" />
            <div className="pm-prize-modal__sparks" aria-hidden="true">
              <span /><span /><span /><span /><span /><span />
            </div>
            <button
              type="button"
              className="pm-prize-modal__close"
              onClick={() => setShowPrizeModal(false)}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>

            <div className="pm-prize-modal__emblem">
              {result.days && result.days >= 25 ? <Sparkles size={38} /> : <Crown size={38} />}
            </div>

            <span className="pm-prize-modal__kicker">
              {result.days && result.days >= 25 ? 'СУПЕР-ПРИЗ ВЫИГРАН' : 'PRO ПРОДЛЁН'}
            </span>
            <h3 className="pm-prize-modal__title">{result.label}</h3>
            <p className="pm-prize-modal__desc">
              Статус ZENOVA PRO активирован и добавлен к текущему сроку вашего профиля!
            </p>

            <button
              type="button"
              className="pm-prize-modal__cta"
              onClick={() => {
                haptic('light');
                setShowPrizeModal(false);
              }}
            >
              Забрать в профиль ✨
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default PremiumRoulette;
