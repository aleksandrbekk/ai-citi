import { Settings } from 'lucide-react'

export function AdminSettings() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Настройки админ-панели — скоро</p>
      </div>
    </div>
  )
}
