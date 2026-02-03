import { Sparkles, TrendingUp } from 'lucide-react'

interface BalanceCardProps {
  balance: number
  giftCoins?: number
  spent: number // будем конвертировать в количество генераций
  earned: number
  isLoading?: boolean
}

export function BalanceCard({
  balance,
  giftCoins = 0,
  spent,
  earned,
  isLoading = false
}: BalanceCardProps) {
  // Конвертируем потраченное в количество генераций (30 нейронов = 1 карусель)
  const generationsCount = Math.floor(spent / 30)

  return (
    <div className="space-y-4">
      {/* Main Balance Card - Большой и чистый */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500 text-sm mb-1">Ваш баланс</p>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-12 w-32 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-gray-900">
                {balance.toLocaleString()}
              </span>
              <img
                src="/neirocoin.png"
                alt=""
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
        </div>

        {giftCoins > 0 && (
          <p className="text-sm text-green-600 font-medium mt-2">
            +{giftCoins} подарочных
          </p>
        )}
      </div>

      {/* Stats - Минималистичные плашки */}
      <div className="grid grid-cols-2 gap-3">
        {/* Генерации */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-600">Генераций</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-orange-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{generationsCount}</p>
          )}
        </div>

        {/* Заработано */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Заработано</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-12 bg-green-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-green-600">{earned}</p>
          )}
        </div>
      </div>
    </div>
  )
}
