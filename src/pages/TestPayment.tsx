import { useState } from 'react'
import { toast } from 'sonner'
import { getTelegramUser } from '@/lib/telegram'
import { isAdmin } from '@/config/admins'
import { ArrowLeft, CreditCard, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface TestPackage {
  id: string
  name: string
  coins: number
  price: number
}

const testPackages: TestPackage[] = [
  { id: 'test_50', name: 'Тест 50₽', coins: 10, price: 50 },
]

export default function TestPayment() {
  const telegramUser = getTelegramUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastOrder, setLastOrder] = useState<string | null>(null)

  const isSuccess = searchParams.get('success') === '1'

  // Проверка на админа
  if (!isAdmin(telegramUser?.id)) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 border border-red-200 text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Доступ запрещён</h2>
          <p className="text-sm text-gray-500">Эта страница доступна только администраторам.</p>
        </div>
      </div>
    )
  }

  const handleBuy = async (pkg: TestPackage) => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(
        `${supabaseUrl}/functions/v1/prodamus-create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            telegramId: telegramUser?.id,
            packageId: pkg.id,
            source: window.Telegram?.WebApp?.initData ? 'miniapp' : 'web',
          })
        }
      )

      const result = await response.json()
      console.log('Prodamus result:', result)

      if (!result.ok || !result.paymentUrl) {
        throw new Error(result.error || 'Не удалось создать платёж')
      }

      setLastOrder(result.orderId)

      // Открываем ссылку оплаты
      const tg = window.Telegram?.WebApp
      if (tg?.openLink) {
        tg.openLink(result.paymentUrl)
      } else {
        window.open(result.paymentUrl, '_blank')
      }

      toast.success('Ссылка на оплату открыта')

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      console.error('Payment error:', error)
      toast.error('Ошибка: ' + message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 cursor-pointer"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            Тест Prodamus
          </h1>
        </div>

        {/* Info badge */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-orange-700">
            Тестовая страница оплаты через Prodamus. Видна только админам.
            Оплата в рублях, монеты начисляются через вебхук.
          </p>
        </div>

        {/* Success message */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Оплата прошла!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Монеты будут начислены через вебхук. Проверь баланс через минуту.
              </p>
            </div>
          </div>
        )}

        {/* Last order */}
        {lastOrder && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-500">Последний заказ:</p>
            <p className="text-xs font-mono text-gray-700 break-all">{lastOrder}</p>
          </div>
        )}
      </div>

      {/* Test packages */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Тестовые пакеты</h2>

        {testPackages.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => handleBuy(pkg)}
            disabled={isProcessing}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-left transition-all duration-200 hover:border-orange-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{pkg.name}</p>
                  <p className="text-xs text-gray-500">{pkg.coins} нейронов</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-500">{pkg.price} ₽</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Debug info */}
      <div className="px-4 mt-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Отладка</h3>
          <div className="space-y-1 text-xs text-gray-500 font-mono">
            <p>Telegram ID: {telegramUser?.id || 'N/A'}</p>
            <p>Payform: lagermlm.payform.ru</p>
            <p>Webhook: /functions/v1/prodamus-webhook</p>
          </div>
        </div>
      </div>
    </div>
  )
}
