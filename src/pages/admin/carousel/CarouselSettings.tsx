import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { getCarouselSettings, updateCarouselSettings } from '@/lib/carouselStylesApi'

export default function CarouselSettingsPage() {
  const queryClient = useQueryClient()
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Загружаем настройки
  const { data: settings, isLoading } = useQuery({
    queryKey: ['carousel-settings'],
    queryFn: getCarouselSettings,
  })

  // Синхронизируем с формой
  useEffect(() => {
    if (settings?.global_system_prompt) {
      setGlobalPrompt(settings.global_system_prompt)
    }
  }, [settings])

  // Мутация для сохранения
  const saveMutation = useMutation({
    mutationFn: () => updateCarouselSettings(globalPrompt),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['carousel-settings'] })
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    },
  })

  const handleSave = () => {
    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-500" />
            Глобальные настройки
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Системный промпт применяется ко ВСЕМ стилям каруселей
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Сохранение...</>
          ) : saveStatus === 'saved' ? (
            <><CheckCircle className="w-5 h-5" /> Сохранено!</>
          ) : (
            <><Save className="w-5 h-5" /> Сохранить</>
          )}
        </button>
      </div>

      {/* Статус ошибки */}
      {saveStatus === 'error' && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Ошибка сохранения. Возможно, таблица carousel_settings не создана.
        </div>
      )}

      {/* Инструкция */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-800 mb-2">Как это работает</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Глобальный системный промпт</strong> — инструкции для Копирайтера (как писать текст, структура, тон)</li>
          <li>• <strong>Визуальный стиль</strong> (style_prompt) — настраивается отдельно для каждого стиля в редакторе стилей</li>
          <li>• При генерации: глобальный промпт + визуальный стиль выбранного шаблона</li>
        </ul>
      </div>

      {/* Редактор промпта */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Глобальный системный промпт для Копирайтера
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Этот промпт будет использоваться для генерации текста ВСЕХ каруселей, независимо от выбранного визуального стиля.
        </p>
        <textarea
          value={globalPrompt}
          onChange={(e) => setGlobalPrompt(e.target.value)}
          placeholder="Введите системный промпт для Копирайтера..."
          className="w-full h-[500px] px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300"
        />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{globalPrompt.length.toLocaleString()} символов</span>
          <span>Последнее обновление: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString('ru') : 'Никогда'}</span>
        </div>
      </div>

      {/* SQL для создания таблицы */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="font-semibold text-gray-700 mb-2">SQL для создания таблицы (если нужно)</h3>
        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS carousel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_system_prompt TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставить начальную запись
INSERT INTO carousel_settings (global_system_prompt)
VALUES ('')
ON CONFLICT DO NOTHING;

-- RLS (опционально)
ALTER TABLE carousel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON carousel_settings FOR SELECT USING (true);`}
        </pre>
      </div>
    </div>
  )
}
