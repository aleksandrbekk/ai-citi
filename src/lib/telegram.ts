// src/lib/telegram.ts

// Расширяем тип TelegramWebApp для поддержки новых методов
declare global {
  interface TelegramWebApp {
    disableVerticalSwipes?: () => void
    enableVerticalSwipes?: () => void
  }
}

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
  const webApp = getTelegramWebApp()
  if (webApp) {
    webApp.expand()
    webApp.ready()
    
    // Отключить свайп вниз для закрытия (доступно с Bot API 7.7)
    if (webApp.disableVerticalSwipes) {
      webApp.disableVerticalSwipes()
    }
    
    // Запрос fullscreen режима
    if (webApp.requestFullscreen) {
      webApp.requestFullscreen()
    }
    
    // Обновление viewport размеров
    const updateViewport = () => {
      const viewportHeight = webApp.viewportHeight || window.innerHeight
      const viewportStableHeight = webApp.viewportStableHeight || window.innerHeight
      
      document.documentElement.style.setProperty('--tg-viewport-height', `${viewportHeight}px`)
      document.documentElement.style.setProperty('--tg-viewport-stable-height', `${viewportStableHeight}px`)
    }
    
    updateViewport()
    
    // Слушаем изменения viewport
    if (webApp.onEvent) {
      webApp.onEvent('viewportChanged', updateViewport)
    } else {
      // Fallback: слушаем изменения размера окна
      window.addEventListener('resize', updateViewport)
    }
  }
}
