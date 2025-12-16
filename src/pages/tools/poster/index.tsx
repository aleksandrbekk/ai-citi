import { Link } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PosterDashboard() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">НЕЙРОПОСТЕР</h1>
        <Link to="/tools/poster/create">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Новый пост
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">0</div>
          <div className="text-xs text-zinc-400">Черновики</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">0</div>
          <div className="text-xs text-zinc-400">Запланировано</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-500">0</div>
          <div className="text-xs text-zinc-400">Опубликовано</div>
        </div>
      </div>

      {/* Empty State */}
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
    </div>
  )
}

