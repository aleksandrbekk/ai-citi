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
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">CRM</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-white'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
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

