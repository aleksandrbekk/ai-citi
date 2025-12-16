import { useAuthStore } from '@/store/authStore'
import { Coins, Star } from 'lucide-react'

export function Header() {
  const { profile, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !profile) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="flex items-center justify-center h-14 px-4">
          <span className="text-lg font-bold text-white">🏙️ НЕЙРОГОРОД</span>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Левая часть - уровень */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-xs font-bold text-black">{profile.level}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400">Уровень</span>
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                style={{ width: `${(profile.xp / profile.xp_to_next_level) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Правая часть - ресурсы */}
        <div className="flex items-center gap-3">
          {/* Монеты */}
          <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded-lg">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">{profile.coins}</span>
          </div>
          
          {/* Премиум монеты */}
          <div className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">{profile.premium_coins}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

