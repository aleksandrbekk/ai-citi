import { TrendingDown, TrendingUp } from 'lucide-react'

interface BalanceCardProps {
  balance: number
  giftCoins?: number
  spent: number
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
  return (
    <div className="space-y-3">
      {/* Main Balance Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          {/* Neuron Icon - на светлом фоне */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
              <img
                src="/neirocoin.png"
                alt="Нейроны"
                className="w-12 h-12 object-contain"
              />
            </div>
            {giftCoins > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">+</span>
              </div>
            )}
          </div>

          {/* Balance Info */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Ваш баланс</p>
            <div className="flex items-baseline gap-2 mt-1">
              {isLoading ? (
                <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
              ) : (
                <>
                  <p className="text-4xl font-bold text-gray-900">
                    {balance.toLocaleString()}
                  </p>
                  <span className="text-base text-gray-400">нейронов</span>
                </>
              )}
            </div>
            {giftCoins > 0 && (
              <p className="text-sm text-green-600 font-medium mt-1">
                +{giftCoins} подарочных
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Потрачено</span>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-gray-900">{spent.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Заработано</span>
          </div>
          {isLoading ? (
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-orange-500">{earned.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  )
}
