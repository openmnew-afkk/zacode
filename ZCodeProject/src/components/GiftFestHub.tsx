import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Gift, Snowflake, Sparkles, Crown, Clock, CheckCircle2, Film, Star, Bookmark, Award } from 'lucide-react';
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
const QUESTS_KEY = 'zenova_giftfest_quests_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

interface QuestDef {
  id: string;
  title: string;
  desc: string;
  badge: string;
  reward: number;
  icon: React.ReactNode;
  done: boolean;
}

export const GiftFestHub: React.FC<GiftFestHubProps> = ({ onBack, onNotice }) => {
  const { haptic } = useTelegram();
  const { applyRemotePremium, isPremium, watchHistory, favorites, tracked } = useStore();

  const [tickets, setTickets] = useState<number>(() => {
    try { return Number(localStorage.getItem(TICKETS_KEY) || 0); } catch { return 0; }
  });

  const [lastDailyAt, setLastDailyAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(DAILY_KEY) || 0); } catch { return 0; }
  });

  const [claimedQuests, setClaimedQuests] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(QUESTS_KEY) || '[]'); } catch { return []; }
  });

  const [dailyOpening, setDailyOpening] = useState(false);
  const [dailyReward, setDailyReward] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const quests = useMemo<QuestDef[]>(() => {
    const ratedCount = Object.values(tracked || {}).filter((t) => (t.rating || 0) > 0).length;
    const hasOpenedBox = lastDailyAt > 0;
    return [
      {
        id: 'first_watch',
        title: 'Первый киносеанс',
        desc: 'Откройте любой фильм в каталоге или плеере',
        badge: 'Ачивка: Зритель',
        reward: 25,
        icon: <Film size={16} />,
        done: watchHistory.length >= 1,
      },
      {
        id: 'critic',
        title: 'Кинокритик',
        desc: 'Поставьте оценку фильму в «Моём дневнике»',
        badge: 'Ачивка: Критик',
        reward: 35,
        icon: <Star size={16} />,
        done: ratedCount >= 1,
      },
      {
        id: 'collector',
        title: 'Золотая коллекция',
        desc: 'Сохраните 3 фильма в Избранное',
        badge: 'Ачивка: Эстет',
        reward: 50,
        icon: <Bookmark size={16} />,
        done: favorites.length >= 3,
      },
      {
        id: 'gift_hunter',
        title: 'Охотник GiftFest',
        desc: 'Откройте бесплатный «Снежный бокс дня»',
        badge: 'Ачивка: Удачливый',
        reward: 40,
        icon: <Gift size={16} />,
        done: hasOpenedBox,
      },
      {
        id: 'marathon',
        title: 'Зимний марафонец',
        desc: 'Посмотрите 5 фильмов или сериалов',
        badge: 'Ачивка: Легенда Зала',
        reward: 100,
        icon: <Award size={16} />,
        done: watchHistory.length >= 5,
      },
    ];
  }, [watchHistory.length, favorites.length, tracked, lastDailyAt]);

  const claimQuest = (q: QuestDef) => {
    if (!q.done || claimedQuests.includes(q.id)) return;
    haptic('heavy');
    const nextClaimed = [...claimedQuests, q.id];
    const nextTickets = tickets + q.reward;
    setClaimedQuests(nextClaimed);
    setTickets(nextTickets);
    try {
      localStorage.setItem(QUESTS_KEY, JSON.stringify(nextClaimed));
      localStorage.setItem(TICKETS_KEY, String(nextTickets));
    } catch {}
    onNotice?.(`${q.badge} открыта! +${q.reward} ❄️`);
  };

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
          }}
          onSpinComplete={() => {
            const bonusTickets = tickets + 30;
            setTickets(bonusTickets);
            try { localStorage.setItem(TICKETS_KEY, String(bonusTickets)); } catch {}
            onNotice?.('Приз начислен + 30 ❄️ за спин!');
          }}
        />

        {/* План подарков и Ачивки в стиле кино */}
        <section className="gf-quests">
          <div className="gf-quests__head">
            <h3 className="gf-prizes__title">План подарков · Кино-ачивки</h3>
            <span className="gf-quests__count">{claimedQuests.length} / {quests.length}</span>
          </div>
          <div className="gf-quests__list">
            {quests.map((q) => {
              const claimed = claimedQuests.includes(q.id);
              return (
                <div key={q.id} className={`gf-quest ${claimed ? 'is-claimed' : q.done ? 'is-ready' : ''}`}>
                  <span className="gf-quest__icon">{q.icon}</span>
                  <div className="gf-quest__copy">
                    <span className="gf-quest__badge">{q.badge}</span>
                    <strong>{q.title}</strong>
                    <p>{q.desc}</p>
                  </div>
                  <button
                    type="button"
                    className={`gf-quest__btn ${claimed ? 'is-claimed' : q.done ? 'is-ready' : ''}`}
                    onClick={() => claimQuest(q)}
                    disabled={!q.done || claimed}
                  >
                    {claimed ? 'Получено' : q.done ? `+${q.reward} ❄️` : `${q.reward} ❄️`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

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
