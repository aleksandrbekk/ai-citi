import { CheckCircle, Coins, ArrowRight, Sparkles } from 'lucide-react'

export default function PaymentSuccess() {
  const handleOpenApp = () => {
    // Пробуем открыть мини-апп
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.close()
    } else {
      // Если не в TG — редирект на главную
      window.location.href = '/'
    }
  }

  const handleOpenBot = () => {
    window.open('https://t.me/AICITIbot', '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white flex flex-col items-center justify-center p-6">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-cyan-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full text-center">
        {/* Иконка успеха */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            {/* Анимированные частицы */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Оплата успешна!
        </h1>
        <p className="text-gray-500 mb-8">
          100 монет уже зачислены на ваш баланс
        </p>

        {/* Карточка с шагами */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-lg shadow-gray-100">
          {/* Шаг 1 */}
          <div className="flex gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Монеты зачислены</p>
              <p className="text-sm text-gray-500">
                100 монет автоматически добавлены на ваш баланс
              </p>
            </div>
          </div>

          {/* Шаг 2 */}
          <div className="flex gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Вернитесь в приложение</p>
              <p className="text-sm text-gray-500">
                Откройте AI CITI через бота{' '}
                <span className="text-orange-500 font-medium">@AICITIbot</span>
              </p>
            </div>
          </div>

          {/* Шаг 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Используйте монеты</p>
              <p className="text-sm text-gray-500">
                Создавайте карусели, используйте AI-помощника и многое другое
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={handleOpenBot}
            className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Открыть бота
          </button>
          <button
            onClick={handleOpenApp}
            className="py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Баланс */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-full">
          <Coins className="w-5 h-5 text-orange-500" />
          <span className="text-gray-700">Ваш баланс:</span>
          <span className="font-bold text-orange-600">+100 монет</span>
        </div>
      </div>
    </div>
  )
}
