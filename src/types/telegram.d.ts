// src/types/telegram.d.ts
interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

interface TelegramWebAppInitData {
  user?: TelegramWebAppUser
  auth_date?: number
  hash?: string
  query_id?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: TelegramWebAppInitData
  ready: () => void
  expand: () => void
  close: () => void
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void
  platform?: string
  requestFullscreen?: () => void
  disableVerticalSwipes?: () => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp
  }
}











