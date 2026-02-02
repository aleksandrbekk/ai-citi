import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePosts } from '@/hooks/usePosts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay } from 'date-fns'
import { ru } from 'date-fns/locale'

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

export default function PosterCalendar() {
  const navigate = useNavigate()
  const { getPosts } = usePosts()
  const [posts, setPosts] = useState<Post[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Проверка доступа
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    let userId: number | null = null
    if (tg?.initDataUnsafe?.user?.id) {
      userId = tg.initDataUnsafe.user.id
    } else {
      const savedUser = localStorage.getItem('tg_user')
      if (savedUser) {
        try { userId = JSON.parse(savedUser).id } catch {}
      }
    }
    if (userId !== ALLOWED_USER_ID) {
      navigate('/')
    }
  }, [navigate])

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setIsLoading(true)
    const data = await getPosts()
    setPosts(data)
    setIsLoading(false)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Добавляем дни предыдущего месяца для заполнения недели
  const firstDayOfWeek = getDay(monthStart)
  const daysBeforeMonth = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    daysBeforeMonth.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), -i))
  }

  // Добавляем дни следующего месяца для заполнения недели
  const lastDayOfWeek = getDay(monthEnd)
  const daysAfterMonth = []
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    daysAfterMonth.push(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), i))
  }

  const allDays = [...daysBeforeMonth, ...daysInMonth, ...daysAfterMonth]

  const getPostsForDate = (date: Date) => {
    return posts.filter(post => {
      if (!post.scheduled_at && !post.created_at) return false
      const postDate = post.scheduled_at ? new Date(post.scheduled_at) : new Date(post.created_at)
      return isSameDay(postDate, date)
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500'
      case 'scheduled':
        return 'bg-orange-500'
      case 'draft':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
    setSelectedDate(null)
  }

  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentDate)) {
      setSelectedDate(day)
    }
  }

  const selectedPosts = selectedDate ? getPostsForDate(selectedDate) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/tools/poster')} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Календарь постов</h1>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : (
        <>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
              <div key={index} className="text-center text-xs text-gray-500 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, index) => {
              const dayPosts = getPostsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square p-2 rounded-lg transition-colors relative
                    ${isCurrentMonth ? 'hover:bg-gray-100' : 'opacity-30'}
                    ${isToday ? 'ring-2 ring-orange-500' : ''}
                    ${isSelected ? 'bg-orange-500/20' : 'bg-white border border-gray-200'}
                  `}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  {dayPosts.length > 0 && (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {dayPosts.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(post.status)}`}
                          title={`${post.status}: ${post.caption || 'Без текста'}`}
                        />
                      ))}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-gray-500">+{dayPosts.length - 3}</div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 justify-center mt-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Опубликован</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Запланирован</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span>Черновик</span>
            </div>
          </div>

          {/* Selected Date Posts */}
          {selectedDate && selectedPosts.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4">
                Посты на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
              </h3>
              <div className="space-y-3">
                {selectedPosts.map(post => (
                  <div key={post.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
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
                    </div>
                    <p className="text-sm text-gray-900 mb-1">
                      {post.caption || 'Без текста'}
                    </p>
                    {post.scheduled_at && (
                      <p className="text-xs text-gray-500">
                        {format(new Date(post.scheduled_at), 'HH:mm', { locale: ru })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDate && selectedPosts.length === 0 && (
            <div className="mt-6 text-center text-gray-500">
              Нет постов на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

