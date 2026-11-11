import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, LifeBuoy, FileText } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { RULES_SECTIONS } from '../data/rules';
import RulesSections from '../components/RulesSections';
import './RulesPage.css';

const RulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [openSignal, setOpenSignal] = useState<{ id: string; n: number } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const jumpTo = (id: string) => {
    haptic('light');
    setOpenSignal({ id, n: Date.now() });
    setTimeout(() => {
      document.getElementById(`rules-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <div className="rl page">
      <div className="rl-glow" aria-hidden="true" />
      <div className="rl-wrap">
        <button type="button" className="rl-back" onClick={() => { haptic('light'); navigate(-1); }}>
          <ArrowLeft size={16} /> Назад
        </button>

        <header className="rl-hero">
          <div className="rl-hero__icon"><ShieldCheck size={26} /></div>
          <h1 className="rl-hero__title">Правила и соглашение</h1>
          <p className="rl-hero__sub">
            Коротко о главном: ZENOVA — каталог фильмов и музыки. Материалы передают внешние
            источники, права на них принадлежат правообладателям. Ниже — полные условия по разделам.
          </p>
        </header>

        {/* Быстрая навигация */}
        <nav className="rl-nav" aria-label="Разделы соглашения">
          {RULES_SECTIONS.map((s) => (
            <button key={s.id} type="button" className="rl-nav__chip" onClick={() => jumpTo(s.id)}>
              {s.title.replace(/^\d+\.\s*/, '')}
            </button>
          ))}
        </nav>

        <RulesSections defaultOpen={['about']} openSignal={openSignal} />

        {/* Поддержка и обращения */}
        <div className="rl-contact">
          <div className="rl-contact__icon"><LifeBuoy size={19} /></div>
          <div className="rl-contact__copy">
            <strong>Поддержка и обращения правообладателей</strong>
            <span>
              Вопросы о работе приложения, а также обращения правообладателей — через канал
              поддержки. Приложите сведения о произведении, ссылку на карточку и подтверждение полномочий.
            </span>
          </div>
          <a
            className="rl-contact__btn"
            href="https://t.me/zenovafilm"
            target="_blank"
            rel="noreferrer"
            onClick={() => haptic('light')}
          >
            Написать
          </a>
        </div>

        <p className="rl-footer">
          <FileText size={12} /> © {new Date().getFullYear()} ZENOVA. Права сторон и пользователей
          определяются применимым законодательством.
        </p>
      </div>
    </div>
  );
};

export default RulesPage;
