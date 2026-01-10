import { Plus } from 'lucide-react'

export function UtmTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-zinc-400">Управление UTM ссылками</span>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Создать ссылку
        </button>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
        <p className="text-zinc-500">UTM ссылки — скоро</p>
      </div>
    </div>
  )
}
