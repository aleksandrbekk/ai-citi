import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Users, Edit, Trash2, Link2, BarChart3, ArrowLeft, ClipboardList } from 'lucide-react'
import { useUserQuizzes, type UserQuiz } from '@/hooks/useUserQuizzes'
import { getTelegramUser } from '@/lib/telegram'
import { toast } from 'sonner'

// Пока квизы доступны только админам
const ADMIN_IDS = [643763835, 190202791, 1762872372]

export default function QuizDashboard() {
  const navigate = useNavigate()
  const { quizzes, isLoading, createQuiz, deleteQuiz } = useUserQuizzes()
  const [isCreating, setIsCreating] = useState(false)

  const telegramUser = getTelegramUser()
  const hasAccess = telegramUser && ADMIN_IDS.includes(telegramUser.id)

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Скоро будет доступно</p>
        </div>
      </div>
    )
  }

  const handleCreate = async () => {
    setIsCreating(true)
    const result = await createQuiz('Новый квиз')
    if (result) {
      navigate(`/tools/quiz/${result.id}/edit`)
    } else {
      toast.error('Ошибка создания квиза')
    }
    setIsCreating(false)
  }

  const handleDelete = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Удалить этот квиз? Все вопросы и заявки будут потеряны.')) {
      const success = await deleteQuiz(quizId)
      if (success) {
        toast.success('Квиз удалён')
      } else {
        toast.error('Ошибка удаления')
      }
    }
  }

  const copyLink = (slug: string | null, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!slug) {
      toast.error('Сначала сохраните квиз')
      return
    }
    const url = `${window.location.origin}/q/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Ссылка скопирована!')
  }

  const totalViews = quizzes.reduce((sum, q) => sum + q.total_views, 0)
  const totalLeads = quizzes.reduce((sum, q) => sum + q.total_completions, 0)

  return (
    <div className="min-h-screen bg-[#FFF8F5]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 hover:bg-white transition-colors shadow-sm"
            aria-label="На главную"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">НЕЙРОКВИЗ</h1>
            <p className="text-sm text-gray-500">Создавайте квизы и собирайте заявки</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Создать</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Квизов</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-gray-500">Просмотры</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Заявки</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
          </div>
        </div>

        {/* Quizzes List */}
        {!isLoading && quizzes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Нет квизов</h2>
            <p className="text-gray-500 mb-6">Создайте первый квиз для сбора заявок</p>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Создать квиз
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onEdit={() => navigate(`/tools/quiz/${quiz.id}/edit`)}
                onLeads={() => navigate(`/tools/quiz/${quiz.id}/leads`)}
                onCopyLink={(e) => copyLink(quiz.slug, e)}
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
  onLeads,
  onCopyLink,
  onDelete,
}: {
  quiz: UserQuiz
  onEdit: () => void
  onLeads: () => void
  onCopyLink: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const conversion = quiz.total_views > 0
    ? ((quiz.total_completions / quiz.total_views) * 100).toFixed(0)
    : '0'

  return (
    <div
      onClick={onEdit}
      className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {/* Cover */}
        {quiz.cover_image_url ? (
          <img
            src={quiz.cover_image_url}
            alt=""
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-orange-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{quiz.title}</h3>
            {quiz.is_published ? (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex-shrink-0">
                Опубликован
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full flex-shrink-0">
                Черновик
              </span>
            )}
          </div>

          {quiz.slug && (
            <p className="text-xs text-gray-400 mb-2 truncate">/q/{quiz.slug}</p>
          )}

          {/* Metrics */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {quiz.total_views}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {quiz.total_completions}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              {conversion}%
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm hover:bg-orange-100 transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          Редактировать
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onLeads() }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cyan-50 text-cyan-600 rounded-xl text-sm hover:bg-cyan-100 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Заявки
        </button>
        <button
          onClick={onCopyLink}
          className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
          title="Копировать ссылку"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 transition-colors"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
