// src/lib/telegram.ts

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp
}

export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp()
  if (!webApp?.initDataUnsafe?.user) return null
  return webApp.initDataUnsafe.user
}

export function getInitData(): string | null {
  const webApp = getTelegramWebApp()
  return webApp?.initData || null
}

// Инициализация Telegram WebApp
// Fullscreen ТОЛЬКО на мобильных (iOS/Android), на десктопе — компактный режим
export function expandWebApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  tg.ready();

  // Определяем платформу
  const platform = (tg as any).platform;
  const isMobile = platform === 'android' || platform === 'ios';

  // Fullscreen только на мобильных
  if (isMobile) {
    tg.expand();
    try {
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
    } catch (e) {
      console.log('requestFullscreen not available');
    }
  }

  // Отключаем вертикальные свайпы для навигации (везде)
  try {
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }
  } catch (e) {
    console.log('disableVerticalSwipes not available');
  }

  return tg;
}

// Алиас для обратной совместимости
export function initTelegram() {
  return expandWebApp();
}

// Определение мобильного Telegram
export function isMobileTelegram(): boolean {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;

  const platform = (tg as any).platform;
  // android, ios — мобильные
  // tdesktop, macos, web — десктоп/браузер
  return platform === 'android' || platform === 'ios';
}
