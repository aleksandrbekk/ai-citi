import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance, supabase } from '@/lib/supabase'
import { Coins, Crown, ExternalLink, Mail, CheckCircle } from 'lucide-react'

// Ссылка на продукт в Lava.top
const LAVA_PRODUCT_URL = 'https://app.lava.top/products/bcc55515-b779-47cd-83aa-5306575e6d95'

export function Shop() {
  const telegramUser = getTelegramUser()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [email, setEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        // Загружаем баланс
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)

        // Загружаем сохранённый email
        const { data } = await supabase
          .from('payment_emails')
          .select('email')
          .eq('telegram_id', telegramUser.id)
          .single()

        if (data?.email) {
          setSavedEmail(data.email)
          setEmail(data.email)
        }
      }
      setIsLoadingCoins(false)
    }
    loadData()
  }, [telegramUser?.id])

  const handleSaveEmail = async () => {
    if (!email || !telegramUser?.id) return

    // Простая валидация email
    if (!email.includes('@')) {
      alert('Введите корректный email')
      return
    }

    setIsSaving(true)

    // Сохраняем или обновляем email
    const { error } = await supabase
      .from('payment_emails')
      .upsert({
        telegram_id: telegramUser.id,
        email: email.toLowerCase().trim()
      }, { onConflict: 'telegram_id' })

    if (error) {
      console.error('Error saving email:', error)
      alert('Ошибка сохранения email')
    } else {
      setSavedEmail(email.toLowerCase().trim())
    }

    setIsSaving(false)
  }

  const handleBuyCoins = () => {
    if (!savedEmail) {
      alert('Сначала сохраните email')
      return
    }

    // Открываем страницу оплаты Lava.top
    window.open(LAVA_PRODUCT_URL, '_blank')
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-center">
          <span className="text-gray-900">МАГАЗИН </span>
          <span className="text-orange-500">AI CITI</span>
        </h1>
      </div>

      {/* Баланс */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ваш баланс</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {isLoadingCoins ? '...' : coinBalance}
                </span>
                <span className="text-gray-500">монет</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email для оплаты */}
      <div className="px-4 pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Email для оплаты</p>
          </div>

          {savedEmail ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700">{savedEmail}</span>
              <button
                onClick={() => setSavedEmail(null)}
                className="ml-auto text-xs text-gray-500 underline"
              >
                Изменить
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full p-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={handleSaveEmail}
                disabled={isSaving || !email}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить email'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Используйте этот же email при оплате на Lava.top
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Пакет монет */}
      <div className="px-4 space-y-4">
        <button
          onClick={handleBuyCoins}
          disabled={!savedEmail}
          className={`w-full bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-left transition-all shadow-lg ${
            savedEmail ? 'hover:shadow-xl active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">100 монет</p>
                <p className="text-white/80 text-sm">Пополнение баланса</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">$10</p>
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <ExternalLink className="w-3 h-3" />
                <span>Lava.top</span>
              </div>
            </div>
          </div>
        </button>

        {!savedEmail && (
          <p className="text-xs text-orange-500 text-center">
            Сначала сохраните email выше
          </p>
        )}

        {/* Информация */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Как это работает:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>1. Сохраните email выше</li>
            <li>2. Нажмите "100 монет" для оплаты</li>
            <li>3. На Lava.top укажите тот же email</li>
            <li>4. После оплаты монеты зачислятся автоматически</li>
          </ul>
        </div>

        {/* Подписка скоро */}
        <div className="bg-gray-100 rounded-2xl p-4 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-300 flex items-center justify-center">
              <Coins className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-600">Pro подписка</p>
              <p className="text-xs text-gray-400">Скоро • 2900₽/мес</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-4 pt-6">
        <p className="text-center text-xs text-gray-400">
          Монеты не сгорают • Безопасная оплата
        </p>
      </div>
    </div>
  )
}
