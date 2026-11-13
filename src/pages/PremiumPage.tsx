import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, Check, Sparkles, MonitorPlay, Mic2, Music4, ShieldOff,
  BadgeCheck, Zap, ChevronDown, Star, Gift, CalendarDays, CalendarRange,
  HelpCircle, ArrowLeft,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { claimPremium } from '../api/backend';
import RulesModal from '../components/RulesModal';
import './PremiumPage.css';

/* ZENOVA PRO — понятная подписка: что даёт, сколько стоит, как подключить. */

type PlanType = 'free2' | 'stars5' | 'stars7' | 'month' | 'year';

interface Plan {
  id: PlanType;
  days: number;
  name: string;
  price: string;
  perDay: string;
  note: string;
  badge?: string;
  icon: React.ReactNode;
}

const COMPARISON: { label: string; free: string; pro: string; icon: React.ReactNode }[] = [
  { label: 'Каталог фильмов и сериалов', free: 'Полный', pro: 'Полный', icon: <MonitorPlay size={16} /> },
  { label: 'Качество видео', free: 'До 1080p', pro: '4K HDR*', icon: <Sparkles size={16} /> },
  { label: 'Студии озвучки', free: 'Основные', pro: 'Все доступные', icon: <Mic2 size={16} /> },
  { label: 'Музыка из фильмов', free: 'Превью 30 сек', pro: 'Полные треки', icon: <Music4 size={16} /> },
  { label: 'Реклама', free: 'Может появляться', pro: 'Нет', icon: <ShieldOff size={16} /> },
  { label: 'Опыт за просмотры', free: 'x1', pro: 'x2', icon: <Zap size={16} /> },
  { label: 'Бейдж в профиле', free: '—', pro: 'Золотой PRO', icon: <BadgeCheck size={16} /> },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Как активировать подписку?',
    a: 'Выберите тариф и нажмите кнопку оплаты. Для Stars-тарифов отправьте звёзды и укажите свой @username — активация проверяется автоматически. Пробные 2 дня включаются сразу, без оплаты.',
  },
  {
    q: 'Что будет, когда срок закончится?',
    a: 'Приложение продолжит работать в обычном режиме: каталог, поиск и избранное останутся с вами. PRO-привилегии просто отключатся, ничего не списывается автоматически.',
  },
  {
    q: 'Можно ли продлить или сменить тариф?',
    a: 'Да. Дни нового тарифа добавляются к остатку текущего. Можно начать с пробных 2 дней, а потом перейти на месяц или год.',
  },
  {
    q: 'Что означает «4K HDR*»?',
    a: 'Качество зависит от источника: PRO открывает максимальное качество, которое поддерживает конкретный плеер и фильм. Если источник отдаёт только 1080p — будет 1080p.',
  },
];

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [freeTrialUsed, setFreeTrialUsed] = useState(() => {
    try { return localStorage.getItem('tc_free_trial_claimed') === 'true'; } catch { return false; }
  });

  const [showPayModal, setShowPayModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [payName, setPayName] = useState(telegramUsername);
  const [payMsg, setPayMsg] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const isAdmin = telegramUsername === 'ZenovaAdmin';

  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  useEffect(() => {
    if (isPremium && premiumExpiry && Date.now() > premiumExpiry) {
      setPremium(false);
    }
  }, [isPremium, premiumExpiry, setPremium]);

  const monthPrice = prices.month ?? 199;
  const yearPrice = prices.year ?? 1600;
  const yearSavings = Math.round((1 - yearPrice / (monthPrice * 12)) * 100);

  const plans: Plan[] = [
    {
      id: 'free2', days: 2, name: 'Проба', price: '0 ₽', perDay: 'бесплатно',
      note: '2 дня PRO без оплаты и карты', badge: freeTrialUsed ? 'Использован' : 'Бесплатно',
      icon: <Gift size={18} />,
    },
    {
      id: 'stars5', days: 5, name: '5 дней', price: '7 ⭐', perDay: '≈ 1,4 ⭐ / день',
      note: 'Оплата звёздами Telegram', icon: <Star size={18} />,
    },
    {
      id: 'stars7', days: 7, name: '7 дней', price: '10 ⭐', perDay: '≈ 1,4 ⭐ / день',
      note: 'Неделя без ограничений', badge: 'Популярный',
      icon: <CalendarDays size={18} />,
    },
    {
      id: 'month', days: 30, name: 'Месяц', price: `${monthPrice} ₽`, perDay: `≈ ${Math.round(monthPrice / 30)} ₽ / день`,
      note: '30 дней PRO', icon: <CalendarDays size={18} />,
    },
    {
      id: 'year', days: 365, name: 'Год', price: `${yearPrice} ₽`, perDay: `≈ ${Math.round(yearPrice / 365)} ₽ / день`,
      note: '365 дней PRO', badge: yearSavings > 0 ? `−${yearSavings}%` : undefined,
      icon: <CalendarRange size={18} />,
    },
  ];

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSubscribe = () => {
    haptic('medium');

    if (isAdmin) {
      activatePremiumForever();
      flash('PRO активирован навсегда (Admin)');
      return;
    }

    if (selectedPlan === 'free2') {
      if (freeTrialUsed) {
        flash('Пробные 2 дня уже использованы на этом аккаунте');
        return;
      }
      activatePremiumDays(2);
      setFreeTrialUsed(true);
      try { localStorage.setItem('tc_free_trial_claimed', 'true'); } catch {}
      haptic('heavy');
      flash('Готово! 2 дня PRO активированы');
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

    const daysMap: Record<PlanType, number> = { free2: 2, stars5: 5, stars7: 7, month: 30, year: 365 };
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
      activatePremiumDays(targetDays);
      flash(`PRO на ${targetDays} дней активирован!`);
      setTimeout(() => setShowPayModal(false), 2000);
    }
  };

  const ctaLabel = isAdmin
    ? 'Активировать навсегда (Admin)'
    : selectedPlan === 'free2'
      ? (freeTrialUsed ? 'Пробный период уже использован' : 'Включить 2 дня бесплатно')
      : selectedPlan === 'stars5'
        ? 'Подключить 5 дней · 7 ⭐'
        : selectedPlan === 'stars7'
          ? 'Подключить 7 дней · 10 ⭐'
          : selectedPlan === 'month'
            ? `Подключить месяц · ${monthPrice} ₽`
            : `Подключить год · ${yearPrice} ₽`;

  /* ══════════ ЭКРАН АКТИВНОГО PRO ══════════ */
  if (isPremium) {
    return (
      <div className="zp page">
        <div className="zp-glow" aria-hidden="true" />
        <div className="zp-wrap">
          <button type="button" className="zp-back" onClick={() => { haptic('light'); navigate(-1); }}>
            <ArrowLeft size={16} /> Назад
          </button>

          <div className="zp-active">
            <div className="zp-active__crown"><Crown size={30} /></div>
            <span className="zp-active__tag">ZENOVA PRO</span>
            <h1 className="zp-active__title">Подписка активна</h1>
            <p className="zp-active__sub">
              {isAdmin
                ? 'Статус администратора · бессрочный доступ'
                : daysLeft
                  ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}${premiumExpiry ? ` · до ${new Date(premiumExpiry).toLocaleDateString('ru-RU')}` : ''}`
                  : 'Бессрочный доступ'}
            </p>
            {daysLeft !== null && !isAdmin && (
              <div className="zp-active__bar">
                <div className="zp-active__fill" style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} />
              </div>
            )}
          </div>

          <div className="zp-card">
            <div className="zp-card__head">Ваши привилегии</div>
            <ul className="zp-perks">
              <li><Check size={15} /> Максимальное качество видео, которое даёт источник (вплоть до 4K HDR)</li>
              <li><Check size={15} /> Все доступные студии озвучки в плеере</li>
              <li><Check size={15} /> Полные музыкальные треки вместо 30-секундных превью</li>
              <li><Check size={15} /> Без рекламы</li>
              <li><Check size={15} /> Двойной опыт (x2 XP) за просмотры</li>
              <li><Check size={15} /> Золотой бейдж PRO в профиле</li>
            </ul>
          </div>

          <p className="zp-hint">
            Дни можно продлить в любой момент — они добавятся к остатку. Автосписаний нет.
          </p>

          <button type="button" className="zp-legal" onClick={() => { haptic('light'); setShowRules(true); }}>
            Правила и пользовательское соглашение
          </button>

          <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div>
      </div>
    );
  }

  /* ══════════ ЭКРАН ВЫБОРА ТАРИФА ══════════ */
  return (
    <div className="zp page">
      <div className="zp-glow" aria-hidden="true" />
      <div className="zp-wrap">
        <button type="button" className="zp-back" onClick={() => { haptic('light'); navigate(-1); }}>
          <ArrowLeft size={16} /> Назад
        </button>

        <header className="zp-hero">
          <div className="zp-hero__crown"><Crown size={28} /></div>
          <h1 className="zp-hero__title">ZENOVA <span>PRO</span></h1>
          <p className="zp-hero__sub">
            Одна подписка — максимум от кинотеатра: качество, озвучки, полная музыка и ничего лишнего.
          </p>
        </header>

        <section className="zp-card">
          <div className="zp-card__head">Что даёт PRO</div>
          <div className="zp-compare">
            <div className="zp-compare__row zp-compare__row--head">
              <span />
              <span className="zp-compare__col">Бесплатно</span>
              <span className="zp-compare__col zp-compare__col--pro">PRO</span>
            </div>
            {COMPARISON.map((row) => (
              <div key={row.label} className="zp-compare__row">
                <span className="zp-compare__label">{row.icon}{row.label}</span>
                <span className="zp-compare__col">{row.free}</span>
                <span className="zp-compare__col zp-compare__col--pro">{row.pro}</span>
              </div>
            ))}
          </div>
          <p className="zp-card__foot">* Максимальное качество зависит от источника и плеера.</p>
        </section>

        <section className="zp-plans">
          <div className="zp-section-title">Выберите срок</div>
          <div className="zp-plans__grid">
            {plans.map((p) => {
              const disabled = p.id === 'free2' && freeTrialUsed;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`zp-plan ${selectedPlan === p.id ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''} ${p.id === 'year' ? 'zp-plan--wide' : ''}`}
                  onClick={() => { if (!disabled) { setSelectedPlan(p.id); haptic('light'); } }}
                >
                  {p.badge && <span className={`zp-plan__badge ${p.id === 'free2' ? 'zp-plan__badge--green' : ''}`}>{p.badge}</span>}
                  <span className="zp-plan__icon">{p.icon}</span>
                  <span className="zp-plan__name">{p.name}</span>
                  <span className="zp-plan__price">{p.price}</span>
                  <span className="zp-plan__perday">{p.perDay}</span>
                  <span className="zp-plan__note">{p.note}</span>
                  <span className="zp-plan__check">{selectedPlan === p.id ? <Check size={13} /> : null}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" className="zp-cta" onClick={handleSubscribe}>
          <Crown size={17} /> {ctaLabel}
        </button>
        <p className="zp-cta-note">
          {selectedPlan === 'free2'
            ? 'Активация в один тап · без карты и списаний'
            : selectedPlan === 'stars5' || selectedPlan === 'stars7'
              ? 'Оплата звёздами Telegram Stars · активация после подтверждения'
              : 'Разовая оплата · без автопродления и скрытых списаний'}
        </p>

        <section className="zp-card">
          <div className="zp-card__head">Как подключить</div>
          <ol className="zp-steps">
            <li><span className="zp-steps__num">1</span><div><strong>Выберите тариф</strong><small>Пробные 2 дня — бесплатно, дальше любой срок.</small></div></li>
            <li><span className="zp-steps__num">2</span><div><strong>Оплатите удобным способом</strong><small>Telegram Stars или перевод по реквизитам.</small></div></li>
            <li><span className="zp-steps__num">3</span><div><strong>PRO включится сам</strong><small>Бейдж и привилегии появятся сразу после активации.</small></div></li>
          </ol>
        </section>

        <section className="zp-card">
          <div className="zp-card__head"><HelpCircle size={15} /> Частые вопросы</div>
          <div className="zp-faq">
            {FAQ.map((item, i) => (
              <div key={i} className={`zp-faq__item ${openFaq === i ? 'is-open' : ''}`}>
                <button type="button" className="zp-faq__q" onClick={() => { setOpenFaq(openFaq === i ? null : i); haptic('light'); }}>
                  {item.q}
                  <ChevronDown size={15} className="zp-faq__chev" />
                </button>
                {openFaq === i && <p className="zp-faq__a">{item.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <button type="button" className="zp-legal" onClick={() => { haptic('light'); setShowRules(true); }}>
          Правила и пользовательское соглашение
        </button>
        <p className="zp-footer">
          PRO — подписка на возможности приложения. Права на фильмы и музыку принадлежат их правообладателям.
        </p>

        {showPayModal && (
          <div className="zp-pay-overlay" onClick={() => !payLoading && setShowPayModal(false)}>
            <div className="zp-pay" onClick={(e) => e.stopPropagation()}>
              <div className="zp-pay__handle" />
              <h2 className="zp-pay__title">
                {selectedPlan === 'stars5'
                  ? '5 дней PRO · 7 ⭐'
                  : selectedPlan === 'stars7'
                    ? '7 дней PRO · 10 ⭐'
                    : selectedPlan === 'month'
                      ? `Месяц PRO · ${monthPrice} ₽`
                      : `Год PRO · ${yearPrice} ₽`}
              </h2>

              <div className="zp-pay__instruction">
                <p>1. Отправьте звёзды ⭐ или перевод по реквизитам ниже.</p>
                <p>2. Укажите свой @username и нажмите «Подтвердить».</p>
              </div>

              <div className="zp-pay__req">
                <div className="zp-pay__row">
                  <div className="zp-pay__row-left">
                    <span className="zp-pay__label">Telegram Stars</span>
                    <span className="zp-pay__value">
                      {selectedPlan === 'stars5' ? '7 ⭐' : selectedPlan === 'stars7' ? '10 ⭐' : 'Перевод по реквизитам'}
                    </span>
                  </div>
                </div>

                {requisites.crypto && (
                  <button
                    type="button"
                    className="zp-pay__row zp-pay__row--btn"
                    onClick={() => { navigator.clipboard?.writeText(requisites.crypto); haptic('light'); setPayMsg('Адрес скопирован'); }}
                  >
                    <div className="zp-pay__row-left">
                      <span className="zp-pay__label">USDT TRC-20 / TON</span>
                      <span className="zp-pay__value">{requisites.crypto}</span>
                    </div>
                    <span className="zp-pay__copy">Копировать</span>
                  </button>
                )}
              </div>

              <input
                className="zp-pay__input"
                type="text"
                placeholder="Ваш @username в Telegram"
                value={payName}
                onChange={(e) => { setPayName(e.target.value); setPayMsg(''); }}
                spellCheck={false}
                autoComplete="off"
              />

              <button type="button" className="zp-pay__btn" onClick={handlePaid} disabled={payLoading}>
                {payLoading ? 'Проверяем оплату…' : 'Подтвердить активацию'}
              </button>
              {payMsg && <p className="zp-pay__msg">{payMsg}</p>}

              <button type="button" className="zp-pay__cancel" onClick={() => setShowPayModal(false)} disabled={payLoading}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {showSuccess && (
          <div className="zp-success"><Check size={16} /> {successMsg}</div>
        )}

        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </div>
  );
};

export default PremiumPage;
