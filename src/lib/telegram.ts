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

  // =============================================================================
  // FULLSCREEN SAFE AREA FOR TELEGRAM UI (Close + Menu buttons)
  // =============================================================================
  // В fullscreen режиме Telegram рисует свои кнопки (Закрыть / …) поверх WebApp.
  // Нам нужен "content safe area top" — отступ до начала безопасного контента.
  try {
    const tgAny = tg as any;

    const applyInsets = () => {
      // Предпочтительно: значение из SDK, если есть
      const top =
        typeof tgAny.contentSafeAreaInsetTop === 'number'
          ? tgAny.contentSafeAreaInsetTop
          : getContentSafeAreaTop();

      document.documentElement.style.setProperty(
        '--tg-content-safe-area-inset-top',
        `${Math.max(0, Math.round(top))}px`
      );
    };

    applyInsets();

    // На некоторых платформах инсет меняется при развороте/resize
    if (typeof tgAny.onEvent === 'function') {
      tgAny.onEvent('viewportChanged', applyInsets);
    }
  } catch (e) {
    // молча: это только улучшение UX
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

/**
 * Получить Content Safe Area Inset Top
 * Это отступ, который учитывает кнопки Telegram (Закрыть, 3 точки) в fullscreen режиме
 * 
 * ВАЖНО: В fullscreen режиме Telegram оставляет фиксированные кнопки вверху:
 * - Кнопка "Закрыть" (X)
 * - Кнопка "3 точки" (меню)
 * 
 * Контент должен размещаться ПОД этими кнопками, используя contentSafeAreaInsetTop
 */
export function getContentSafeAreaTop(): number {
  const tg = window.Telegram?.WebApp;
  if (!tg) return 0;

  // Пробуем получить из SDK (если доступно)
  const tgAny = tg as any;
  if (tgAny.contentSafeAreaInsetTop !== undefined) {
    return tgAny.contentSafeAreaInsetTop;
  }

  // Fallback: используем системный safe-area + фиксированный отступ для кнопок
  // Обычно кнопки Telegram занимают ~44-56px + safe-area
  const systemSafeArea = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-area-top') || '0'
  ) || 0;

  // Фиксированный отступ для кнопок Telegram (примерно 56px на мобильных)
  const telegramHeaderHeight = isMobileTelegram() ? 56 : 0;
  // ВАЖНО: на iOS/Android в fullscreen верхний TG-хедер визуально “съедает” больше места,
  // поэтому держим безопасный минимум 100px (см. src/index.css .safe-top).
  const minTop = isMobileTelegram() ? 100 : 0;

  return Math.max(systemSafeArea + telegramHeaderHeight, minTop);
}
