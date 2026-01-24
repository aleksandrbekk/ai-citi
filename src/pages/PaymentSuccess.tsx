import { CheckCircle, Coins, Sparkles } from 'lucide-react'

export default function PaymentSuccess() {
  const handleOpenBot = () => {
    window.open('https://t.me/Neirociti_bot', '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-6">
      <div className="max-w-md mx-auto pt-12 text-center">
        {/* Иконка успеха */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-12 h-12 text-white" />
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
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-lg text-left">
          {/* Шаг 1 */}
          <div className="flex gap-4 mb-5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
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
            <div>
              <p className="font-semibold text-gray-900">Вернитесь в приложение</p>
              <p className="text-sm text-gray-500">
                Откройте AI CITI через бота{' '}
                <span className="text-orange-500 font-medium">@Neirociti_bot</span>
              </p>
            </div>
          </div>

          {/* Шаг 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-semibold text-gray-900">Используйте монеты</p>
              <p className="text-sm text-gray-500">
                Создавайте карусели, используйте AI и многое другое
              </p>
            </div>
          </div>
        </div>

        {/* Кнопка */}
        <button
          onClick={handleOpenBot}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          <Sparkles className="w-5 h-5 inline mr-2" />
          Открыть бота
        </button>

        {/* Баланс */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-orange-200 rounded-full">
          <Coins className="w-5 h-5 text-orange-500" />
          <span className="font-bold text-orange-600">+100 монет</span>
        </div>
      </div>
    </div>
  )
}
