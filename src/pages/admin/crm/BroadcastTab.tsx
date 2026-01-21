import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Send, Check } from 'lucide-react'

interface AudienceOption {
  id: string
  label: string
  count: number
  filter: (client: any) => boolean
}

export function BroadcastTab() {
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null)

  // Загрузка клиентов для подсчёта
  const { data: clients } = useQuery({
    queryKey: ['clients-for-broadcast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
      if (error) throw error
      return data
    }
  })

  // Подсчёт аудиторий
  const now = new Date()
  const audiences: AudienceOption[] = [
    {
      id: 'all',
      label: 'Все клиенты',
      count: clients?.length || 0,
      filter: () => true
    },
    {
      id: 'active',
      label: 'Активные',
      count: clients?.filter(c => new Date(c.expires_at) > now).length || 0,
      filter: (c) => new Date(c.expires_at) > now
    },
    {
      id: 'expiring',
      label: 'Истекает скоро',
      count: clients?.filter(c => {
        const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days > 0 && days <= 7
      }).length || 0,
      filter: (c) => {
        const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return days > 0 && days <= 7
      }
    },
    {
      id: 'expired',
      label: 'Просроченные',
      count: clients?.filter(c => new Date(c.expires_at) <= now).length || 0,
      filter: (c) => new Date(c.expires_at) <= now
    },
    {
      id: 'basic',
      label: 'Тариф BASIC',
      count: clients?.filter(c => c.plan?.toUpperCase() === 'BASIC').length || 0,
      filter: (c) => c.plan?.toUpperCase() === 'BASIC'
    },
    {
      id: 'pro',
      label: 'Тариф PRO',
      count: clients?.filter(c => c.plan?.toUpperCase() === 'PRO').length || 0,
      filter: (c) => c.plan?.toUpperCase() === 'PRO'
    },
    {
      id: 'vip',
      label: 'Тариф VIP',
      count: clients?.filter(c => c.plan?.toUpperCase() === 'VIP').length || 0,
      filter: (c) => c.plan?.toUpperCase() === 'VIP'
    },
    {
      id: 'elite',
      label: 'Тариф ELITE',
      count: clients?.filter(c => c.plan?.toUpperCase() === 'ELITE').length || 0,
      filter: (c) => c.plan?.toUpperCase() === 'ELITE'
    },
  ]

  // Подсчёт выбранных получателей
  const getSelectedCount = () => {
    if (selectedAudiences.length === 0) return 0
    if (selectedAudiences.includes('all')) return clients?.length || 0
    
    const selectedClients = new Set<string>()
    selectedAudiences.forEach(audId => {
      const audience = audiences.find(a => a.id === audId)
      if (audience) {
        clients?.filter(audience.filter).forEach(c => selectedClients.add(c.id))
      }
    })
    return selectedClients.size
  }

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
    const recipientCount = getSelectedCount()
    if (!message.trim() || recipientCount === 0) return
    
    setIsSending(true)
    setSendResult(null)

    const recipients = new Set<number>()

    selectedAudiences.forEach(audId => {
      const audience = audiences.find(a => a.id === audId)
      if (audience && clients) {
        clients.filter(audience.filter).forEach(c => {
          if (c.telegram_id) recipients.add(c.telegram_id)
        })
      }
    })

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
            message: message.trim()
          })
        }
      )

      const data = await response.json()

      if (data.error) {
        setSendResult({
          success: 0,
          failed: recipientCount
        })
      } else {
        setSendResult({
          success: data.success,
          failed: data.failed
        })
        if (data.success > 0) {
          setMessage('')
          setSelectedAudiences([])
        }
      }
    } catch (err: any) {
      setSendResult({
        success: 0,
        failed: recipientCount
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Получатели */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Получатели</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {audiences.map(audience => (
            <button
              key={audience.id}
              onClick={() => toggleAudience(audience.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedAudiences.includes(audience.id)
                  ? 'bg-blue-600 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {audience.label} ({audience.count})
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          Выбрано: <span className="text-gray-900 font-semibold">{getSelectedCount()}</span>
        </div>
      </div>

      {/* Сообщение */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Сообщение</h3>
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите текст..."
          className="w-full h-40 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 resize-none"
        />
        
        <div className="flex justify-end mt-2">
          <span className="text-xs text-gray-400">{message.length} символов</span>
        </div>
      </div>

      {/* Результат отправки */}
      {sendResult && (
        <div className={`p-4 rounded-lg ${sendResult.failed > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <div className="flex items-center gap-2">
            <Check className={`w-5 h-5 ${sendResult.failed > 0 ? 'text-red-500' : 'text-green-500'}`} />
            <span className="text-gray-900">
              Отправлено: {sendResult.success}, Ошибок: {sendResult.failed}
            </span>
          </div>
        </div>
      )}

      {/* Кнопка отправки */}
      <button
        onClick={handleSend}
        disabled={isSending || !message.trim() || selectedAudiences.length === 0}
        className="w-full py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-white disabled:text-zinc-600 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSending ? (
          'Отправка...'
        ) : (
          <>
            <Send className="w-5 h-5" />
            Отправить
          </>
        )}
      </button>
    </div>
  )
}
