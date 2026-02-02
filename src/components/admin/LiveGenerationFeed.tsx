import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Sparkles, RefreshCw, Palette, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface LiveGeneration {
  id: string
  user_id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  photo_url: string | null
  amount: number
  style: string
  created_at: string
  seconds_ago: number
}

// Стили каруселей для отображения
const STYLE_LABELS: Record<string, { name: string; color: string }> = {
  APPLE_GLASSMORPHISM: { name: 'Apple Glass', color: 'bg-orange-500' },
  AESTHETIC_BEIGE: { name: 'Aesthetic Beige', color: 'bg-amber-600' },
  SOFT_PINK_EDITORIAL: { name: 'Soft Pink', color: 'bg-pink-400' },
  MINIMALIST_LINE_ART: { name: 'Minimalist', color: 'bg-gray-700' },
  GRADIENT_MESH_3D: { name: 'Gradient 3D', color: 'bg-purple-500' },
  unknown: { name: 'Неизвестный', color: 'bg-gray-400' },
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${seconds} сек назад`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`
  return `${Math.floor(seconds / 86400)} дн назад`
}

function getInitials(firstName: string | null, username: string | null): string {
  if (firstName) return firstName.charAt(0).toUpperCase()
  if (username) return username.charAt(0).toUpperCase()
  return '?'
}

export default function LiveGenerationFeed() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const { data: generations, refetch, isLoading } = useQuery<LiveGeneration[]>({
    queryKey: ['live_generations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_live_generations', { p_limit: 20 })
      if (error) throw error
      return (data as LiveGeneration[]) || []
    },
    refetchInterval: 10000, // Auto-refresh каждые 10 секунд
  })

  // Обновляем время последнего обновления при получении данных
  useEffect(() => {
    if (generations) {
      setLastUpdate(new Date())
    }
  }, [generations])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  // Считаем "в процессе" (< 2 минут)
  const inProgressCount = generations?.filter(g => g.seconds_ago < 120).length || 0

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Live-лента генераций</h3>
              <p className="text-xs text-gray-500">
                Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inProgressCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 rounded-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-orange-700">{inProgressCount} активных</span>
              </div>
            )}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Обновить"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Загрузка...</p>
          </div>
        ) : generations && generations.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {generations.map((gen) => {
              const isInProgress = gen.seconds_ago < 120
              const styleInfo = STYLE_LABELS[gen.style] || STYLE_LABELS.unknown

              return (
                <div
                  key={gen.id}
                  className={`p-3 hover:bg-gray-50 transition-colors duration-200 ${isInProgress ? 'bg-orange-50/50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {gen.photo_url ? (
                        <img
                          src={gen.photo_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {getInitials(gen.first_name, gen.username)}
                          </span>
                        </div>
                      )}
                      {isInProgress && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {gen.first_name || gen.username || `ID ${gen.telegram_id}`}
                        </span>
                        {gen.username && gen.first_name && (
                          <span className="text-xs text-gray-400">@{gen.username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <Palette className="w-3 h-3 text-gray-400" />
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white ${styleInfo.color}`}>
                            {styleInfo.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">-{Math.abs(gen.amount)} монет</span>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(gen.seconds_ago)}</span>
                      </div>
                      {isInProgress && (
                        <span className="text-xs font-medium text-orange-600">В процессе</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Пока нет генераций</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Автообновление каждые 10 секунд • Показано {generations?.length || 0} последних
        </p>
      </div>
    </div>
  )
}
