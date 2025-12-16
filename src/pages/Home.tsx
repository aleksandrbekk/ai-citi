import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, GraduationCap, Wrench, ShoppingBag, Dumbbell } from 'lucide-react'
import { Link } from 'react-router-dom'

const buildings = [
  {
    id: 'agents',
    name: 'AI FERMA',
    description: 'AI-агенты для генерации контента',
    icon: Bot,
    path: '/agents',
    color: 'from-blue-500 to-cyan-500',
    locked: false,
  },
  {
    id: 'school',
    name: 'Школа',
    description: 'Обучающие курсы',
    icon: GraduationCap,
    path: '/school',
    color: 'from-green-500 to-emerald-500',
    locked: false,
  },
  {
    id: 'gym',
    name: 'Тренажёрка',
    description: 'Трекер привычек',
    icon: Dumbbell,
    path: '/gym',
    color: 'from-orange-500 to-red-500',
    locked: true,
    requiredLevel: 3,
  },
  {
    id: 'tools',
    name: 'Инструменты',
    description: 'Полезные инструменты',
    icon: Wrench,
    path: '/tools',
    color: 'from-purple-500 to-pink-500',
    locked: true,
    requiredLevel: 5,
  },
  {
    id: 'shop',
    name: 'Магазин',
    description: 'Покупки и подписки',
    icon: ShoppingBag,
    path: '/shop',
    color: 'from-amber-500 to-yellow-500',
    locked: false,
  },
]

export function Home() {
  const { user, profile } = useAuthStore()

  return (
    <div className="p-4 space-y-6">
      {/* Приветствие */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">
          Привет, {user?.first_name || 'Нейрожитель'}! 👋
        </h1>
        <p className="text-zinc-400">
          Добро пожаловать в НЕЙРОГОРОД
        </p>
      </div>

      {/* Карта зданий */}
      <div className="grid grid-cols-2 gap-3">
        {buildings.map((building) => {
          const Icon = building.icon
          const isLocked = building.locked && (profile?.level || 1) < (building.requiredLevel || 0)

          if (isLocked) {
            return (
              <Card 
                key={building.id}
                className="bg-zinc-900/50 border-zinc-800 opacity-50"
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${building.color} flex items-center justify-center opacity-50`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-sm">{building.name}</span>
                  <span className="text-[10px] text-zinc-500">
                    🔒 Уровень {building.requiredLevel}
                  </span>
                </CardContent>
              </Card>
            )
          }

          return (
            <Link key={building.id} to={building.path}>
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${building.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-medium text-sm">{building.name}</span>
                  <span className="text-[10px] text-zinc-500">
                    {building.description}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

