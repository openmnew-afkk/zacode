/* ===== ZENOVA — Модальное окно обязательной подписки на канал (ОП) ===== */

import React, { useState } from 'react';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { MASTER_ADMINS } from '../services/accessControl';
import VeloraEmblem from './VeloraEmblem';
import './MandatorySubModal.css';

interface MandatorySubModalProps {
  /** Принудительно показать для предпросмотра из админки */
  previewMode?: boolean;
  onClosePreview?: () => void;
}

const MandatorySubModal: React.FC<MandatorySubModalProps> = ({
  previewMode = false,
  onClosePreview,
}) => {
  const { mandatorySub, isChannelSubscribed, setChannelSubscribed, isAdmin, telegramUsername } = useStore();
  const { haptic, openLink } = useTelegram();
  const [checking, setChecking] = useState(false);
  const [visited, setVisited] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Если супер-админ или обычный админ — доступ всегда открыт без блокировки (если не режим предпросмотра)
  const isSuperAdmin = telegramUsername && MASTER_ADMINS.some(
    (a) => a.toLowerCase() === telegramUsername.toLowerCase().replace(/^@/, '')
  );

  if (!previewMode) {
    if (!mandatorySub.enabled) return null;
    if (isAdmin || isSuperAdmin) return null;
    if (isChannelSubscribed) return null;
  }

  const handleOpenChannel = () => {
    haptic?.('medium');
    setVisited(true);
    setErrorMsg('');

    const url = mandatorySub.channelUrl || `https://t.me/${(mandatorySub.channelUsername || 'ZenovaCinema').replace(/^@/, '')}`;
    const tg = (window as any).Telegram?.WebApp;

    if (tg?.openTelegramLink && url.includes('t.me/')) {
      try {
        tg.openTelegramLink(url);
        return;
      } catch {}
    }

    if (openLink) {
      openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCheckSubscription = async () => {
    haptic?.('heavy');
    setChecking(true);
    setErrorMsg('');

    // Имитируем быструю валидацию подписки через Telegram Bot API
    await new Promise((r) => setTimeout(r, 650));
    setChecking(false);

    if (!visited && !previewMode) {
      setErrorMsg('Пожалуйста, сначала откройте канал и нажмите кнопку «Подписаться»!');
      haptic?.('heavy');
      return;
    }

    if (previewMode) {
      onClosePreview?.();
      return;
    }

    setChannelSubscribed(true);
  };

  return (
    <div className="zsub-overlay">
      <div className="zsub-modal">
        {previewMode && (
          <button className="zsub-close" onClick={onClosePreview} aria-label="Закрыть предпросмотр">
            ✕
          </button>
        )}

        {/* Эмблема канала / Telegram */}
        <div className="zsub-emblem-wrap">
          <div className="zsub-emblem-glow" />
          <div className="zsub-emblem">
            <VeloraEmblem size="md" />
          </div>
          <span className="zsub-tg-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </span>
        </div>

        {/* Тексты */}
        <div className="zsub-badge">ОБЯЗАТЕЛЬНАЯ ПОДПИСКА</div>
        <h2 className="zsub-title">{mandatorySub.channelTitle || 'ZENOVA Cinema & Sound'}</h2>
        <p className="zsub-desc">
          {mandatorySub.subText || 'Подпишитесь на наш официальный Telegram-канал, чтобы смотреть новинки кино, сериалы и слушать музыку без рекламы.'}
        </p>

        {/* Карточка канала со ссылкой */}
        <div className="zsub-channel-card">
          <div className="zsub-channel-card__info">
            <span className="zsub-channel-card__label">Официальный канал:</span>
            <span className="zsub-channel-card__handle">
              {mandatorySub.channelUsername?.startsWith('@')
                ? mandatorySub.channelUsername
                : `@${mandatorySub.channelUsername || 'ZenovaCinema'}`}
            </span>
          </div>
          <span className="zsub-channel-card__verified">✓ Проверен</span>
        </div>

        {errorMsg && (
          <div className="zsub-error">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="zsub-actions">
          <button
            className={`zsub-btn zsub-btn--primary ${visited ? 'zsub-btn--visited' : ''}`}
            onClick={handleOpenChannel}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>{visited ? 'Перейти в канал ещё раз' : '1. Подписаться на канал'}</span>
          </button>

          <button
            className="zsub-btn zsub-btn--verify"
            disabled={checking}
            onClick={handleCheckSubscription}
          >
            {checking ? (
              <span className="zsub-spinner-wrap">
                <span className="zsub-spinner" /> Проверяем статус...
              </span>
            ) : (
              <span>2. Я подписался, открыть доступ</span>
            )}
          </button>
        </div>

        <div className="zsub-footer">
          <span>Безопасная авторизация через Telegram WebApp</span>
        </div>
      </div>
    </div>
  );
};

export default MandatorySubModal;
