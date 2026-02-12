import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function HomeworkReview() {
  const queryClient = useQueryClient()
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['homework-pending'],
    queryFn: async () => {
      const { data: submissions, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!submissions || submissions.length === 0) return []

      const lessonIds = [...new Set(submissions.map(s => s.lesson_id))]
      const { data: lessons } = await supabase
        .from('course_lessons')
        .select('id, title, order_index')
        .in('id', lessonIds)

      const userIds = [...new Set(submissions.map(s => s.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, username')
        .in('id', userIds)

      const enriched = await Promise.all(submissions.map(async (sub: any) => {
        const enrichedSub = {
          ...sub,
          lesson: lessons?.find(l => l.id === sub.lesson_id),
          user: users?.find(u => u.id === sub.user_id)
        }

        if (sub.quiz_answers && Object.keys(sub.quiz_answers).length > 0) {
          const questionIds = Object.keys(sub.quiz_answers)
          const { data: questions } = await supabase
            .from('lesson_quizzes')
            .select('id, question')
            .in('id', questionIds)

          const allOptionIds = Object.values(sub.quiz_answers).flat() as string[]
          const { data: options } = await supabase
            .from('quiz_options')
            .select('id, option_text, is_correct')
            .in('id', allOptionIds)

          enrichedSub.quizData = { questions, options }
        }

        return enrichedSub
      }))

      return enriched
    }
  })

  const reviewSubmission = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['homework-pending'] })
    }
  })

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    reviewSubmission.mutate({
      id,
      status,
      comment: commentInputs[id]
    })
    setCommentInputs(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-gray-900">Проверка домашних заданий</h1>
      <p className="text-gray-500 mb-6">Новых на проверке: {submissions?.length || 0}</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : submissions?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Нет домашних заданий на проверке</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions?.map((sub: any) => (
            <div key={sub.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              {/* Информация об ученике и уроке */}
              <div className="mb-4">
                <p className="font-semibold text-lg text-gray-900">
                  {sub.user?.first_name} {sub.user?.last_name}
                  {sub.user?.username && (
                    <span className="text-gray-400 font-normal ml-2">@{sub.user.username}</span>
                  )}
                </p>
                <p className="text-orange-500 font-medium">
                  Урок {sub.lesson?.order_index}: {sub.lesson?.title}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Отправлено: {new Date(sub.created_at).toLocaleString('ru-RU')}
                </p>
              </div>

              {/* Ответ ученика */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">Ответ ученика:</p>
                <p className="text-gray-900 whitespace-pre-wrap">{sub.answer_text}</p>
              </div>

              {/* Ответы на квиз */}
              {sub.quiz_answers && sub.quizData && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-400 mb-3">Ответы на тест:</p>
                  <div className="space-y-3">
                    {Object.entries(sub.quiz_answers).map(([questionId, optionIds]: [string, any]) => {
                      const question = sub.quizData.questions?.find((q: any) => q.id === questionId)
                      const selectedOptions = sub.quizData.options?.filter((o: any) => optionIds.includes(o.id))

                      return (
                        <div key={questionId} className="border-l-2 border-orange-200 pl-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">{question?.question || 'Вопрос не найден'}</p>
                          <div className="space-y-1">
                            {selectedOptions?.map((opt: any) => (
                              <p key={opt.id} className={`text-sm ${opt.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                {opt.option_text} {opt.is_correct ? '✓' : '✗'}
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Комментарий куратора */}
              <textarea
                value={commentInputs[sub.id] || ''}
                onChange={(e) => setCommentInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                placeholder="Комментарий для ученика (необязательно)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                rows={2}
              />

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(sub.id, 'rejected')}
                  disabled={reviewSubmission.isPending}
                  className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-semibold text-lg hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Незачёт
                </button>
                <button
                  onClick={() => handleReview(sub.id, 'approved')}
                  disabled={reviewSubmission.isPending}
                  className="flex-1 py-3 bg-green-50 border border-green-200 text-green-600 rounded-xl font-semibold text-lg hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Зачёт
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
