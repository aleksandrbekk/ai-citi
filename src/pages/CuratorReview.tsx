import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CuratorReview() {
  const queryClient = useQueryClient()
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  // Загрузить ДЗ на проверке
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['curator-homework'],
    queryFn: async () => {
      // Сначала получаем ДЗ
      const { data: submissions, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching submissions:', error)
        throw error
      }
      
      if (!submissions || submissions.length === 0) {
        return []
      }
      
      // Подгружаем данные для каждого ДЗ
      const enriched = await Promise.all(submissions.map(async (sub: any) => {
        // Получаем урок
        const { data: lesson } = await supabase
          .from('course_lessons')
          .select('id, title, order_index, module_id')
          .eq('id', sub.lesson_id)
          .single()
        
        // Получаем модуль
        let module = null
        if (lesson?.module_id) {
          const { data: mod } = await supabase
            .from('course_modules')
            .select('title, order_index')
            .eq('id', lesson.module_id)
            .single()
          module = mod
        }
        
        // Получаем пользователя
        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, username')
          .eq('id', sub.user_id)
          .single()
        
        // Подгружаем quiz данные если есть
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
    }
  })

  // Проверка ДЗ
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-b from-white to-gray-50/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-bold">Проверка ДЗ</h1>
          <p className="text-xs text-gray-400">На проверке: {submissions?.length || 0}</p>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">Загрузка...</p>
        ) : submissions?.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500">Все задания проверены!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions?.map((sub: any) => (
              <div key={sub.id} className="glass-card rounded-2xl p-4">
                {/* Инфо об ученике */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold">
                    {sub.users?.first_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {sub.users?.first_name} {sub.users?.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{sub.users?.username || 'нет username'}
                    </p>
                  </div>
                </div>

                {/* Урок */}
                <div className="bg-zinc-800 rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-400">
                    Модуль {sub.course_lessons?.course_modules?.order_index}: {sub.course_lessons?.course_modules?.title}
                  </p>
                  <p className="text-sm text-orange-400">
                    Урок {sub.course_lessons?.order_index}: {sub.course_lessons?.title}
                  </p>
                </div>

                {/* Текстовый ответ */}
                {sub.answer_text && (
                  <div className="bg-zinc-800 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-400 mb-1">Ответ:</p>
                    <p className="text-sm whitespace-pre-wrap">{sub.answer_text}</p>
                  </div>
                )}

                {/* Ответы на квиз */}
                {sub.quiz_answers && sub.quizData && (
                  <div className="bg-zinc-800 rounded-xl p-3 mb-3">
                    <p className="text-xs text-gray-400 mb-2">Тест:</p>
                    <div className="space-y-2">
                      {Object.entries(sub.quiz_answers).map(([questionId, optionIds]: [string, any]) => {
                        const question = sub.quizData.questions?.find((q: any) => q.id === questionId)
                        const selectedOptions = sub.quizData.options?.filter((o: any) => optionIds.includes(o.id))
                        
                        return (
                          <div key={questionId} className="border-l-2 border-zinc-600 pl-2">
                            <p className="text-xs text-gray-500">{question?.question}</p>
                            {selectedOptions?.map((opt: any) => (
                              <p key={opt.id} className={`text-sm ${opt.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                                • {opt.option_text} {opt.is_correct ? '✓' : '✗'}
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
                  className="w-full p-3 bg-zinc-800 rounded-xl text-sm placeholder-zinc-600 resize-none mb-3"
                  rows={2}
                />

                {/* Кнопки */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(sub.id, 'rejected')}
                    disabled={reviewMutation.isPending}
                    className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Незачёт
                  </button>
                  <button
                    onClick={() => handleReview(sub.id, 'approved')}
                    disabled={reviewMutation.isPending}
                    className="flex-1 py-3 bg-green-500/20 text-green-400 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Зачёт
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

