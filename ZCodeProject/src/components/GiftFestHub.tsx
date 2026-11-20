import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft, Gift, Snowflake, Sparkles, Crown, Clock,
  Film, Star, Bookmark, Award, Check,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import {
  idbGet,
  idbSet,
  tgCloudLoadChunked,
  tgCloudSaveChunked,
} from '../services/userCloudStorage';
import PremiumRoulette from './PremiumRoulette';
import './GiftFestHub.css';

export interface GiftFestHubProps {
  onBack?: () => void;
  onNotice?: (msg: string) => void;
  embedded?: boolean;
  onTicketsChange?: (tickets: number) => void;
}

export const GIFTFEST_TICKETS_KEY = 'zenova_giftfest_tickets';
const DAILY_KEY = 'zenova_giftfest_daily_at';
const TREE_PICK_KEY = 'zenova_giftfest_tree_at';
const QUESTS_KEY = 'zenova_giftfest_quests_v1';
const ROADMAP_KEY = 'zenova_giftfest_roadmap_v1';
const UPDATED_KEY = 'zenova_giftfest_updated_at';
const FREE_SPIN_KEY = 'zenova_roulette_free_spin_at';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GiftFestSyncPayload {
  tickets: number;
  lastDailyAt: number;
  lastTreeAt: number;
  lastFreeSpinAt?: number;
  claimedQuests: string[];
  claimedRoadmap: string[];
  updatedAt: number;
}

interface QuestDef {
  id: string;
  title: string;
  desc: string;
  badge: string;
  reward: number;
  icon: React.ReactNode;
  done: boolean;
}

interface RoadmapTier {
  id: string;
  cost: number;
  title: string;
  rewardLabel: string;
  proDays?: number;
}

const ROADMAP_TIERS: RoadmapTier[] = [
  { id: 'r_50', cost: 50, title: 'Зимний Зритель', rewardLabel: 'Бейдж сезона + старт марафона' },
  { id: 'r_120', cost: 120, title: '2 дня PRO', rewardLabel: 'Полный доступ к Gemini & Kimi', proDays: 2 },
  { id: 'r_220', cost: 220, title: '5 дней PRO', rewardLabel: 'Недельный буст и золотой ранг', proDays: 5 },
  { id: 'r_350', cost: 350, title: '7 дней PRO', rewardLabel: 'Титул «Магистр Кино»', proDays: 7 },
  { id: 'r_500', cost: 500, title: '30 дней PRO', rewardLabel: 'Гранд-приз Зимнего Киномарафона', proDays: 30 },
];

export const GiftFestHub: React.FC<GiftFestHubProps> = ({
  onBack,
  onNotice,
  embedded = false,
  onTicketsChange,
}) => {
  const { haptic } = useTelegram();
  const {
    applyRemotePremium,
    activatePremiumDays,
    isPremium,
    watchHistory,
    favorites,
    tracked,
  } = useStore();

  const [tickets, setTickets] = useState<number>(() => {
    try { return Number(localStorage.getItem(GIFTFEST_TICKETS_KEY) || 0); } catch { return 0; }
  });

  const [lastDailyAt, setLastDailyAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(DAILY_KEY) || 0); } catch { return 0; }
  });

  const [lastTreeAt, setLastTreeAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(TREE_PICK_KEY) || 0); } catch { return 0; }
  });

  const [treeResult, setTreeResult] = useState<{ idx: number; amount: number } | null>(null);

  const [claimedQuests, setClaimedQuests] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(QUESTS_KEY) || '[]'); } catch { return []; }
  });

  const [claimedRoadmap, setClaimedRoadmap] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(ROADMAP_KEY) || '[]'); } catch { return []; }
  });

  const [dailyOpening, setDailyOpening] = useState(false);
  const [dailyReward, setDailyReward] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const stateRef = useRef({
    tickets,
    lastDailyAt,
    lastTreeAt,
    claimedQuests,
    claimedRoadmap,
  });
  stateRef.current = { tickets, lastDailyAt, lastTreeAt, claimedQuests, claimedRoadmap };

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const persistGiftFest = (next: GiftFestSyncPayload, syncRemote = true) => {
    setTickets(next.tickets);
    setLastDailyAt(next.lastDailyAt);
    setLastTreeAt(next.lastTreeAt);
    setClaimedQuests(next.claimedQuests);
    setClaimedRoadmap(next.claimedRoadmap);
    stateRef.current = {
      tickets: next.tickets,
      lastDailyAt: next.lastDailyAt,
      lastTreeAt: next.lastTreeAt,
      claimedQuests: next.claimedQuests,
      claimedRoadmap: next.claimedRoadmap,
    };

    try {
      localStorage.setItem(GIFTFEST_TICKETS_KEY, String(next.tickets));
      localStorage.setItem(DAILY_KEY, String(next.lastDailyAt));
      localStorage.setItem(TREE_PICK_KEY, String(next.lastTreeAt));
      localStorage.setItem(QUESTS_KEY, JSON.stringify(next.claimedQuests));
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(next.claimedRoadmap));
      localStorage.setItem(UPDATED_KEY, String(next.updatedAt));
      if (next.lastFreeSpinAt && next.lastFreeSpinAt > 0) {
        const curFree = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
        if (next.lastFreeSpinAt > curFree) {
          localStorage.setItem(FREE_SPIN_KEY, String(next.lastFreeSpinAt));
        }
      }
    } catch {}

    onTicketsChange?.(next.tickets);
    window.dispatchEvent(new CustomEvent('zenova-giftfest-sync', { detail: next }));

    if (syncRemote) {
      idbSet('tc_giftfest_state', next);
      tgCloudSaveChunked('znv_gfest', next);
    }
  };

  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      try {
        const localUpdated = Number(localStorage.getItem(UPDATED_KEY) || 0) || 0;
        const localFreeSpin = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
        const cur = stateRef.current;

        const [idbState, cloudState] = await Promise.all([
          idbGet<Partial<GiftFestSyncPayload>>('tc_giftfest_state'),
          tgCloudLoadChunked<Partial<GiftFestSyncPayload> | null>('znv_gfest', null),
        ]);
        if (!alive) return;

        const remoteSources = [idbState, cloudState].filter(
          (s): s is Partial<GiftFestSyncPayload> => Boolean(s && typeof s === 'object')
        );
        if (remoteSources.length === 0) {
          if (cur.tickets > 0 || cur.claimedQuests.length > 0 || cur.claimedRoadmap.length > 0 || cur.lastDailyAt > 0 || cur.lastTreeAt > 0) {
            const initial: GiftFestSyncPayload = {
              ...cur,
              lastFreeSpinAt: localFreeSpin,
              updatedAt: localUpdated || Date.now(),
            };
            idbSet('tc_giftfest_state', initial);
            tgCloudSaveChunked('znv_gfest', initial);
          }
          return;
        }

        const mergedQuests = Array.from(
          new Set([
            ...cur.claimedQuests,
            ...remoteSources.flatMap((s) => (Array.isArray(s.claimedQuests) ? s.claimedQuests : [])),
          ])
        );
        const mergedRoadmap = Array.from(
          new Set([
            ...cur.claimedRoadmap,
            ...remoteSources.flatMap((s) => (Array.isArray(s.claimedRoadmap) ? s.claimedRoadmap : [])),
          ])
        );
        const mergedDailyAt = Math.max(cur.lastDailyAt, ...remoteSources.map((s) => Number(s.lastDailyAt || 0)));
        const mergedTreeAt = Math.max(cur.lastTreeAt, ...remoteSources.map((s) => Number(s.lastTreeAt || 0)));
        const mergedFreeSpinAt = Math.max(localFreeSpin, ...remoteSources.map((s) => Number(s.lastFreeSpinAt || 0)));

        // Для снежинок: если локально ещё не было timestamp (миграция или сброс) — берём Math.max;
        // если есть timestamp'ы, побеждает самое свежее событие (чтобы трата -25 ❄️ не откатывалась),
        // но если локально 0 и в облаке > 0 — всегда восстанавливаем облако.
        let bestTickets = cur.tickets;
        let bestUpdated = localUpdated;
        for (const s of remoteSources) {
          const rTickets = Number(s.tickets ?? 0);
          const rUpdated = Number(s.updatedAt ?? 0);
          if (bestUpdated === 0) {
            bestTickets = Math.max(bestTickets, rTickets);
            if (rUpdated > bestUpdated) bestUpdated = rUpdated;
          } else if (rUpdated > bestUpdated) {
            bestTickets = rTickets;
            bestUpdated = rUpdated;
          } else if (bestTickets === 0 && rTickets > 0) {
            bestTickets = rTickets;
          }
        }

        const merged: GiftFestSyncPayload = {
          tickets: bestTickets,
          lastDailyAt: mergedDailyAt,
          lastTreeAt: mergedTreeAt,
          lastFreeSpinAt: mergedFreeSpinAt,
          claimedQuests: mergedQuests,
          claimedRoadmap: mergedRoadmap,
          updatedAt: Math.max(bestUpdated, Date.now()),
        };

        const needsLocalUpdate =
          merged.tickets !== cur.tickets ||
          merged.lastDailyAt !== cur.lastDailyAt ||
          merged.lastTreeAt !== cur.lastTreeAt ||
          merged.claimedQuests.length !== cur.claimedQuests.length ||
          merged.claimedRoadmap.length !== cur.claimedRoadmap.length;

        const needsCloudPush =
          !cloudState ||
          Number(cloudState.tickets ?? -1) !== merged.tickets ||
          (cloudState.claimedQuests?.length || 0) !== merged.claimedQuests.length ||
          (cloudState.claimedRoadmap?.length || 0) !== merged.claimedRoadmap.length;

        if (needsLocalUpdate) {
          persistGiftFest(merged, needsCloudPush);
        } else if (needsCloudPush) {
          idbSet('tc_giftfest_state', merged);
          tgCloudSaveChunked('znv_gfest', merged);
        }
      } catch {}
    };

    hydrate();

    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<Partial<GiftFestSyncPayload>>).detail;
      if (!detail) return;
      if (typeof detail.tickets === 'number' && detail.tickets !== stateRef.current.tickets) {
        setTickets(detail.tickets);
        stateRef.current.tickets = detail.tickets;
        onTicketsChange?.(detail.tickets);
      }
      if (typeof detail.lastDailyAt === 'number' && detail.lastDailyAt > stateRef.current.lastDailyAt) {
        setLastDailyAt(detail.lastDailyAt);
        stateRef.current.lastDailyAt = detail.lastDailyAt;
      }
      if (typeof detail.lastTreeAt === 'number' && detail.lastTreeAt > stateRef.current.lastTreeAt) {
        setLastTreeAt(detail.lastTreeAt);
        stateRef.current.lastTreeAt = detail.lastTreeAt;
      }
      if (typeof detail.lastFreeSpinAt === 'number' && detail.lastFreeSpinAt > 0 && !detail.updatedAt) {
        const snapshot: GiftFestSyncPayload = {
          ...stateRef.current,
          lastFreeSpinAt: detail.lastFreeSpinAt,
          updatedAt: Date.now(),
        };
        idbSet('tc_giftfest_state', snapshot);
        tgCloudSaveChunked('znv_gfest', snapshot);
      }
      if (Array.isArray(detail.claimedQuests)) {
        const union = Array.from(new Set([...stateRef.current.claimedQuests, ...detail.claimedQuests]));
        if (union.length !== stateRef.current.claimedQuests.length) {
          setClaimedQuests(union);
          stateRef.current.claimedQuests = union;
        }
      }
      if (Array.isArray(detail.claimedRoadmap)) {
        const union = Array.from(new Set([...stateRef.current.claimedRoadmap, ...detail.claimedRoadmap]));
        if (union.length !== stateRef.current.claimedRoadmap.length) {
          setClaimedRoadmap(union);
          stateRef.current.claimedRoadmap = union;
        }
      }
    };
    window.addEventListener('zenova-giftfest-sync', onSync);
    return () => {
      alive = false;
      window.removeEventListener('zenova-giftfest-sync', onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncTickets = (next: number) => {
    const freeAt = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
    persistGiftFest({
      ...stateRef.current,
      tickets: next,
      lastFreeSpinAt: freeAt,
      updatedAt: Date.now(),
    });
  };

  const nextDailyInMs = Math.max(0, lastDailyAt + DAY_MS - now);
  const canOpenDaily = nextDailyInMs === 0;
  const canPickTree = now >= lastTreeAt + DAY_MS;

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
      const gained = [20, 25, 30, 40, 50][Math.floor(Math.random() * 5)];
      const ts = Date.now();
      const cur = stateRef.current;
      const freeAt = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
      setDailyReward(gained);
      setDailyOpening(false);
      persistGiftFest({
        ...cur,
        tickets: cur.tickets + gained,
        lastDailyAt: ts,
        lastFreeSpinAt: freeAt,
        updatedAt: ts,
      });
      haptic('heavy');
      onNotice?.(`Снежный бокс: +${gained} ❄️!`);
    }, 550);
  };

  const handlePickTreeGift = (boxIdx: number) => {
    if (!canPickTree) return;
    haptic('heavy');
    const rewards = [15, 25, 45].sort(() => Math.random() - 0.5);
    const amount = rewards[boxIdx] || 25;
    const ts = Date.now();
    const cur = stateRef.current;
    const freeAt = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
    setTreeResult({ idx: boxIdx, amount });
    persistGiftFest({
      ...cur,
      tickets: cur.tickets + amount,
      lastTreeAt: ts,
      lastFreeSpinAt: freeAt,
      updatedAt: ts,
    });
    onNotice?.(`Подарок под ёлкой: +${amount} ❄️!`);
  };

  const handleClaimRoadmap = (tier: RoadmapTier) => {
    const cur = stateRef.current;
    if (cur.tickets < tier.cost || cur.claimedRoadmap.includes(tier.id)) return;
    haptic('heavy');
    const nextClaimed = [...cur.claimedRoadmap, tier.id];
    const freeAt = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
    persistGiftFest({
      ...cur,
      claimedRoadmap: nextClaimed,
      lastFreeSpinAt: freeAt,
      updatedAt: Date.now(),
    });
    if (tier.proDays) {
      activatePremiumDays(tier.proDays);
      onNotice?.(`Открыто: ${tier.title}! Подписка активирована.`);
    } else {
      onNotice?.(`Получено достижение: ${tier.title}!`);
    }
  };

  const quests = useMemo<QuestDef[]>(() => {
    const ratedCount = Object.values(tracked || {}).filter((t) => (t.rating || 0) > 0).length;
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
        done: lastDailyAt > 0,
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
    const cur = stateRef.current;
    if (!q.done || cur.claimedQuests.includes(q.id)) return;
    haptic('heavy');
    const nextClaimed = [...cur.claimedQuests, q.id];
    const freeAt = Number(localStorage.getItem(FREE_SPIN_KEY) || 0) || 0;
    persistGiftFest({
      ...cur,
      tickets: cur.tickets + q.reward,
      claimedQuests: nextClaimed,
      lastFreeSpinAt: freeAt,
      updatedAt: Date.now(),
    });
    onNotice?.(`${q.badge} открыта! +${q.reward} ❄️`);
  };

  const maxRoadmap = ROADMAP_TIERS[ROADMAP_TIERS.length - 1].cost;
  const roadmapPct = Math.min(100, Math.round((tickets / maxRoadmap) * 100));

  return (
    <div className={`gf-hub ${embedded ? 'gf-hub--embedded' : ''}`}>
      {!embedded && (
        <header className="gf-nav">
          <button
            type="button"
            className="gf-nav__back"
            onClick={() => {
              haptic('light');
              onBack?.();
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
      )}

      <div className="gf-body">
        {/* Hero ивента (показываем в standalone-режиме) */}
        {!embedded && (
          <section className="gf-hero">
            <div className="gf-hero__badge">
              <Sparkles size={11} />
              <span>СЕЗОННЫЙ ИВЕНТ · ZENOVA</span>
            </div>
            <h2 className="gf-hero__title">Новогодний GiftFest</h2>
            <p className="gf-hero__sub">
              Смотрите фильмы, открывайте подарки под ёлкой, крутите Колесо Фортуны бесплатно каждый день и забирайте дни ZENOVA PRO.
            </p>
            <div className="gf-progress-box">
              <div className="gf-progress-box__top">
                <span>Прогресс сезона GiftFest</span>
                <strong>{tickets} / {maxRoadmap} ❄️</strong>
              </div>
              <div className="gf-progress-box__track">
                <div className="gf-progress-box__fill" style={{ width: `${roadmapPct}%` }} />
              </div>
              <span className="gf-progress-box__hint">
                {isPremium ? 'Статус PRO активен — модели Gemini и Kimi открыты' : 'Соберите 120 ❄️ или крутите рулетку для получения PRO'}
              </span>
            </div>
          </section>
        )}

        {/* Bento 2x: Снежный бокс дня + Подарки под ёлкой */}
        <div className="gf-bento-row">
          {/* Ежедневный бесплатный сундук */}
          <section className="gf-daily">
            <div className="gf-daily__top">
              <div className="gf-daily__icon">
                <Gift size={17} />
              </div>
              <span className="gf-daily__kicker">24Ч БОНУС</span>
            </div>
            <div className="gf-daily__info">
              <h3 className="gf-daily__title">Снежный бокс</h3>
              <p className="gf-daily__sub">
                {dailyReward
                  ? `+${dailyReward} ❄️ получено`
                  : canOpenDaily
                    ? '+20…50 ❄️ бесплатно'
                    : formatCooldown(nextDailyInMs)}
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

          {/* Мини-игра «Подарки под ёлкой» */}
          <section className="gf-tree-game">
            <div className="gf-tree-game__head">
              <div>
                <span className="gf-daily__kicker">ИГРА ДНЯ</span>
                <h3 className="gf-tree-game__title">Под ёлкой</h3>
                <p className="gf-tree-game__sub">
                  {treeResult
                    ? `Приз +${treeResult.amount} ❄️`
                    : canPickTree
                      ? 'До +45 ❄️ в одной из 3'
                      : formatCooldown(Math.max(0, lastTreeAt + DAY_MS - now))}
                </p>
              </div>
            </div>

            <div className="gf-tree-boxes">
              {[0, 1, 2].map((idx) => {
                const picked = treeResult?.idx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`gf-tree-box ${picked ? 'is-picked' : ''} ${!canPickTree && !picked ? 'is-locked' : ''}`}
                    onClick={() => handlePickTreeGift(idx)}
                    disabled={!canPickTree}
                  >
                    <span className="gf-tree-box__emoji">{picked ? '✨' : '🎁'}</span>
                    <span className="gf-tree-box__lbl">
                      {picked ? `+${treeResult.amount}` : `#${idx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Колесо Фортуны */}
        <PremiumRoulette
          tickets={tickets}
          onTicketsChange={syncTickets}
          onPremium={(expiry) => applyRemotePremium(expiry)}
          onSpinComplete={(spin) => {
            if (!spin.tickets) {
              const bonus = 15;
              syncTickets(stateRef.current.tickets + bonus);
              onNotice?.(`${spin.label} + ${bonus} ❄️ за спин!`);
            } else {
              onNotice?.(`Начислено ${spin.label}!`);
            }
          }}
        />

        {/* Дорожка наград PRO */}
        <section className="gf-roadmap">
          <div className="gf-quests__head">
            <h3 className="gf-prizes__title">Дорожка подарков</h3>
            <span className="gf-quests__count">{tickets} / {maxRoadmap} ❄️</span>
          </div>
          <div className="gf-roadmap__track" aria-hidden="true">
            <div className="gf-roadmap__fill" style={{ width: `${roadmapPct}%` }} />
          </div>
          <div className="gf-roadmap__list">
            {ROADMAP_TIERS.map((tier) => {
              const unlocked = tickets >= tier.cost;
              const claimed = claimedRoadmap.includes(tier.id);
              return (
                <div key={tier.id} className={`gf-road-step ${claimed ? 'is-claimed' : unlocked ? 'is-ready' : ''}`}>
                  <div className="gf-road-step__cost">
                    <Snowflake size={11} />
                    <span>{tier.cost}</span>
                  </div>
                  <div className="gf-road-step__info">
                    <strong>{tier.title}</strong>
                    <span>{tier.rewardLabel}</span>
                  </div>
                  <button
                    type="button"
                    className={`gf-quest__btn ${claimed ? 'is-claimed' : unlocked ? 'is-ready' : ''}`}
                    onClick={() => handleClaimRoadmap(tier)}
                    disabled={!unlocked || claimed}
                  >
                    {claimed ? <Check size={13} /> : unlocked ? 'Забрать' : <Crown size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Кино-Ачивки */}
        <section className="gf-quests">
          <div className="gf-quests__head">
            <h3 className="gf-prizes__title">Кино-ачивки</h3>
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
      </div>
    </div>
  );
};

export default GiftFestHub;
