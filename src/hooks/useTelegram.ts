import { useEffect, useCallback } from 'react';
import type { TelegramUser } from '../types';

/* ===== Хук для работы с Telegram WebApp ===== */

/** Глобальный объект Telegram WebApp */
const getTg = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

/** Расширяем Window для TypeScript */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        close: () => void;
        expand: () => void;
        isExpanded: boolean;
        disableVerticalSwipes?: () => void;
        setHeaderColor?: (color: string) => void;
        setBottomBarColor?: (color: string) => void;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme: 'dark' | 'light';
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setText: (text: string) => void;
          enable: () => void;
          disable: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export const useTelegram = () => {
  const tg = getTg();

  /** Получить данные пользователя */
  const user: TelegramUser | null = tg?.initDataUnsafe?.user ?? null;

  /** Цветовая схема Telegram */
  const colorScheme = tg?.colorScheme ?? 'dark';

  /** Инициализация WebApp */
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      // Отключаем свайп закрытия (iOS Telegram)
      if (typeof tg.disableVerticalSwipes === 'function') {
        try { tg.disableVerticalSwipes(); } catch {}
      }
      // Цвет хедера под фон приложения
      if (typeof tg.setHeaderColor === 'function') {
        try { tg.setHeaderColor('#08080f'); } catch {}
      }
      if (typeof tg.setBottomBarColor === 'function') {
        try { tg.setBottomBarColor('#08080f'); } catch {}
      }
    }
  }, []);

  /** Показать кнопку "Назад" */
  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (tg) {
        tg.BackButton.show();
        tg.BackButton.onClick(onClick);
        return () => {
          tg.BackButton.offClick(onClick);
          tg.BackButton.hide();
        };
      }
    },
    []
  );

  /** Показать главную кнопку */
  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      if (tg) {
        tg.MainButton.setText(text);
        tg.MainButton.show();
        tg.MainButton.enable();
        tg.MainButton.onClick(onClick);
        return () => {
          tg.MainButton.offClick(onClick);
          tg.MainButton.hide();
        };
      }
    },
    []
  );

  /** Скрыть главную кнопку */
  const hideMainButton = useCallback(() => {
    tg?.MainButton.hide();
  }, []);

  /** Тактильный отклик */
  const haptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      tg?.HapticFeedback?.impactOccurred(type);
    },
    []
  );

  /** Закрыть приложение */
  const closeApp = useCallback(() => {
    tg?.close();
  }, []);

  /** Открыть ссылку во внешнем браузере */
  const openLink = useCallback((url: string) => {
    if (tg?.openLink) {
      try { tg.openLink(url); return; } catch {}
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    tg,
    user,
    colorScheme,
    showBackButton,
    showMainButton,
    hideMainButton,
    haptic,
    closeApp,
    openLink,
  };
};
