import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { RULES_SECTIONS } from '../data/rules';
import './RulesPage.css';

const RulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleBack = () => {
    haptic('light');
    navigate(-1);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="rules page">
      <header className="rules-header">
        <button className="rules-back" onClick={handleBack} aria-label="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="rules-header__text">
          <h1 className="rules-title">Пользовательское соглашение</h1>
          <p className="rules-updated">Условия использования · правовая информация</p>
        </div>
      </header>

      <div className="rules-content">
        <div className="rules-badge-card">
          <div className="rules-badge-card__icon">🛡️</div>
          <div className="rules-badge-card__text">
            <strong>Каталог и внешние источники</strong>
            <span>Ссылки и встроенные плееры ведут к сторонним сервисам, условия которых устанавливают их владельцы.</span>
          </div>
        </div>

        {RULES_SECTIONS.map((section) => (
          <div key={section.title} className="rules-section">
            <h2 className="rules-section__title">{section.title}</h2>
            {section.items.map((item, index) => (
              <p key={index} className="rules-item">{item}</p>
            ))}
          </div>
        ))}

        <div className="rules-contact-card">
          <h3 className="rules-contact-card__title">Обращения правообладателей</h3>
          <p className="rules-contact-card__desc">
            Направьте сведения о произведении, ссылку на карточку или источник и подтверждение полномочий через канал поддержки, указанный в приложении.
          </p>
        </div>

        <p className="rules-footer">
          © {new Date().getFullYear()} ZENOVA. Права сторон и пользователей определяются применимым законодательством.
        </p>
      </div>
    </div>
  );
};

export default RulesPage;
