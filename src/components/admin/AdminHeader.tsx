import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminHeader() {
  const admin = useAdminAuth((s) => s.admin)
  return (
    <header className="h-16 bg-zinc-800 border-b border-zinc-700 px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-white">Админ-панель</h1>
      <div className="text-zinc-400">
        {admin?.name}
      </div>
    </header>
  )
}
