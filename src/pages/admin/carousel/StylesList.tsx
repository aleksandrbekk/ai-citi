import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Palette, Image } from 'lucide-react'
import { getAllCarouselStyles, deleteCarouselStyle, updateCarouselStyle, type CarouselStyleDB } from '@/lib/supabase'

export default function CarouselStylesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Загружаем стили из БД
  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['admin-carousel-styles'],
    queryFn: getAllCarouselStyles,
  })

  // Мутация для переключения активности
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateCarouselStyle(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] }),
  })

  // Мутация для удаления
  const deleteMutation = useMutation({
    mutationFn: deleteCarouselStyle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] }),
  })

  const handleDelete = (style: CarouselStyleDB) => {
    if (confirm(`Удалить стиль "${style.name}"? Это действие нельзя отменить.`)) {
      deleteMutation.mutate(style.id)
    }
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
            <Palette className="w-6 h-6 text-orange-500" />
            Стили каруселей
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {styles.length} стилей • {styles.filter(s => s.is_active).length} активных
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/carousel-styles/new')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить стиль
        </button>
      </div>

      {/* Список стилей */}
      {styles.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Стили ещё не созданы</p>
          <button
            onClick={() => navigate('/admin/carousel-styles/new')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Создать первый стиль
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              onEdit={() => navigate(`/admin/carousel-styles/${style.id}`)}
              onToggle={() => toggleMutation.mutate({ id: style.id, is_active: !style.is_active })}
              onDelete={() => handleDelete(style)}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Подсказка */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>💡 Подсказка:</strong> Отключённые стили не показываются пользователям при выборе.
          Изменения сразу применяются к генерации каруселей.
        </p>
      </div>
    </div>
  )
}

function StyleCard({
  style,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
}: {
  style: CarouselStyleDB
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isToggling: boolean
}) {
  const exampleCount = style.example_images?.length || 0

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all ${
        style.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Превью/Аватар */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: style.preview_color + '20' }}
        >
          {style.preview_image ? (
            <img src={style.preview_image} alt={style.name} className="w-full h-full object-cover" />
          ) : (
            style.emoji || '🎨'
          )}
        </div>

        {/* Информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{style.name}</h3>
            {!style.is_active && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                Скрыт
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              style.audience === 'female' ? 'bg-pink-100 text-pink-600' :
              style.audience === 'male' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {style.audience === 'female' ? '👩 Женский' :
               style.audience === 'male' ? '👨 Мужской' : '👥 Универс.'}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{style.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              {exampleCount} превью
            </span>
            <span>{style.style_id}</span>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Вкл/Выкл */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`p-2.5 rounded-lg transition-colors ${
              style.is_active
                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={style.is_active ? 'Отключить' : 'Включить'}
          >
            {style.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          {/* Редактировать */}
          <button
            onClick={onEdit}
            className="p-2.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
            title="Редактировать"
          >
            <Edit className="w-5 h-5" />
          </button>

          {/* Удалить */}
          <button
            onClick={onDelete}
            className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
            title="Удалить"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
