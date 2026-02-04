import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, Palette, Image, Download, AlertCircle, Settings, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getAllCarouselStyles,
  deleteCarouselStyle,
  updateCarouselStyle,
  seedDefaultStyles,
  type CarouselStyleDB
} from '@/lib/carouselStylesApi'
import { STYLES_INDEX } from '@/lib/carouselStyles'

export default function CarouselStylesList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CarouselStyleDB | null>(null)

  // Загружаем стили из БД
  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['admin-carousel-styles'],
    queryFn: getAllCarouselStyles,
  })

  // Инициализация стандартных стилей
  const handleSeedStyles = async () => {
    setIsSeeding(true)
    setSeedError(null)
    try {
      const result = await seedDefaultStyles()
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] })
      } else if (result.errors.length > 0) {
        setSeedError(result.errors.join('; '))
      }
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] })
      }
    } catch (error) {
      setSeedError(error instanceof Error ? error.message : 'Не удалось создать стили')
    } finally {
      setIsSeeding(false)
    }
  }

  // Мутация для переключения активности
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateCarouselStyle(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] }),
  })

  // Мутация для удаления
  const deleteMutation = useMutation({
    mutationFn: deleteCarouselStyle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-carousel-styles'] })
      toast.success('Стиль удалён')
      setDeleteTarget(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления')
      setDeleteTarget(null)
    },
  })

  const handleDelete = (style: CarouselStyleDB) => {
    setDeleteTarget(style)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id)
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
    <div className="max-w-4xl mx-auto px-4">
      {/* Header - Mobile Optimized */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Стили каруселей
            </h1>
            <p className="text-xs text-gray-500">
              {styles.length} стилей • {styles.filter(s => s.is_active).length} активных
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/admin/carousel-settings')}
            className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
            title="Глобальный промпт"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/admin/carousel-styles/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        </div>
      </div>

      {/* Ошибка при инициализации */}
      {seedError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <strong>Ошибка:</strong> {seedError}
          <p className="mt-2 text-xs">
            Возможно, таблица carousel_styles не создана. Создайте её в Supabase Dashboard:
            <br />
            <code className="bg-red-100 px-1 rounded">
              https://supabase.com/dashboard/project/debcwvxlvozjlqkhnauy/sql/new
            </code>
          </p>
        </div>
      )}

      {/* Список стилей */}
      {styles.length === 0 ? (
        <>
          {/* Информация о fallback режиме */}
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  Используются встроенные стили
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Пользователи видят 5 стандартных стилей. Для редактирования в админке нужно создать таблицу в БД и нажать "Загрузить 5 стандартных".
                </p>
              </div>
            </div>
          </div>

          {/* Показываем захардкоженные стили с кнопками редактирования */}
          <div className="space-y-3 mb-6">
            {STYLES_INDEX.map((styleMeta) => (
              <div
                key={styleMeta.id}
                className="bg-white border-2 border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/admin/carousel-styles/builtin/${styleMeta.id}`)}
              >
                {/* Основной контент */}
                <div className="flex gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: styleMeta.previewColor + '15' }}
                  >
                    {styleMeta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 text-base">{styleMeta.name}</h3>
                      <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-medium rounded-full">
                        АКТИВЕН
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        styleMeta.audience === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {styleMeta.audience === 'female' ? 'Женский' : 'Универсальный'}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium">Встроенный</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{styleMeta.description}</p>
                  </div>
                </div>

                {/* Действия */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">
                    {styleMeta.id}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/admin/carousel-styles/builtin/${styleMeta.id}`)
                    }}
                    className="p-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-all"
                    title="Редактировать"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Кнопка для инициализации БД */}
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <p className="text-gray-500 mb-4">Хотите редактировать стили? Инициализируйте БД:</p>
            <button
              onClick={handleSeedStyles}
              disabled={isSeeding}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2 justify-center mx-auto"
            >
              {isSeeding ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Создание...</>
              ) : (
                <><Download className="w-4 h-4" /> Загрузить в БД для редактирования</>
              )}
            </button>
          </div>
        </>
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
      <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
        <p className="text-sm text-cyan-800">
          <strong>Подсказка:</strong> Отключённые стили не показываются пользователям.
          Изменения применяются сразу.
        </p>
      </div>

      {/* Модальное окно подтверждения удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Удалить стиль?</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить стиль <strong>"{deleteTarget.name}"</strong>?
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Удаление...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Удалить</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
      className={`bg-white border-2 rounded-2xl p-4 transition-all cursor-pointer hover:shadow-md ${
        style.is_active ? 'border-gray-100' : 'border-gray-100 opacity-50'
      }`}
      onClick={onEdit}
    >
      {/* Основной контент */}
      <div className="flex gap-4">
        {/* Превью */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: style.preview_color + '15' }}
        >
          {(style.preview_image || style.example_images?.[0]) ? (
            <img
              src={style.preview_image || style.example_images?.[0]}
              alt={style.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{style.emoji || '🎨'}</span>
          )}
        </div>

        {/* Информация */}
        <div className="flex-1 min-w-0">
          {/* Название и бейджи */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-gray-900 text-base">{style.name}</h3>
            {!style.is_active && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-medium rounded-full">
                СКРЫТ
              </span>
            )}
          </div>

          {/* Аудитория */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              style.audience === 'female'
                ? 'bg-pink-100 text-pink-600'
                : style.audience === 'male'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {style.audience === 'female' ? 'Женский' :
                style.audience === 'male' ? 'Мужской' : 'Универсальный'}
            </span>
            {exampleCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Image className="w-3 h-3" />
                {exampleCount}
              </span>
            )}
          </div>

          {/* Описание */}
          <p className="text-sm text-gray-500 line-clamp-1">{style.description}</p>
        </div>
      </div>

      {/* Действия - отдельная строка */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">
          {style.style_id}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Вкл/Выкл */}
          <button
            onClick={onToggle}
            disabled={isToggling}
            className={`p-2 rounded-xl transition-all ${
              style.is_active
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={style.is_active ? 'Отключить' : 'Включить'}
          >
            {style.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Редактировать */}
          <button
            onClick={onEdit}
            className="p-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-all"
            title="Редактировать"
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Удалить */}
          <button
            onClick={onDelete}
            className="p-2 bg-red-100 text-red-500 rounded-xl hover:bg-red-200 transition-all"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
