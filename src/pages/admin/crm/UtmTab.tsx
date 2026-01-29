import { useState, useEffect } from 'react'
import {
  Plus,
  Copy,
  Trash2,
  Edit,
  Check,
  X,
  Link2,
  Gift,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// =========================================================
// ТИПЫ
// =========================================================

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

interface PromoLink {
  id: string
  code: string
  coins_amount: number
  description: string | null
  is_active: boolean
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  created_at: string
}

interface ClaimStats {
  promo_link_id: string
  total_claims: number
  total_coins: number
}

// =========================================================
// КОНСТАНТЫ
// =========================================================

const BOT_USERNAME = 'Neirociti_bot'
const PROMO_PRESETS = [10, 25, 50, 100, 200, 500]

// =========================================================
// КОМПОНЕНТ
// =========================================================

export default function UtmTab() {
  // === Вкладки ===
  const [activeTab, setActiveTab] = useState<'utm' | 'promo'>('utm')

  // === UTM State ===
  const [campaigns, setCampaigns] = useState<UtmCampaign[]>([])
  const [utmLoading, setUtmLoading] = useState(true)
  const [showUtmForm, setShowUtmForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<UtmCampaign | null>(null)
  const [utmFormData, setUtmFormData] = useState({
    name: '',
    utm_source: '',
    utm_medium: '',
    short_code: '',
    target_url: '/'
  })

  // === Promo State ===
  const [promoLinks, setPromoLinks] = useState<PromoLink[]>([])
  const [promoStats, setPromoStats] = useState<Map<string, ClaimStats>>(new Map())
  const [promoLoading, setPromoLoading] = useState(true)
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [newCoins, setNewCoins] = useState(50)
  const [newDescription, setNewDescription] = useState('')
  const [isCreatingPromo, setIsCreatingPromo] = useState(false)
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null)

  // === Общее ===
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // =========================================================
  // ЗАГРУЗКА ДАННЫХ
  // =========================================================

  useEffect(() => {
    loadCampaigns()
    loadPromoLinks()
  }, [])

  const loadCampaigns = async () => {
    setUtmLoading(true)
    const { data, error } = await supabase
      .from('utm_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCampaigns(data)
    }
    setUtmLoading(false)
  }

  const loadPromoLinks = async () => {
    setPromoLoading(true)
    try {
      const { data: links, error } = await supabase
        .from('promo_links')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && links) {
        setPromoLinks(links)
      }

      // Статистика claims
      const { data: claimsData } = await supabase
        .from('promo_claims')
        .select('promo_link_id, coins_awarded')

      if (claimsData) {
        const statsMap = new Map<string, ClaimStats>()
        claimsData.forEach((claim: { promo_link_id: string; coins_awarded: number }) => {
          const existing = statsMap.get(claim.promo_link_id) || {
            promo_link_id: claim.promo_link_id,
            total_claims: 0,
            total_coins: 0
          }
          existing.total_claims++
          existing.total_coins += claim.coins_awarded
          statsMap.set(claim.promo_link_id, existing)
        })
        setPromoStats(statsMap)
      }
    } catch (error) {
      console.error('Error loading promo links:', error)
    } finally {
      setPromoLoading(false)
    }
  }

  // =========================================================
  // UTM ФУНКЦИИ
  // =========================================================

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

  const handleUtmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const campaignData = {
      ...utmFormData,
      short_code: utmFormData.short_code || generateShortCode()
    }

    if (editingCampaign) {
      const { error } = await supabase
        .from('utm_campaigns')
        .update(campaignData)
        .eq('id', editingCampaign.id)

      if (!error) {
        toast.success('Ссылка обновлена')
        loadCampaigns()
        resetUtmForm()
      }
    } else {
      const { error } = await supabase
        .from('utm_campaigns')
        .insert([campaignData])

      if (!error) {
        toast.success('Ссылка создана')
        loadCampaigns()
        resetUtmForm()
      }
    }
  }

  const handleUtmEdit = (campaign: UtmCampaign) => {
    setEditingCampaign(campaign)
    setUtmFormData({
      name: campaign.name,
      utm_source: campaign.utm_source || '',
      utm_medium: campaign.utm_medium || '',
      short_code: campaign.short_code || '',
      target_url: campaign.target_url || '/'
    })
    setShowUtmForm(true)
  }

  const handleUtmDelete = async (id: string) => {
    if (!confirm('Удалить эту UTM-ссылку?')) return
    const { error } = await supabase
      .from('utm_campaigns')
      .delete()
      .eq('id', id)

    if (!error) {
      toast.success('Удалено')
      loadCampaigns()
    }
  }

  const toggleUtmActive = async (campaign: UtmCampaign) => {
    const { error } = await supabase
      .from('utm_campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaign.id)

    if (!error) {
      loadCampaigns()
    }
  }

  const resetUtmForm = () => {
    setShowUtmForm(false)
    setEditingCampaign(null)
    setUtmFormData({
      name: '',
      utm_source: '',
      utm_medium: '',
      short_code: '',
      target_url: '/'
    })
  }

  // =========================================================
  // PROMO ФУНКЦИИ
  // =========================================================

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const buildPromoUrl = (code: string) => {
    return `https://t.me/${BOT_USERNAME}?startapp=${code}`
  }

  const createPromoLink = async () => {
    if (newCoins < 1) {
      toast.error('Укажите количество монет')
      return
    }

    setIsCreatingPromo(true)
    try {
      const code = generatePromoCode()

      const { error } = await supabase
        .from('promo_links')
        .insert({
          code: code,
          coins_amount: newCoins,
          description: newDescription.trim() || null,
        })

      if (error) throw error

      const link = buildPromoUrl(code)
      setLastCreatedLink(link)
      toast.success(`Промо-ссылка создана!`)
      setNewCoins(50)
      setNewDescription('')
      await loadPromoLinks()
    } catch (error) {
      console.error('Error creating promo link:', error)
      toast.error('Ошибка создания')
    } finally {
      setIsCreatingPromo(false)
    }
  }

  const togglePromoActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('promo_links')
      .update({ is_active: !isActive })
      .eq('id', id)

    if (!error) {
      setPromoLinks(links =>
        links.map(link =>
          link.id === id ? { ...link, is_active: !isActive } : link
        )
      )
      toast.success(isActive ? 'Деактивировано' : 'Активировано')
    }
  }

  const deletePromoLink = async (id: string) => {
    if (!confirm('Удалить промо-ссылку?')) return
    const { error } = await supabase
      .from('promo_links')
      .delete()
      .eq('id', id)

    if (!error) {
      setPromoLinks(links => links.filter(link => link.id !== id))
      toast.success('Удалено')
    }
  }

  // =========================================================
  // ОБЩИЕ ФУНКЦИИ
  // =========================================================

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Скопировано!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getPromoStats = (id: string) => promoStats.get(id) || { total_claims: 0, total_coins: 0 }

  const totalPromoClaims = Array.from(promoStats.values()).reduce((acc, s) => acc + s.total_claims, 0)
  const totalPromoCoins = Array.from(promoStats.values()).reduce((acc, s) => acc + s.total_coins, 0)

  // =========================================================
  // РЕНДЕР
  // =========================================================

  return (
    <div className="space-y-5">
      {/* === ВКЛАДКИ === */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('utm')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'utm'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Link2 className="w-4 h-4" />
          UTM ссылки
        </button>
        <button
          onClick={() => setActiveTab('promo')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'promo'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Gift className="w-4 h-4" />
          Промо-ссылки
        </button>
      </div>

      {/* === UTM TAB === */}
      {activeTab === 'utm' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">UTM Ссылки</h3>
              <p className="text-sm text-gray-500">Отслеживание источников трафика</p>
            </div>
            <button
              onClick={() => setShowUtmForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-sm font-medium w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Создать ссылку
            </button>
          </div>

          {/* Create/Edit Form */}
          {showUtmForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">
                  {editingCampaign ? 'Редактировать' : 'Новая UTM-ссылка'}
                </h4>
                <button
                  onClick={resetUtmForm}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleUtmSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Название *</label>
                    <input
                      type="text"
                      value={utmFormData.name}
                      onChange={(e) => setUtmFormData({ ...utmFormData, name: e.target.value })}
                      placeholder="Реклама в Instagram"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Короткий код</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={utmFormData.short_code}
                        onChange={(e) => setUtmFormData({ ...utmFormData, short_code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                        placeholder="auto"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setUtmFormData({ ...utmFormData, short_code: generateShortCode() })}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Источник (utm_source)</label>
                    <input
                      type="text"
                      value={utmFormData.utm_source}
                      onChange={(e) => setUtmFormData({ ...utmFormData, utm_source: e.target.value })}
                      placeholder="instagram, telegram"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Тип (utm_medium)</label>
                    <input
                      type="text"
                      value={utmFormData.utm_medium}
                      onChange={(e) => setUtmFormData({ ...utmFormData, utm_medium: e.target.value })}
                      placeholder="stories, post, reels"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetUtmForm}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {editingCampaign ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* UTM List */}
          {utmLoading ? (
            <div className="text-center py-12 text-gray-500">Загрузка...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Нет UTM-ссылок</p>
              <button
                onClick={() => setShowUtmForm(true)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Создать первую
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className={`bg-white border rounded-xl p-4 transition-all ${campaign.is_active
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-200 opacity-50'
                    }`}
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900">{campaign.name}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {campaign.utm_source && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                            {campaign.utm_source}
                          </span>
                        )}
                        {campaign.utm_medium && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium">
                            {campaign.utm_medium}
                          </span>
                        )}
                        {!campaign.is_active && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs">
                            Неактивна
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleUtmEdit(campaign)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-5 h-5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => toggleUtmActive(campaign)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${campaign.is_active
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                      >
                        {campaign.is_active ? 'Выкл' : 'Вкл'}
                      </button>
                      <button
                        onClick={() => handleUtmDelete(campaign.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Link row */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                    <code className="text-xs text-orange-600 truncate flex-1 font-mono">
                      {buildUtmUrl(campaign)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(buildUtmUrl(campaign), campaign.id)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedId === campaign.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-xl py-2">
                      <div className="text-xs text-gray-500">Клики</div>
                      <div className="font-semibold text-gray-900">{campaign.clicks}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <div className="text-xs text-gray-500">Уник.</div>
                      <div className="font-semibold text-gray-900">{campaign.unique_clicks}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <div className="text-xs text-gray-500">Рег.</div>
                      <div className="font-semibold text-green-600">{campaign.registrations}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl py-2">
                      <div className="text-xs text-gray-500">Покупки</div>
                      <div className="font-semibold text-amber-600">{campaign.purchases}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === PROMO TAB === */}
      {activeTab === 'promo' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Промо-ссылки</h3>
              <p className="text-sm text-gray-500">Одноразовые бонусы за переход</p>
            </div>
            <button
              onClick={() => {
                setShowPromoForm(!showPromoForm)
                setLastCreatedLink(null)
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-sm font-medium w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Создать промо
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{promoLinks.length}</div>
              <div className="text-xs text-gray-500 mt-1">Ссылок</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{totalPromoClaims}</div>
              <div className="text-xs text-gray-500 mt-1">Активаций</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{totalPromoCoins}</div>
              <div className="text-xs text-gray-500 mt-1">Монет</div>
            </div>
          </div>

          {/* Create Form */}
          {showPromoForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Новая промо-ссылка</h4>
                <button
                  onClick={() => {
                    setShowPromoForm(false)
                    setLastCreatedLink(null)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Монеты - пресеты + ползунок */}
              <div>
                <label className="block text-sm text-gray-600 mb-3">
                  Количество монет: <span className="font-bold text-orange-600 text-lg">{newCoins}</span>
                </label>

                <div className="flex flex-wrap gap-2 mb-4">
                  {PROMO_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCoins(preset)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${newCoins === preset
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={newCoins}
                  onChange={(e) => setNewCoins(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>

              {/* Источник */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Источник трафика
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Instagram Reels, Telegram, YouTube..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPromoForm(false)
                    setLastCreatedLink(null)
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={createPromoLink}
                  disabled={isCreatingPromo || newCoins < 1}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingPromo ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Создание...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Создать ссылку
                    </>
                  )}
                </button>
              </div>

              {/* Показ созданной ссылки */}
              {lastCreatedLink && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Check className="w-5 h-5" />
                    Ссылка создана! Скопируй и отправь:
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-green-200">
                    <code className="text-sm text-orange-600 truncate flex-1 font-mono">
                      {lastCreatedLink}
                    </code>
                    <button
                      onClick={() => copyToClipboard(lastCreatedLink, 'last-created')}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copiedId === 'last-created' ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Promo List */}
          {promoLoading ? (
            <div className="text-center py-12 text-gray-500">Загрузка...</div>
          ) : promoLinks.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Нет промо-ссылок</p>
              <button
                onClick={() => setShowPromoForm(true)}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Создать первую
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {promoLinks.map(link => {
                const linkStats = getPromoStats(link.id)

                return (
                  <div
                    key={link.id}
                    className={`bg-white border rounded-xl p-4 transition-all ${link.is_active
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-gray-200 opacity-50'
                      }`}
                  >
                    {/* Header row */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                            {link.code}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold">
                            <Gift className="w-4 h-4" />
                            {link.coins_amount} монет
                          </span>
                          {!link.is_active && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs">
                              Неактивна
                            </span>
                          )}
                        </div>

                        {link.description && (
                          <p className="text-sm text-gray-600">
                            📍 {link.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(buildPromoUrl(link.code), link.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Копировать ссылку"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => togglePromoActive(link.id, link.is_active)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${link.is_active
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                            }`}
                        >
                          {link.is_active ? 'Выкл' : 'Вкл'}
                        </button>
                        <button
                          onClick={() => deletePromoLink(link.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Link row - ВСЕГДА показываем */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                      <code className="text-xs text-orange-600 truncate flex-1 font-mono">
                        {buildPromoUrl(link.code)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(buildPromoUrl(link.code), `link-${link.id}`)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      >
                        {copiedId === `link-${link.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Активаций:</span>
                        <span className="text-sm font-bold text-green-600">{linkStats.total_claims}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Выдано:</span>
                        <span className="text-sm font-bold text-amber-600">{linkStats.total_coins}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
