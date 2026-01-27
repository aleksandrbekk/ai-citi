import { Calendar, GraduationCap, Sparkles } from 'lucide-react'

export function School() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex flex-col items-center justify-center">
      {/* Иконка */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-6">
        <GraduationCap size={40} className="text-white" />
      </div>

      {/* Заголовок */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Школа</h1>

      {/* Описание */}
      <p className="text-gray-500 text-center max-w-xs mb-6">
        Обучающие курсы по нейросетям, контенту и продажам
      </p>

      {/* Бейдж с датой */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200">
        <Calendar size={16} className="text-blue-600" />
        <span className="text-sm font-medium text-blue-700">
          Запуск 10 февраля
        </span>
        <Sparkles size={14} className="text-blue-500" />
      </div>
    </div>
  )
}
