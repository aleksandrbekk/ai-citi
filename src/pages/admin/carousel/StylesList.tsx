import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Search,
  Palette
} from 'lucide-react'
import {
  getAllCarouselStyles,
  deleteCarouselStyle,
  duplicateCarouselStyle,
  updateCarouselStyle,
  type CarouselStyleDB
} from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselStylesList() {
  const navigate = useNavigate()
  const [styles, setStyles] = useState<CarouselStyleDB[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadStyles = async () => {
    setIsLoading(true)
    const data = await getAllCarouselStyles()
    setStyles(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadStyles()
  }, [])

  const handleDelete = async (style: CarouselStyleDB) => {
    if (!confirm(`Удалить стиль "${style.name}"?`)) return

    const success = await deleteCarouselStyle(style.id)
    if (success) {
      loadStyles()
    }
  }

  const handleDuplicate = async (style: CarouselStyleDB) => {
    const newStyleId = `${style.style_id}_COPY_${Date.now()}`
    const newName = `${style.name} (копия)`
    const user = getTelegramUser()

    const duplicate = await duplicateCarouselStyle(
      style.id,
      newStyleId,
      newName,
      user?.id
    )

    if (duplicate) {
      loadStyles()
      navigate(`/admin/carousel-styles/${duplicate.id}`)
    }
  }

  const handleToggleActive = async (style: CarouselStyleDB) => {
    const updated = await updateCarouselStyle(style.id, {
      is_active: !style.is_active
    })
    if (updated) {
      loadStyles()
    }
  }

  const filteredStyles = styles.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.style_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6" />
          Стили каруселей
        </h2>
        <button
          onClick={() => navigate('/admin/carousel-styles/new')}
          className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать стиль
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Поиск по названию или ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#94A3B8]">Загрузка...</div>
      ) : filteredStyles.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-[#1E293B] rounded-full flex items-center justify-center mx-auto mb-4">
            <Palette className="w-10 h-10 text-[#64748B]" />
          </div>
          <p className="text-[#94A3B8] mb-6">
            {searchQuery ? 'Ничего не найдено' : 'Нет стилей'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/admin/carousel-styles/new')}
              className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
            >
              Создать первый стиль
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStyles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              onEdit={() => navigate(`/admin/carousel-styles/${style.id}`)}
              onDelete={() => handleDelete(style)}
              onDuplicate={() => handleDuplicate(style)}
              onToggleActive={() => handleToggleActive(style)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StyleCard({
  style,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive
}: {
  style: CarouselStyleDB
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleActive: () => void
}) {
  return (
    <div className={`bg-[#1E293B] border rounded-lg p-4 flex items-center gap-4 transition-all ${
      style.is_active ? 'border-[#334155]' : 'border-[#334155]/50 opacity-60'
    }`}>
      {/* Drag Handle */}
      <div className="text-[#64748B] cursor-grab">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Preview */}
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: style.preview_color + '20' }}
      >
        {style.emoji || '🎨'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-white truncate">{style.name}</h3>
          {!style.is_active && (
            <span className="px-2 py-0.5 bg-[#64748B]/20 text-[#94A3B8] text-xs rounded">
              Скрыт
            </span>
          )}
        </div>
        <p className="text-sm text-[#94A3B8] truncate">{style.style_id}</p>
        {style.description && (
          <p className="text-xs text-[#64748B] truncate mt-1">{style.description}</p>
        )}
      </div>

      {/* Audience Badge */}
      <div className="flex-shrink-0">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          style.audience === 'universal'
            ? 'bg-[#3B82F6]/20 text-[#60A5FA]'
            : style.audience === 'female'
            ? 'bg-pink-500/20 text-pink-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {style.audience === 'universal' ? '👥 Универсальный' :
           style.audience === 'female' ? '👩 Женский' : '👨 Мужской'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onToggleActive}
          className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#94A3B8] hover:text-white"
          title={style.is_active ? 'Скрыть' : 'Показать'}
        >
          {style.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onDuplicate}
          className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#94A3B8] hover:text-white"
          title="Дублировать"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#94A3B8] hover:text-white"
          title="Редактировать"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-[#94A3B8] hover:text-red-400"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
