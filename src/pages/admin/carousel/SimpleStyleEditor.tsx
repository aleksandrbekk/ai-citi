import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import {
  getCarouselStyleById,
  createCarouselStyle,
  updateCarouselStyle,
  type CarouselStyleInput
} from '@/lib/supabase'
import { STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'

export default function SimpleStyleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'

  // Basic info
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎨')
  const [description, setDescription] = useState('')
  const [previewColor, setPreviewColor] = useState('#FF5A1F')

  // The 4 main slide templates (the actual prompts)
  const [hookTemplate, setHookTemplate] = useState('')
  const [contentTemplate, setContentTemplate] = useState('')
  const [ctaTemplate, setCtaTemplate] = useState('')
  const [viralTemplate, setViralTemplate] = useState('')

  // Person settings (simple)
  const [personScale, setPersonScale] = useState('85% of frame width')
  const [personPosition, setPersonPosition] = useState('RIGHT or LEFT 40% of frame')
  const [personLighting, setPersonLighting] = useState('studio lighting, soft shadows')
  const [personAesthetic, setPersonAesthetic] = useState('clean, professional, modern 2026')

  const [copied, setCopied] = useState<string | null>(null)

  // Load existing style
  const { data: existingStyle, isLoading } = useQuery({
    queryKey: ['carousel-style', id],
    queryFn: () => getCarouselStyleById(id!),
    enabled: !isNew && !!id
  })

  useEffect(() => {
    if (existingStyle) {
      setName(existingStyle.name)
      setEmoji(existingStyle.emoji || '🎨')
      setDescription(existingStyle.description || '')
      setPreviewColor(existingStyle.preview_color || '#FF5A1F')

      const config = existingStyle.config as any
      if (config?.slide_templates) {
        setHookTemplate(config.slide_templates.HOOK || '')
        setContentTemplate(config.slide_templates.CONTENT || '')
        setCtaTemplate(config.slide_templates.CTA || '')
        setViralTemplate(config.slide_templates.VIRAL || '')
      }
      if (config?.person) {
        setPersonScale(config.person.scale || '')
        setPersonPosition(config.person.position || '')
        setPersonLighting(config.person.lighting || '')
        setPersonAesthetic(config.person.aesthetic || '')
      }
    }
  }, [existingStyle])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const styleId = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')

      const styleData: CarouselStyleInput = {
        style_id: isNew ? styleId : existingStyle?.style_id || styleId,
        name,
        emoji,
        description,
        audience: 'universal',
        preview_color: previewColor,
        config: {
          id: styleId,
          name,
          description,
          audience: 'universal',
          colors: {
            background_primary: "#FFFFFF",
            accent_primary: previewColor,
            text_primary: "#1A1A1A"
          },
          typography: {
            style: "bold modern sans-serif",
            headline: "bold, black",
            body: "medium weight"
          },
          cards: {
            style: "glassmorphism",
            blur: "20px backdrop blur",
            border_radius: "24px"
          },
          person: {
            scale: personScale,
            position: personPosition,
            lighting: personLighting,
            aesthetic: personAesthetic
          },
          decorations: {
            elements: "subtle glow effects"
          },
          prompt_blocks: {},
          slide_templates: {
            HOOK: hookTemplate,
            CONTENT: contentTemplate,
            CTA: ctaTemplate,
            VIRAL: viralTemplate
          }
        },
        example_images: [],
        is_active: true
      }

      if (isNew) {
        return createCarouselStyle(styleData)
      } else {
        return updateCarouselStyle(id!, styleData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel-styles'] })
      navigate('/admin/carousel-styles')
    }
  })

  // Import from existing style
  const importFromStyle = (styleId: StyleId) => {
    const config = STYLE_CONFIGS[styleId]
    if (config) {
      setHookTemplate(config.slide_templates.HOOK || '')
      setContentTemplate(config.slide_templates.CONTENT || '')
      setCtaTemplate(config.slide_templates.CTA || '')
      setViralTemplate(config.slide_templates.VIRAL || '')
      setPersonScale(config.person.scale || '')
      setPersonPosition(config.person.position || '')
      setPersonLighting(config.person.lighting || '')
      setPersonAesthetic(config.person.aesthetic || '')
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/carousel-styles')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900">{isNew ? 'Новый стиль' : 'Редактирование'}</h1>
              <p className="text-xs text-gray-500">Простой режим — только промпты</p>
            </div>
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Основное</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Название</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Мой стиль"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Эмодзи</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-2xl"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Цвет</label>
                <input
                  type="color"
                  value={previewColor}
                  onChange={(e) => setPreviewColor(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание стиля"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Import from existing */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            Импорт из готового стиля
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STYLE_CONFIGS).map((styleId) => (
              <button
                key={styleId}
                onClick={() => importFromStyle(styleId as StyleId)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 rounded-lg text-sm transition-colors"
              >
                {STYLE_CONFIGS[styleId as StyleId].name}
              </button>
            ))}
          </div>
        </div>

        {/* Person Settings */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Настройки персонажа</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Масштаб</label>
              <input
                type="text"
                value={personScale}
                onChange={(e) => setPersonScale(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Позиция</label>
              <input
                type="text"
                value={personPosition}
                onChange={(e) => setPersonPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Освещение</label>
              <input
                type="text"
                value={personLighting}
                onChange={(e) => setPersonLighting(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Эстетика</label>
              <input
                type="text"
                value={personAesthetic}
                onChange={(e) => setPersonAesthetic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Slide Templates */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Промпты слайдов</h2>

          {/* HOOK */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-orange-600">🎣 HOOK (первый слайд)</label>
              <button
                onClick={() => copyToClipboard(hookTemplate, 'hook')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copied === 'hook' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              value={hookTemplate}
              onChange={(e) => setHookTemplate(e.target.value)}
              rows={8}
              placeholder="Промпт для первого слайда (зацепка)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-y"
            />
          </div>

          {/* CONTENT */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-blue-600">📝 CONTENT (контентные слайды)</label>
              <button
                onClick={() => copyToClipboard(contentTemplate, 'content')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copied === 'content' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              value={contentTemplate}
              onChange={(e) => setContentTemplate(e.target.value)}
              rows={8}
              placeholder="Промпт для контентных слайдов..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-y"
            />
          </div>

          {/* CTA */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-green-600">📢 CTA (призыв к действию)</label>
              <button
                onClick={() => copyToClipboard(ctaTemplate, 'cta')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copied === 'cta' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              value={ctaTemplate}
              onChange={(e) => setCtaTemplate(e.target.value)}
              rows={8}
              placeholder="Промпт для слайда с призывом..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-y"
            />
          </div>

          {/* VIRAL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-purple-600">🚀 VIRAL (вирусный слайд)</label>
              <button
                onClick={() => copyToClipboard(viralTemplate, 'viral')}
                className="text-gray-400 hover:text-gray-600"
              >
                {copied === 'viral' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <textarea
              value={viralTemplate}
              onChange={(e) => setViralTemplate(e.target.value)}
              rows={8}
              placeholder="Промпт для вирального слайда (поделись)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm resize-y"
            />
          </div>
        </div>

        {/* Save button at bottom */}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 font-medium"
        >
          {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Сохранить стиль
        </button>
      </div>
    </div>
  )
}
