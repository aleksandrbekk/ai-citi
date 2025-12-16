import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getTelegramWebApp, isTelegramWebApp } from '../lib/telegram'

export function useAuth() {
  const { user, profile, isLoading, isAuthenticated, error, login, logout } = useAuthStore()

  useEffect(() => {
    // Если уже авторизован — не делаем ничего
    if (isAuthenticated) return

    const tg = getTelegramWebApp()
    
    if (tg && isTelegramWebApp()) {
      // Инициализация Telegram WebApp
      tg.ready()
      tg.expand()
      
      // Авторизация через initData
      if (tg.initData) {
        login(tg.initData)
      }
    }
  }, [isAuthenticated, login])

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    error,
    logout,
    isTelegramWebApp: isTelegramWebApp(),
  }
}

