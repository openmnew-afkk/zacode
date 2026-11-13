import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Check, X } from 'lucide-react';
import RulesSections from './RulesSections';
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
    <div className="rmo-overlay" onClick={mandatory ? undefined : onClose}>
      <div
        className="rmo-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rmo-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rmo-handle" />

        <header className="rmo-header">
          <div className="rmo-header__icon"><ShieldCheck size={19} /></div>
          <div className="rmo-header__text">
            <h2 id="rmo-title" className="rmo-title">Правила и соглашение</h2>
            <p className="rmo-subtitle">ZENOVA — каталог. Материалы передают внешние источники.</p>
          </div>
          {!mandatory && (
            <button type="button" className="rmo-close" onClick={onClose} aria-label="Закрыть">
              <X size={17} />
            </button>
          )}
        </header>

        <div className="rmo-body">
          <RulesSections compact defaultOpen={['about']} />
          <p className="rmo-note">
            Обращения правообладателей и вопросы — через канал поддержки в приложении.
            Полные условия открываются в разделе «Правила» настроек.
          </p>
        </div>

        <footer className="rmo-footer">
          {mandatory ? (
            <button type="button" className="rmo-accept" onClick={() => onAccept?.()}>
              <Check size={16} /> Принимаю условия соглашения
            </button>
          ) : (
            <p className="rmo-copy">© {new Date().getFullYear()} ZENOVA · условия определяются применимым законодательством</p>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default RulesModal;
