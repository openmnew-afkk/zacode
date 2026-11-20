import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Crown, Gift, RotateCw, Sparkles, Star, X } from 'lucide-react';
import {
  createRouletteInvoice, fetchRouletteConfig, fetchRouletteSpin, spinRoulette,
  type RoulettePrize, type RouletteSpin,
} from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import '../pages/PremiumRoulette.css';

const PENDING_KEY = 'zenova_roulette_pending';
const SEGMENT_FILLS = ['#1d192b', '#2b1c3e', '#15243d', '#332413', '#132c25'];
const DEFAULT_PRIZES: RoulettePrize[] = [
  { id: 'pro_1', label: '1 день PRO', days: 1, gift: false, chance: 70 },
  { id: 'pro_2', label: '2 дня PRO', days: 2, gift: false, chance: 20 },
  { id: 'pro_3', label: '3 дня PRO', days: 3, gift: false, chance: 7 },
  { id: 'pro_7', label: '7 дней PRO', days: 7, gift: false, chance: 2.8 },
  { id: 'gift', label: 'Подарок TG', days: 0, gift: true, chance: 0.2 },
];

interface PremiumRouletteProps {
  onPremium: (expiry: number | null) => void;
  onSpinComplete?: (spin: RouletteSpin) => void;
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

const PremiumRoulette: React.FC<PremiumRouletteProps> = ({ onPremium, onSpinComplete }) => {
  const { tg, haptic } = useTelegram();
  const [prizes, setPrizes] = useState<RoulettePrize[]>(DEFAULT_PRIZES);
  const [configError, setConfigError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'invoice' | 'waiting' | 'spinning' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<RouletteSpin | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  const finishTimer = useRef<number | null>(null);
  const busy = phase !== 'idle' && phase !== 'done';

  useEffect(() => {
    fetchRouletteConfig()
      .then((config) => {
        if (config.prizes?.length === 5) setPrizes(config.prizes);
        setConfigError('');
      })
      .catch(() => {});
    return () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    };
  }, []);

  const showResult = (spin: RouletteSpin) => {
    setResult(spin);
    setPhase('spinning');
    setMessage('');
    setRotation((current) => {
      const turns = Math.ceil(current / 360) * 360 + 2160;
      return turns + 360 - (spin.segment * 72 + 36);
    });
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    finishTimer.current = window.setTimeout(() => {
      setPhase('done');
      setShowPrizeModal(true);
      if (spin.expiry) onPremium(spin.expiry);
      onSpinComplete?.(spin);
      haptic('heavy');
    }, 4500);
  };

  const runPaidSpin = async (spinId: string) => {
    setPhase('waiting');
    setMessage('Платёж принят. Подтверждаем на сервере…');
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const status = await fetchRouletteSpin(spinId);
        if (status.spin) {
          showResult(status.spin);
          return;
        }
        if (status.paid) break;
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      const response = await spinRoulette(spinId);
      showResult(response.spin);
    } catch (error) {
      setPhase('idle');
      setMessage(
        error instanceof Error
          ? `${error.message} Оплаченное вращение сохранено — попробуйте продолжить.`
          : 'Не удалось запустить вращение. Попробуйте ещё раз.'
      );
    }
  };

  useEffect(() => {
    try {
      const pending = localStorage.getItem(PENDING_KEY);
      if (pending) void runPaidSpin(pending);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpin = async () => {
    haptic('medium');
    setResult(null);
    setShowPrizeModal(false);
    setMessage('');
    if (!tg?.openInvoice) {
      setMessage('Оплата Stars доступна внутри Telegram Mini App');
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
          setMessage(status === 'cancelled' ? 'Оплата отменена. Stars не списаны.' : 'Платёж не завершён.');
        }
      });
    } catch (error) {
      setPhase('idle');
      setMessage(error instanceof Error ? error.message : 'Не удалось создать счёт');
    }
  };

  const buttonLabel = phase === 'invoice'
    ? 'Создаём счёт…'
    : phase === 'waiting'
      ? 'Ждём подтверждение…'
      : phase === 'spinning'
        ? 'Колесо вращается…'
        : 'Крутить за 10 Stars';

  return (
    <section className="pm-roulette" aria-labelledby="roulette-title">
      <div className="pm-roulette__head">
        <span className="pm-roulette__badge"><Sparkles size={11} /> Беспроигрышная рулетка</span>
        <h2 id="roulette-title" className="pm-roulette__title">Колесо GiftFest</h2>
        <p className="pm-roulette__desc">10 Stars за спин. Выигрывайте дни ZENOVA PRO или редкий Подарок Telegram.</p>
      </div>

      <div className={`pm-roulette__stage ${phase === 'spinning' ? 'is-spinning' : ''}`}>
        <div className="pm-roulette__pointer" aria-hidden="true">
          <span />
        </div>

        {/* Внешний металлический обод с лампочками */}
        <div className="pm-roulette__bezel">
          {Array.from({ length: 16 }, (_, idx) => (
            <span
              key={idx}
              className="pm-roulette__bulb"
              style={{ transform: `rotate(${idx * 22.5}deg) translateY(-132px)` }}
            />
          ))}

          <div
            className="pm-roulette__wheel"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label={result ? `Результат: ${result.label}` : 'Колесо с пятью призами'}
          >
            <svg viewBox="0 0 240 240" className="pm-roulette__svg">
              {prizes.map((prize, i) => {
                const start = i * 72 - 36;
                const end = start + 72;
                const midAngle = i * 72;
                const textPos = polarToCartesian(120, 120, 74, midAngle);
                const shortLabel = prize.gift ? '🎁 GIFT' : prize.label.replace(' PRO', '');
                return (
                  <g key={prize.id}>
                    <path
                      d={slicePath(120, 120, 116, start, end)}
                      fill={SEGMENT_FILLS[i % SEGMENT_FILLS.length]}
                      stroke="rgba(231, 199, 137, 0.35)"
                      strokeWidth="1.2"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      fill={prize.gift ? '#fde68a' : '#f8fafc'}
                      fontSize="11.5"
                      fontWeight="800"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}
              <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(231, 199, 137, 0.55)" strokeWidth="2.5" />
            </svg>

            <span className="pm-roulette__hub">
              <RotateCw size={20} />
            </span>
          </div>
        </div>
      </div>

      <button type="button" className="pm-roulette__spin" onClick={handleSpin} disabled={busy || prizes.length !== 5}>
        <Star size={16} fill="currentColor" />
        <span>{buttonLabel}</span>
      </button>

      {(message || configError) && <p className="pm-roulette__message" role="status">{configError || message}</p>}

      {phase === 'done' && result && !showPrizeModal && (
        <button
          type="button"
          className="pm-roulette-result"
          onClick={() => setShowPrizeModal(true)}
        >
          <span className="pm-roulette-result__icon">{result.prizeId === 'gift' ? <Gift size={22} /> : <Check size={22} />}</span>
          <span className="pm-roulette-result__text">Ваш приз: <strong>{result.label}</strong></span>
        </button>
      )}

      <details className="pm-roulette__odds">
        <summary>Шансы и правила рулетки</summary>
        <div className="pm-roulette__odds-list">
          {prizes.map((prize) => <div key={prize.id}><span>{prize.label}</span><strong>{prize.chance}%</strong></div>)}
        </div>
        <p>Один счёт — одно вращение. Дни PRO суммируются с текущим сроком. Подарок Telegram отправляется ботом автоматически при доступности, иначе начисляются 7 дней PRO.</p>
      </details>

      {/* Всплывающий экран выигрыша (Pop-up Celebration Modal) */}
      {showPrizeModal && result && createPortal(
        <div className="pm-prize-overlay" onClick={() => setShowPrizeModal(false)}>
          <div className="pm-prize-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-prize-modal__rays" aria-hidden="true" />
            <button
              type="button"
              className="pm-prize-modal__close"
              onClick={() => setShowPrizeModal(false)}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>

            <div className="pm-prize-modal__emblem">
              {result.prizeId === 'gift' ? <Gift size={38} /> : <Crown size={38} />}
            </div>

            <span className="pm-prize-modal__kicker">ПОЗДРАВЛЯЕМ!</span>
            <h3 className="pm-prize-modal__title">{result.label}</h3>
            <p className="pm-prize-modal__desc">
              {result.compensation
                ? 'Подарок сейчас недоступен в Telegram, поэтому мы начислили 7 дней ZENOVA PRO.'
                : result.prizeId === 'gift'
                  ? 'Подарок отправлен в ваш Telegram-профиль ботом ZENOVA!'
                  : 'Награда уже активирована и добавлена к вашему профилю.'}
            </p>

            <button
              type="button"
              className="pm-prize-modal__cta"
              onClick={() => {
                haptic('light');
                setShowPrizeModal(false);
              }}
            >
              Забрать приз
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default PremiumRoulette;
