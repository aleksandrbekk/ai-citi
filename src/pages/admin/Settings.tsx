import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Bot } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChatSettings {
  id: string
  system_prompt: string
  active_model: string
  fallback_model: string
  max_retries: number
  updated_at: string
}

export function AdminSettings() {
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Форма
  const [prompt, setPrompt] = useState('')
  const [activeModel, setActiveModel] = useState('gemini-2.5-pro')
  const [fallbackModel, setFallbackModel] = useState('gemini-2.5-flash')

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
      setPrompt(data.system_prompt || '')
      setActiveModel(data.active_model || 'gemini-2.5-pro')
      setFallbackModel(data.fallback_model || 'gemini-2.5-flash')
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
          system_prompt: prompt,
          active_model: activeModel,
          fallback_model: fallbackModel,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
      // Обновляем локальное состояние
      setSettings(prev => prev ? {
        ...prev,
        system_prompt: prompt,
        active_model: activeModel,
        fallback_model: fallbackModel,
        updated_at: new Date().toISOString()
      } : null)
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
          Настройки сохранены! Изменения применятся сразу.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Промпт */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Bot className="w-4 h-4" />
            System Prompt (инструкции для AI)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={15}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y font-mono text-sm"
            placeholder="Введите промпт для AI..."
          />
          <p className="mt-2 text-sm text-gray-500">
            Этот текст будет использоваться как системный промпт для AI-чата. 
            Можешь скопировать код из Google Agent Designer и вставить instruction сюда.
          </p>
        </div>

        {/* Модели */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Основная модель
            </label>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (умнее, дороже)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (быстрее, дешевле)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Запасная модель
            </label>
            <select
              value={fallbackModel}
              onChange={(e) => setFallbackModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </div>
        </div>

        {/* Информация */}
        {settings?.updated_at && (
          <div className="text-sm text-gray-500">
            Последнее обновление: {new Date(settings.updated_at).toLocaleString('ru-RU')}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 pt-4 border-t">
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
            Сохранить
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

      {/* Подсказка */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Как использовать:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Открой Google Agent Designer</li>
          <li>Создай или отредактируй агента</li>
          <li>Нажми "Get code"</li>
          <li>Скопируй текст из поля <code className="bg-blue-100 px-1 rounded">instruction='...'</code></li>
          <li>Вставь сюда и сохрани</li>
        </ol>
      </div>
    </div>
  )
}
