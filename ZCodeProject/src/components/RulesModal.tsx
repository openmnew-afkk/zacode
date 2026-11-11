import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RULES_SECTIONS } from '../data/rules';
import './RulesModal.css';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mandatory?: boolean;
  onAccept?: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, mandatory = false, onAccept }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !mandatory) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, mandatory]);

  if (!isOpen) return null;

  return createPortal(
    <div className="rules-modal-overlay" onClick={mandatory ? undefined : onClose}>
      <div
        className="rules-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rules-modal-handle-bar">
          <div className="rules-modal-handle" />
        </div>

        <header className="rules-modal-header">
          <div className="rules-modal-header__text">
            <h2 id="rules-modal-title" className="rules-modal-title">Пользовательское соглашение</h2>
            <p className="rules-modal-subtitle">Условия использования · правовая информация</p>
          </div>
          {!mandatory && (
            <button className="rules-modal-close" onClick={onClose} aria-label="Закрыть">
              ✕
            </button>
          )}
        </header>

        <div className="rules-modal-body">
          <div className="rules-modal-badge">
            <div className="rules-modal-badge__icon">🛡️</div>
            <div className="rules-modal-badge__content">
              <strong>Каталог и внешние источники</strong>
              <span>Ссылки и встроенные плееры ведут к сторонним сервисам; их содержание и права определяются владельцами источников.</span>
            </div>
          </div>

          {RULES_SECTIONS.map((section) => (
            <div key={section.title} className="rules-modal-section">
              <h3 className="rules-modal-section__title">{section.title}</h3>
              {section.items.map((item, idx) => (
                <p key={idx} className="rules-modal-item">{item}</p>
              ))}
            </div>
          ))}

          <div className="rules-modal-contact">
            <h4 className="rules-modal-contact__title">Обращения правообладателей</h4>
            <p className="rules-modal-contact__desc">
              Направьте сведения о произведении, ссылку на карточку или источник и подтверждение полномочий через канал поддержки, указанный в приложении.
            </p>
          </div>
        </div>

        <footer className="rules-modal-footer">
          <p>© {new Date().getFullYear()} ZENOVA. Права сторон и пользователей определяются применимым законодательством.</p>
          {mandatory && (
            <button
              className="rules-modal-accept"
              onClick={() => onAccept?.()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Принимаю условия соглашения
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default RulesModal;
