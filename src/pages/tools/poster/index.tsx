import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Image, Trash2, Edit, Send, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePosts, usePublishToInstagram } from '@/hooks/usePosts'
import { toast } from 'sonner'

// ID Александра - только он имеет доступ к постеру
const ALLOWED_USER_ID = 643763835

interface Post {
  id: string
  caption: string
  status: string
  scheduled_at: string | null
  created_at: string
  post_media: { public_url: string }[]
}

// Форматирование даты в МСК
const formatDateMSK = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PosterDashboard() {
  const { getPosts, deletePost } = usePosts()
  const publishMutation = usePublishToInstagram()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Проверка доступа по Telegram ID
  const getTelegramUserId = (): number | null => {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id
    }
    const savedUser = localStorage.getItem('tg_user')
    if (savedUser) {
      try {
        return JSON.parse(savedUser).id
      } catch {
        return null
      }
    }
    return null
  }

  const currentUserId = getTelegramUserId()
  const hasAccess = currentUserId === ALLOWED_USER_ID

  useEffect(() => {
    if (hasAccess) {
      loadPosts()
    }
  }, [hasAccess])

  const loadPosts = async () => {
    setIsLoading(true)
    const data = await getPosts()
    setPosts(data)
    setIsLoading(false)
  }

  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Удалить этот пост?')) {
      const success = await deletePost(postId)
      if (success) {
        loadPosts() // Перезагружаем список
      }
    }
  }

  const handleEdit = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/tools/poster/${postId}/edit`)
  }

  const handlePublishNow = async (postId: string) => {
    if (confirm('Опубликовать пост в Instagram прямо сейчас?')) {
      try {
        await publishMutation.mutateAsync(postId)
        toast.success('Пост опубликован в Instagram!')
        loadPosts() // Перезагружаем список
      } catch (error: any) {
        toast.error('Ошибка: ' + error.message)
      }
    }
  }

  const drafts = posts.filter(p => p.status === 'draft')
  const scheduled = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')

  // Если нет доступа - показываем экран блокировки
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock size={40} className="text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
          <p className="text-gray-500 mb-6">
            Нейропостер доступен только для администраторов.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
          >
            На главную
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">НЕЙРОПОСТЕР</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/tools/poster/calendar')}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200"
            title="Календарь"
          >
            <Calendar className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => navigate('/tools/poster/create')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-xl text-white font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Новый
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-orange-500">{drafts.length}</div>
          <div className="text-xs text-gray-500">Черновики</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-cyan-500">{scheduled.length}</div>
          <div className="text-xs text-gray-500">Запланировано</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-green-500">{published.length}</div>
          <div className="text-xs text-gray-500">Опубликовано</div>
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет постов</h2>
          <p className="text-gray-500 mb-6">Создайте первый пост для Instagram</p>
          <button
            onClick={() => navigate('/tools/poster/create')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-xl text-white font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать пост
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-xl p-4 flex gap-4 relative border border-gray-200 shadow-sm">
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {post.status !== 'published' && (
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    disabled={publishMutation.isPending}
                    className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-600 disabled:opacity-50"
                    title="Опубликовать сейчас"
                  >
                    <Send size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => handleEdit(post.id, e)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <Edit size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={(e) => handleDelete(post.id, e)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} className="text-gray-600 hover:text-red-500" />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {post.post_media?.[0]?.public_url ? (
                  <img
                    src={post.post_media[0].public_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-20">
                <p className="text-sm text-gray-900 truncate">
                  {post.caption || 'Без текста'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    post.status === 'draft' ? 'bg-orange-100 text-orange-600' :
                    post.status === 'scheduled' ? 'bg-cyan-100 text-cyan-600' :
                    post.status === 'published' ? 'bg-green-100 text-green-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {post.status === 'draft' ? 'Черновик' :
                     post.status === 'scheduled' ? 'Запланирован' :
                     post.status === 'published' ? 'Опубликован' : 'Ошибка'}
                  </span>
                  {post.post_media?.length > 1 && (
                    <span className="text-xs text-gray-500">
                      {post.post_media.length} фото
                    </span>
                  )}
                </div>
                {post.scheduled_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateMSK(post.scheduled_at)} МСК
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
