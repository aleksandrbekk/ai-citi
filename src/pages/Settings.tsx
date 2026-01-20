import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function Settings() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
