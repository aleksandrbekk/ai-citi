import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { 
  Plus, Search, MoreVertical, DollarSign, Trash2
} from 'lucide-react'

interface Client {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  plan: string
  started_at: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  source: string
  tags: string[]
  total_paid_usd: number
  payments_count: number
  notes: string | null
}

export function ClientsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Загрузка клиентов
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Client[]
    }
  })

  // Добавление клиента
  const addClient = useMutation({
    mutationFn: async (newClient: Partial<Client>) => {
      const { data, error } = await supabase
        .from('premium_clients')
        .insert(newClient)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setShowAddModal(false)
    }
  })

  // Удаление клиента
  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('premium_clients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSelectedClient(null)
    }
  })

  // Обновление клиента
  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Client> }) => {
      const { error } = await supabase
        .from('premium_clients')
        .update(data)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    }
  })

  // Фильтрация
  const filteredClients = clients?.filter(client => {
    // Поиск
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch = 
        client.telegram_id.toString().includes(search) ||
        client.username?.toLowerCase().includes(searchLower) ||
        client.first_name?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    // Фильтр по плану
    if (filterPlan !== 'all' && client.plan !== filterPlan) return false
    // Фильтр по статусу
    if (filterStatus !== 'all') {
      const daysLeft = Math.ceil((new Date(client.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (filterStatus === 'active' && daysLeft <= 0) return false
      if (filterStatus === 'expiring' && (daysLeft <= 0 || daysLeft > 7)) return false
      if (filterStatus === 'expired' && daysLeft > 0) return false
    }
    return true
  })

  // Расчёт дней до истечения
  const getDaysLeft = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  // Цвет статуса
  const getStatusColor = (expiresAt: string) => {
    const days = getDaysLeft(expiresAt)
    if (days <= 0) return 'text-red-500 bg-red-500/10'
    if (days <= 7) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-green-500 bg-green-500/10'
  }

  const getStatusText = (expiresAt: string) => {
    const days = getDaysLeft(expiresAt)
    if (days <= 0) return `Истёк ${Math.abs(days)} дн. назад`
    if (days === 1) return '1 день'
    return `${days} дн.`
  }

  return (
    <div>
      {/* Фильтры и поиск */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Поиск */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по ID, username, имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Фильтр по плану */}
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
        >
          <option value="all">Все тарифы</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="vip">VIP</option>
        </select>

        {/* Фильтр по статусу */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="expiring">Истекает скоро</option>
          <option value="expired">Просроченные</option>
        </select>

        {/* Кнопка добавления */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить
        </button>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Пользователь</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Тариф</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Источник</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Истекает</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">LTV</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Статус</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Загрузка...
                </td>
              </tr>
            ) : filteredClients?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  {clients?.length === 0 ? 'Нет клиентов' : 'Ничего не найдено'}
                </td>
              </tr>
            ) : (
              filteredClients?.map((client) => (
                <tr 
                  key={client.id} 
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer ${
                    getDaysLeft(client.expires_at) <= 0 ? 'bg-red-500/5' : 
                    getDaysLeft(client.expires_at) <= 7 ? 'bg-yellow-500/5' : ''
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">
                        {client.first_name || 'Без имени'}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {client.username ? `@${client.username}` : client.telegram_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-sm rounded">
                      {client.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {client.source}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className={getStatusColor(client.expires_at).split(' ')[0]}>
                        {getStatusText(client.expires_at)}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {new Date(client.expires_at).toLocaleDateString('ru')}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white">
                    ${client.total_paid_usd}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {client.in_channel && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="В канале" />
                      )}
                      {client.in_chat && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" title="В чате" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модалка добавления клиента */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdd={(data) => addClient.mutate(data)}
          isLoading={addClient.isPending}
        />
      )}

      {/* Модалка деталей клиента */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onDelete={() => deleteClient.mutate(selectedClient.id)}
          onUpdate={(data) => updateClient.mutate({ id: selectedClient.id, data })}
        />
      )}
    </div>
  )
}

// Модалка добавления клиента
function AddClientModal({ 
  onClose, 
  onAdd, 
  isLoading 
}: { 
  onClose: () => void
  onAdd: (data: Partial<Client>) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({
    telegram_id: '',
    username: '',
    first_name: '',
    plan: 'basic',
    days: '30',
    source: 'manual',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(form.days))
    
    onAdd({
      telegram_id: parseInt(form.telegram_id),
      username: form.username || null,
      first_name: form.first_name || null,
      plan: form.plan,
      expires_at: expiresAt.toISOString(),
      source: form.source,
      notes: form.notes || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Добавить клиента</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Telegram ID *</label>
            <input
              type="number"
              required
              value={form.telegram_id}
              onChange={(e) => setForm({...form, telegram_id: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              placeholder="123456789"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({...form, username: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              placeholder="username"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Имя</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({...form, first_name: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              placeholder="Иван"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Тариф</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({...form, plan: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Дней подписки</label>
              <input
                type="number"
                value={form.days}
                onChange={(e) => setForm({...form, days: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Источник</label>
            <select
              value={form.source}
              onChange={(e) => setForm({...form, source: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
            >
              <option value="manual">Вручную</option>
              <option value="lava">Lava</option>
              <option value="crypto">Crypto</option>
              <option value="migration">Миграция</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Заметка</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({...form, notes: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
              rows={2}
              placeholder="Комментарий..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Добавление...' : 'Добавить клиента'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Модалка деталей клиента
function ClientDetailModal({
  client,
  onClose,
  onDelete,
  onUpdate
}: {
  client: Client
  onClose: () => void
  onDelete: () => void
  onUpdate: (data: Partial<Client>) => void
}) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: client.first_name || '',
    username: client.username || '',
    plan: client.plan,
    days: '30',
    source: client.source,
    notes: client.notes || '',
    in_channel: client.in_channel,
    in_chat: client.in_chat
  })
  
  const [newPayment, setNewPayment] = useState({ amount: '', description: '' })
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Загрузка платежей
  const { data: payments, refetch: refetchPayments } = useQuery({
    queryKey: ['payments', client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', client.id)
        .order('payment_date', { ascending: false })
      return data || []
    },
    enabled: !!client.id
  })

  // Функция добавления платежа
  const handleAddPayment = async () => {
    if (!newPayment.amount || !client.id) return
    
    const amount = parseFloat(newPayment.amount)
    
    // Создаём платёж
    await supabase.from('payments').insert({
      client_id: client.id,
      amount,
      description: newPayment.description || null
    })
    
    // Обновляем LTV клиента
    const newLTV = (client.total_paid_usd || 0) + amount
    await supabase
      .from('premium_clients')
      .update({ total_paid_usd: newLTV })
      .eq('id', client.id)
    
    // Обновляем данные
    refetchPayments()
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    setNewPayment({ amount: '', description: '' })
    setShowPaymentForm(false)
  }

  // Функция удаления платежа
  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (!confirm('Удалить платёж?')) return
    
    await supabase.from('payments').delete().eq('id', paymentId)
    
    // Обновляем LTV
    const newLTV = Math.max(0, (client.total_paid_usd || 0) - amount)
    await supabase
      .from('premium_clients')
      .update({ total_paid_usd: newLTV })
      .eq('id', client.id)
    
    refetchPayments()
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }

  const daysLeft = Math.ceil((new Date(client.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const handleSave = () => {
    const updates: Partial<Client> = {
      first_name: form.first_name || null,
      username: form.username || null,
      plan: form.plan,
      source: form.source,
      notes: form.notes || null,
      in_channel: form.in_channel,
      in_chat: form.in_chat
    }
    
    // Если указаны дни — продлить подписку
    if (form.days && parseInt(form.days) > 0) {
      const newExpires = new Date()
      newExpires.setDate(newExpires.getDate() + parseInt(form.days))
      updates.expires_at = newExpires.toISOString()
    }
    
    onUpdate(updates)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Редактировать клиента</h2>
            <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Telegram ID</label>
              <input
                type="text"
                disabled
                value={client.telegram_id}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Имя</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({...form, first_name: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Тариф</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({...form, plan: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Продлить на (дней)</label>
                <input
                  type="number"
                  value={form.days}
                  onChange={(e) => setForm({...form, days: e.target.value})}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Источник</label>
              <select
                value={form.source}
                onChange={(e) => setForm({...form, source: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="manual">Вручную</option>
                <option value="lava">Lava</option>
                <option value="crypto">Crypto</option>
                <option value="migration">Миграция</option>
              </select>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_channel}
                  onChange={(e) => setForm({...form, in_channel: e.target.checked})}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800"
                />
                <span className="text-sm text-zinc-400">В канале</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_chat}
                  onChange={(e) => setForm({...form, in_chat: e.target.checked})}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800"
                />
                <span className="text-sm text-zinc-400">В чате</span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Заметка</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {client.first_name || client.username || `ID: ${client.telegram_id}`}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Telegram ID</div>
              <div className="text-white font-mono">{client.telegram_id}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Username</div>
              <div className="text-white">{client.username ? `@${client.username}` : '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Тариф</div>
              <div className="text-white">{client.plan}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Осталось</div>
              <div className={daysLeft <= 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'}>
                {daysLeft <= 0 ? `Истёк ${Math.abs(daysLeft)} дн. назад` : `${daysLeft} дн.`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">LTV</div>
              <div className="text-white">${client.total_paid_usd}</div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Платежей</div>
              <div className="text-white">{client.payments_count}</div>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg p-3">
            <div className="text-xs text-zinc-500 mb-1">Источник</div>
            <div className="text-white">{client.source}</div>
          </div>

          {client.notes && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Заметка</div>
              <div className="text-white text-sm">{client.notes}</div>
            </div>
          )}

          {/* История платежей */}
          <div className="border-t border-zinc-700 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <DollarSign size={16} /> История платежей
              </h4>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              >
                <Plus size={14} /> Добавить
              </button>
            </div>

            {/* Форма нового платежа */}
            {showPaymentForm && (
              <div className="bg-zinc-800 rounded-lg p-3 mb-3 space-y-2">
                <input
                  type="number"
                  placeholder="Сумма ($)"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full bg-zinc-700 text-white rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Описание (опционально)"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  className="w-full bg-zinc-700 text-white rounded px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-2 text-sm"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded py-2 text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Список платежей */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments && payments.length > 0 ? (
                payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                    <div>
                      <div className="text-green-400 font-medium">${payment.amount}</div>
                      {payment.description && (
                        <div className="text-zinc-500 text-xs">{payment.description}</div>
                      )}
                      <div className="text-zinc-600 text-xs">
                        {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(payment.id, payment.amount)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-sm text-center py-2">Нет платежей</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Редактировать
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
