import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, Sparkles, ShoppingBag } from 'lucide-react'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency') || 'RUB'
  const packageId = searchParams.get('packageId')

  useEffect(() => {
    // Запускаем конфетти при загрузке
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  const handleReturnToApp = () => {
    // Если мы внутри Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    } else {
      // Если в обычном браузере — открываем бота
      window.location.href = 'https://t.me/Neirociti_bot'
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-white to-cyan-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="relative w-full max-w-md"
      >
        {/* Decorative background blur */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-[32px] blur-xl opacity-20 animate-pulse" />

        <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-2xl overflow-hidden">
          {/* Header Pattern */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none" />

          <div className="flex flex-col items-center pt-12 pb-8 px-6 text-center">
            {/* Success Icon with Ripple */}
            <div className="relative mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 z-10 relative"
              >
                <Check className="w-12 h-12 text-white stroke-[3]" />
              </motion.div>
              {/* Ripple Circles */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-green-400/20 rounded-full"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.2, repeat: Infinity }}
                className="absolute inset-0 bg-green-400/10 rounded-full"
              />
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-900 mb-2"
            >
              Оплата успешна!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 text-lg mb-8 max-w-[280px] mx-auto leading-relaxed"
            >
              Ваши средства зачислены и готовы к использованию
            </motion.p>

            {/* Receipt Card */}
            {(amount || packageId) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full bg-gray-50/80 rounded-2xl p-4 border border-gray-100 mb-8"
              >
                <div className="flex items-center justify-between py-2 border-b border-gray-100 border-dashed">
                  <span className="text-gray-400 text-sm font-medium">Сумма</span>
                  <span className="text-gray-900 font-bold text-lg">
                    {amount} {currency === 'RUB' ? '₽' : currency}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 pt-3">
                  <span className="text-gray-400 text-sm font-medium">Тариф</span>
                  <span className="text-orange-600 font-bold uppercase text-sm tracking-wide flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    {packageId || 'Пополнение'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="w-full space-y-3">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleReturnToApp}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Вернуться в приложение
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={handleGoHome}
                className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors text-sm"
              >
                На главную страницу
              </motion.button>
            </div>
          </div>

          {/* Bottom Decor */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500" />
        </div>
      </motion.div>
    </div>
  )
}
