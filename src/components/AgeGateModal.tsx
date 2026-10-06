/* ===== ZENOVA — Подтверждение совершеннолетия 18+ (436-ФЗ) ===== */

import React from 'react';
import { useTelegram } from '../hooks/useTelegram';
import './AgeGateModal.css';

interface AgeGateModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const AGE_STORAGE_KEY = 'zenova_age_verified_18';

export function isAgeVerified(): boolean {
  try {
    return localStorage.getItem(AGE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAgeVerified(): void {
  try {
    localStorage.setItem(AGE_STORAGE_KEY, 'true');
  } catch {}
}

const AgeGateModal: React.FC<AgeGateModalProps> = ({ onConfirm, onCancel }) => {
  const { haptic } = useTelegram();

  const handleAgree = () => {
    haptic?.('medium');
    setAgeVerified();
    onConfirm();
  };

  const handleDisagree = () => {
    haptic?.('light');
    onCancel();
  };

  return (
    <div className="zage-overlay">
      <div className="zage-modal">
        <div className="zage-icon-wrap">
          <span className="zage-icon">🔞</span>
        </div>

        <div className="zage-badge">436-ФЗ • 18+</div>
        <h2 className="zage-title">Возрастное ограничение 18+</h2>

        <p className="zage-desc">
          В соответствии с Федеральным законом РФ № 436-ФЗ «О защите детей от информации, причиняющей вред их здоровью и развитию», данный материал содержит контент категории 18+.
        </p>

        <p className="zage-sub">
          Пожалуйста, подтвердите, что вам уже исполнилось 18 лет, для доступа к просмотру.
        </p>

        <div className="zage-actions">
          <button className="zage-btn zage-btn--confirm" onClick={handleAgree}>
            ✓ Мне уже исполнилось 18 лет
          </button>
          <button className="zage-btn zage-btn--cancel" onClick={handleDisagree}>
            Мне нет 18 лет (Назад)
          </button>
        </div>

        <div className="zage-footer">
          <span>Сервис не размещает порнографические материалы в силу ст. 242 УК РФ</span>
        </div>
      </div>
    </div>
  );
};

export default AgeGateModal;
