import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { Plus, Eye, Edit, Trash2, BarChart3, Search, FileText } from 'lucide-react'

export function QuizzesList() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['quizzes', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    }
  })

  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quizzes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    }
  })

  const handleDelete = async (id: string) => {
    if (confirm('Удалить этот квиз?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Квизы</h1>
          <p className="text-zinc-400">Управление опросами и квизами</p>
        </div>
        <button
          onClick={() => navigate('/admin/quizzes/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать квиз
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Quizzes List */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-400">Загрузка...</div>
      ) : !quizzes || quizzes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-zinc-600" />
          </div>
          <p className="text-zinc-400 mb-6">Нет квизов</p>
          <button
            onClick={() => navigate('/admin/quizzes/new')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Создать первый квиз
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz: any) => (
            <div
              key={quiz.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-blue-600 transition-all"
            >
              {/* Cover */}
              {quiz.cover_image_url ? (
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={quiz.cover_image_url}
                    alt={quiz.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {quiz.is_published ? (
                      <span className="px-3 py-1 bg-green-500/80 backdrop-blur-sm rounded-full text-xs font-medium">
                        Опубликован
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-zinc-500/80 backdrop-blur-sm rounded-full text-xs font-medium">
                        Черновик
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <div className="text-4xl font-bold text-white/30">{quiz.title?.charAt(0)?.toUpperCase() || 'Q'}</div>
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">{quiz.title}</h3>
                {quiz.description && (
                  <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{quiz.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{quiz.total_views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>{quiz.total_completions || 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.location.href = `https://aiciti.pro/quiz/${quiz.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Открыть
                  </button>
                  <button
                    onClick={() => navigate(`/admin/quizzes/${quiz.id}/analytics`)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Аналитика
                  </button>
                  <button
                    onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
