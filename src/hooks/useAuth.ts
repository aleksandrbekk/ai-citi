// src/hooks/useAuth.ts
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { expandWebApp } from '../lib/telegram'

export function useAuth() {
  const { user, profile, isLoading, isAuthenticated, error, login } = useAuthStore()

  useEffect(() => {
    // Раскрываем Telegram WebApp на весь экран
    expandWebApp()
    
    // Автоматически логинимся при загрузке
    if (!isAuthenticated && !isLoading) {
      login()
    }
  }, [])

  return { user, profile, isLoading, isAuthenticated, error }
}
