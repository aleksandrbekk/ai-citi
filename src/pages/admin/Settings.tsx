import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Bot, Zap, MessageSquare, Users, Sliders, Info, Crown, Sparkles, Database, Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useMaintenanceMode, toggleMaintenanceMode, updateMaintenanceMessage } from '@/hooks/useMaintenanceMode'

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
  rag_enabled: boolean
  rag_engine_id: string
  updated_at: string
}

const MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Умнее, дороже', tier: 'premium' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Быстрее, дешевле', tier: 'fast' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Самая быстрая', tier: 'fast' },
]

// Компонент для числового поля без бага с 0
function NumberInput({
  value,
  onChange,
  min = 0,
  max = 99999,
  className = ''
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  className?: string
}) {
  const [localValue, setLocalValue] = useState(value.toString())

  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setLocalValue(raw)
  }

  const handleBlur = () => {
    let num = parseInt(localValue) || min
    num = Math.max(min, Math.min(max, num))
    setLocalValue(num.toString())
    onChange(num)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all ${className}`}
    />
  )
}

export function AdminSettings() {
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'prompt' | 'models' | 'limits' | 'advanced'>('prompt')

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
    max_retries: 2,
    rag_enabled: false,
    rag_engine_id: ''
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
        max_retries: data.max_retries || 2,
        rag_enabled: data.rag_enabled ?? false,
        rag_engine_id: data.rag_engine_id || ''
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
          active_model: form.premium_model,
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
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const tabs = [
    { id: 'prompt', label: 'Промпт', icon: Bot },
    { id: 'models', label: 'Модели', icon: Sparkles },
    { id: 'limits', label: 'Лимиты', icon: Users },
    { id: 'advanced', label: 'Тюнинг', icon: Sliders },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки AI-чата</h1>
          <p className="text-sm text-gray-500">Управление моделями, промптами и лимитами</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-lg">!</span>
          </div>
          <div>
            <p className="font-medium text-red-800">Ошибка</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 text-lg">✓</span>
          </div>
          <div>
            <p className="font-medium text-green-800">Сохранено!</p>
            <p className="text-sm text-green-600">Изменения применятся к следующим запросам</p>
          </div>
        </div>
      )}

      {/* Maintenance Mode Card */}
      <MaintenanceToggleCard />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-2xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer ${activeTab === tab.id
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Tab: Prompt */}
        {activeTab === 'prompt' && (
          <div className="p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Bot className="w-5 h-5 text-orange-500" />
                System Prompt
              </label>
              <textarea
                value={form.system_prompt}
                onChange={(e) => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                rows={12}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y font-mono text-sm bg-gray-50 transition-all"
                placeholder="Введите системный промпт для AI..."
              />
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Скопируй <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">instruction='...'</code> из Google Agent Designer
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Приветственное сообщение
              </label>
              <textarea
                value={form.welcome_message}
                onChange={(e) => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y transition-all"
                placeholder="Первое сообщение бота при открытии чата..."
              />
            </div>
          </div>
        )}

        {/* Tab: Models */}
        {activeTab === 'models' && (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Как работает</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Premium пользователи (Starter, Pro, Elite) получают умную модель.<br />
                    Бесплатные пользователи (Basic) — быструю модель.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Premium Model */}
              <div className="p-5 border-2 border-amber-200 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Premium модель</span>
                </div>
                <select
                  value={form.premium_model}
                  onChange={(e) => setForm(f => ({ ...f, premium_model: e.target.value }))}
                  className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer"
                >
                  {MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Starter', 'Pro', 'Elite'].map(t => (
                    <span key={t} className="px-2 py-1 bg-amber-200/50 text-amber-700 text-xs font-medium rounded-lg">{t}</span>
                  ))}
                </div>
              </div>

              {/* Free Model */}
              <div className="p-5 border border-gray-200 rounded-2xl bg-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-gray-700">Free модель</span>
                </div>
                <select
                  value={form.free_model}
                  onChange={(e) => setForm(f => ({ ...f, free_model: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white cursor-pointer"
                >
                  {MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
                  ))}
                </select>
                <div className="mt-3">
                  <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-lg">Basic</span>
                </div>
              </div>
            </div>

            {/* Fallback */}
            <div className="p-5 border border-gray-200 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Запасная модель (fallback)
              </label>
              <select
                value={form.fallback_model}
                onChange={(e) => setForm(f => ({ ...f, fallback_model: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Используется если основная модель недоступна</p>
            </div>
          </div>
        )}

        {/* Tab: Limits */}
        {activeTab === 'limits' && (
          <div className="p-6 space-y-6">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Лимиты сообщений</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Сколько сообщений может отправить пользователь каждого тарифа за сутки
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Basic */}
              <div className="p-4 border border-gray-200 rounded-2xl">
                <div className="text-center mb-3">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">BASIC</span>
                </div>
                <NumberInput
                  value={form.limit_basic}
                  onChange={(v) => setForm(f => ({ ...f, limit_basic: v }))}
                  min={0}
                  max={1000}
                  className="text-center text-lg font-semibold border-gray-200"
                />
                <p className="text-center text-xs text-gray-500 mt-2">сообщений/день</p>
              </div>

              {/* Pro */}
              <div className="p-4 border-2 border-blue-200 rounded-2xl bg-blue-50/50">
                <div className="text-center mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">PRO</span>
                </div>
                <NumberInput
                  value={form.limit_pro}
                  onChange={(v) => setForm(f => ({ ...f, limit_pro: v }))}
                  min={0}
                  max={1000}
                  className="text-center text-lg font-semibold border-blue-200 bg-white"
                />
                <p className="text-center text-xs text-blue-600 mt-2">сообщений/день</p>
              </div>

              {/* STARTER */}
              <div className="p-4 border-2 border-cyan-200 rounded-2xl bg-cyan-50/50">
                <div className="text-center mb-3">
                  <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full">STARTER</span>
                </div>
                <NumberInput
                  value={form.limit_vip}
                  onChange={(v) => setForm(f => ({ ...f, limit_vip: v }))}
                  min={0}
                  max={1000}
                  className="text-center text-lg font-semibold border-cyan-200 bg-white"
                />
                <p className="text-center text-xs text-cyan-600 mt-2">сообщений/день</p>
              </div>

              {/* Elite */}
              <div className="p-4 border-2 border-amber-300 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50">
                <div className="text-center mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xs font-semibold rounded-full">
                    <Crown className="w-3 h-3" />
                    ELITE
                  </span>
                </div>
                <NumberInput
                  value={form.limit_elite}
                  onChange={(v) => setForm(f => ({ ...f, limit_elite: v }))}
                  min={0}
                  max={10000}
                  className="text-center text-lg font-semibold border-amber-300 bg-white"
                />
                <p className="text-center text-xs text-amber-600 mt-2">сообщений/день</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Advanced */}
        {activeTab === 'advanced' && (
          <div className="p-6 space-y-6">
            {/* Temperature */}
            <div className="p-5 border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Temperature</label>
                  <p className="text-xs text-gray-500 mt-0.5">Креативность ответов AI</p>
                </div>
                <div className="w-16 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-orange-600">{form.temperature}</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={form.temperature}
                onChange={(e) => setForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0 — Точные ответы</span>
                <span>1 — Креативные</span>
              </div>
              <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <p className="text-xs text-green-700">
                    <strong>Работает!</strong> Передаётся напрямую в Gemini API
                  </p>
                </div>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="p-5 border border-gray-200 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Max Tokens</label>
              <p className="text-xs text-gray-500 mb-3">Максимальная длина ответа AI</p>
              <NumberInput
                value={form.max_tokens}
                onChange={(v) => setForm(f => ({ ...f, max_tokens: v }))}
                min={256}
                max={32768}
                className="border-gray-200"
              />
              <p className="mt-2 text-xs text-gray-500">Рекомендуется: 4096-8192</p>
            </div>

            {/* History */}
            <div className="p-5 border border-gray-200 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-semibold text-gray-900">История сообщений</label>
                  <p className="text-xs text-gray-500 mt-0.5">Бот помнит контекст разговора</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, history_enabled: !f.history_enabled }))}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${form.history_enabled ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.history_enabled ? 'left-6' : 'left-1'
                    }`} />
                </button>
              </div>

              {form.history_enabled && (
                <div className="pt-4 border-t">
                  <label className="block text-sm text-gray-700 mb-2">Максимум сообщений в памяти</label>
                  <NumberInput
                    value={form.max_history}
                    onChange={(v) => setForm(f => ({ ...f, max_history: v }))}
                    min={5}
                    max={50}
                    className="w-32 border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Retries */}
            <div className="p-5 border border-gray-200 rounded-2xl">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Попытки при ошибке</label>
              <p className="text-xs text-gray-500 mb-3">Сколько раз пытаться, если модель не отвечает</p>
              <NumberInput
                value={form.max_retries}
                onChange={(v) => setForm(f => ({ ...f, max_retries: v }))}
                min={1}
                max={5}
                className="w-32 border-gray-200"
              />
            </div>

            {/* RAG Settings */}
            <div className="p-5 border-2 border-cyan-200 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Database className="w-5 h-5 text-cyan-600" />
                    RAG режим (Agent Builder)
                  </label>
                  <p className="text-xs text-cyan-600 mt-0.5">Ответы на основе загруженных документов (покрывается кредитом ฿32k)</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, rag_enabled: !f.rag_enabled }))}
                  className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${form.rag_enabled ? 'bg-cyan-500' : 'bg-gray-300'
                    }`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.rag_enabled ? 'left-6' : 'left-1'
                    }`} />
                </button>
              </div>

              {form.rag_enabled && (
                <div className="pt-4 border-t border-cyan-200">
                  <label className="block text-sm text-gray-700 mb-2">Engine ID (из Agent Builder)</label>
                  <input
                    type="text"
                    value={form.rag_engine_id}
                    onChange={(e) => setForm(f => ({ ...f, rag_engine_id: e.target.value }))}
                    placeholder="assistant-search"
                    className="w-full px-4 py-3 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all bg-white font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-cyan-600">
                    Создайте Engine в <a href="https://console.cloud.google.com/gen-app-builder/engines" target="_blank" rel="noopener" className="underline">Agent Builder Console</a>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {settings?.updated_at && (
              <p className="text-xs text-gray-500">
                Обновлено: {new Date(settings.updated_at).toLocaleString('ru-RU')}
              </p>
            )}

            <div className="flex gap-3 ml-auto">
              <button
                onClick={loadSettings}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Обновить</span>
              </button>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MaintenanceToggleCard() {
  const { isMaintenanceEnabled, message } = useMaintenanceMode()
  const [localMsg, setLocalMsg] = useState(message)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalMsg(message)
  }, [message])

  const handleToggle = async () => {
    setSaving(true)
    await toggleMaintenanceMode(!isMaintenanceEnabled)
    setSaving(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await updateMaintenanceMessage(localMsg)
    setSaving(false)
  }

  return (
    <div className={`mb-6 p-5 rounded-2xl border transition-colors ${isMaintenanceEnabled
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-gray-200'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMaintenanceEnabled
              ? 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/20'
              : 'bg-gray-100'
            }`}>
            <Wrench className={`w-5 h-5 ${isMaintenanceEnabled ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Тех. работы</h3>
            <p className="text-xs text-gray-500">Заглушка для всех кроме админов</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative w-12 h-7 rounded-full transition-colors ${isMaintenanceEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
        >
          <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isMaintenanceEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
        </button>
      </div>

      {isMaintenanceEnabled && (
        <div className="mt-4 pt-4 border-t border-orange-200/60">
          <label className="text-xs text-gray-500 mb-1.5 block">Текст для пользователей:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={localMsg}
              onChange={(e) => setLocalMsg(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={handleSave}
              disabled={saving || localMsg === message}
              className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
            Активно — пользователи видят заглушку
          </div>
        </div>
      )}
    </div>
  )
}
