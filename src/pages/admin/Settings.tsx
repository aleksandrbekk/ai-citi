import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Bot, Zap, MessageSquare, Users, Sliders } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChatSettings {
  id: string
  system_prompt: string
  active_model: string
  fallback_model: string
  premium_model: string
  free_model: string
  temperature: number
  max_tokens: number
  welcome_message: string
  limit_basic: number
  limit_pro: number
  limit_vip: number
  limit_elite: number
  history_enabled: boolean
  max_history: number
  max_retries: number
  updated_at: string
}

const MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (умнее, дороже)', tier: 'premium' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (быстрее, дешевле)', tier: 'fast' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (самая быстрая)', tier: 'fast' },
]

export function AdminSettings() {
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'prompt' | 'models' | 'limits' | 'advanced'>('prompt')

  // Форма
  const [form, setForm] = useState({
    system_prompt: '',
    premium_model: 'gemini-2.5-pro',
    free_model: 'gemini-2.5-flash',
    fallback_model: 'gemini-2.5-flash',
    temperature: 0.8,
    max_tokens: 8192,
    welcome_message: '',
    limit_basic: 10,
    limit_pro: 50,
    limit_vip: 100,
    limit_elite: 300,
    history_enabled: true,
    max_history: 20,
    max_retries: 2
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error

      setSettings(data)
      setForm({
        system_prompt: data.system_prompt || '',
        premium_model: data.premium_model || 'gemini-2.5-pro',
        free_model: data.free_model || 'gemini-2.5-flash',
        fallback_model: data.fallback_model || 'gemini-2.5-flash',
        temperature: data.temperature || 0.8,
        max_tokens: data.max_tokens || 8192,
        welcome_message: data.welcome_message || '',
        limit_basic: data.limit_basic || 10,
        limit_pro: data.limit_pro || 50,
        limit_vip: data.limit_vip || 100,
        limit_elite: data.limit_elite || 300,
        history_enabled: data.history_enabled ?? true,
        max_history: data.max_history || 20,
        max_retries: data.max_retries || 2
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings?.id) return
    
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('chat_settings')
        .update({
          ...form,
          active_model: form.premium_model, // для совместимости
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const tabs = [
    { id: 'prompt', label: 'Промпт', icon: Bot },
    { id: 'models', label: 'Модели', icon: Zap },
    { id: 'limits', label: 'Лимиты', icon: Users },
    { id: 'advanced', label: 'Расширенные', icon: Sliders },
  ]

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Настройки AI-чата</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          ✅ Настройки сохранены! Изменения применятся сразу.
        </div>
      )}

      {/* Табы */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        
        {/* Таб: Промпт */}
        {activeTab === 'prompt' && (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Bot className="w-4 h-4" />
                System Prompt (инструкции для AI)
              </label>
              <textarea
                value={form.system_prompt}
                onChange={(e) => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                rows={15}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y font-mono text-sm"
                placeholder="Введите промпт для AI..."
              />
              <p className="mt-2 text-sm text-gray-500">
                Скопируй <code className="bg-gray-100 px-1 rounded">instruction='...'</code> из Google Agent Designer
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                Приветственное сообщение
              </label>
              <textarea
                value={form.welcome_message}
                onChange={(e) => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                placeholder="Первое сообщение бота при открытии чата..."
              />
            </div>
          </div>
        )}

        {/* Таб: Модели */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-1">Как работает:</h3>
              <p className="text-sm text-blue-700">
                Premium пользователи (Pro, VIP, Elite) получают умную модель. 
                Бесплатные пользователи (Basic) — быструю модель.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                <label className="block text-sm font-medium text-orange-800 mb-2">
                  🌟 Модель для Premium
                </label>
                <select
                  value={form.premium_model}
                  onChange={(e) => setForm(f => ({ ...f, premium_model: e.target.value }))}
                  className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-orange-600">Pro, VIP, Elite тарифы</p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⚡ Модель для Free
                </label>
                <select
                  value={form.free_model}
                  onChange={(e) => setForm(f => ({ ...f, free_model: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">Basic тариф (бесплатный)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Запасная модель (если основная не работает)
              </label>
              <select
                value={form.fallback_model}
                onChange={(e) => setForm(f => ({ ...f, fallback_model: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Таб: Лимиты */}
        {activeTab === 'limits' && (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-1">Лимиты сообщений в день:</h3>
              <p className="text-sm text-yellow-700">
                Сколько сообщений может отправить пользователь каждого тарифа за сутки
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic (бесплатный)
                </label>
                <input
                  type="number"
                  value={form.limit_basic}
                  onChange={(e) => setForm(f => ({ ...f, limit_basic: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min={0}
                />
                <p className="mt-1 text-xs text-gray-500">сообщений/день</p>
              </div>

              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Pro
                </label>
                <input
                  type="number"
                  value={form.limit_pro}
                  onChange={(e) => setForm(f => ({ ...f, limit_pro: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  min={0}
                />
                <p className="mt-1 text-xs text-blue-600">сообщений/день</p>
              </div>

              <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  VIP
                </label>
                <input
                  type="number"
                  value={form.limit_vip}
                  onChange={(e) => setForm(f => ({ ...f, limit_vip: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  min={0}
                />
                <p className="mt-1 text-xs text-purple-600">сообщений/день</p>
              </div>

              <div className="p-4 border border-yellow-300 rounded-lg bg-yellow-50">
                <label className="block text-sm font-medium text-yellow-700 mb-2">
                  👑 Elite
                </label>
                <input
                  type="number"
                  value={form.limit_elite}
                  onChange={(e) => setForm(f => ({ ...f, limit_elite: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-yellow-400 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white"
                  min={0}
                />
                <p className="mt-1 text-xs text-yellow-600">сообщений/день</p>
              </div>
            </div>
          </div>
        )}

        {/* Таб: Расширенные */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature (креативность)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={form.temperature}
                    onChange={(e) => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-mono">{form.temperature}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  0 = точные ответы, 1 = креативные ответы
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens (длина ответа)
                </label>
                <input
                  type="number"
                  value={form.max_tokens}
                  onChange={(e) => setForm(f => ({ ...f, max_tokens: parseInt(e.target.value) || 1024 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min={256}
                  max={32768}
                  step={256}
                />
                <p className="mt-1 text-xs text-gray-500">Рекомендуется 4096-8192</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">История сообщений</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.history_enabled}
                    onChange={(e) => setForm(f => ({ ...f, history_enabled: e.target.checked }))}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Включить память (бот помнит контекст)</span>
                </label>
              </div>

              {form.history_enabled && (
                <div className="w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимум сообщений в памяти
                  </label>
                  <input
                    type="number"
                    value={form.max_history}
                    onChange={(e) => setForm(f => ({ ...f, max_history: parseInt(e.target.value) || 10 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    min={5}
                    max={50}
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество попыток при ошибке
                </label>
                <input
                  type="number"
                  value={form.max_retries}
                  onChange={(e) => setForm(f => ({ ...f, max_retries: parseInt(e.target.value) || 2 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min={1}
                  max={5}
                />
              </div>
            </div>
          </div>
        )}

        {/* Информация и кнопки */}
        <div className="mt-6 pt-6 border-t">
          {settings?.updated_at && (
            <div className="text-sm text-gray-500 mb-4">
              Последнее обновление: {new Date(settings.updated_at).toLocaleString('ru-RU')}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Сохранить все настройки
            </button>

            <button
              onClick={loadSettings}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
