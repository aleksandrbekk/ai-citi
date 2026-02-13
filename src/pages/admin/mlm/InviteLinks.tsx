import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Link2, Copy, Check, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

const BOT_USERNAME = 'Neirociti_bot'

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function InviteLinks() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [tariff, setTariff] = useState('standard')
  const [days, setDays] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [withCurator, setWithCurator] = useState(false)
  const [curatorDays, setCuratorDays] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: links, isLoading } = useQuery({
    queryKey: ['school-invite-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_invite_links')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const createLink = useMutation({
    mutationFn: async () => {
      const code = generateCode()
      const { error } = await supabase
        .from('school_invite_links')
        .insert({
          code,
          tariff_slug: tariff,
          days_access: days ? parseInt(days) : null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          with_curator: withCurator,
          curator_days: withCurator && curatorDays ? parseInt(curatorDays) : null,
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-invite-links'] })
      setShowForm(false)
      setTariff('standard')
      setDays('')
      setMaxUses('')
      setWithCurator(false)
      setCuratorDays('')
      toast.success('Ссылка создана')
    }
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('school_invite_links')
        .update({ is_active: !isActive })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-invite-links'] })
    }
  })

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_invite_links')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-invite-links'] })
      toast.success('Ссылка удалена')
    }
  })

  const copyLink = (code: string, id: string) => {
    const url = `https://t.me/${BOT_USERNAME}?start=school_${code}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Ссылка скопирована')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ссылки доступа</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg text-white rounded-lg flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={18} />
          Создать
        </button>
      </div>

      {/* Форма создания */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <h2 className="font-medium mb-3 text-gray-900">Новая ссылка</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="standard">Standard</option>
              <option value="platinum">Platinum</option>
            </select>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Дней доступа (пусто = бессрочно)"
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Лимит (пусто = безлимит)"
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex items-center gap-3 col-span-full">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={withCurator}
                  onChange={(e) => setWithCurator(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700">С куратором</span>
              </label>
              {withCurator && (
                <input
                  type="number"
                  value={curatorDays}
                  onChange={(e) => setCuratorDays(e.target.value)}
                  placeholder="Дни куратора (пусто = по тарифу)"
                  className="flex-1 max-w-xs px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              )}
            </div>
            <button
              onClick={() => createLink.mutate()}
              disabled={createLink.isPending}
              className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg disabled:opacity-50 rounded-lg text-white font-medium transition-all cursor-pointer"
            >
              {createLink.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* Список ссылок */}
      {isLoading ? (
        <p className="text-gray-400">Загрузка...</p>
      ) : !links || links.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Нет ссылок. Создайте первую.
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => {
            const url = `https://t.me/${BOT_USERNAME}?start=school_${link.code}`
            const limitReached = link.max_uses && link.used_count >= link.max_uses

            return (
              <div
                key={link.id}
                className={`bg-white border rounded-xl p-4 shadow-sm ${
                  !link.is_active || limitReached ? 'border-gray-200 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Link2 size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        link.tariff_slug === 'platinum' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {link.tariff_slug === 'platinum' ? 'Платина' : 'Стандарт'}
                      </span>
                      {link.with_curator && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 font-medium">
                          Куратор{link.curator_days ? ` ${link.curator_days}д` : ''}
                        </span>
                      )}
                      {link.days_access && (
                        <span className="text-xs text-gray-400">{link.days_access} дн.</span>
                      )}
                      {!link.days_access && (
                        <span className="text-xs text-gray-400">бессрочно</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {link.used_count}{link.max_uses ? `/${link.max_uses}` : ''} исп.
                      </span>
                      {!link.is_active && (
                        <span className="text-xs text-red-400">выключена</span>
                      )}
                      {limitReached && link.is_active && (
                        <span className="text-xs text-red-400">лимит</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{url}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(link.code, link.id)}
                      className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                      title="Копировать"
                    >
                      {copiedId === link.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: link.id, isActive: link.is_active })}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
                      title={link.is_active ? 'Выключить' : 'Включить'}
                    >
                      {link.is_active ? <ToggleRight size={18} className="text-orange-500" /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Удалить ссылку?')) deleteLink.mutate(link.id)
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
