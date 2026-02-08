import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
    BarChart3,
    TrendingUp,
    Users,
    Eye,
    MousePointer,
    ShoppingCart,
    MessageSquare,
    Palette,
    RefreshCw,
    Activity,
    Calendar,
    ArrowUp,
    ArrowDown
} from 'lucide-react'

type Period = 'today' | 'week' | 'month' | 'all'
type Tab = 'overview' | 'pages' | 'features' | 'revenue'

interface UserEvent {
    id: string
    telegram_id: number
    event_name: string
    event_category: string
    event_data: Record<string, unknown> | null
    page_path: string | null
    session_id: string | null
    created_at: string
}

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
export function ProductAnalytics() {
    const [period, setPeriod] = useState<Period>('week')
    const [tab, setTab] = useState<Tab>('overview')

    const now = new Date()
    const periodStart = (() => {
        if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
        if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
        if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
        return new Date(2024, 0, 1) // all time
    })()

    // ---------- Загрузка событий ----------
    const { data: events = [], isLoading: eventsLoading, refetch } = useQuery({
        queryKey: ['user_events', period],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_events')
                .select('*')
                .gte('created_at', periodStart.toISOString())
                .order('created_at', { ascending: false })
                .limit(5000)

            if (error) { console.error('Events error:', error); return [] }
            return data as UserEvent[]
        },
        refetchInterval: 30000
    })

    // ---------- Загрузка пользователей ----------
    const { data: totalUsers = 0 } = useQuery({
        queryKey: ['total_users_count'],
        queryFn: async () => {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
            return count || 0
        }
    })

    // ---------- Загрузка подписок ----------
    const { data: subscriptions = [] } = useQuery({
        queryKey: ['active_subscriptions'],
        queryFn: async () => {
            const { data } = await supabase
                .from('user_subscriptions')
                .select('tier, status, created_at')
                .eq('status', 'active')
            return data || []
        }
    })

    // ========== РАСЧЁТЫ ==========

    // DAU — уникальные telegram_id за каждый день
    const dauMap = new Map<string, Set<number>>()
    events.forEach(e => {
        const day = e.created_at.split('T')[0]
        if (!dauMap.has(day)) dauMap.set(day, new Set())
        dauMap.get(day)!.add(e.telegram_id)
    })

    const todayKey = now.toISOString().split('T')[0]
    const yesterdayKey = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const dau = dauMap.get(todayKey)?.size || 0
    const dauYesterday = dauMap.get(yesterdayKey)?.size || 0

    // WAU — уникальные за 7 дней
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const wauSet = new Set<number>()
    events.forEach(e => {
        if (new Date(e.created_at) >= weekAgo) wauSet.add(e.telegram_id)
    })
    const wau = wauSet.size

    // MAU — уникальные за 30 дней
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const mauSet = new Set<number>()
    events.forEach(e => {
        if (new Date(e.created_at) >= monthAgo) mauSet.add(e.telegram_id)
    })
    const mau = mauSet.size

    // Сессии
    const sessions = new Set(events.filter(e => e.session_id).map(e => e.session_id))

    // Просмотры страниц
    const pageViews = events.filter(e => e.event_name === 'page_view')
    const pageViewsByPath = new Map<string, number>()
    pageViews.forEach(e => {
        const path = e.page_path || 'unknown'
        pageViewsByPath.set(path, (pageViewsByPath.get(path) || 0) + 1)
    })
    const topPages = Array.from(pageViewsByPath.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)

    // Фичи
    const carouselEvents = events.filter(e => e.event_category === 'carousel')
    const coachEvents = events.filter(e => e.event_category === 'coach')
    const shopEvents = events.filter(e => e.event_category === 'shop')

    // Revenue events
    const buyCoinsEvents = events.filter(e => e.event_name === 'shop_buy_coins')
    const buySubEvents = events.filter(e => e.event_name === 'shop_buy_subscription')

    // DAU по дням (для графика)
    const last7days: { day: string; label: string; users: number; views: number }[] = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString('ru', { weekday: 'short', day: 'numeric' })
        last7days.push({
            day: key,
            label,
            users: dauMap.get(key)?.size || 0,
            views: pageViews.filter(e => e.created_at.startsWith(key)).length
        })
    }

    // Стили карусели — популярные
    const carouselStyles = new Map<string, number>()
    carouselEvents
        .filter(e => e.event_name === 'carousel_start' && e.event_data)
        .forEach(e => {
            const style = String((e.event_data as Record<string, unknown>)?.style || 'unknown')
            carouselStyles.set(style, (carouselStyles.get(style) || 0) + 1)
        })

    const formatNum = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
        return n.toString()
    }

    const DeltaBadge = ({ current, previous }: { current: number; previous: number }) => {
        if (previous === 0) return null
        const delta = ((current - previous) / previous) * 100
        const isUp = delta >= 0
        return (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(delta).toFixed(0)}%
            </span>
        )
    }

    if (eventsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    // ========== PAGE NAME MAPPING ==========
    const pageNames: Record<string, string> = {
        '/': 'Главная',
        '/agents': 'Агенты',
        '/agents/carousel': 'Нейропостер',
        '/agents/carousel/generating': 'Генерация карусели',
        '/agents/karmalogik': 'AI Коуч',
        '/shop': 'Магазин',
        '/school': 'Школа',
        '/referrals': 'Рефералы',
        '/profile': 'Профиль',
        '/tools': 'Инструменты',
    }

    return (
        <div className="space-y-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-orange-500" />
                    <h1 className="text-xl font-bold text-gray-900">Продуктовая аналитика</h1>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Обновить
                </button>
            </div>

            {/* Период */}
            <div className="flex gap-2">
                {([
                    ['today', 'Сегодня'],
                    ['week', 'Неделя'],
                    ['month', 'Месяц'],
                    ['all', 'Всё время'],
                ] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPeriod(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === key
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Табы */}
            <div className="flex gap-2 border-b border-gray-200">
                {([
                    ['overview', 'Обзор', Activity],
                    ['pages', 'Страницы', Eye],
                    ['features', 'Фичи', MousePointer],
                    ['revenue', 'Монетизация', ShoppingCart],
                ] as const).map(([key, label, Icon]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ========== ОБЗОР ========== */}
            {tab === 'overview' && (
                <>
                    {/* Главные метрики */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            icon={Users}
                            label="DAU (сегодня)"
                            value={dau}
                            color="bg-green-100 text-green-600"
                            extra={<DeltaBadge current={dau} previous={dauYesterday} />}
                        />
                        <MetricCard
                            icon={TrendingUp}
                            label="WAU (7 дней)"
                            value={wau}
                            color="bg-blue-100 text-blue-600"
                        />
                        <MetricCard
                            icon={Calendar}
                            label="MAU (30 дней)"
                            value={mau}
                            color="bg-cyan-100 text-cyan-600"
                        />
                        <MetricCard
                            icon={Users}
                            label="Всего юзеров"
                            value={totalUsers}
                            color="bg-orange-100 text-orange-600"
                        />
                    </div>

                    {/* Вторичные метрики */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-gray-500 text-xs mb-1">Событий за период</div>
                            <div className="text-lg font-bold text-gray-900">{formatNum(events.length)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-gray-500 text-xs mb-1">Просмотров страниц</div>
                            <div className="text-lg font-bold text-gray-900">{formatNum(pageViews.length)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-gray-500 text-xs mb-1">Уникальных сессий</div>
                            <div className="text-lg font-bold text-gray-900">{formatNum(sessions.size)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-gray-500 text-xs mb-1">Активных подписок</div>
                            <div className="text-lg font-bold text-gray-900">{subscriptions.length}</div>
                        </div>
                    </div>

                    {/* График DAU по дням */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Активность по дням (7 дней)
                        </h3>
                        <div className="flex items-end gap-2 h-36">
                            {last7days.map(day => {
                                const maxUsers = Math.max(...last7days.map(d => d.users), 1)
                                const height = (day.users / maxUsers) * 100
                                return (
                                    <div key={day.day} className="flex-1 flex flex-col items-center">
                                        <div className="text-xs text-gray-600 font-medium mb-1">{day.users}</div>
                                        <div className="w-full flex flex-col gap-0.5" style={{ height: '100px' }}>
                                            <div className="flex-1" />
                                            <div
                                                className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-md transition-all"
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2">{day.label}</div>
                                        <div className="text-xs text-gray-300">{day.views} пр.</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Быстрый обзор фич */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                            <Palette className="w-6 h-6 mx-auto text-orange-500 mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{carouselEvents.length}</div>
                            <div className="text-xs text-gray-500">Карусели</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                            <MessageSquare className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{coachEvents.length}</div>
                            <div className="text-xs text-gray-500">AI Коуч</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                            <ShoppingCart className="w-6 h-6 mx-auto text-green-500 mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{shopEvents.length}</div>
                            <div className="text-xs text-gray-500">Магазин</div>
                        </div>
                    </div>

                    {/* Пустое состояние */}
                    {events.length === 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
                            <BarChart3 className="w-10 h-10 mx-auto text-orange-400 mb-3" />
                            <p className="text-orange-800 font-medium">Данные ещё не поступили</p>
                            <p className="text-orange-600 text-sm mt-1">
                                События начнут появляться когда пользователи зайдут в TMA после деплоя
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ========== СТРАНИЦЫ ========== */}
            {tab === 'pages' && (
                <>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Топ страниц по просмотрам
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {topPages.length > 0 ? topPages.map(([path, count], i) => {
                                const maxCount = topPages[0][1]
                                const percent = (count / maxCount) * 100
                                return (
                                    <div key={path} className="px-4 py-3 flex items-center gap-4">
                                        <span className="text-gray-400 text-sm w-6 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900 text-sm truncate">
                                                    {pageNames[path] || path}
                                                </span>
                                                {pageNames[path] && (
                                                    <span className="text-xs text-gray-400">{path}</span>
                                                )}
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-orange-500 rounded-full transition-all"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 w-16 text-right">
                                            {formatNum(count)}
                                        </span>
                                    </div>
                                )
                            }) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Нет данных по просмотрам страниц
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ========== ФИЧИ ========== */}
            {tab === 'features' && (
                <>
                    {/* Карусели */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                            <Palette className="w-4 h-4 text-orange-500" /> Нейропостер
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-orange-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Генераций</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {carouselEvents.filter(e => e.event_name === 'carousel_start').length}
                                </div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Уникальных юзеров</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {new Set(carouselEvents.map(e => e.telegram_id)).size}
                                </div>
                            </div>
                        </div>
                        {/* Популярные стили */}
                        {carouselStyles.size > 0 && (
                            <div>
                                <div className="text-xs text-gray-500 mb-2">Популярные стили</div>
                                <div className="space-y-2">
                                    {Array.from(carouselStyles.entries())
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([style, count]) => (
                                            <div key={style} className="flex items-center gap-2">
                                                <span className="text-sm text-gray-700 flex-1 truncate">{style}</span>
                                                <span className="text-sm font-medium text-gray-900">{count}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Коуч */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                            <MessageSquare className="w-4 h-4 text-cyan-500" /> AI Коуч (Кармалогик)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-cyan-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Сообщений</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {coachEvents.filter(e => e.event_name === 'coach_message_sent').length}
                                </div>
                            </div>
                            <div className="bg-cyan-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">TTS озвучек</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {coachEvents.filter(e => e.event_name === 'coach_tts_played').length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Магазин */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                            <ShoppingCart className="w-4 h-4 text-green-500" /> Магазин
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Покупка монет</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {buyCoinsEvents.length}
                                </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">Покупка подписки</div>
                                <div className="text-xl font-bold text-gray-900">
                                    {buySubEvents.length}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ========== МОНЕТИЗАЦИЯ ========== */}
            {tab === 'revenue' && (
                <>
                    {/* Подписки */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-green-500" /> Подписки
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">Активных</div>
                                <div className="text-2xl font-bold text-gray-900">{subscriptions.length}</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">PRO</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {subscriptions.filter(s => s.tier === 'pro').length}
                                </div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">ELITE</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {subscriptions.filter(s => s.tier === 'elite').length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Воронка конверсии */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-orange-500" /> Воронка монетизации
                        </h3>
                        <FunnelBar label="Всего юзеров" value={totalUsers} max={totalUsers} color="bg-gray-400" />
                        <FunnelBar label="Активные (WAU)" value={wau} max={totalUsers} color="bg-blue-500" />
                        <FunnelBar label="Открыли магазин" value={shopEvents.length} max={totalUsers} color="bg-cyan-500" />
                        <FunnelBar label="Нажали купить" value={buyCoinsEvents.length + buySubEvents.length} max={totalUsers} color="bg-orange-500" />
                        <FunnelBar label="Подписки" value={subscriptions.length} max={totalUsers} color="bg-green-500" />
                    </div>

                    {/* Последние покупки */}
                    {(buyCoinsEvents.length > 0 || buySubEvents.length > 0) && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <h3 className="font-medium text-gray-900 text-sm mb-3">Последние покупки</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {[...buyCoinsEvents, ...buySubEvents]
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .slice(0, 20)
                                    .map(e => (
                                        <div key={e.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                            <div>
                                                <span className="font-medium text-gray-900">
                                                    {e.event_name === 'shop_buy_coins' ? '🪙 Монеты' : '⭐ Подписка'}
                                                </span>
                                                <span className="text-gray-400 ml-2">ID: {e.telegram_id}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(e.created_at).toLocaleString('ru', {
                                                    day: '2-digit', month: '2-digit',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ========== ПОДКОМПОНЕНТЫ ==========

function MetricCard({
    icon: Icon,
    label,
    value,
    color,
    extra
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    color: string
    extra?: React.ReactNode
}) {
    const formatNum = (n: number) => {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
        return n.toString()
    }

    return (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-gray-500 text-xs">{label}</span>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900">{formatNum(value)}</span>
                {extra}
            </div>
        </div>
    )
}

function FunnelBar({
    label,
    value,
    max,
    color
}: {
    label: string
    value: number
    max: number
    color: string
}) {
    const percent = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-900 font-medium">{value} ({percent.toFixed(1)}%)</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${Math.max(percent, 1)}%` }}
                />
            </div>
        </div>
    )
}

export default ProductAnalytics
