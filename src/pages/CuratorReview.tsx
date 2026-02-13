import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getCuratorStudents } from '@/lib/supabase'
import type { CuratorStudent } from '@/lib/supabase'
import { ArrowLeft, Check, X, Users, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

type Tab = 'homework' | 'students'

export default function CuratorReview() {
  const queryClient = useQueryClient()
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<Tab>('homework')
  const [curatorUserId, setCuratorUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Определяем текущего куратора по telegram_id
  useEffect(() => {
    const init = async () => {
      const tg = window.Telegram?.WebApp
      const savedUser = localStorage.getItem('tg_user')
      let telegramId: number | null = null

      if (tg?.initDataUnsafe?.user?.id) {
        telegramId = tg.initDataUnsafe.user.id
      } else if (savedUser) {
        try {
          telegramId = JSON.parse(savedUser).id
        } catch {}
      }

      if (!telegramId) return

      // Проверяем, является ли пользователь админом
      const ADMIN_IDS = [643763835, 190202791]
      setIsAdmin(ADMIN_IDS.includes(telegramId))

      // Находим user_id по telegram_id
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single()

      if (user) {
        setCuratorUserId(user.id)
      }
    }
    init()
  }, [])

  // Загрузить список учеников куратора
  const { data: curatorStudents } = useQuery({
    queryKey: ['curator-students', curatorUserId],
    queryFn: () => getCuratorStudents(curatorUserId!),
    enabled: !!curatorUserId,
  })

  // Загрузить ДЗ на проверке (фильтруем по ученикам куратора)
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['curator-homework', curatorUserId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('homework_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      // Если не админ и есть список учеников — фильтруем
      if (!isAdmin && curatorStudents && curatorStudents.length > 0) {
        const studentIds = curatorStudents.map(s => s.user_id)
        query = query.in('user_id', studentIds)
      } else if (!isAdmin && (!curatorStudents || curatorStudents.length === 0)) {
        // Не админ и нет учеников — пустой список
        return []
      }

      const { data: submissions, error } = await query

      if (error) {
        console.error('Error fetching submissions:', error)
        throw error
      }

      if (!submissions || submissions.length === 0) {
        return []
      }

      const enriched = await Promise.all(submissions.map(async (sub: any) => {
        const { data: lesson } = await supabase
          .from('course_lessons')
          .select('id, title, order_index, module_id')
          .eq('id', sub.lesson_id)
          .single()

        let module = null
        if (lesson?.module_id) {
          const { data: mod } = await supabase
            .from('course_modules')
            .select('title, order_index')
            .eq('id', lesson.module_id)
            .single()
          module = mod
        }

        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, username')
          .eq('id', sub.user_id)
          .single()

        let quizData = null
        if (sub.quiz_answers && Object.keys(sub.quiz_answers).length > 0) {
          const questionIds = Object.keys(sub.quiz_answers)
          const { data: questions } = await supabase
            .from('lesson_quizzes')
            .select('id, question')
            .in('id', questionIds)

          const allOptionIds = Object.values(sub.quiz_answers).flat() as string[]
          if (allOptionIds.length > 0) {
            const { data: options } = await supabase
              .from('quiz_options')
              .select('id, option_text, is_correct')
              .in('id', allOptionIds)
            quizData = { questions, options }
          }
        }

        return {
          ...sub,
          course_lessons: lesson ? { ...lesson, course_modules: module } : null,
          users: user,
          quizData
        }
      }))

      return enriched
    },
    enabled: !!curatorUserId && (isAdmin || (curatorStudents !== undefined)),
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string, status: string, comment?: string }) => {
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          status,
          curator_comment: comment || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-homework'] })
    }
  })

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewMutation.mutate({ id, status, comment: commentInputs[id] })
    setCommentInputs(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  const tabs = [
    { id: 'homework' as Tab, label: 'Проверка ДЗ', icon: ClipboardCheck },
    { id: 'students' as Tab, label: 'Мои ученики', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <Link to="/school" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="font-bold text-gray-900">Куратор</h1>
          <p className="text-xs text-gray-400">
            {activeTab === 'homework'
              ? `На проверке: ${submissions?.length || 0}`
              : `Учеников: ${curatorStudents?.length || 0}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {activeTab === 'homework' ? (
          /* ── Таб «Проверка ДЗ» ── */
          isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : submissions?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500">Все задания проверены!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions?.map((sub: any) => (
                <div key={sub.id} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
                  {/* Инфо об ученике */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {sub.users?.first_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {sub.users?.first_name} {sub.users?.last_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        @{sub.users?.username || 'нет username'}
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-gray-400">
                      {new Date(sub.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Урок */}
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-500">
                      Модуль {sub.course_lessons?.course_modules?.order_index}: {sub.course_lessons?.course_modules?.title}
                    </p>
                    <p className="text-sm font-medium text-orange-600">
                      Урок {sub.course_lessons?.order_index}: {sub.course_lessons?.title}
                    </p>
                  </div>

                  {/* Текстовый ответ */}
                  {sub.answer_text && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                      <p className="text-xs text-gray-400 mb-1">Ответ:</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{sub.answer_text}</p>
                    </div>
                  )}

                  {/* Ответы на квиз */}
                  {sub.quiz_answers && sub.quizData && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
                      <p className="text-xs text-gray-400 mb-2">Тест:</p>
                      <div className="space-y-2">
                        {Object.entries(sub.quiz_answers).map(([questionId, optionIds]: [string, any]) => {
                          const question = sub.quizData.questions?.find((q: any) => q.id === questionId)
                          const selectedOptions = sub.quizData.options?.filter((o: any) => optionIds.includes(o.id))

                          return (
                            <div key={questionId} className="border-l-2 border-orange-200 pl-2">
                              <p className="text-xs text-gray-500">{question?.question}</p>
                              {selectedOptions?.map((opt: any) => (
                                <p key={opt.id} className={`text-sm ${opt.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                  {opt.option_text} {opt.is_correct ? '✓' : '✗'}
                                </p>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Комментарий */}
                  <textarea
                    value={commentInputs[sub.id] || ''}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    placeholder="Комментарий (необязательно)"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                    rows={2}
                  />

                  {/* Кнопки */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(sub.id, 'rejected')}
                      disabled={reviewMutation.isPending}
                      className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <X size={18} /> Незачёт
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, 'approved')}
                      disabled={reviewMutation.isPending}
                      className="flex-1 py-3 bg-green-50 border border-green-200 text-green-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Check size={18} /> Зачёт
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Таб «Мои ученики» ── */
          !curatorStudents ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : curatorStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-gray-500">Нет назначенных учеников</p>
            </div>
          ) : (
            <div className="space-y-3">
              {curatorStudents.map((student: CuratorStudent) => {
                const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Без имени'
                const tariffLabel = student.tariff_slug === 'platinum' ? 'Платина' : student.tariff_slug === 'standard' ? 'Стандарт' : student.tariff_slug
                const totalDays = student.tariff_slug === 'platinum' ? 90 : 30
                let daysLeft: number | null = null
                if (student.curator_started_at) {
                  const start = new Date(student.curator_started_at)
                  const now = new Date()
                  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  daysLeft = Math.max(0, totalDays - elapsed)
                }

                return (
                  <div key={student.user_id} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                        {student.first_name?.[0] || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {student.username && (
                            <a
                              href={`https://t.me/${student.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-500 hover:text-cyan-600 underline underline-offset-2"
                            >
                              @{student.username}
                            </a>
                          )}
                          {student.email && (
                            <a
                              href={`mailto:${student.email}`}
                              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                            >
                              {student.email}
                            </a>
                          )}
                          {!student.username && !student.email && (
                            <span className="text-xs text-gray-400">ID: {student.telegram_id}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          student.tariff_slug === 'platinum'
                            ? 'bg-cyan-50 text-cyan-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {tariffLabel}
                        </span>
                      </div>
                    </div>
                    {daysLeft !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Поддержка</span>
                          <span className={daysLeft <= 5 ? 'text-red-500 font-medium' : daysLeft <= 10 ? 'text-amber-500' : 'text-cyan-600'}>
                            {daysLeft} дн. из {totalDays}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              daysLeft <= 5 ? 'bg-red-400' : daysLeft <= 10 ? 'bg-amber-400' : 'bg-cyan-400'
                            }`}
                            style={{ width: `${Math.round((daysLeft / totalDays) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!student.curator_started_at && (
                      <p className="mt-2 text-xs text-gray-400">Ещё не начал обучение</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
