import { useState } from 'react'
import { Users, Send, CreditCard, Link2, UserPlus, Coins } from 'lucide-react'
import { ClientsTab } from './crm/ClientsTab'
import { AllUsersTab } from './crm/AllUsersTab'
import { BroadcastTab } from './crm/BroadcastTab'
import StatsTab from './crm/StatsTab'
import UtmTab from './crm/UtmTab'
import { ReferralsTab } from './crm/ReferralsTab'

const tabs = [
  { id: 'all', label: 'Все пользователи', icon: Users },
  { id: 'paid', label: 'Платные клиенты', icon: CreditCard },
  { id: 'referrals', label: 'Рефералы', icon: UserPlus },
  { id: 'broadcast', label: 'Рассылка', icon: Send },
  { id: 'stats', label: 'Статистика', icon: Coins },
  { id: 'utm', label: 'UTM Ссылки', icon: Link2 },
]

export function AdminCRM() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="overflow-x-hidden">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">CRM</h1>
      </div>

      {/* Табы - вертикально на мобиле, горизонтально на десктопе */}
      <div className="grid grid-cols-2 gap-2 mb-4 lg:flex lg:gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-xs lg:text-sm">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {activeTab === 'all' && <AllUsersTab />}
      {activeTab === 'paid' && <ClientsTab />}
      {activeTab === 'referrals' && <ReferralsTab />}
      {activeTab === 'broadcast' && <BroadcastTab />}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'utm' && <UtmTab />}
    </div>
  )
}

