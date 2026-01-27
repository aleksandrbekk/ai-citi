import { Calendar, Sparkles, Target } from 'lucide-react'

export function Missions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6 flex flex-col items-center justify-center">
      {/* Иконка */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30 mb-6">
        <Target size={40} className="text-white" />
      </div>

      {/* Заголовок */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Миссии</h1>

      {/* Описание */}
      <p className="text-gray-500 text-center max-w-xs mb-6">
        Выполняй задания, получай награды и прокачивай свой профиль
      </p>

      {/* Бейдж с датой */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200">
        <Calendar size={16} className="text-purple-600" />
        <span className="text-sm font-medium text-purple-700">
          Запуск 10 февраля
        </span>
        <Sparkles size={14} className="text-purple-500" />
      </div>
    </div>
  )
}
