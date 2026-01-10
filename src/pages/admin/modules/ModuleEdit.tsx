import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useModule, useUpdateModule, useCreateModule } from '../../../hooks/admin/useModules'
import { useCreateLesson, useDuplicateLesson, useDeleteLesson } from '../../../hooks/admin/useLessons'
import { ArrowLeft, Plus, Copy, Trash2 } from 'lucide-react'

export function ModuleEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const { data, isLoading } = useModule(id || '', { enabled: !isNew })
  const updateModule = useUpdateModule()
  const createModule = useCreateModule()
  const createLesson = useCreateLesson()
  const duplicateLesson = useDuplicateLesson()
  const deleteLesson = useDeleteLesson()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [orderIndex, setOrderIndex] = useState(0)
  const [minTariff, setMinTariff] = useState<'standard' | 'platinum'>('standard')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (data?.module && !isNew) {
      setTitle(data.module.title)
      setDescription(data.module.description || '')
      setOrderIndex(data.module.order_index)
      setMinTariff(data.module.min_tariff as 'standard' | 'platinum')
      setIsActive(data.module.is_active)
    }
  }, [data, isNew])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const moduleData = {
      title,
      description: description || null,
      order_index: orderIndex,
      min_tariff: minTariff,
      is_active: isActive,
    }

    try {
      if (isNew) {
        const created = await createModule.mutateAsync(moduleData)
        navigate(`/admin/mlm/modules/${created.id}`)
      } else {
        await updateModule.mutateAsync({ id: id!, data: moduleData })
      }
    } catch (error) {
      console.error('Ошибка сохранения модуля:', error)
    }
  }

  const handleAddLesson = async () => {
    if (!id || isNew) return

    try {
      const newLesson = await createLesson.mutateAsync({
        module_id: id,
        title: 'Новый урок',
        description: null,
        order_index: (data?.lessons.length || 0) + 1,
        video_url: null,
        has_homework: false,
        homework_description: null,
      })

      navigate(`/admin/mlm/modules/${id}/lessons/${newLesson.id}`)
    } catch (error) {
      console.error('Ошибка создания урока:', error)
    }
  }

  const handleDuplicateLesson = async (lessonId: string) => {
    try {
      await duplicateLesson.mutateAsync(lessonId)
    } catch (error) {
      console.error('Ошибка копирования урока:', error)
    }
  }

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!id) return

    const confirmed = window.confirm(`Удалить урок "${lessonTitle}"?`)
    if (!confirmed) return

    try {
      await deleteLesson.mutateAsync({ lessonId, moduleId: id })
    } catch (error) {
      console.error('Ошибка удаления урока:', error)
    }
  }

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/mlm/modules')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Назад к модулям
      </button>

      <h1 className="text-2xl font-bold mb-6 text-white">
        {isNew ? 'Создать модуль' : 'Редактировать модуль'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Порядок</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Минимальный тариф</label>
              <select
                value={minTariff}
                onChange={(e) => setMinTariff(e.target.value as 'standard' | 'platinum')}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-500 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-zinc-400">
              Модуль активен
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={updateModule.isPending || createModule.isPending}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {updateModule.isPending || createModule.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/mlm/modules')}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </form>

      {!isNew && data && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Уроки модуля</h2>
            <button
              onClick={handleAddLesson}
              disabled={createLesson.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={20} />
              Добавить урок
            </button>
          </div>

          <div className="space-y-2">
            {data.lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-zinc-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-white">{lesson.title}</div>
                  {lesson.description && (
                    <div className="text-sm text-zinc-400 mt-1">{lesson.description}</div>
                  )}
                  <div className="text-xs text-zinc-500 mt-2">
                    Порядок: {lesson.order_index} {lesson.has_homework && '• Домашнее задание'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicateLesson(lesson.id)}
                    disabled={duplicateLesson.isPending}
                    className="p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                    title="Копировать урок"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                    disabled={deleteLesson.isPending}
                    className="p-2 bg-zinc-700 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                    title="Удалить урок"
                  >
                    <Trash2 size={18} />
                  </button>
                  <Link
                    to={`/admin/mlm/modules/${id}/lessons/${lesson.id}`}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors inline-block"
                  >
                    Редактировать
                  </Link>
                </div>
              </div>
            ))}

            {data.lessons.length === 0 && (
              <div className="text-center py-8 text-zinc-400">
                Уроки не добавлены
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
