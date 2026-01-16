import { useState, useEffect } from 'react'
import {
  Plus,
  Copy,
  Trash2,
  MousePointer,
  Users,
  ShoppingCart,
  Eye,
  Edit,
  Check,
  X,
  Link2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UtmCampaign {
  id: string
  name: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  short_code: string | null
  target_url: string
  is_active: boolean
  clicks: number
  unique_clicks: number
  registrations: number
  purchases: number
  created_at: string
}

const BOT_USERNAME = 'neurochikbot' // Telegram bot username

export default function UtmTab() {
  const [campaigns, setCampaigns] = useState<UtmCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<UtmCampaign | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    utm_source: '',
    utm_medium: '',
    short_code: '',
    target_url: '/'
  })

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('utm_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCampaigns(data)
    }
    setIsLoading(false)
  }

  const generateShortCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const buildUtmUrl = (campaign: Partial<UtmCampaign>) => {
    const baseUrl = `https://t.me/${BOT_USERNAME}/app`
    const params = new URLSearchParams()

    if (campaign.utm_source) params.append('utm_source', campaign.utm_source)
    if (campaign.utm_medium) params.append('utm_medium', campaign.utm_medium)
    if (campaign.short_code) params.append('ref', campaign.short_code)

    const paramStr = params.toString()
    return paramStr ? `${baseUrl}?${paramStr}` : baseUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const campaignData = {
      ...formData,
      short_code: formData.short_code || generateShortCode()
    }

    if (editingCampaign) {
      // Update
      const { error } = await supabase
        .from('utm_campaigns')
        .update(campaignData)
        .eq('id', editingCampaign.id)

      if (!error) {
        loadCampaigns()
        resetForm()
      }
    } else {
      // Create
      const { error } = await supabase
        .from('utm_campaigns')
        .insert([campaignData])

      if (!error) {
        loadCampaigns()
        resetForm()
      }
    }
  }

  const handleEdit = (campaign: UtmCampaign) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      utm_source: campaign.utm_source || '',
      utm_medium: campaign.utm_medium || '',
      short_code: campaign.short_code || '',
      target_url: campaign.target_url || '/'
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту UTM-ссылку?')) return

    const { error } = await supabase
      .from('utm_campaigns')
      .delete()
      .eq('id', id)

    if (!error) {
      loadCampaigns()
    }
  }

  const toggleActive = async (campaign: UtmCampaign) => {
    const { error } = await supabase
      .from('utm_campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaign.id)

    if (!error) {
      loadCampaigns()
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingCampaign(null)
    setFormData({
      name: '',
      utm_source: '',
      utm_medium: '',
      short_code: '',
      target_url: '/'
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-[#94A3B8]">Загрузка...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">UTM Ссылки</h3>
          <p className="text-sm text-[#94A3B8]">Создавайте ссылки для отслеживания источников трафика</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать ссылку
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">
              {editingCampaign ? 'Редактировать ссылку' : 'Новая UTM-ссылка'}
            </h4>
            <button onClick={resetForm} className="text-[#94A3B8] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#94A3B8] mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Реклама в Instagram"
                  className="w-full px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#94A3B8] mb-1">Короткий код</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    placeholder="auto"
                    className="flex-1 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, short_code: generateShortCode() })}
                    className="px-3 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#94A3B8] mb-1">utm_source (откуда трафик)</label>
                <input
                  type="text"
                  value={formData.utm_source}
                  onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                  placeholder="instagram, telegram, youtube"
                  className="w-full px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#94A3B8] mb-1">utm_medium (тип рекламы)</label>
                <input
                  type="text"
                  value={formData.utm_medium}
                  onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                  placeholder="stories, post, reels, banner"
                  className="w-full px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-[#1E293B] rounded-lg p-4">
              <div className="text-sm text-[#94A3B8] mb-2">Превью ссылки:</div>
              <code className="text-xs text-[#60A5FA] break-all">
                {buildUtmUrl(formData)}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors font-medium"
              >
                {editingCampaign ? 'Сохранить' : 'Создать'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#94A3B8] mb-1">
            <Link2 className="w-4 h-4" />
            <span className="text-sm">Всего ссылок</span>
          </div>
          <div className="text-2xl font-bold">{campaigns.length}</div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#94A3B8] mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-sm">Всего кликов</span>
          </div>
          <div className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.clicks, 0)}</div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#94A3B8] mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Регистрации</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{campaigns.reduce((sum, c) => sum + c.registrations, 0)}</div>
        </div>
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#94A3B8] mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">Покупки</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{campaigns.reduce((sum, c) => sum + c.purchases, 0)}</div>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-[#1E293B] border border-[#334155] rounded-lg">
          <Link2 className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
          <p className="text-[#94A3B8] mb-4">Нет UTM-ссылок</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
          >
            Создать первую ссылку
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`bg-[#1E293B] border rounded-lg p-4 transition-all ${
                campaign.is_active ? 'border-[#334155]' : 'border-[#334155] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{campaign.name}</h4>
                    {!campaign.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-[#64748B]/20 text-[#94A3B8] rounded">
                        Неактивна
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-2">
                    {campaign.utm_source && <span className="px-2 py-0.5 bg-[#0F172A] rounded">{campaign.utm_source}</span>}
                    {campaign.utm_medium && <span className="px-2 py-0.5 bg-[#0F172A] rounded">{campaign.utm_medium}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="text-xs text-[#60A5FA] truncate max-w-md">
                      {buildUtmUrl(campaign)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(buildUtmUrl(campaign), campaign.id)}
                      className="p-1 hover:bg-[#334155] rounded transition-colors flex-shrink-0"
                      title="Копировать"
                    >
                      {copiedId === campaign.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#94A3B8]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-[#94A3B8] text-xs">Клики</div>
                    <div className="font-semibold">{campaign.clicks}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#94A3B8] text-xs">Уник.</div>
                    <div className="font-semibold">{campaign.unique_clicks}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#94A3B8] text-xs">Рег.</div>
                    <div className="font-semibold text-green-400">{campaign.registrations}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#94A3B8] text-xs">Покупки</div>
                    <div className="font-semibold text-yellow-400">{campaign.purchases}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(campaign)}
                    className={`p-2 rounded-lg transition-colors ${
                      campaign.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-[#334155] text-[#94A3B8] hover:bg-[#475569]'
                    }`}
                    title={campaign.is_active ? 'Деактивировать' : 'Активировать'}
                  >
                    {campaign.is_active ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="p-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
