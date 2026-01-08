import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit, Trash2, BarChart3, Users, TrendingUp } from 'lucide-react'
import { useQuizzes, Quiz, useQuizAnalytics } from '@/hooks/useQuizzes'

export default function QuizzesDashboard() {
  const navigate = useNavigate()
  const { quizzes, isLoading, deleteQuiz } = useQuizzes()

  const handleDelete = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Удалить этот квиз?')) {
      await deleteQuiz(quizId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent mb-2">
              Квизы
            </h1>
            <p className="text-zinc-400">Создавайте и управляйте опросами</p>
          </div>
          <button
            onClick={() => navigate('/quizzes/builder')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
          >
            <Plus className="w-5 h-5" />
            Создать квиз
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Всего квизов</span>
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold">{quizzes.length}</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Опубликовано</span>
              <Eye className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">
              {quizzes.filter(q => q.is_published).length}
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Всего прохождений</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">
              {quizzes.reduce((sum, q) => sum + q.total_completions, 0)}
            </div>
          </div>
        </div>

        {/* Quizzes List */}
        {isLoading ? (
          <div className="text-center py-12 text-zinc-400">Загрузка...</div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-zinc-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Нет квизов</h2>
            <p className="text-zinc-400 mb-6">Создайте первый квиз для ваших подписчиков</p>
            <button
              onClick={() => navigate('/quizzes/builder')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Создать квиз
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onEdit={() => navigate(`/quizzes/builder/${quiz.id}`)}
                onView={() => navigate(`/quiz/${quiz.id}`)}
                onDelete={(e) => handleDelete(quiz.id, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuizCard({
  quiz,
  onEdit,
  onView,
  onDelete
}: {
  quiz: Quiz
  onEdit: () => void
  onView: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const navigate = useNavigate()
  const { analytics } = useQuizAnalytics(quiz.id)

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl hover:border-orange-500/30 transition-all group">
      {/* Cover Image */}
      {quiz.cover_image_url ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={quiz.cover_image_url}
            alt={quiz.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div className="absolute top-3 right-3 flex gap-2">
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
        <div className="h-48 bg-gradient-to-br from-orange-500/20 to-blue-500/20 flex items-center justify-center">
          <div className="text-4xl font-bold text-white/30">{quiz.title.charAt(0).toUpperCase()}</div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2 line-clamp-2">{quiz.title}</h3>
        {quiz.description && (
          <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{quiz.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1 text-zinc-400">
            <Eye className="w-4 h-4" />
            <span>{quiz.total_views}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="w-4 h-4" />
            <span>{quiz.total_completions}</span>
          </div>
          {analytics.completionRate > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>{analytics.completionRate.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm"
          >
            Открыть
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/quizzes/${quiz.id}/analytics`)
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            title="Аналитика"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
