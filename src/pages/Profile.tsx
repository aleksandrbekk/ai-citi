import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Pencil, TrendingUp, Calendar, Crown } from 'lucide-react'

const statIcons = {
  learning: BookOpen,
  content: Pencil,
  sales: TrendingUp,
  discipline: Calendar,
}

const statLabels = {
  learning: 'Обучение',
  content: 'Контент',
  sales: 'Продажи',
  discipline: 'Дисциплина',
}

export function Profile() {
  const { user, profile, logout } = useAuthStore()

  if (!user || !profile) {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400">Загрузка профиля...</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Карточка профиля */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Аватар */}
            <div className="relative">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.first_name || 'Avatar'}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-black">
                    {user.first_name?.[0] || '?'}
                  </span>
                </div>
              )}
              {/* Уровень */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-zinc-950 border-2 border-amber-400 flex items-center justify-center">
                <span className="text-xs font-bold text-amber-400">{profile.level}</span>
              </div>
            </div>

            {/* Информация */}
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {user.first_name} {user.last_name || ''}
              </h2>
              {user.username && (
                <p className="text-zinc-400 text-sm">@{user.username}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 capitalize">{profile.subscription}</span>
              </div>
            </div>
          </div>

          {/* Прогресс XP */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Опыт</span>
              <span className="text-zinc-300">{profile.xp} / {profile.xp_to_next_level} XP</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                style={{ width: `${(profile.xp / profile.xp_to_next_level) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Статистика Нейрончика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(profile.stats).map(([key, value]) => {
              const Icon = statIcons[key as keyof typeof statIcons]
              const label = statLabels[key as keyof typeof statLabels]
              
              return (
                <div 
                  key={key}
                  className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg"
                >
                  <Icon className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs text-zinc-400">{label}</p>
                    <p className="font-bold">{value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Кнопка выхода (для теста) */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={logout}
      >
        Выйти
      </Button>
    </div>
  )
}

