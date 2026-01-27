import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'
import { getTelegramUser } from '../../lib/telegram'
import { isAdmin } from '../../config/admins'

export function AdminProtectedRoute() {
  const admin = useAdminAuth((s) => s.admin)
  const loginByTelegramId = useAdminAuth((s) => s.loginByTelegramId)

  // Автологин для админов по telegram_id
  useEffect(() => {
    if (admin) return // Уже залогинен
    loginByTelegramId()
  }, [admin, loginByTelegramId])

  // Проверяем telegram_id для автодоступа
  const tgUser = getTelegramUser()
  const isAutoAdmin = isAdmin(tgUser?.id)

  if (!admin && !isAutoAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
