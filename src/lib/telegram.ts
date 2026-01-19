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

export function getStartParam(): string | null {
  // 1. Пробуем из initDataUnsafe (работает на Android/Desktop)
  const webApp = getTelegramWebApp()
  const fromWebApp = (webApp as any)?.initDataUnsafe?.start_param
  if (fromWebApp) {
    console.log('✅ startParam from initDataUnsafe:', fromWebApp)
    return fromWebApp
  }

  // 2. ВАЖНО: Пробуем парсить из initData напрямую (iOS fallback)
  const initData = getInitData()
  if (initData) {
    const initParams = new URLSearchParams(initData)
    const fromInitData = initParams.get('start_param')
    if (fromInitData) {
      console.log('✅ startParam from initData:', fromInitData)
      return fromInitData
    }
  }

  // 3. Fallback: из URL параметра tgWebAppStartParam (для iOS)
  const urlParams = new URLSearchParams(window.location.search)
  const fromUrl = urlParams.get('tgWebAppStartParam')
  if (fromUrl) {
    console.log('✅ startParam from URL:', fromUrl)
    return fromUrl
  }

  // 4. Fallback: из hash параметра (некоторые версии Telegram)
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const fromHash = hashParams.get('tgWebAppStartParam')
  if (fromHash) {
    console.log('✅ startParam from hash:', fromHash)
    return fromHash
  }

  console.log('❌ startParam not found anywhere')
  return null
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

  // Задаём цвета для header и background (кремовый фон)
  try {
    const tgAny = tg as any;
    if (typeof tgAny.setHeaderColor === 'function') {
      tgAny.setHeaderColor('#FFF8F5');
    }
    if (typeof tgAny.setBackgroundColor === 'function') {
      tgAny.setBackgroundColor('#FFF8F5');
    }
  } catch (e) {
    console.log('setHeaderColor/setBackgroundColor not available');
  }

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
