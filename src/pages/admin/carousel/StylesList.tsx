import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Palette,
  Download,
  Code,
  Database
} from 'lucide-react'
import {
  getAllCarouselStyles,
  deleteCarouselStyle,
  updateCarouselStyle,
  createCarouselStyle,
  type CarouselStyleDB,
  type CarouselStyleInput
} from '@/lib/supabase'
import { STYLES_INDEX, STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'

export default function CarouselStylesList() {
  const navigate = useNavigate()
  const [dbStyles, setDbStyles] = useState<CarouselStyleDB[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copyingStyle, setCopyingStyle] = useState<string | null>(null)

  const loadStyles = async () => {
    setIsLoading(true)
    const data = await getAllCarouselStyles()
    setDbStyles(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadStyles()
  }, [])

  // Копирует захардкоженный стиль в БД
  const copyHardcodedToDb = async (styleId: StyleId) => {
    setCopyingStyle(styleId)

    const meta = STYLES_INDEX.find(s => s.id === styleId)
    const config = STYLE_CONFIGS[styleId]

    if (!meta || !config) {
      setCopyingStyle(null)
      return
    }

    const styleData: CarouselStyleInput = {
      style_id: styleId,
      name: meta.name,
      emoji: meta.emoji,
      description: meta.description,
      audience: meta.audience,
      preview_color: meta.previewColor,
      config: config,
      example_images: [],
      is_active: true
    }

    const created = await createCarouselStyle(styleData)
    setCopyingStyle(null)

    if (created) {
      await loadStyles()
      navigate(`/admin/carousel-styles/${created.id}`)
    }
  }

  const handleDelete = async (style: CarouselStyleDB) => {
    if (!confirm(`Удалить стиль "${style.name}"?`)) return
    const success = await deleteCarouselStyle(style.id)
    if (success) loadStyles()
  }

  const handleToggleActive = async (style: CarouselStyleDB) => {
    const updated = await updateCarouselStyle(style.id, { is_active: !style.is_active })
    if (updated) loadStyles()
  }

  // Фильтрация
  const filteredDbStyles = dbStyles.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.style_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Захардкоженные стили, которых ещё нет в БД
  const hardcodedNotInDb = STYLES_INDEX.filter(
    meta => !dbStyles.some(db => db.style_id === meta.id)
  ).filter(meta =>
    meta.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meta.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6" />
          Стили каруселей
        </h2>
        <button
          onClick={() => navigate('/admin/carousel-styles/new')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Новый
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {/* DB Styles - редактируемые */}
          {filteredDbStyles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                В базе данных (редактируемые)
              </h3>
              <div className="space-y-2">
                {filteredDbStyles.map((style) => (
                  <DbStyleCard
                    key={style.id}
                    style={style}
                    onEdit={() => navigate(`/admin/carousel-styles/${style.id}`)}
                    onDelete={() => handleDelete(style)}
                    onToggleActive={() => handleToggleActive(style)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hardcoded Styles - нужно скопировать в БД */}
          {hardcodedNotInDb.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Встроенные стили (нажми чтобы редактировать)
              </h3>
              <div className="space-y-2">
                {hardcodedNotInDb.map((meta) => (
                  <HardcodedStyleCard
                    key={meta.id}
                    meta={meta}
                    isCopying={copyingStyle === meta.id}
                    onCopyToDb={() => copyHardcodedToDb(meta.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDbStyles.length === 0 && hardcodedNotInDb.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">Ничего не найдено</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Карточка стиля из БД
function DbStyleCard({
  style,
  onEdit,
  onDelete,
  onToggleActive
}: {
  style: CarouselStyleDB
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all ${
      style.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
    }`}>
      {/* Preview */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: style.preview_color + '20' }}
      >
        {style.emoji || '🎨'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{style.name}</h3>
          {!style.is_active && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Скрыт</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{style.style_id}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggleActive}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          title={style.is_active ? 'Скрыть' : 'Показать'}
        >
          {style.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-orange-50 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
          title="Редактировать"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Карточка захардкоженного стиля
function HardcodedStyleCard({
  meta,
  isCopying,
  onCopyToDb
}: {
  meta: { id: string; name: string; emoji: string; previewColor: string; description: string }
  isCopying: boolean
  onCopyToDb: () => void
}) {
  return (
    <button
      onClick={onCopyToDb}
      disabled={isCopying}
      className="w-full bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 hover:bg-orange-50 hover:border-orange-300 transition-all text-left disabled:opacity-50"
    >
      {/* Preview */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: meta.previewColor + '20' }}
      >
        {meta.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{meta.name}</h3>
        <p className="text-xs text-gray-500 truncate">{meta.description}</p>
      </div>

      {/* Action */}
      <div className="flex items-center gap-2 text-orange-500 flex-shrink-0">
        {isCopying ? (
          <span className="text-sm">Копирование...</span>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Скопировать в БД</span>
          </>
        )}
      </div>
    </button>
  )
}
