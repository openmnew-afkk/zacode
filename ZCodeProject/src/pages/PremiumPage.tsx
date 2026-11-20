import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, CalendarDays, Check, ChevronDown, Crown,
  Gift, HelpCircle, MonitorPlay, ShieldOff, Sparkles, Star, Zap,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import {
  createPremiumInvoice, fetchPremiumStatus, type PremiumPlanId,
} from '../api/backend';
import RulesModal from '../components/RulesModal';
import PremiumRoulette from '../components/PremiumRoulette';
import './PremiumPage.css';

interface Plan {
  id: PremiumPlanId;
  name: string;
  price: string;
  perDay: string;
  note: string;
  badge?: string;
  icon: React.ReactNode;
}

const COMPARISON = [
  { label: 'Каталог и поиск', free: 'Полные', pro: 'Полные', icon: <MonitorPlay size={16} /> },
  { label: 'Плееры, качество и озвучка', free: 'От источника', pro: 'От источника', icon: <Sparkles size={16} /> },
  { label: 'Внутреннее объявление', free: 'Показывается', pro: 'Скрыто', icon: <ShieldOff size={16} /> },
  { label: 'ИИ-консьерж SYNTHAX', free: '2 запроса / день', pro: 'Kimi K3.1 Pro · 8 / день', icon: <Sparkles size={16} /> },
  { label: 'Опыт профиля', free: 'Базовый', pro: '+250 XP', icon: <Zap size={16} /> },
  { label: 'Оформление профиля', free: 'Обычное', pro: 'Золотое PRO', icon: <BadgeCheck size={16} /> },
];

const FAQ = [
  {
    q: 'Как проходит оплата?',
    a: 'После выбора тарифа Telegram откроет официальный счёт в Stars. PRO включается только после подтверждения платежа сервером Telegram. Банковская карта и переводы по реквизитам не нужны.',
  },
  {
    q: 'Как работает пробный период?',
    a: '7 дней PRO стоят 15 Stars. Предложение доступно один раз на Telegram-аккаунт. Это платный пробный период, а не бесплатная подписка.',
  },
  {
    q: 'PRO улучшает качество фильмов?',
    a: 'Нет. Видео, качество, озвучка и реклама зависят от сторонних плееров и конкретного источника. ZENOVA не управляет ими и не обещает 4K, HDR или отсутствие рекламы внутри плееров.',
  },
  {
    q: 'Есть ли автопродление?',
    a: 'Нет. Оба тарифа — разовая покупка на указанный срок. Когда PRO закончится, каталог, поиск и кинотека останутся доступны, а золотое оформление и бонус XP отключатся.',
  },
];

const PLANS: Plan[] = [
  {
    id: 'trial', name: 'Пробные 7 дней', price: '15 Stars', perDay: '≈ 2,1 Stars / день',
    note: 'Один раз на Telegram-аккаунт', badge: 'Попробовать', icon: <Gift size={18} />,
  },
  {
    id: 'month', name: '30 дней', price: '180 Stars', perDay: '6 Stars / день',
    note: 'Полный месяц ZENOVA PRO', badge: 'На месяц', icon: <CalendarDays size={18} />,
  },
];

const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { tg, haptic } = useTelegram();
  const {
    isPremium, setPremium, activatePremiumForever,
    premiumExpiry, telegramUsername, applyRemotePremium,
  } = useStore();

  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>('month');
  const [trialUsed, setTrialUsed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showRules, setShowRules] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const isAdmin = telegramUsername === 'ZenovaAdmin';
  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    if (isPremium && premiumExpiry && Date.now() > premiumExpiry) setPremium(false);
  }, [isPremium, premiumExpiry, setPremium]);

  useEffect(() => {
    let active = true;
    fetchPremiumStatus().then((status) => {
      if (!active) return;
      setTrialUsed(status.trialUsed);
      if (status.premium) applyRemotePremium(status.expiry);
    }).catch(() => {});
    return () => { active = false; };
  }, [applyRemotePremium]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
  };

  const waitForConfirmedPremium = async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const status = await fetchPremiumStatus();
      setTrialUsed(status.trialUsed);
      if (status.premium) {
        applyRemotePremium(status.expiry);
        return true;
      }
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return false;
  };

  const handleInvoiceResult = async (status: string) => {
    try {
      if (status === 'paid') {
        setPayMsg('Оплата принята Telegram. Подтверждаем активацию…');
        if (await waitForConfirmedPremium()) {
          haptic('heavy');
          setPayMsg('');
          flash('ZENOVA PRO активирован. Спасибо!');
        } else {
          setPayMsg('Оплата принята. Telegram ещё передаёт подтверждение — откройте страницу через минуту.');
        }
      } else if (status === 'pending') {
        setPayMsg('Платёж ожидает подтверждения. PRO включится после подтверждения Telegram.');
      } else {
        setPayMsg(status === 'cancelled' ? 'Оплата отменена. Premium не активирован.' : 'Платёж не завершён. Premium не активирован.');
      }
    } catch {
      setPayMsg('Не удалось проверить статус. Откройте страницу ещё раз — оплата не будет активирована локально.');
    } finally {
      setPayLoading(false);
    }
  };

  const handleSubscribe = async () => {
    haptic('medium');
    if (isAdmin) {
      activatePremiumForever();
      flash('PRO активирован навсегда (Admin)');
      return;
    }
    if (selectedPlan === 'trial' && trialUsed) {
      setPayMsg('Пробный период уже использован на этом аккаунте');
      return;
    }
    if (!tg?.openInvoice) {
      setPayMsg('Оплата Stars доступна внутри Telegram Mini App');
      return;
    }

    setPayLoading(true);
    setPayMsg('Создаём официальный счёт Telegram…');
    try {
      const invoice = await createPremiumInvoice(selectedPlan);
      setPayMsg('Открываем оплату Telegram Stars…');
      tg.openInvoice(invoice.url, (status) => { void handleInvoiceResult(status); });
    } catch (error) {
      setPayMsg(error instanceof Error ? error.message : 'Не удалось создать счёт. Попробуйте позже.');
      setPayLoading(false);
    }
  };

  const selected = PLANS.find((plan) => plan.id === selectedPlan) || PLANS[1];

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
            <h1 className="zp-active__title">PRO активен</h1>
            <p className="zp-active__sub">
              {isAdmin
                ? 'Статус администратора · бессрочный доступ'
                : daysLeft
                  ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} · до ${new Date(premiumExpiry!).toLocaleDateString('ru-RU')}`
                  : 'Бессрочный доступ'}
            </p>
            {daysLeft !== null && !isAdmin && (
              <div className="zp-active__bar">
                <div className="zp-active__fill" style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }} />
              </div>
            )}
          </div>

          <div className="zp-card">
            <div className="zp-card__head">Что сейчас доступно</div>
            <ul className="zp-perks">
              <li><Check size={15} /> Золотой бейдж, кристалл и оформление профиля PRO</li>
              <li><Check size={15} /> +250 XP к прогрессу кинематографического ранга</li>
              <li><Check size={15} /> Kimi K3.1 Pro в SYNTHAX — до 8 запросов в день</li>
              <li><Check size={15} /> Внутреннее промообъявление ZENOVA скрыто</li>
              <li><Check size={15} /> Срок PRO привязан к Telegram-аккаунту и проверяется сервером</li>
            </ul>
          </div>

          <PremiumRoulette onPremium={applyRemotePremium} />

          <p className="zp-hint">
            Качество видео, озвучка и реклама по-прежнему зависят от сторонних плееров. Автосписаний нет.
          </p>
          <button type="button" className="zp-legal" onClick={() => { haptic('light'); setShowRules(true); }}>
            Правила и пользовательское соглашение
          </button>
          <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div>
      </div>
    );
  }

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
            ИИ-консьерж Kimi K3.1 Pro, золотое оформление и бонусы внутри приложения. Без ложных обещаний про сторонние плееры.
          </p>
        </header>

        <section className="zp-card">
          <div className="zp-card__head">Что вы получаете</div>
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
          <p className="zp-card__foot">Внешние плееры одинаковы для всех: их качество, озвучка и реклама от ZENOVA не зависят.</p>
        </section>

        <section className="zp-plans">
          <div className="zp-section-title">Оплата только Telegram Stars</div>
          <div className="zp-plans__grid">
            {PLANS.map((plan) => {
              const disabled = plan.id === 'trial' && trialUsed;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`zp-plan ${selectedPlan === plan.id ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                  onClick={() => {
                    if (!disabled && !payLoading) {
                      setSelectedPlan(plan.id);
                      setPayMsg('');
                      haptic('light');
                    }
                  }}
                  disabled={disabled || payLoading}
                >
                  <span className="zp-plan__badge">{disabled ? 'Использован' : plan.badge}</span>
                  <span className="zp-plan__icon">{plan.icon}</span>
                  <span className="zp-plan__name">{plan.name}</span>
                  <span className="zp-plan__price">{plan.price}</span>
                  <span className="zp-plan__perday">{plan.perDay}</span>
                  <span className="zp-plan__note">{plan.note}</span>
                  <span className="zp-plan__check">{selectedPlan === plan.id ? <Check size={13} /> : null}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" className="zp-cta" onClick={handleSubscribe} disabled={payLoading || (selectedPlan === 'trial' && trialUsed)}>
          <Star size={17} fill="currentColor" />
          {payLoading ? 'Ждём Telegram…' : `Оплатить ${selected.price}`}
        </button>
        <p className="zp-cta-note">Официальный счёт Telegram · разовый платёж · без автопродления</p>
        {payMsg && <p className="zp-payment-msg" role="status">{payMsg}</p>}

        <PremiumRoulette onPremium={applyRemotePremium} />

        <section className="zp-card">
          <div className="zp-card__head">Как подключить</div>
          <ol className="zp-steps">
            <li><span className="zp-steps__num">1</span><div><strong>Выберите срок</strong><small>7 дней за 15 Stars или 30 дней за 180 Stars.</small></div></li>
            <li><span className="zp-steps__num">2</span><div><strong>Оплатите в Telegram</strong><small>Откроется официальный счёт Stars — никаких переводов людям и реквизитов.</small></div></li>
            <li><span className="zp-steps__num">3</span><div><strong>Дождитесь подтверждения</strong><small>PRO включится после подтверждённого платежа, а не после простого закрытия счёта.</small></div></li>
          </ol>
        </section>

        <section className="zp-card">
          <div className="zp-card__head"><HelpCircle size={15} /> Частые вопросы</div>
          <div className="zp-faq">
            {FAQ.map((item, index) => (
              <div key={item.q} className={`zp-faq__item ${openFaq === index ? 'is-open' : ''}`}>
                <button type="button" className="zp-faq__q" onClick={() => { setOpenFaq(openFaq === index ? null : index); haptic('light'); }}>
                  {item.q}
                  <ChevronDown size={15} className="zp-faq__chev" />
                </button>
                {openFaq === index && <p className="zp-faq__a">{item.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <button type="button" className="zp-legal" onClick={() => { haptic('light'); setShowRules(true); }}>
          Правила и пользовательское соглашение
        </button>
        <p className="zp-footer">PRO — цифровой статус внутри ZENOVA. Права на фильмы и музыку принадлежат их правообладателям.</p>

        {showSuccess && <div className="zp-success"><Check size={16} /> {successMsg}</div>}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    </div>
  );
};

export default PremiumPage;
