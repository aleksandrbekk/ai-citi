import { Settings } from 'lucide-react'

export function AdminSettings() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
      </div>
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
        <p className="text-zinc-400">Настройки админ-панели — скоро</p>
      </div>
    </div>
  )
}
