import { useState } from 'react'
import { Users, Send, BarChart3, CreditCard, Link2 } from 'lucide-react'
import { ClientsTab } from './crm/ClientsTab'
import { AllUsersTab } from './crm/AllUsersTab'
import { BroadcastTab } from './crm/BroadcastTab'
import AnalyticsTab from './crm/AnalyticsTab'
import UtmTab from './crm/UtmTab'

const tabs = [
  { id: 'all', label: 'Все пользователи', icon: Users },
  { id: 'paid', label: 'Платные клиенты', icon: CreditCard },
  { id: 'broadcast', label: 'Рассылка', icon: Send },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'utm', label: 'UTM Ссылки', icon: Link2 },
]

export function AdminCRM() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-blue-500" />
        <h1 className="text-xl font-bold text-white">CRM</h1>
      </div>

      {/* Табы - горизонтальный скролл */}
      <div className="flex gap-1 mb-4 pb-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {activeTab === 'all' && <AllUsersTab />}
      {activeTab === 'paid' && <ClientsTab />}
      {activeTab === 'broadcast' && <BroadcastTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'utm' && <UtmTab />}
    </div>
  )
}

