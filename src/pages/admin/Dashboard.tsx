import { useNavigate, Link } from 'react-router-dom'
import {
    Users,
    HelpCircle,
    Palette,
    GraduationCap,
    Settings,
    Home,
    BarChart3,
    type LucideIcon
} from 'lucide-react'

interface TileProps {
    to: string
    icon: LucideIcon
    label: string
    gradient: string
    iconBg?: string
}

function DashboardTile({ to, icon: Icon, label, gradient, iconBg }: TileProps) {
    const navigate = useNavigate()

    return (
        <button
            onClick={() => navigate(to)}
            className={`
        ${gradient}
        aspect-square rounded-3xl p-6
        flex flex-col items-center justify-center gap-3
        shadow-lg hover:shadow-xl
        transform hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200
        group
      `}
        >
            <div className={`
        w-16 h-16 lg:w-20 lg:h-20
        rounded-2xl
        flex items-center justify-center
        ${iconBg || 'bg-white/20'}
        backdrop-blur-sm
        group-hover:scale-110
        transition-transform duration-200
      `}>
                <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-white font-semibold text-lg lg:text-xl">
                {label}
            </span>
        </button>
    )
}

export function AdminDashboard() {
    const tiles: TileProps[] = [
        {
            to: '/admin/crm',
            icon: Users,
            label: 'CRM',
            gradient: 'bg-gradient-to-br from-orange-400 to-orange-600',
        },
        {
            to: '/admin/quizzes',
            icon: HelpCircle,
            label: 'Квизы',
            gradient: 'bg-gradient-to-br from-cyan-400 to-teal-600',
        },
        {
            to: '/admin/carousel-styles',
            icon: Palette,
            label: 'Карусели',
            gradient: 'bg-gradient-to-br from-orange-400 to-rose-500',
        },
        {
            to: '/admin/mlm',
            icon: GraduationCap,
            label: 'Школа',
            gradient: 'bg-gradient-to-br from-teal-400 to-cyan-600',
        },
        {
            to: '/admin/settings',
            icon: Settings,
            label: 'Настройки',
            gradient: 'bg-gradient-to-br from-gray-400 to-gray-600',
        },
        {
            to: '/admin/analytics',
            icon: BarChart3,
            label: 'Аналитика',
            gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        },
    ]

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
            {/* Кнопка домой для мобайла */}
            <Link
                to="/"
                className="lg:hidden absolute top-4 left-4 p-3 rounded-xl bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-all active:scale-95"
            >
                <Home className="w-5 h-5" />
            </Link>

            {/* Заголовок */}
            <div className="text-center mb-8 lg:mb-12">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Админ-панель</h1>
            </div>

            {/* Сетка плиток */}
            <div className="w-full max-w-md lg:max-w-lg">
                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                    {tiles.map((tile) => (
                        <DashboardTile key={tile.to} {...tile} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
