import { useAdminAuth } from '../../../hooks/admin/useAdminAuth'

export function MlmDashboard() {
  const admin = useAdminAuth((s) => s.admin)
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Добро пожаловать, {admin?.name}!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-800 rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-500">11</div>
          <div className="text-zinc-400 mt-1">Модулей</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-500">112</div>
          <div className="text-zinc-400 mt-1">Уроков</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-500">—</div>
          <div className="text-zinc-400 mt-1">Учеников</div>
        </div>
      </div>
    </div>
  )
}
