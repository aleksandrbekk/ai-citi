import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Calendar, Image, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePosts } from '@/hooks/usePosts'

interface Post {
  id: string
  caption: string
  status: string
  scheduled_at: string | null
  created_at: string
  post_media: { public_url: string }[]
}

export default function PosterDashboard() {
  const { getPosts, deletePost } = usePosts()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

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

  const drafts = posts.filter(p => p.status === 'draft')
  const scheduled = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">НЕЙРОПОСТЕР</h1>
        <Link to="/tools/poster/create">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Новый
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{drafts.length}</div>
          <div className="text-xs text-zinc-400">Черновики</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{scheduled.length}</div>
          <div className="text-xs text-zinc-400">Запланировано</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{published.length}</div>
          <div className="text-xs text-zinc-400">Опубликовано</div>
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="text-center py-8 text-zinc-400">Загрузка...</div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Нет постов</h2>
          <p className="text-zinc-400 mb-6">Создайте первый пост для Instagram</p>
          <Link to="/tools/poster/create">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Создать пост
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-zinc-900 rounded-xl p-4 flex gap-4 relative">
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={(e) => handleEdit(post.id, e)}
                  className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <Edit size={16} className="text-white" />
                </button>
                <button
                  onClick={(e) => handleDelete(post.id, e)}
                  className="p-2 bg-black/50 rounded-full hover:bg-red-500/70 transition-colors"
                >
                  <Trash2 size={16} className="text-white" />
                </button>
              </div>
              
              {/* Thumbnail */}
              <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                {post.post_media?.[0]?.public_url ? (
                  <img 
                    src={post.post_media[0].public_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-zinc-600" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {post.caption || 'Без текста'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    post.status === 'draft' ? 'bg-orange-500/20 text-orange-400' :
                    post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                    post.status === 'published' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {post.status === 'draft' ? 'Черновик' :
                     post.status === 'scheduled' ? 'Запланирован' :
                     post.status === 'published' ? 'Опубликован' : 'Ошибка'}
                  </span>
                  {post.post_media?.length > 1 && (
                    <span className="text-xs text-zinc-400">
                      {post.post_media.length} фото
                    </span>
                  )}
                </div>
                {post.scheduled_at && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(post.scheduled_at).toLocaleString('ru')}
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
