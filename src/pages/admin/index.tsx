import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  FileText,
  Settings,
  ChevronRight,
  LogOut,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Search,
  Link2,
  Palette,
  Zap
} from 'lucide-react'
import { useQuizzes, useQuizAnalytics, type Quiz } from '@/hooks/useQuizzes'
import UtmTab from './crm/UtmTab'
import StatsTab from './crm/StatsTab'
import { useMaintenanceMode, toggleMaintenanceMode, updateMaintenanceMessage } from '@/hooks/useMaintenanceMode'
import { AIEngineSettings } from './ai-engine/AIEngineSettings'

type AdminSection = 'crm' | 'mlm-camp' | 'quizzes' | 'carousel-styles' | 'ai-engine' | 'settings'

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState<AdminSection>('crm')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E293B] border-r border-[#334155] p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">AI CiTY</h1>
          <p className="text-sm text-[#94A3B8]">Админ-панель</p>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem
            icon={Users}
            label="CRM"
            active={activeSection === 'crm'}
            onClick={() => setActiveSection('crm')}
          />
          <SidebarItem
            icon={GraduationCap}
            label="МЛМ Лагерь"
            active={activeSection === 'mlm-camp'}
            onClick={() => setActiveSection('mlm-camp')}
          />
          <SidebarItem
            icon={FileText}
            label="Квизы"
            active={activeSection === 'quizzes'}
            onClick={() => setActiveSection('quizzes')}
          />
          <SidebarItem
            icon={Palette}
            label="Карусели"
            active={activeSection === 'carousel-styles'}
            onClick={() => setActiveSection('carousel-styles')}
          />
          <SidebarItem
            icon={Zap}
            label="AI Engine"
            active={activeSection === 'ai-engine'}
            onClick={() => setActiveSection('ai-engine')}
          />
          <SidebarItem
            icon={Settings}
            label="Настройки"
            active={activeSection === 'settings'}
            onClick={() => setActiveSection('settings')}
          />
        </nav>

        {/* Logout */}
        <div className="border-t border-[#334155] pt-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-[#94A3B8] hover:text-white hover:bg-[#334155] rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#0F172A] overflow-auto">
        <div className="p-8">
          {activeSection === 'crm' && <CRMSection />}
          {activeSection === 'mlm-camp' && <MLMCampSection />}
          {activeSection === 'quizzes' && <QuizzesSection navigate={navigate} />}
          {activeSection === 'carousel-styles' && <CarouselStylesSection navigate={navigate} />}
          {activeSection === 'ai-engine' && <AIEngineSettings />}
          {activeSection === 'settings' && <SettingsSection />}
        </div>
      </main>
    </div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
        ? 'bg-[#3B82F6] text-white'
        : 'text-[#94A3B8] hover:text-white hover:bg-[#334155]'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  )
}

function CRMSection() {
  const [activeTab, setActiveTab] = useState<'base' | 'mailing' | 'analytics' | 'utm'>('base')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Админ-панель
        </h1>
        <h2 className="text-xl font-semibold text-[#94A3B8] flex items-center gap-2">
          <Users className="w-5 h-5" />
          CRM
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#334155]">
        <TabButton
          icon={Users}
          label="База"
          active={activeTab === 'base'}
          onClick={() => setActiveTab('base')}
        />
        <TabButton
          icon={FileText}
          label="Рассылка"
          active={activeTab === 'mailing'}
          onClick={() => setActiveTab('mailing')}
        />
        <TabButton
          icon={BarChart3}
          label="Аналитика"
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
        />
        <TabButton
          icon={Link2}
          label="UTM Ссылки"
          active={activeTab === 'utm'}
          onClick={() => setActiveTab('utm')}
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Поиск по ID, username, имени..."
            className="w-full pl-10 pr-4 py-3 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'base' && (
        <div className="bg-[#1E293B] rounded-lg border border-[#334155] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0F172A] border-b border-[#334155]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#94A3B8]">Пользователь</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#94A3B8]">Тариф</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#94A3B8]">Источник</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#334155] hover:bg-[#0F172A]">
                <td className="px-6 py-4">
                  <div className="font-medium">Тайский</div>
                  <div className="text-sm text-[#94A3B8]">5834159353</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/20 text-[#60A5FA]">
                    basic
                  </span>
                </td>
                <td className="px-6 py-4 text-[#94A3B8]">manual</td>
              </tr>
              <tr className="border-b border-[#334155] hover:bg-[#0F172A]">
                <td className="px-6 py-4">
                  <div className="font-medium">дмитрий</div>
                  <div className="text-sm text-[#94A3B8]">@dmbekk</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#3B82F6]/20 text-[#60A5FA]">
                    basic
                  </span>
                </td>
                <td className="px-6 py-4 text-[#94A3B8]">manual</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'mailing' && (
        <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-6">
          <p className="text-[#94A3B8]">Раздел рассылки в разработке</p>
        </div>
      )}

      {activeTab === 'analytics' && <StatsTab />}

      {activeTab === 'utm' && <UtmTab />}
    </div>
  )
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: any
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${active
        ? 'border-[#3B82F6] text-white'
        : 'border-transparent text-[#94A3B8] hover:text-white'
        }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  )
}

function MLMCampSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <GraduationCap className="w-6 h-6" />
        МЛМ Лагерь
      </h2>
      <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-6">
        <p className="text-[#94A3B8]">Раздел в разработке</p>
      </div>
    </div>
  )
}

function QuizzesSection({ navigate }: { navigate: any }) {
  const { quizzes, isLoading, deleteQuiz } = useQuizzes()

  const handleDelete = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Удалить этот квиз?')) {
      await deleteQuiz(quizId)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Квизы
        </h2>
        <button
          onClick={() => navigate('/quizzes/builder')}
          className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать квиз
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#94A3B8]">Загрузка...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-[#1E293B] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-[#64748B]" />
          </div>
          <p className="text-[#94A3B8] mb-6">Нет квизов</p>
          <button
            onClick={() => navigate('/quizzes/builder')}
            className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
          >
            Создать первый квиз
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <AdminQuizCard
              key={quiz.id}
              quiz={quiz}
              onEdit={() => navigate(`/quizzes/builder/${quiz.id}`)}
              onView={() => navigate(`/quiz/${quiz.id}`)}
              onAnalytics={() => navigate(`/quizzes/${quiz.id}/analytics`)}
              onDelete={(e) => handleDelete(quiz.id, e)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AdminQuizCard({
  quiz,
  onEdit,
  onView,
  onAnalytics,
  onDelete
}: {
  quiz: Quiz
  onEdit: () => void
  onView: () => void
  onAnalytics: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const { analytics } = useQuizAnalytics(quiz.id)

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden hover:border-[#3B82F6]/50 transition-all group">
      {/* Cover */}
      {quiz.cover_image_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={quiz.cover_image_url}
            alt={quiz.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>
          <div className="absolute top-3 right-3">
            {quiz.is_published ? (
              <span className="px-3 py-1 bg-green-500/80 backdrop-blur-sm rounded-full text-xs font-medium">
                Опубликован
              </span>
            ) : (
              <span className="px-3 py-1 bg-[#64748B]/80 backdrop-blur-sm rounded-full text-xs font-medium">
                Черновик
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 flex items-center justify-center">
          <div className="text-4xl font-bold text-white/30">{quiz.title.charAt(0).toUpperCase()}</div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{quiz.title}</h3>
        {quiz.description && (
          <p className="text-[#94A3B8] text-sm mb-4 line-clamp-2">{quiz.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1 text-[#94A3B8]">
            <Eye className="w-4 h-4" />
            <span>{analytics.totalViews}</span>
          </div>
          <div className="flex items-center gap-1 text-[#94A3B8]">
            <Users className="w-4 h-4" />
            <span>{analytics.totalCompletions}</span>
          </div>
          {analytics.completionRate > 0 && (
            <div className="flex items-center gap-1 text-green-400">
              <BarChart3 className="w-4 h-4" />
              <span>{analytics.completionRate.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onView}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-colors text-sm border border-[#334155]"
          >
            <Eye className="w-4 h-4" />
            Открыть
          </button>
          <button
            onClick={onAnalytics}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-colors text-sm border border-[#334155]"
          >
            <BarChart3 className="w-4 h-4" />
            Аналитика
          </button>
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-colors text-sm border border-[#334155]"
          >
            <Edit className="w-4 h-4" />
            Редактировать
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 text-sm border border-red-500/30"
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

function CarouselStylesSection({ navigate }: { navigate: any }) {
  // Редирект на отдельную страницу списка стилей
  useEffect(() => {
    navigate('/admin/carousel-styles')
  }, [navigate])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-[#94A3B8]">Перенаправление...</div>
    </div>
  )
}

function SettingsSection() {
  const { isMaintenanceEnabled, message } = useMaintenanceMode()
  const [localMessage, setLocalMessage] = useState(message)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalMessage(message)
  }, [message])

  const handleToggle = async () => {
    setSaving(true)
    await toggleMaintenanceMode(!isMaintenanceEnabled)
    setSaving(false)
  }

  const handleSaveMessage = async () => {
    setSaving(true)
    await updateMaintenanceMessage(localMessage)
    setSaving(false)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Настройки
      </h2>

      {/* Maintenance Mode */}
      <div className="bg-[#1E293B] rounded-lg border border-[#334155] p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🛠 Технические работы
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">
              Блокирует доступ всем пользователям кроме админов
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${isMaintenanceEnabled ? 'bg-orange-500' : 'bg-[#334155]'
              }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isMaintenanceEnabled ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
          </button>
        </div>

        {isMaintenanceEnabled && (
          <div className="mt-4 pt-4 border-t border-[#334155]">
            <label className="text-sm text-[#94A3B8] mb-2 block">Сообщение для пользователей:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localMessage}
                onChange={(e) => setLocalMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6]"
              />
              <button
                onClick={handleSaveMessage}
                disabled={saving || localMessage === message}
                className="px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 rounded-lg transition-colors text-sm font-medium"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}

        {isMaintenanceEnabled && (
          <div className="mt-3 flex items-center gap-2 text-sm text-orange-400">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            Тех. работы активны — пользователи видят заглушку
          </div>
        )}
      </div>
    </div>
  )
}
