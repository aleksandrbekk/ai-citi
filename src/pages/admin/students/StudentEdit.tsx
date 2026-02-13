import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useStudent,
  useUpdateStudent,
  useAllModulesWithLessons,
  useStudentLessonUnlocks,
  useStudentHwStatuses,
  useStudentSubmissions,
  useToggleLessonUnlock,
  useBulkToggleLessonUnlocks
} from '../../../hooks/admin/useStudents'
import { supabase } from '../../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Unlock, Lock, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Switch } from '../../../components/ui/switch'
import { toast } from 'sonner'

export function StudentEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useStudent(id || '')
  const updateStudent = useUpdateStudent()

  // Курс: модули + уроки
  const { data: courseData, isLoading: courseLoading } = useAllModulesWithLessons()
  const { data: lessonUnlocks, isLoading: unlocksLoading } = useStudentLessonUnlocks(id || '')
  const { data: hwStatuses, isLoading: hwLoading } = useStudentHwStatuses(id || '')
  const { data: studentSubmissions, isLoading: submissionsLoading } = useStudentSubmissions(id || '')
  const toggleUnlock = useToggleLessonUnlock()
  const bulkToggle = useBulkToggleLessonUnlocks()

  const [tariffSlug, setTariffSlug] = useState('standard')
  const [expiresAt, setExpiresAt] = useState('')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (data?.tariff) {
      setTariffSlug(data.tariff.tariff_slug)
      setExpiresAt(
        data.tariff.expires_at
          ? new Date(data.tariff.expires_at).toISOString().slice(0, 10)
          : ''
      )
    } else {
      setTariffSlug('standard')
      setExpiresAt('')
    }
  }, [data])

  // Раскрыть все модули при первой загрузке
  useEffect(() => {
    if (courseData?.modules && expandedModules.size === 0) {
      setExpandedModules(new Set(courseData.modules.map(m => m.id)))
    }
  }, [courseData])

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !data) return

    if (!tariffSlug) {
      toast.error('Выберите тариф')
      return
    }

    try {
      const { data: existingTariff } = await supabase
        .from('user_tariffs')
        .select('id')
        .eq('user_id', id)
        .maybeSingle()

      let error

      if (existingTariff) {
        const { error: updateError } = await supabase
          .from('user_tariffs')
          .update({
            tariff_slug: tariffSlug,
            expires_at: expiresAt || null
          })
          .eq('id', existingTariff.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from('user_tariffs')
          .insert({
            user_id: id,
            tariff_slug: tariffSlug,
            expires_at: expiresAt || null,
            is_active: true
          })
        error = insertError
      }

      if (error) {
        toast.error('Ошибка: ' + error.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Тариф сохранён')
      refetch()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Ошибка сохранения:', error)
      toast.error('Ошибка сохранения: ' + msg)
    }
  }

  // Вычисляем какие уроки открыты по цепочке ДЗ
  const chainUnlocked = (() => {
    const set = new Set<string>()
    if (!courseData || !hwStatuses) return set
    for (const module of courseData.modules) {
      const moduleLessons = courseData.lessons.filter(l => l.module_id === module.id)
      if (moduleLessons.length === 0) continue
      set.add(moduleLessons[0].id) // первый урок всегда открыт
      for (let i = 0; i < moduleLessons.length; i++) {
        const lesson = moduleLessons[i]
        if (!set.has(lesson.id)) break
        if (!lesson.has_homework || !!hwStatuses[lesson.id]) {
          if (i + 1 < moduleLessons.length) set.add(moduleLessons[i + 1].id)
        }
      }
    }
    return set
  })()

  // Эффективное состояние урока: (цепочка ИЛИ ручной unlock) И НЕ ручной lock
  const isLessonOpen = (lessonId: string): boolean => {
    const hasForceUnlock = !!lessonUnlocks?.unlocks?.[lessonId]
    const hasForceLock = !!lessonUnlocks?.locks?.[lessonId]
    if (hasForceLock) return false
    if (hasForceUnlock) return true
    return chainUnlocked.has(lessonId)
  }

  const handleToggleLesson = (lessonId: string, currentlyOpen: boolean) => {
    if (!id) return
    toggleUnlock.mutate({
      userId: id,
      lessonId,
      open: !currentlyOpen
    })
  }

  const handleBulkModule = (moduleId: string, open: boolean) => {
    if (!id || !courseData) return
    const lessonIds = courseData.lessons
      .filter(l => l.module_id === moduleId)
      .map(l => l.id)
    bulkToggle.mutate({ userId: id, lessonIds, open })
  }

  const handleOpenAllCourse = () => {
    if (!id || !courseData) return
    const allLessonIds = courseData.lessons.map(l => l.id)
    bulkToggle.mutate({ userId: id, lessonIds: allLessonIds, open: true })
  }

  const getHwBadge = (lessonId: string, hasHomework: boolean) => {
    if (!hasHomework) return null
    const status = hwStatuses?.[lessonId]
    if (!status) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Новое</span>
    if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">Зачёт</span>
    if (status === 'pending') return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">На проверке</span>
    if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-500">Незачёт</span>
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ученик не найден</div>
      </div>
    )
  }

  const accessLoading = courseLoading || unlocksLoading || hwLoading

  return (
    <div>
      <button
        onClick={() => navigate('/admin/mlm/students')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Назад к ученикам
      </button>

      <h1 className="text-2xl font-bold mb-1 text-gray-900">
        {data.first_name || 'Ученик'}
      </h1>
      {data.username && (
        <p className="text-gray-500 mb-6">@{data.username}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка: Информация + Тариф */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Информация</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Telegram ID</label>
                <input
                  type="text"
                  value={data.telegram_id}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Username</label>
                <input
                  type="text"
                  value={data.username || '—'}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Имя</label>
                <input
                  type="text"
                  value={data.first_name || '—'}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Тариф</label>
                <select
                  value={tariffSlug}
                  onChange={(e) => setTariffSlug(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="standard">Standard</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Дата окончания подписки</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={updateStudent.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {updateStudent.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/mlm/students')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Правая колонка: Управление доступом к урокам */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <BookOpen size={20} />
              Доступ к урокам
            </h2>
          </div>

          {accessLoading ? (
            <div className="text-center py-8 text-gray-400">Загрузка курса...</div>
          ) : courseData && courseData.modules.length > 0 ? (
            <div className="space-y-4">
              {/* Кнопка открыть всё */}
              <button
                onClick={handleOpenAllCourse}
                disabled={bulkToggle.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg text-white rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer text-sm font-medium"
              >
                <Unlock size={16} />
                Открыть все уроки курса
              </button>

              {/* Модули */}
              {courseData.modules.map(module => {
                const moduleLessons = courseData.lessons.filter(l => l.module_id === module.id)
                const isExpanded = expandedModules.has(module.id)
                const openCount = moduleLessons.filter(l => isLessonOpen(l.id)).length
                const allOpen = openCount === moduleLessons.length && moduleLessons.length > 0

                return (
                  <div key={module.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Заголовок модуля */}
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{module.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {moduleLessons.length} уроков · {openCount} открыто
                        </div>
                      </div>
                      {allOpen && (
                        <Unlock size={16} className="text-orange-500 shrink-0" />
                      )}
                    </button>

                    {/* Содержимое модуля */}
                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        {/* Кнопки массового управления */}
                        <div className="flex gap-2 p-3 bg-white border-b border-gray-100">
                          <button
                            onClick={() => handleBulkModule(module.id, true)}
                            disabled={bulkToggle.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Unlock size={12} />
                            Открыть все
                          </button>
                          <button
                            onClick={() => handleBulkModule(module.id, false)}
                            disabled={bulkToggle.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Lock size={12} />
                            Закрыть все
                          </button>
                        </div>

                        {/* Уроки */}
                        <div className="divide-y divide-gray-100">
                          {moduleLessons.map(lesson => {
                            const open = isLessonOpen(lesson.id)

                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 px-4 py-3 bg-white"
                              >
                                <Switch
                                  checked={open}
                                  onCheckedChange={() => handleToggleLesson(lesson.id, open)}
                                  disabled={toggleUnlock.isPending}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900 truncate">{lesson.title}</div>
                                </div>
                                {getHwBadge(lesson.id, lesson.has_homework)}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Модули не найдены
            </div>
          )}
        </div>
      </div>

      {/* Секция: Домашние задания ученика */}
      <div className="mt-6 bg-white/80 backdrop-blur-xl border border-white/60 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 mb-4">
          <FileText size={20} />
          Домашние задания
          {studentSubmissions && studentSubmissions.length > 0 && (
            <span className="text-sm font-normal text-gray-400">({studentSubmissions.length})</span>
          )}
        </h2>

        {submissionsLoading ? (
          <div className="text-center py-8 text-gray-400">Загрузка ДЗ...</div>
        ) : !studentSubmissions || studentSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Ученик ещё не отправлял ДЗ</div>
        ) : (
          <div className="space-y-4">
            {studentSubmissions.map((sub: any) => (
              <div key={sub.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Заголовок ДЗ */}
                <div className="flex items-center gap-3 p-4 bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    sub.status === 'approved' ? 'bg-green-100 text-green-600' :
                    sub.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-500' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {sub.status === 'approved' ? <CheckCircle2 size={16} /> :
                     sub.status === 'pending' ? <Clock size={16} /> :
                     <XCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{sub.lesson_title}</div>
                    <div className="text-xs text-gray-500">{sub.module_title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sub.status === 'approved' ? 'bg-green-100 text-green-600' :
                      sub.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-500'
                    }`}>
                      {sub.status === 'approved' ? 'Зачёт' :
                       sub.status === 'pending' ? 'На проверке' : 'Незачёт'}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Содержимое ДЗ */}
                <div className="p-4 space-y-3">
                  {/* Текстовый ответ */}
                  {sub.answer_text && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Ответ:</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{sub.answer_text}</p>
                    </div>
                  )}

                  {/* Ответы на квиз */}
                  {sub.quiz_answers && sub.quizData && Object.keys(sub.quiz_answers).length > 0 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">Ответы на тест:</p>
                      <div className="space-y-2">
                        {Object.entries(sub.quiz_answers).map(([questionId, optionIds]: [string, any]) => {
                          const question = sub.quizData.questions?.find((q: any) => q.id === questionId)
                          const selectedOptions = sub.quizData.options?.filter((o: any) => optionIds.includes(o.id))
                          return (
                            <div key={questionId} className="border-l-2 border-orange-200 pl-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">{question?.question || 'Вопрос'}</p>
                              {selectedOptions?.map((opt: any) => (
                                <p key={opt.id} className={`text-xs ${opt.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                  {opt.option_text} {opt.is_correct ? '✓' : '✗'}
                                </p>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Комментарий куратора */}
                  {sub.curator_comment && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <p className="text-xs text-orange-400 mb-1">Комментарий куратора:</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{sub.curator_comment}</p>
                    </div>
                  )}

                  {/* Файлы */}
                  {sub.answer_files && sub.answer_files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sub.answer_files.map((file: string, idx: number) => (
                        <a
                          key={idx}
                          href={file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-500 hover:text-orange-600 underline"
                        >
                          Файл {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Дата проверки */}
                  {sub.reviewed_at && (
                    <p className="text-xs text-gray-400">
                      Проверено: {new Date(sub.reviewed_at).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
