import React, { useEffect, useRef, useState } from 'react';
import { Check, Gift, RotateCw, Sparkles, Star } from 'lucide-react';
import {
  createRouletteInvoice, fetchRouletteConfig, fetchRouletteSpin, spinRoulette,
  type RoulettePrize, type RouletteSpin,
} from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import '../pages/PremiumRoulette.css';

const PENDING_KEY = 'zenova_roulette_pending';
const SEGMENT_COLORS = ['#713f91', '#243d72', '#87532c', '#276554', '#7c3552'];
const DEFAULT_PRIZES: RoulettePrize[] = [
  { id: 'pro_1', label: '1 день PRO', days: 1, gift: false, chance: 70 },
  { id: 'pro_2', label: '2 дня PRO', days: 2, gift: false, chance: 20 },
  { id: 'pro_3', label: '3 дня PRO', days: 3, gift: false, chance: 7 },
  { id: 'pro_7', label: '7 дней PRO', days: 7, gift: false, chance: 2.8 },
  { id: 'gift', label: 'Подарок Telegram', days: 0, gift: true, chance: 0.2 },
];

interface PremiumRouletteProps {
  onPremium: (expiry: number | null) => void;
}

const PremiumRoulette: React.FC<PremiumRouletteProps> = ({ onPremium }) => {
  const { tg, haptic } = useTelegram();
  const [prizes, setPrizes] = useState<RoulettePrize[]>(DEFAULT_PRIZES);
  const [configError, setConfigError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'invoice' | 'waiting' | 'spinning' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<RouletteSpin | null>(null);
  const [rotation, setRotation] = useState(0);
  const finishTimer = useRef<number | null>(null);
  const busy = phase !== 'idle' && phase !== 'done';

  useEffect(() => {
    fetchRouletteConfig().then((config) => {
      if (config.prizes?.length === 5) setPrizes(config.prizes);
      setConfigError('');
    }).catch(() => {
      // Показываем колесо с дефолтным конфигом; ошибку сервера сообщим только при попытке крутить
    });
    return () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    };
  }, []);

  const showResult = (spin: RouletteSpin) => {
    setResult(spin);
    setPhase('spinning');
    setMessage('');
    setRotation((current) => {
      const turns = Math.ceil(current / 360) * 360 + 1800;
      return turns + 360 - (spin.segment * 72 + 36);
    });
    try { localStorage.removeItem(PENDING_KEY); } catch {}
    finishTimer.current = window.setTimeout(() => {
      setPhase('done');
      if (spin.expiry) onPremium(spin.expiry);
      haptic('heavy');
    }, 4300);
  };

  const runPaidSpin = async (spinId: string) => {
    setPhase('waiting');
    setMessage('Платёж принят. Подтверждаем его на сервере…');
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
      setMessage(error instanceof Error ? `${error.message} Оплаченное вращение сохранено — попробуйте продолжить.` : 'Не удалось запустить вращение. Попробуйте ещё раз.');
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
      setMessage('Открываем официальный счёт Telegram Stars…');
      tg.openInvoice(invoice.url, (status) => {
        if (status === 'paid' || status === 'pending') {
          void runPaidSpin(invoice.spinId);
        } else {
          try { localStorage.removeItem(PENDING_KEY); } catch {}
          setPhase('idle');
          setMessage(status === 'cancelled' ? 'Оплата отменена. Stars не списаны.' : 'Платёж не завершён. Попробуйте ещё раз.');
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
        <span className="pm-roulette__badge"><Sparkles size={11} /> Каждый спин — с призом</span>
        <h2 id="roulette-title" className="pm-roulette__title">Кино-рулетка</h2>
        <p className="pm-roulette__desc">10 Stars за вращение. Результат определяет сервер после оплаты.</p>
      </div>

      <div className="pm-roulette__wheel-wrap">
        <div className="pm-roulette__pointer" aria-hidden="true" />
        <div
          className="pm-roulette__wheel"
          style={{
            transform: `rotate(${rotation}deg)`,
            background: prizes.length === 5
              ? `conic-gradient(from -36deg, ${SEGMENT_COLORS.map((color, index) => `${color} ${index * 72}deg ${(index + 1) * 72}deg`).join(', ')})`
              : '#171321',
          }}
          aria-label={result ? `Результат: ${result.label}` : 'Колесо с пятью призами'}
        >
          {prizes.map((prize, index) => (
            <span
              key={prize.id}
              className="pm-roulette__seg-label"
              style={{ transform: `translate(-50%, -50%) rotate(${index * 72}deg) translateY(-70px) rotate(${-index * 72}deg)` }}
            >
              {prize.gift ? <Gift size={16} /> : prize.label.replace(' PRO', '')}
            </span>
          ))}
          <span className="pm-roulette__hub"><RotateCw size={23} /></span>
        </div>
      </div>

      <button type="button" className="pm-roulette__spin" onClick={handleSpin} disabled={busy || prizes.length !== 5}>
        <Star size={17} fill="currentColor" /> {buttonLabel}
      </button>
      {(message || configError) && <p className="pm-roulette__message" role="status">{configError || message}</p>}

      {phase === 'done' && result && (
        <div className="pm-roulette-result" role="status">
          <span className="pm-roulette-result__icon">{result.prizeId === 'gift' ? <Gift size={27} /> : <Check size={27} />}</span>
          <p className="pm-roulette-result__text">Ваш приз: <strong>{result.label}</strong></p>
          {result.compensation && <small>Подарок сейчас недоступен, поэтому вместо него начислены 7 дней PRO.</small>}
        </div>
      )}

      <details className="pm-roulette__odds">
        <summary>Шансы и условия</summary>
        <div className="pm-roulette__odds-list">
          {prizes.map((prize) => <div key={prize.id}><span>{prize.label}</span><strong>{prize.chance}%</strong></div>)}
        </div>
        <p>Один счёт — одно вращение. Повторный запрос не меняет приз. Дни PRO суммируются с текущим сроком. Подарок отправляет бот Telegram при наличии настроенного `gift_id` и достаточном балансе Stars; при ошибке доставки начисляются 7 дней PRO.</p>
      </details>
    </section>
  );
};

export default PremiumRoulette;
