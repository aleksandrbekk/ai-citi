import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image,
  Palette,
  User,
  Type,
  Layers,
  Sparkles
} from 'lucide-react'
import {
  getCarouselStyleById,
  getCarouselStyleByStyleId,
  createCarouselStyle,
  updateCarouselStyle,
  type CarouselStyleInput
} from '@/lib/carouselStylesApi'
import { STYLES_INDEX, STYLE_CONFIGS } from '@/lib/carouselStyles'

// Cloudinary config (same as PhotoUploader)
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'

export default function StyleEditor() {
  const { id, styleId: builtinStyleId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = id === 'new'
  const isBuiltin = !!builtinStyleId

  // Секции (раскрытие/скрытие)
  const [sections, setSections] = useState({
    basic: true,
    avatar: true,
    examples: true,
    person: false,
    colors: false,
    typography: false,
    cards: false,
    decorations: false,
    templates: true
  })

  // Basic info
  const [styleId, setStyleId] = useState('')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎨')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState<'universal' | 'female' | 'male'>('universal')
  const [previewColor, setPreviewColor] = useState('#FF5A1F')
  const [isActive, setIsActive] = useState(true)

  // Avatar/Preview image
  const [previewImage, setPreviewImage] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Example images (9 штук)
  const [exampleImages, setExampleImages] = useState<string[]>([])
  const [uploadingExample, setUploadingExample] = useState<number | null>(null)

  // Person settings
  const [personScale, setPersonScale] = useState('85% of frame width')
  const [personPosition, setPersonPosition] = useState('RIGHT or LEFT 40% of frame')
  const [personLighting, setPersonLighting] = useState('studio lighting, soft shadows')
  const [personAesthetic, setPersonAesthetic] = useState('clean, professional, modern 2026')

  // Colors
  const [colorBgPrimary, setColorBgPrimary] = useState('#FFFFFF')
  const [colorBgSecondary, setColorBgSecondary] = useState('#F5F5F5')
  const [colorAccentPrimary, setColorAccentPrimary] = useState('#FF5A1F')
  const [colorAccentSecondary, setColorAccentSecondary] = useState('#06B6D4')
  const [colorTextPrimary, setColorTextPrimary] = useState('#1A1A1A')
  const [colorTextSecondary, setColorTextSecondary] = useState('#666666')

  // Typography
  const [typoStyle, setTypoStyle] = useState('bold modern sans-serif')
  const [typoHeadline, setTypoHeadline] = useState('bold, black')
  const [typoBody, setTypoBody] = useState('medium weight')

  // Cards
  const [cardsStyle, setCardsStyle] = useState('glassmorphism')
  const [cardsBlur, setCardsBlur] = useState('20px backdrop blur')
  const [cardsBorderRadius, setCardsBorderRadius] = useState('24px')

  // Decorations
  const [decorElements, setDecorElements] = useState('subtle glow effects')

  // Slide Templates (промпты для n8n)
  const DEFAULT_STYLE_PROMPT = `ВИЗУАЛЬНЫЙ СТИЛЬ:
Чистый минималистичный дизайн в стиле Apple. Стеклянные карточки с blur эффектом.

ЦВЕТА:
- Фон: светлый градиент от белого к голубоватому
- Акцент: оранжевый #FF5A1F
- Текст: тёмно-серый #1A1A1A

ТИПОГРАФИКА:
- Заголовки: жирный современный sans-serif
- Текст: средний вес, хорошая читаемость

ЧЕЛОВЕК НА ФОТО:
- Масштаб: 85% ширины кадра
- Позиция: справа или слева 40% кадра
- Освещение: студийное, мягкие тени
- Эстетика: чистый, профессиональный, современный 2026

ДЕКОРАЦИИ:
- Мягкие glow эффекты
- Стеклянные карточки с закруглёнными углами 24px
- Тонкие белые бордеры`
  const [stylePrompt, setStylePrompt] = useState(DEFAULT_STYLE_PROMPT)

  // Content System Prompt теперь глобальный — редактируется на странице /admin/carousel-settings

  // Refs for file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const exampleInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Load existing style from DB
  const { data: existingStyle, isLoading } = useQuery({
    queryKey: ['carousel-style', id],
    queryFn: () => getCarouselStyleById(id!),
    enabled: !isNew && !isBuiltin && !!id
  })

  // Check if builtin style already exists in DB
  const { data: existingBuiltinInDb } = useQuery({
    queryKey: ['carousel-style-by-styleid', builtinStyleId],
    queryFn: () => getCarouselStyleByStyleId(builtinStyleId!),
    enabled: isBuiltin && !!builtinStyleId
  })

  // Populate form when data loads
  useEffect(() => {
    if (existingStyle) {
      setStyleId(existingStyle.style_id || '')
      setName(existingStyle.name)
      setEmoji(existingStyle.emoji || '🎨')
      setDescription(existingStyle.description || '')
      setAudience(existingStyle.audience as 'universal' | 'female' | 'male' || 'universal')
      setPreviewColor(existingStyle.preview_color || '#FF5A1F')
      setPreviewImage(existingStyle.preview_image || '')
      setIsActive(existingStyle.is_active ?? true)
      setExampleImages(existingStyle.example_images || [])

      const config = existingStyle.config as Record<string, unknown> | null
      if (config) {
        // Person
        const person = config.person as Record<string, string> | undefined
        if (person) {
          setPersonScale(person.scale || '')
          setPersonPosition(person.position || '')
          setPersonLighting(person.lighting || '')
          setPersonAesthetic(person.aesthetic || '')
        }

        // Colors
        const colors = config.colors as Record<string, string> | undefined
        if (colors) {
          setColorBgPrimary(colors.background_primary || '#FFFFFF')
          setColorBgSecondary(colors.background_secondary || '#F5F5F5')
          setColorAccentPrimary(colors.accent_primary || '#FF5A1F')
          setColorAccentSecondary(colors.accent_secondary || '#06B6D4')
          setColorTextPrimary(colors.text_primary || '#1A1A1A')
          setColorTextSecondary(colors.text_secondary || '#666666')
        }

        // Typography
        const typo = config.typography as Record<string, string> | undefined
        if (typo) {
          setTypoStyle(typo.style || '')
          setTypoHeadline(typo.headline || '')
          setTypoBody(typo.body || '')
        }

        // Cards
        const cards = config.cards as Record<string, string> | undefined
        if (cards) {
          setCardsStyle(cards.style || '')
          setCardsBlur(cards.blur || '')
          setCardsBorderRadius(cards.border_radius || '')
        }

        // Decorations
        const decor = config.decorations as Record<string, string> | undefined
        if (decor) {
          setDecorElements(decor.elements || '')
        }

        // Style prompt (единый промпт стиля)
        const stylePromptValue = config.style_prompt as string | undefined
        if (stylePromptValue) {
          setStylePrompt(stylePromptValue)
        }

        // content_system_prompt убран — теперь глобальный
      }
    }
  }, [existingStyle])

  // Populate form from builtin style (hardcoded configs)
  useEffect(() => {
    if (isBuiltin && builtinStyleId) {
      // Если стиль уже есть в БД, используем его данные
      if (existingBuiltinInDb) {
        setStyleId(existingBuiltinInDb.style_id || '')
        setName(existingBuiltinInDb.name)
        setEmoji(existingBuiltinInDb.emoji || '🎨')
        setDescription(existingBuiltinInDb.description || '')
        setAudience(existingBuiltinInDb.audience as 'universal' | 'female' | 'male' || 'universal')
        setPreviewColor(existingBuiltinInDb.preview_color || '#FF5A1F')
        setPreviewImage(existingBuiltinInDb.preview_image || '')
        setIsActive(existingBuiltinInDb.is_active ?? true)
        setExampleImages(existingBuiltinInDb.example_images || [])

        const config = existingBuiltinInDb.config as Record<string, unknown> | null
        if (config) {
          const person = config.person as Record<string, string> | undefined
          if (person) {
            setPersonScale(person.scale || '')
            setPersonPosition(person.position || '')
            setPersonLighting(person.lighting || '')
            setPersonAesthetic(person.aesthetic || '')
          }
          const colors = config.colors as Record<string, string> | undefined
          if (colors) {
            setColorBgPrimary(colors.background_primary || '#FFFFFF')
            setColorBgSecondary(colors.background_secondary || '#F5F5F5')
            setColorAccentPrimary(colors.accent_primary || '#FF5A1F')
            setColorAccentSecondary(colors.accent_secondary || '#06B6D4')
            setColorTextPrimary(colors.text_primary || '#1A1A1A')
            setColorTextSecondary(colors.text_secondary || '#666666')
          }
          const typo = config.typography as Record<string, string> | undefined
          if (typo) {
            setTypoStyle(typo.style || '')
            setTypoHeadline(typo.headline || '')
            setTypoBody(typo.body || '')
          }
          const cards = config.cards as Record<string, string> | undefined
          if (cards) {
            setCardsStyle(cards.style || '')
            setCardsBlur(cards.blur || '')
            setCardsBorderRadius(cards.border_radius || '')
          }
          const decor = config.decorations as Record<string, string> | undefined
          if (decor) {
            setDecorElements(decor.elements || '')
          }
          // Style prompt (единый промпт стиля)
          const stylePromptValue = config.style_prompt as string | undefined
          if (stylePromptValue) {
            setStylePrompt(stylePromptValue)
          }
          // content_system_prompt убран — теперь глобальный
        }
        return
      }

      // Загружаем из hardcoded конфигов
      const styleMeta = STYLES_INDEX.find(s => s.id === builtinStyleId)
      const config = STYLE_CONFIGS[builtinStyleId as keyof typeof STYLE_CONFIGS]

      if (styleMeta) {
        setStyleId(styleMeta.id)
        setName(styleMeta.name)
        setEmoji(styleMeta.emoji)
        setDescription(styleMeta.description)
        setAudience(styleMeta.audience as 'universal' | 'female' | 'male')
        setPreviewColor(styleMeta.previewColor)
        setPreviewImage(`/styles/${styleMeta.id.toLowerCase()}.jpg`)
        setIsActive(true)
        // Генерируем example images
        const exampleCount = styleMeta.id === 'SOFT_PINK_EDITORIAL' ? 7 : 9
        setExampleImages(
          Array.from({ length: exampleCount }, (_, i) => `/styles/${styleMeta.id}/example_${i + 1}.jpeg`)
        )
      }

      if (config) {
        const person = config.person as Record<string, string> | undefined
        if (person) {
          setPersonScale(person.scale || '')
          setPersonPosition(person.position || '')
          setPersonLighting(person.lighting || '')
          setPersonAesthetic(person.aesthetic || '')
        }
        const colors = config.colors as Record<string, string> | undefined
        if (colors) {
          setColorBgPrimary(colors.background_primary || '#FFFFFF')
          setColorBgSecondary(colors.background_secondary || '#F5F5F5')
          setColorAccentPrimary(colors.accent_primary || '#FF5A1F')
          setColorAccentSecondary(colors.accent_secondary || '#06B6D4')
          setColorTextPrimary(colors.text_primary || '#1A1A1A')
          setColorTextSecondary(colors.text_secondary || '#666666')
        }
        const typo = config.typography as Record<string, string> | undefined
        if (typo) {
          setTypoStyle(typo.style || '')
          setTypoHeadline(typo.headline || '')
          setTypoBody(typo.body || '')
        }
        const cards = config.cards as Record<string, string> | undefined
        if (cards) {
          setCardsStyle(cards.style || '')
          setCardsBlur(cards.blur || '')
          setCardsBorderRadius(cards.border_radius || '')
        }
        const decor = config.decorations as Record<string, string> | undefined
        if (decor) {
          setDecorElements(decor.elements || '')
        }
        // Style prompt
        const stylePromptValue = (config as any).style_prompt as string | undefined
        if (stylePromptValue) {
          setStylePrompt(stylePromptValue)
        }
      }
    }
  }, [isBuiltin, builtinStyleId, existingBuiltinInDb])

  // Upload to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: formData }
    )

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.secure_url
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const url = await uploadToCloudinary(file)
      setPreviewImage(url)
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('Ошибка загрузки аватарки')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Handle example image upload
  const handleExampleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingExample(index)
    try {
      const url = await uploadToCloudinary(file)
      setExampleImages(prev => {
        const newImages = [...prev]
        newImages[index] = url
        return newImages
      })
    } catch (error) {
      console.error('Example upload error:', error)
      alert('Ошибка загрузки превью')
    } finally {
      setUploadingExample(null)
    }
  }

  // Remove example image
  const removeExampleImage = (index: number) => {
    setExampleImages(prev => {
      const newImages = [...prev]
      newImages.splice(index, 1)
      return newImages
    })
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const generatedStyleId = styleId || name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')

      const styleData: CarouselStyleInput = {
        style_id: generatedStyleId,
        name,
        emoji,
        description,
        audience,
        preview_color: previewColor,
        preview_image: previewImage,
        is_active: isActive,
        example_images: exampleImages.filter(Boolean),
        config: {
          id: generatedStyleId,
          name,
          description,
          audience,
          colors: {
            background_primary: colorBgPrimary,
            background_secondary: colorBgSecondary,
            accent_primary: colorAccentPrimary,
            accent_secondary: colorAccentSecondary,
            text_primary: colorTextPrimary,
            text_secondary: colorTextSecondary
          },
          typography: {
            style: typoStyle,
            headline: typoHeadline,
            body: typoBody
          },
          cards: {
            style: cardsStyle,
            blur: cardsBlur,
            border_radius: cardsBorderRadius
          },
          person: {
            scale: personScale,
            position: personPosition,
            lighting: personLighting,
            aesthetic: personAesthetic
          },
          decorations: {
            elements: decorElements
          },
          prompt_blocks: {},
          style_prompt: stylePrompt
          // content_system_prompt убран — теперь глобальный в carousel_settings
        }
      }

      if (isNew) {
        return createCarouselStyle(styleData)
      } else if (isBuiltin) {
        // Для встроенных стилей: обновляем если есть в БД, иначе создаём
        if (existingBuiltinInDb) {
          return updateCarouselStyle(existingBuiltinInDb.id, styleData)
        } else {
          return createCarouselStyle(styleData)
        }
      } else {
        return updateCarouselStyle(id!, styleData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel-styles'] })
      queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] })
      navigate('/admin/carousel-styles')
    }
  })

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ maxHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/carousel-styles')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900">{isNew ? 'Новый стиль' : 'Редактирование'}</h1>
              <p className="text-xs text-gray-500">Полный редактор стиля карусели</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Active toggle */}
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${isActive
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-100 text-gray-400'
                }`}
            >
              {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm">{isActive ? 'Активен' : 'Скрыт'}</span>
            </button>
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
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-20">
        {/* SECTION: Basic Info */}
        <Section
          title="Основная информация"
          icon={<Palette className="w-4 h-4" />}
          isOpen={sections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Мой стиль"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Style ID</label>
              <input
                type="text"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="AUTO_GENERATED"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Оставьте пустым для автогенерации</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Эмодзи</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center text-2xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цвет превью</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={previewColor}
                  onChange={(e) => setPreviewColor(e.target.value)}
                  className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={previewColor}
                  onChange={(e) => setPreviewColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Аудитория</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'universal' | 'female' | 'male')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="universal">👥 Универсальная</option>
                <option value="female">👩 Женская</option>
                <option value="male">👨 Мужская</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание стиля для пользователей"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </Section>

        {/* SECTION: Avatar */}
        <Section
          title="Аватарка стиля"
          icon={<Image className="w-4 h-4" />}
          isOpen={sections.avatar}
          onToggle={() => toggleSection('avatar')}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-400 transition-colors"
              style={{ backgroundColor: previewColor + '20' }}
              onClick={() => avatarInputRef.current?.click()}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              ) : previewImage ? (
                <img src={previewImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                  <span className="text-xs text-gray-400">Загрузить</span>
                </div>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Аватарка отображается в списке стилей и при выборе стиля пользователем.
              </p>
              {previewImage && (
                <button
                  onClick={() => setPreviewImage('')}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Удалить аватарку
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* SECTION: Example Images (9) */}
        <Section
          title="Превью карусели (9 шт)"
          icon={<Layers className="w-4 h-4" />}
          isOpen={sections.examples}
          onToggle={() => toggleSection('examples')}
        >
          <p className="text-sm text-gray-600 mb-4">
            Загрузите до 9 примеров карусели в этом стиле. Они показываются пользователям при выборе стиля.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(9)].map((_, index) => (
              <div
                key={index}
                className="aspect-[4/5] rounded-lg border-2 border-dashed border-gray-300 overflow-hidden relative group cursor-pointer hover:border-orange-400 transition-colors"
                onClick={() => exampleInputRefs.current[index]?.click()}
              >
                {uploadingExample === index ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : exampleImages[index] ? (
                  <>
                    <img
                      src={exampleImages[index]}
                      alt={`Example ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeExampleImage(index)
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs">{index + 1}</span>
                  </div>
                )}
                <input
                  ref={(el) => { exampleInputRefs.current[index] = el }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleExampleUpload(e, index)}
                  className="hidden"
                />
              </div>
            ))}
          </div>
        </Section>

        {/* SECTION: Person Settings */}
        <Section
          title="Настройки персонажа"
          icon={<User className="w-4 h-4" />}
          isOpen={sections.person}
          onToggle={() => toggleSection('person')}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Масштаб (scale)</label>
              <input
                type="text"
                value={personScale}
                onChange={(e) => setPersonScale(e.target.value)}
                placeholder="85% of frame width"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Позиция (position)</label>
              <input
                type="text"
                value={personPosition}
                onChange={(e) => setPersonPosition(e.target.value)}
                placeholder="RIGHT or LEFT 40% of frame"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Освещение (lighting)</label>
              <input
                type="text"
                value={personLighting}
                onChange={(e) => setPersonLighting(e.target.value)}
                placeholder="studio lighting, soft shadows"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Эстетика (aesthetic)</label>
              <input
                type="text"
                value={personAesthetic}
                onChange={(e) => setPersonAesthetic(e.target.value)}
                placeholder="clean, professional, modern 2026"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </Section>

        {/* SECTION: Colors */}
        <Section
          title="Цвета"
          icon={<Palette className="w-4 h-4" />}
          isOpen={sections.colors}
          onToggle={() => toggleSection('colors')}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ColorInput label="Фон основной" value={colorBgPrimary} onChange={setColorBgPrimary} />
            <ColorInput label="Фон вторичный" value={colorBgSecondary} onChange={setColorBgSecondary} />
            <ColorInput label="Акцент основной" value={colorAccentPrimary} onChange={setColorAccentPrimary} />
            <ColorInput label="Акцент вторичный" value={colorAccentSecondary} onChange={setColorAccentSecondary} />
            <ColorInput label="Текст основной" value={colorTextPrimary} onChange={setColorTextPrimary} />
            <ColorInput label="Текст вторичный" value={colorTextSecondary} onChange={setColorTextSecondary} />
          </div>
        </Section>

        {/* SECTION: Typography */}
        <Section
          title="Типографика"
          icon={<Type className="w-4 h-4" />}
          isOpen={sections.typography}
          onToggle={() => toggleSection('typography')}
        >
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Стиль</label>
              <input
                type="text"
                value={typoStyle}
                onChange={(e) => setTypoStyle(e.target.value)}
                placeholder="bold modern sans-serif"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Заголовки</label>
              <input
                type="text"
                value={typoHeadline}
                onChange={(e) => setTypoHeadline(e.target.value)}
                placeholder="bold, black"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Основной текст</label>
              <input
                type="text"
                value={typoBody}
                onChange={(e) => setTypoBody(e.target.value)}
                placeholder="medium weight"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </Section>

        {/* SECTION: Cards */}
        <Section
          title="Стиль карточек"
          icon={<Layers className="w-4 h-4" />}
          isOpen={sections.cards}
          onToggle={() => toggleSection('cards')}
        >
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Стиль</label>
              <input
                type="text"
                value={cardsStyle}
                onChange={(e) => setCardsStyle(e.target.value)}
                placeholder="glassmorphism"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blur</label>
              <input
                type="text"
                value={cardsBlur}
                onChange={(e) => setCardsBlur(e.target.value)}
                placeholder="20px backdrop blur"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius</label>
              <input
                type="text"
                value={cardsBorderRadius}
                onChange={(e) => setCardsBorderRadius(e.target.value)}
                placeholder="24px"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </Section>

        {/* SECTION: Decorations */}
        <Section
          title="Декорации"
          icon={<Sparkles className="w-4 h-4" />}
          isOpen={sections.decorations}
          onToggle={() => toggleSection('decorations')}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Элементы декора</label>
            <input
              type="text"
              value={decorElements}
              onChange={(e) => setDecorElements(e.target.value)}
              placeholder="subtle glow effects, floating particles"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </Section>

        {/* SECTION: Slide Templates (MAIN PROMPTS) */}
        <Section
          title="Промпты слайдов (для n8n)"
          icon={<Sparkles className="w-4 h-4 text-orange-500" />}
          isOpen={sections.templates}
          onToggle={() => toggleSection('templates')}
          highlight
        >
          {/* Подсказка о глобальном промпте */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>💡 Системный промпт</strong> (генерация текста) теперь глобальный для всех стилей.
              <br />
              <a href="/admin/carousel-settings" className="text-blue-600 underline hover:text-blue-800">
                Редактировать глобальный промпт →
              </a>
            </p>
          </div>

          {/* Единый промпт визуального стиля */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-purple-600 flex items-center gap-2">
                🎨 Промпт визуального стиля
              </label>
              <button
                type="button"
                onClick={() => setStylePrompt(DEFAULT_STYLE_PROMPT)}
                className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
              >
                Сбросить к стандартному
              </button>
            </div>
            <p className="text-xs text-purple-600 mb-3">
              Полное описание визуального стиля карусели. Опишите цвета, типографику, позицию персоны, декорации и т.д.
            </p>
            <textarea
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              rows={14}
              placeholder="Опишите визуальный стиль карусели..."
              className="w-full px-3 py-2 border border-purple-300 rounded-lg font-mono text-sm resize-y bg-white"
            />
          </div>
        </Section>


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

// Collapsible Section Component
function Section({
  title,
  icon,
  isOpen,
  onToggle,
  highlight,
  children
}: {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${highlight ? 'ring-2 ring-orange-200' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// Color Input Component
function ColorInput({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 border border-gray-200 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 border border-gray-200 rounded font-mono text-xs"
        />
      </div>
    </div>
  )
}
