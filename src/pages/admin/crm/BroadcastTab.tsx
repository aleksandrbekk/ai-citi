import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Send, Check, Image, X, Calendar, ShoppingCart, CreditCard, Users, Clock, Crown, Coins } from 'lucide-react'

interface AudienceOption {
  id: string
  label: string
  count: number
  icon: React.ElementType
}

export function BroadcastTab() {
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null)

  // Фильтр по дате регистрации
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Загрузка ВСЕХ пользователей
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, created_at')
      if (error) throw error
      return data
    }
  })

  // Загрузка платных клиентов
  const { data: premiumClients } = useQuery({
    queryKey: ['premium-clients-for-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
      if (error) throw error
      return data
    }
  })

  // Загрузка покупателей монет
  const { data: coinBuyers } = useQuery({
    queryKey: ['coin-buyers-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('telegram_id')
        .eq('status', 'completed')
      if (error) throw error
      const unique = new Set(data?.map(p => p.telegram_id))
      return Array.from(unique)
    }
  })

  // Загрузка подписчиков
  const { data: subscribers } = useQuery({
    queryKey: ['subscribers-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('telegram_id')
      if (error) throw error
      const unique = new Set(data?.map(s => s.telegram_id))
      return Array.from(unique)
    }
  })

  const now = new Date()

  // Фильтрация по дате регистрации
  const filterByDate = (createdAt: string | null) => {
    if (dateFilter === 'all' || !createdAt) return true
    const created = new Date(createdAt)
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return created >= weekAgo
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return created >= monthAgo
    }
    if (dateFilter === 'custom') {
      if (dateFrom && created < new Date(dateFrom)) return false
      if (dateTo && created > new Date(dateTo + 'T23:59:59')) return false
      return true
    }
    return true
  }

  // Аудитории
  const audiences: AudienceOption[] = [
    {
      id: 'all',
      label: 'Все пользователи',
      count: allUsers?.filter(u => filterByDate(u.created_at)).length || 0,
      icon: Users
    },
    {
      id: 'active',
      label: 'Активные подписки',
      count: premiumClients?.filter(c => new Date(c.expires_at) > now).length || 0,
      icon: Crown
    },
    {
      id: 'expiring',
      label: 'Истекают ≤7 дн',
      count: premiumClients?.filter(c => {
        const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days > 0 && days <= 7
      }).length || 0,
      icon: Clock
    },
    {
      id: 'expired',
      label: 'Просроченные',
      count: premiumClients?.filter(c => new Date(c.expires_at) <= now).length || 0,
      icon: Calendar
    },
    {
      id: 'coin_buyers',
      label: 'Покупали монеты',
      count: coinBuyers?.length || 0,
      icon: Coins
    },
    {
      id: 'subscribers',
      label: 'Покупали подписку',
      count: subscribers?.length || 0,
      icon: ShoppingCart
    },
    {
      id: 'pro',
      label: 'Тариф PRO',
      count: premiumClients?.filter(c => c.plan?.toUpperCase() === 'PRO').length || 0,
      icon: CreditCard
    },
    {
      id: 'elite',
      label: 'Тариф ELITE',
      count: premiumClients?.filter(c => c.plan?.toUpperCase() === 'ELITE' || c.plan?.toUpperCase() === 'BUSINESS').length || 0,
      icon: Crown
    },
  ]

  // Подсчёт получателей
  const getRecipientIds = (): Set<number> => {
    const recipients = new Set<number>()
    if (selectedAudiences.length === 0) return recipients

    selectedAudiences.forEach(audId => {
      if (audId === 'all' && allUsers) {
        allUsers.filter(u => filterByDate(u.created_at)).forEach(u => {
          if (u.telegram_id) recipients.add(u.telegram_id)
        })
      } else if (audId === 'active' && premiumClients) {
        premiumClients.filter(c => new Date(c.expires_at) > now).forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      } else if (audId === 'expiring' && premiumClients) {
        premiumClients.filter(c => {
          const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return days > 0 && days <= 7
        }).forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      } else if (audId === 'expired' && premiumClients) {
        premiumClients.filter(c => new Date(c.expires_at) <= now).forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      } else if (audId === 'coin_buyers' && coinBuyers) {
        coinBuyers.forEach(id => recipients.add(id))
      } else if (audId === 'subscribers' && subscribers) {
        subscribers.forEach(id => recipients.add(id))
      } else if (audId === 'pro' && premiumClients) {
        premiumClients.filter(c => c.plan?.toUpperCase() === 'PRO').forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      } else if (audId === 'elite' && premiumClients) {
        premiumClients.filter(c => c.plan?.toUpperCase() === 'ELITE' || c.plan?.toUpperCase() === 'BUSINESS').forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      }
    })

    return recipients
  }

  const recipientCount = getRecipientIds().size

  // Переключение аудитории
  const toggleAudience = (id: string) => {
    if (id === 'all') {
      setSelectedAudiences(selectedAudiences.includes('all') ? [] : ['all'])
    } else {
      setSelectedAudiences(prev => {
        const newSelected = prev.filter(a => a !== 'all')
        if (newSelected.includes(id)) {
          return newSelected.filter(a => a !== id)
        } else {
          return [...newSelected, id]
        }
      })
    }
  }

  // Отправка рассылки
  const handleSend = async () => {
    if (!message.trim() || recipientCount === 0) return

    setIsSending(true)
    setSendResult(null)

    const recipients = getRecipientIds()

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            telegram_ids: Array.from(recipients),
            message: message.trim(),
            ...(photoUrl.trim() ? { photo_url: photoUrl.trim() } : {})
          })
        }
      )

      const data = await response.json()

      if (data.error) {
        setSendResult({ success: 0, failed: recipientCount })
      } else {
        setSendResult({ success: data.success, failed: data.failed })
        if (data.success > 0) {
          setMessage('')
          setPhotoUrl('')
          setSelectedAudiences([])
        }
      }
    } catch {
      setSendResult({ success: 0, failed: recipientCount })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Получатели */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Получатели</h3>

        <div className="flex flex-wrap gap-2 mb-3">
          {audiences.map(audience => {
            const Icon = audience.icon
            return (
              <button
                key={audience.id}
                onClick={() => toggleAudience(audience.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectedAudiences.includes(audience.id)
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Icon size={14} />
                {audience.label} ({audience.count})
              </button>
            )
          })}
        </div>

        {/* Фильтр по дате регистрации */}
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <Calendar size={12} />
            Фильтр по дате регистрации
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ['all', 'Все даты'],
              ['week', 'За неделю'],
              ['month', 'За месяц'],
              ['custom', 'Период'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateFilter === key
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              <span className="text-gray-400 self-center text-xs">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
          Получателей: <span className="text-gray-900 font-bold">{recipientCount}</span>
        </div>
      </div>

      {/* Сообщение */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Сообщение</h3>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите текст (поддерживается HTML: <b>, <i>, <a>)..."
          className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{message.length} символов</span>
        </div>
      </div>

      {/* Фото */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Image size={14} />
          Фото (необязательно)
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Вставьте URL изображения..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {photoUrl && (
            <button
              onClick={() => setPhotoUrl('')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>

        {/* Предпросмотр */}
        {photoUrl && (
          <div className="mt-3 relative">
            <img
              src={photoUrl}
              alt="Предпросмотр"
              className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Результат */}
      {sendResult && (
        <div className={`p-4 rounded-2xl flex items-center gap-2 ${sendResult.failed > 0
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            Отправлено: {sendResult.success}, Ошибок: {sendResult.failed}
          </span>
        </div>
      )}

      {/* Кнопка отправки */}
      <button
        onClick={handleSend}
        disabled={isSending || !message.trim() || selectedAudiences.length === 0}
        className="w-full py-4 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-500 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:shadow-none"
      >
        {isSending ? (
          'Отправка...'
        ) : (
          <>
            <Send className="w-5 h-5" />
            Отправить ({recipientCount})
          </>
        )}
      </button>
    </div>
  )
}
