import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminProtectedRoute() {
  const admin = useAdminAuth((s) => s.admin)
  if (!admin) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
