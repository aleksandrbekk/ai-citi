import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  ArrowLeft,
  Palette,
  Type,
  Image,
  User,
  Sparkles,
  FileText,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  getCarouselStyleById,
  createCarouselStyle,
  updateCarouselStyle,
  type CarouselStyleDB,
  type CarouselStyleInput
} from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'

// Cloudinary config
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

// Дефолтная структура конфига
const DEFAULT_CONFIG = {
  colors: {
    background_primary: '#FFFFFF',
    background_gradient: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F7 100%)',
    accent_primary: '#FF5A1F',
    accent_secondary: '#FF8A3D',
    text_primary: '#1A1A1A',
    text_secondary: '#666666',
    card_background: 'rgba(255, 255, 255, 0.7)',
    card_border: 'rgba(255, 255, 255, 0.5)'
  },
  typography: {
    style: 'bold modern sans-serif',
    headline: 'bold, black #1A1A1A',
    body: 'medium weight, #1A1A1A',
    accent_text: 'bold, white on accent'
  },
  cards: {
    style: 'glassmorphism',
    blur: '20px backdrop blur',
    border: '1px solid rgba(255,255,255,0.5)',
    shadow: 'soft drop shadow',
    border_radius: '24px'
  },
  person: {
    scale: '85% of frame width',
    position: 'RIGHT or LEFT 40% of frame',
    lighting: 'studio lighting, soft shadows',
    aesthetic: 'clean, professional, modern 2026'
  },
  decorations: {
    elements: 'subtle glow effects, floating particles',
    '3d_objects': 'glossy 3D icons with accent colors',
    particles: 'subtle sparkles, light dust'
  },
  prompt_blocks: {
    format_prefix: 'Create a vertical portrait image, taller than wide.',
    background: '',
    cards_content: '',
    cards_headline: '',
    person_hook: '',
    person_cta: '',
    decorations_hook: '',
    cta_card: '',
    viral_elements: '',
    style_footer: ''
  },
  slide_templates: {
    HOOK: '',
    CONTENT: '',
    CTA: '',
    VIRAL: ''
  }
}

export default function CarouselStyleEditor() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [styleId, setStyleId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🎨')
  const [audience, setAudience] = useState<'universal' | 'female' | 'male'>('universal')
  const [previewColor, setPreviewColor] = useState('#FF5A1F')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [exampleImages, setExampleImages] = useState<string[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState<'basic' | 'colors' | 'typography' | 'cards' | 'person' | 'decorations' | 'prompts' | 'templates' | 'examples'>('basic')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Load existing style
  useEffect(() => {
    if (!isNew && id) {
      loadStyle(id)
    }
  }, [id, isNew])

  const loadStyle = async (styleId: string) => {
    setIsLoading(true)
    const style = await getCarouselStyleById(styleId)
    if (style) {
      setStyleId(style.style_id)
      setName(style.name)
      setDescription(style.description || '')
      setEmoji(style.emoji)
      setAudience(style.audience)
      setPreviewColor(style.preview_color)
      setPreviewImage(style.preview_image)
      setIsActive(style.is_active)
      setSortOrder(style.sort_order)
      setConfig({ ...DEFAULT_CONFIG, ...style.config as typeof DEFAULT_CONFIG })
      setExampleImages(style.example_images || [])
    } else {
      setError('Стиль не найден')
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!styleId.trim()) {
      setError('Введите ID стиля')
      return
    }
    if (!name.trim()) {
      setError('Введите название стиля')
      return
    }

    setIsSaving(true)
    setError(null)

    const user = getTelegramUser()
    const styleData: CarouselStyleInput = {
      style_id: styleId.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      name,
      description: description || null,
      emoji,
      audience,
      preview_color: previewColor,
      preview_image: previewImage,
      is_active: isActive,
      sort_order: sortOrder,
      config,
      example_images: exampleImages,
      updated_by: user?.id
    }

    let result: CarouselStyleDB | null = null

    if (isNew) {
      styleData.created_by = user?.id
      result = await createCarouselStyle(styleData)
    } else if (id) {
      result = await updateCarouselStyle(id, styleData)
    }

    setIsSaving(false)

    if (result) {
      navigate('/admin/carousel-styles')
    } else {
      setError('Не удалось сохранить стиль')
    }
  }

  const handleImageUpload = async (file: File, type: 'preview' | 'example') => {
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      formData.append('folder', 'carousel-styles')

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      const imageUrl = data.secure_url

      if (type === 'preview') {
        setPreviewImage(imageUrl)
      } else {
        setExampleImages([...exampleImages, imageUrl])
      }
    } catch {
      setError('Не удалось загрузить изображение')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const removeExampleImage = (index: number) => {
    setExampleImages(exampleImages.filter((_, i) => i !== index))
  }

  const updateConfigField = (section: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }))
  }

  const importFromExisting = (existingStyleId: StyleId) => {
    const existingConfig = STYLE_CONFIGS[existingStyleId]
    if (existingConfig) {
      setConfig({
        colors: existingConfig.colors as any,
        typography: existingConfig.typography as any,
        cards: existingConfig.cards as any,
        person: existingConfig.person as any,
        decorations: existingConfig.decorations as any,
        prompt_blocks: existingConfig.prompt_blocks as any,
        slide_templates: existingConfig.slide_templates as any
      })
      setName(existingConfig.name)
      setDescription(existingConfig.description)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <div className="text-[#94A3B8]">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0F172A] border-b border-[#334155] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/carousel-styles')}
              className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                {isNew ? 'Новый стиль' : `Редактирование: ${name}`}
              </h1>
              <p className="text-sm text-[#94A3B8]">
                {isNew ? 'Создание нового стиля карусели' : styleId}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-[#334155] flex gap-1 overflow-x-auto">
        {[
          { id: 'basic', label: 'Основное', icon: Palette },
          { id: 'colors', label: 'Цвета', icon: Palette },
          { id: 'typography', label: 'Типографика', icon: Type },
          { id: 'cards', label: 'Карточки', icon: FileText },
          { id: 'person', label: 'Персонаж', icon: User },
          { id: 'decorations', label: 'Декор', icon: Sparkles },
          { id: 'prompts', label: 'Промпты', icon: FileText },
          { id: 'templates', label: 'Шаблоны слайдов', icon: FileText },
          { id: 'examples', label: 'Примеры', icon: Image }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#3B82F6] text-white'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Basic Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6 max-w-2xl">
            {/* Import from existing */}
            {isNew && (
              <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-4">
                <label className="block text-sm font-medium text-[#94A3B8] mb-2">
                  Импортировать из существующего стиля
                </label>
                <select
                  onChange={(e) => e.target.value && importFromExisting(e.target.value as StyleId)}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
                >
                  <option value="">Выберите стиль...</option>
                  {Object.keys(STYLE_CONFIGS).map(key => (
                    <option key={key} value={key}>{STYLE_CONFIGS[key as StyleId].name}</option>
                  ))}
                </select>
              </div>
            )}

            <FormField label="ID стиля" required>
              <input
                type="text"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="APPLE_GLASSMORPHISM"
                className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
              />
              <p className="text-xs text-[#64748B] mt-1">Уникальный идентификатор (латиница, цифры, _)</p>
            </FormField>

            <FormField label="Название" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apple Glassmorphism"
                className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
              />
            </FormField>

            <FormField label="Описание">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Универсальный премиум стиль..."
                rows={3}
                className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white resize-none"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Эмодзи">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="🎨"
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white text-center text-2xl"
                />
              </FormField>

              <FormField label="Цвет превью">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={previewColor}
                    onChange={(e) => setPreviewColor(e.target.value)}
                    className="w-12 h-10 bg-[#0F172A] border border-[#334155] rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={previewColor}
                    onChange={(e) => setPreviewColor(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Целевая аудитория">
              <div className="flex gap-2">
                {[
                  { value: 'universal', label: '👥 Универсальный' },
                  { value: 'female', label: '👩 Женский' },
                  { value: 'male', label: '👨 Мужской' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAudience(opt.value as any)}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      audience === opt.value
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                        : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#3B82F6]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Порядок сортировки">
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
                />
              </FormField>

              <FormField label="Статус">
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isActive
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-[#0F172A] border-[#334155] text-[#94A3B8]'
                  }`}
                >
                  {isActive ? '✓ Активен' : 'Скрыт'}
                </button>
              </FormField>
            </div>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Цветовая палитра</h3>
            {Object.entries(config.colors).map(([key, value]) => (
              <FormField key={key} label={key.replace(/_/g, ' ')}>
                <div className="flex gap-2">
                  {!value.toString().includes('gradient') && !value.toString().includes('rgba') && (
                    <input
                      type="color"
                      value={value.toString().startsWith('#') ? value : '#FFFFFF'}
                      onChange={(e) => updateConfigField('colors', key, e.target.value)}
                      className="w-12 h-10 bg-[#0F172A] border border-[#334155] rounded-lg cursor-pointer"
                    />
                  )}
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateConfigField('colors', key, e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white font-mono text-sm"
                  />
                </div>
              </FormField>
            ))}
          </div>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Типографика</h3>
            {Object.entries(config.typography).map(([key, value]) => (
              <FormField key={key} label={key.replace(/_/g, ' ')}>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateConfigField('typography', key, e.target.value)}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
                />
              </FormField>
            ))}
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Стиль карточек</h3>
            {Object.entries(config.cards).map(([key, value]) => (
              <FormField key={key} label={key.replace(/_/g, ' ')}>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateConfigField('cards', key, e.target.value)}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white"
                />
              </FormField>
            ))}
          </div>
        )}

        {/* Person Tab */}
        {activeTab === 'person' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Настройки персонажа</h3>
            {Object.entries(config.person).map(([key, value]) => (
              <FormField key={key} label={key.replace(/_/g, ' ')}>
                <textarea
                  value={value}
                  onChange={(e) => updateConfigField('person', key, e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white resize-none"
                />
              </FormField>
            ))}
          </div>
        )}

        {/* Decorations Tab */}
        {activeTab === 'decorations' && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Декоративные элементы</h3>
            {Object.entries(config.decorations).map(([key, value]) => (
              <FormField key={key} label={key.replace(/_/g, ' ')}>
                <textarea
                  value={value}
                  onChange={(e) => updateConfigField('decorations', key, e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white resize-none"
                />
              </FormField>
            ))}
          </div>
        )}

        {/* Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Prompt-блоки для генерации</h3>
            <p className="text-sm text-[#94A3B8] mb-6">
              Эти тексты отправляются в n8n для генерации изображений. Используйте переменные: [POSE], [EMOTION], [OUTFIT_BY_TOPIC], [PROPS] и т.д.
            </p>
            {Object.entries(config.prompt_blocks).map(([key, value]) => (
              <CollapsibleSection
                key={key}
                title={key.replace(/_/g, ' ')}
                isExpanded={expandedSections.has(key)}
                onToggle={() => toggleSection(key)}
              >
                <textarea
                  value={value}
                  onChange={(e) => updateConfigField('prompt_blocks', key, e.target.value)}
                  rows={6}
                  placeholder={`Промпт для ${key}...`}
                  className="w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-lg text-white resize-none font-mono text-sm"
                />
              </CollapsibleSection>
            ))}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Шаблоны слайдов</h3>
            <p className="text-sm text-[#94A3B8] mb-6">
              Полные промпты для каждого типа слайда. Переменные: {'{HEADLINE_1}'}, {'{HEADLINE_2}'}, {'{BOTTOM_TEXT}'}, {'{TRANSITION}'} и т.д.
            </p>
            {Object.entries(config.slide_templates).map(([key, value]) => (
              <CollapsibleSection
                key={key}
                title={`Слайд: ${key}`}
                isExpanded={expandedSections.has(`template_${key}`)}
                onToggle={() => toggleSection(`template_${key}`)}
              >
                <textarea
                  value={value}
                  onChange={(e) => updateConfigField('slide_templates', key, e.target.value)}
                  rows={12}
                  placeholder={`Полный промпт для слайда ${key}...`}
                  className="w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-lg text-white resize-none font-mono text-sm"
                />
              </CollapsibleSection>
            ))}
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Примеры слайдов</h3>

            {/* Upload */}
            <div className="bg-[#1E293B] rounded-lg border border-dashed border-[#334155] p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'example')}
                className="hidden"
                id="example-upload"
                disabled={isUploadingImage}
              />
              <label
                htmlFor="example-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {isUploadingImage ? (
                  <div className="w-12 h-12 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-12 h-12 text-[#64748B]" />
                )}
                <p className="text-[#94A3B8]">
                  {isUploadingImage ? 'Загрузка...' : 'Нажмите для загрузки изображения'}
                </p>
                <p className="text-xs text-[#64748B]">PNG, JPG до 10MB</p>
              </label>
            </div>

            {/* Examples Grid */}
            {exampleImages.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {exampleImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Пример ${index + 1}`}
                      className="w-full aspect-[3/4] object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => removeExampleImage(index)}
                        className="p-2 bg-red-500 rounded-full text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-0.5 text-xs">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#94A3B8] mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children
}: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#1E293B] rounded-lg border border-[#334155] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#334155]/30 transition-colors"
      >
        <span className="font-medium capitalize">{title}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-[#334155]">
          {children}
        </div>
      )}
    </div>
  )
}
