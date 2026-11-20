import React, { useState, useEffect } from 'react';
import { ChevronLeft, Gift, Snowflake, Sparkles, Crown, Clock, CheckCircle2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import PremiumRoulette from './PremiumRoulette';
import './GiftFestHub.css';

interface GiftFestHubProps {
  onBack: () => void;
  onNotice?: (msg: string) => void;
}

const TICKETS_KEY = 'zenova_giftfest_tickets';
const DAILY_KEY = 'zenova_giftfest_daily_at';
const DAY_MS = 24 * 60 * 60 * 1000;

export const GiftFestHub: React.FC<GiftFestHubProps> = ({ onBack, onNotice }) => {
  const { haptic } = useTelegram();
  const { applyRemotePremium, isPremium } = useStore();

  const [tickets, setTickets] = useState<number>(() => {
    try { return Number(localStorage.getItem(TICKETS_KEY) || 0); } catch { return 0; }
  });

  const [lastDailyAt, setLastDailyAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(DAILY_KEY) || 0); } catch { return 0; }
  });

  const [dailyOpening, setDailyOpening] = useState(false);
  const [dailyReward, setDailyReward] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const nextDailyInMs = Math.max(0, lastDailyAt + DAY_MS - now);
  const canOpenDaily = nextDailyInMs === 0;

  const formatCooldown = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}ч ${String(m).padStart(2, '0')}м`;
  };

  const handleOpenDailyBox = () => {
    if (!canOpenDaily || dailyOpening) return;
    haptic('medium');
    setDailyOpening(true);
    window.setTimeout(() => {
      const gained = [15, 20, 25, 35, 50][Math.floor(Math.random() * 5)];
      const nextTickets = tickets + gained;
      const ts = Date.now();
      setTickets(nextTickets);
      setLastDailyAt(ts);
      setDailyReward(gained);
      setDailyOpening(false);
      try {
        localStorage.setItem(TICKETS_KEY, String(nextTickets));
        localStorage.setItem(DAILY_KEY, String(ts));
      } catch {}
      haptic('heavy');
      onNotice?.(`Получено +${gained} ❄️ в GiftFest!`);
    }, 600);
  };

  const milestone = 200;
  const milestonePct = Math.min(100, Math.round((tickets / milestone) * 100));

  return (
    <div className="gf-hub">
      <header className="gf-nav">
        <button
          type="button"
          className="gf-nav__back"
          onClick={() => {
            haptic('light');
            onBack();
          }}
        >
          <ChevronLeft size={18} />
          <span>Назад</span>
        </button>
        <h1 className="gf-nav__title">GiftFest</h1>
        <div className="gf-nav__tickets" title="Снежинки-билеты">
          <Snowflake size={13} />
          <span>{tickets}</span>
        </div>
      </header>

      <div className="gf-body">
        {/* Hero ивента */}
        <section className="gf-hero">
          <div className="gf-hero__badge">
            <Sparkles size={11} />
            <span>ЗИМНИЙ РОЗЫГРЫШ · ZENOVA</span>
          </div>
          <h2 className="gf-hero__title">Новогодний GiftFest</h2>
          <p className="gf-hero__sub">
            Крутите колесо за 10 Stars, выигрывайте дни ZENOVA PRO и редкий Telegram Подарок, а также собирайте снежинки каждый день.
          </p>

          <div className="gf-progress-box">
            <div className="gf-progress-box__top">
              <span>Билеты розыгрыша</span>
              <strong>{tickets} / {milestone} ❄️</strong>
            </div>
            <div className="gf-progress-box__track">
              <div className="gf-progress-box__fill" style={{ width: `${milestonePct}%` }} />
            </div>
            <span className="gf-progress-box__hint">
              {tickets >= milestone
                ? 'Вы участник главного новогоднего розыгрыша!'
                : `Соберите ${milestone} ❄️ для участия в большом зимнем розыгрыше призов`}
            </span>
          </div>
        </section>

        {/* Ежедневный бесплатный сундук */}
        <section className="gf-daily">
          <div className="gf-daily__icon">
            <Gift size={22} />
          </div>
          <div className="gf-daily__info">
            <span className="gf-daily__kicker">БЕСПЛАТНО РАЗ В 24 ЧАСА</span>
            <h3 className="gf-daily__title">Снежный бокс дня</h3>
            <p className="gf-daily__sub">
              {dailyReward
                ? `Вы получили +${dailyReward} ❄️ билетов!`
                : canOpenDaily
                  ? 'Откройте сейчас и заберите от 15 до 50 снежинок'
                  : `Следующий бокс через ${formatCooldown(nextDailyInMs)}`}
            </p>
          </div>
          <button
            type="button"
            className={`gf-daily__btn ${!canOpenDaily ? 'is-cooldown' : ''}`}
            onClick={handleOpenDailyBox}
            disabled={!canOpenDaily || dailyOpening}
          >
            {dailyOpening ? (
              'Открываем…'
            ) : canOpenDaily ? (
              'Открыть'
            ) : (
              <>
                <Clock size={12} />
                <span>Ждём</span>
              </>
            )}
          </button>
        </section>

        {/* Колесо Фортуны 10 Stars */}
        <PremiumRoulette
          onPremium={(expiry) => {
            applyRemotePremium(expiry);
            const bonusTickets = tickets + 30;
            setTickets(bonusTickets);
            try { localStorage.setItem(TICKETS_KEY, String(bonusTickets)); } catch {}
            onNotice?.('Приз начислен + 30 ❄️ за спин!');
          }}
        />

        {/* Призовой фонд */}
        <section className="gf-prizes">
          <h3 className="gf-prizes__title">Что можно выиграть</h3>
          <div className="gf-prizes__grid">
            <div className="gf-prize-card">
              <span className="gf-prize-card__icon gf-prize-card__icon--gold"><Gift size={18} /></span>
              <strong>Подарок Telegram</strong>
              <span>Коллекционный подарок напрямую в ваш профиль</span>
            </div>
            <div className="gf-prize-card">
              <span className="gf-prize-card__icon gf-prize-card__icon--amber"><Crown size={18} /></span>
              <strong>До 7 дней PRO</strong>
              <span>Доступ к Gemini, Kimi K3.1 Pro и золотой статус</span>
            </div>
            <div className="gf-prize-card">
              <span className="gf-prize-card__icon gf-prize-card__icon--cyan"><Snowflake size={18} /></span>
              <strong>+30 ❄️ за спин</strong>
              <span>Билеты за каждое вращение в общий зачёт</span>
            </div>
            <div className="gf-prize-card">
              <span className="gf-prize-card__icon gf-prize-card__icon--green"><CheckCircle2 size={18} /></span>
              <strong>{isPremium ? 'PRO активен' : 'Гарант приза'}</strong>
              <span>Ни одного пустого сектора — выигрыш в каждом спине</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GiftFestHub;
