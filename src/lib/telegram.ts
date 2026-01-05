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

// Расширяем тему Telegram
export function expandWebApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  tg.ready();
  tg.expand();
  
  // Fullscreen методы (если доступны)
  try {
    if (typeof tg.requestFullscreen === 'function') {
      tg.requestFullscreen();
    }
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }
  } catch (e) {
    console.log('Fullscreen methods not available');
  }

  return tg;
}

// Алиас для обратной совместимости
export function initTelegram() {
  return expandWebApp();
}
