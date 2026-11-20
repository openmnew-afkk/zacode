import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crown, Gift, Snowflake, Sparkles, Star, X } from 'lucide-react';
import {
  createRouletteInvoice,
  DEFAULT_ROULETTE_PRIZES,
  fetchRouletteConfig,
  fetchRouletteSpin,
  getApiBase,
  spinRoulette,
  spinRouletteLocal,
  type RoulettePrize,
  type RouletteSpin,
} from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import '../pages/PremiumRoulette.css';

const PENDING_KEY = 'zenova_roulette_pending';
const FREE_SPIN_KEY = 'zenova_roulette_free_spin_at';
const TICKETS_KEY = 'zenova_giftfest_tickets';
const DAY_MS = 24 * 60 * 60 * 1000;
const SPIN_COST_TICKETS = 25;

const SLICE_GRADIENTS = [
  ['#332410', '#1a1309'], // 0: 1 день PRO (Янтарь)
  ['#122742', '#0b1628'], // 1: +40 билетов (Сапфир)
  ['#2f1847', '#170c26'], // 2: 2 дня PRO (Королевский пурпур)
  ['#103429', '#091c16'], // 3: 3 дня PRO (Изумруд)
  ['#3f1526', '#1e0a12'], // 4: 7 дней PRO (Рубин)
  ['#4a3512', '#261a07'], // 5: Подарок (Шампань Золото)
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
  const [lastFreeAt, setLastFreeAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(FREE_SPIN_KEY) || 0); } catch { return 0; }
  });

  const finishTimer = useRef<number | null>(null);
  const busy = phase !== 'idle' && phase !== 'done';
  const currentTickets = externalTickets !== undefined ? externalTickets : localTickets;
  const freeSpinReady = Date.now() >= lastFreeAt + DAY_MS;
  const hasServer = Boolean(getApiBase());

  useEffect(() => {
    fetchRouletteConfig()
      .then((config) => {
        if (config.prizes?.length >= 5) setPrizes(config.prizes);
      })
      .catch(() => {});

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<{ tickets?: number; lastFreeSpinAt?: number }>).detail;
      if (!detail) return;
      if (typeof detail.tickets === 'number') setLocalTickets(detail.tickets);
      if (typeof detail.lastFreeSpinAt === 'number' && detail.lastFreeSpinAt > 0) {
        setLastFreeAt((prev) => Math.max(prev, detail.lastFreeSpinAt!));
      }
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

  const handleFreeOrTicketSpin = () => {
    if (busy) return;
    if (freeSpinReady) {
      haptic('medium');
      const now = Date.now();
      setLastFreeAt(now);
      try { localStorage.setItem(FREE_SPIN_KEY, String(now)); } catch {}
      window.dispatchEvent(new CustomEvent('zenova-giftfest-sync', { detail: { lastFreeSpinAt: now } }));
      const spin = spinRouletteLocal(prizes);
      animateSpinResult(spin, 0);
      return;
    }
    if (currentTickets >= SPIN_COST_TICKETS) {
      haptic('medium');
      const nextAfterCost = currentTickets - SPIN_COST_TICKETS;
      updateTickets(nextAfterCost);
      const spin = spinRouletteLocal(prizes);
      animateSpinResult(spin, -SPIN_COST_TICKETS);
      return;
    }
    setMessage(`Нужно ${SPIN_COST_TICKETS} ❄️ для спина — откройте Снежный бокс или выполните кино-квест!`);
  };

  const handleStarsSpin = async () => {
    haptic('medium');
    setResult(null);
    setShowPrizeModal(false);
    setMessage('');

    if (!hasServer || !tg?.openInvoice) {
      handleFreeOrTicketSpin();
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
      handleFreeOrTicketSpin();
    }
  };

  const mainButtonText = phase === 'invoice'
    ? 'Создаём счёт…'
    : phase === 'waiting'
      ? 'Проверяем оплату…'
      : phase === 'spinning'
        ? 'Удача в пути…'
        : freeSpinReady
          ? 'Крутить бесплатно (1 раз в день)'
          : currentTickets >= SPIN_COST_TICKETS
            ? `Крутить за ${SPIN_COST_TICKETS} ❄️`
            : hasServer
              ? 'Крутить за 10 Stars'
              : `Нужно ${SPIN_COST_TICKETS} ❄️ (сейчас ${currentTickets} ❄️)`;

  return (
    <section className="pm-roulette" aria-labelledby="roulette-title">
      <div className="pm-roulette__head">
        <span className="pm-roulette__badge"><Sparkles size={11} /> Рулетка GiftFest</span>
        <h2 id="roulette-title" className="pm-roulette__title">Колесо Фортуны</h2>
        <p className="pm-roulette__desc">
          Крутите бесплатно каждый день или за ❄️ снежинки. Выигрывайте дни ZENOVA PRO и призы.
        </p>
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
            aria-label={result ? `Результат: ${result.label}` : 'Колесо фортуны'}
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
                const shortLabel = prize.gift
                  ? '🎁 ПРИЗ'
                  : prize.tickets
                    ? `+${prize.tickets} ❄️`
                    : prize.label.replace(' дней', 'Д').replace(' дня', 'Д').replace(' день', 'Д');
                return (
                  <g key={prize.id}>
                    <path
                      d={slicePath(120, 120, 117, start, end)}
                      fill={`url(#pmSliceGrad${i % SLICE_GRADIENTS.length})`}
                      stroke="rgba(231, 199, 137, 0.42)"
                      strokeWidth="1.2"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill={prize.gift ? '#f4dfae' : '#f8fafc'}
                      fontSize="11"
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
              onClick={handleFreeOrTicketSpin}
              disabled={busy}
              aria-label="Крутить колесо"
            >
              <span>SPIN</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pm-roulette__actions">
        <button
          type="button"
          className="pm-roulette__spin"
          onClick={handleFreeOrTicketSpin}
          disabled={busy}
        >
          {freeSpinReady ? <Sparkles size={16} /> : <Snowflake size={16} />}
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
          <span className="pm-roulette-result__icon">{result.prizeId === 'gift' ? <Gift size={20} /> : <Check size={20} />}</span>
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
        <p>1 бесплатный спин доступен каждые 24 часа. Дополнительные спины — за 25 ❄️ снежинок из кино-квестов или за 10 Stars. Выигранные дни PRO суммируются с вашим профилем мгновенно.</p>
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
              {result.tickets ? <Snowflake size={38} /> : result.prizeId === 'gift' ? <Gift size={38} /> : <Crown size={38} />}
            </div>

            <span className="pm-prize-modal__kicker">НАГРАДА ПОЛУЧЕНА</span>
            <h3 className="pm-prize-modal__title">{result.label}</h3>
            <p className="pm-prize-modal__desc">
              {result.tickets
                ? 'Снежинки-билеты зачислены в ваш баланс GiftFest!'
                : result.days
                  ? 'Статус ZENOVA PRO активирован! Модели Gemini 2.5 Pro и Kimi K3.1 Pro в SYNTHAX-9 уже открыты.'
                  : 'Приз успешно зачислен на ваш аккаунт ZENOVA.'}
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
