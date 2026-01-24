import { useState, useEffect } from 'react'
import {
  Plus,
  Copy,
  Trash2,
  MousePointer,
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
      <div className="text-center py-12 text-gray-500">Загрузка...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">UTM Ссылки</h3>
          <p className="text-sm text-gray-500">Отслеживание источников трафика</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Создать ссылку
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">
              {editingCampaign ? 'Редактировать ссылку' : 'Новая UTM-ссылка'}
            </h4>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Реклама в Instagram"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Короткий код</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    placeholder="auto"
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, short_code: generateShortCode() })}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Источник (utm_source)</label>
                <input
                  type="text"
                  value={formData.utm_source}
                  onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                  placeholder="instagram, telegram"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Тип (utm_medium)</label>
                <input
                  type="text"
                  value={formData.utm_medium}
                  onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                  placeholder="stories, post, reels"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-2">Превью ссылки:</div>
              <code className="text-xs text-orange-600 break-all">
                {buildUtmUrl(formData)}
              </code>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors font-medium"
              >
                {editingCampaign ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Link2 className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Ссылок</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{campaigns.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Кликов</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{campaigns.reduce((sum, c) => sum + c.clicks, 0)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Покупки</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-400">{campaigns.reduce((sum, c) => sum + c.purchases, 0)}</div>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Нет UTM-ссылок</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            Создать первую ссылку
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`bg-white border rounded-xl p-4 transition-all ${
                campaign.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-sm sm:text-base">{campaign.name}</h4>
                    {!campaign.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                        Выкл
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    {campaign.utm_source && <span className="px-2 py-0.5 bg-gray-50 rounded">{campaign.utm_source}</span>}
                    {campaign.utm_medium && <span className="px-2 py-0.5 bg-gray-50 rounded">{campaign.utm_medium}</span>}
                  </div>
                </div>

                {/* Actions - always visible */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(campaign)}
                    className={`p-2 rounded-lg transition-colors ${
                      campaign.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Link row */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 mb-3">
                <code className="text-xs text-orange-600 truncate flex-1">
                  {buildUtmUrl(campaign)}
                </code>
                <button
                  onClick={() => copyToClipboard(buildUtmUrl(campaign), campaign.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  {copiedId === campaign.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs sm:text-sm">
                <div className="bg-gray-50 rounded-lg py-2 px-1">
                  <div className="text-gray-500 text-[10px] sm:text-xs">Клики</div>
                  <div className="font-semibold">{campaign.clicks}</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 px-1">
                  <div className="text-gray-500 text-[10px] sm:text-xs">Уник.</div>
                  <div className="font-semibold">{campaign.unique_clicks}</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 px-1">
                  <div className="text-gray-500 text-[10px] sm:text-xs">Рег.</div>
                  <div className="font-semibold text-green-400">{campaign.registrations}</div>
                </div>
                <div className="bg-gray-50 rounded-lg py-2 px-1">
                  <div className="text-gray-500 text-[10px] sm:text-xs">Покупки</div>
                  <div className="font-semibold text-yellow-400">{campaign.purchases}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
