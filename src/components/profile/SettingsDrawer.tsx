import { X, LogOut, Bell, Moon, Globe, ChevronRight } from 'lucide-react'
import { haptic } from '@/lib/haptic'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

export function SettingsDrawer({
  isOpen,
  onClose,
  onLogout
}: SettingsDrawerProps) {
  if (!isOpen) return null

  const settings = [
    {
      id: 'notifications',
      icon: Bell,
      label: 'Уведомления',
      value: 'Включены',
      disabled: true
    },
    {
      id: 'theme',
      icon: Moon,
      label: 'Тема',
      value: 'Светлая',
      disabled: true
    },
    {
      id: 'language',
      icon: Globe,
      label: 'Язык',
      value: 'Русский',
      disabled: true
    }
  ]

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Настройки</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Settings List */}
        <div className="px-6 py-4 space-y-2">
          {settings.map(setting => (
            <button
              key={setting.id}
              disabled={setting.disabled}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl opacity-50 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center">
                <setting.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-500">{setting.value}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}

          {/* Coming Soon Note */}
          <p className="text-xs text-gray-400 text-center py-2">
            Настройки скоро будут доступны
          </p>
        </div>

        {/* Logout Button */}
        <div className="px-6 pb-8 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              haptic.tap()
              onLogout()
            }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}
