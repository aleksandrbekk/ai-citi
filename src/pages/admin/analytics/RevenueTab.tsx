import { useState } from 'react'
import {
    TrendingUp,
    ShoppingCart,
    BarChart3,
    Coins,
    Sparkles,
    AlertCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    XCircle,
    DollarSign
} from 'lucide-react'

// Пакеты монет (актуальные)
const COIN_PACKAGES = [
    { id: 'light', name: 'Light (30 нейронов)', coins: 30 },
    { id: 'starter', name: 'Starter (100 нейронов)', coins: 100 },
    { id: 'standard', name: 'Standard (300 нейронов)', coins: 300 },
    { id: 'pro', name: 'PRO (500 нейронов)', coins: 500 },
    { id: 'business', name: 'Business (1000 нейронов)', coins: 1000 },
]

const CAROUSEL_STYLES = [
    { id: 'APPLE_GLASSMORPHISM', name: '🍎 Apple Glass', color: 'bg-orange-500' },
    { id: 'AESTHETIC_BEIGE', name: '🤎 Aesthetic Beige', color: 'bg-amber-600' },
    { id: 'SOFT_PINK_EDITORIAL', name: '🌸 Soft Pink', color: 'bg-pink-400' },
    { id: 'MINIMALIST_LINE_ART', name: '✏️ Minimalist', color: 'bg-gray-700' },
    { id: 'GRADIENT_MESH_3D', name: '🌈 Gradient 3D', color: 'bg-purple-500' },
    { id: '_legacy', name: '📦 Старые (без стиля)', color: 'bg-gray-400' },
]

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

interface RevenueTabProps {
    subscriptions: any[]
    allSubscriptions: any[]
    coinPurchases: any[]
    carouselGenerations: any[]
    carouselRefunds: any[]
    statsSummary: any
    totalUsers: number
    wau: number
    shopEvents: any[]
    buyCoinsEvents: any[]
    buySubEvents: any[]
}

export function RevenueTab({
    subscriptions,
    allSubscriptions,
    coinPurchases,
    carouselGenerations,
    carouselRefunds,
    statsSummary,
    totalUsers,
    wau,
    shopEvents,
    buyCoinsEvents,
    buySubEvents
}: RevenueTabProps) {
    const [showPurchases, setShowPurchases] = useState(false)
    const [showRefunds, setShowRefunds] = useState(false)
    const [showActiveSubs, setShowActiveSubs] = useState(false)
    const [showCancelledSubs, setShowCancelledSubs] = useState(false)

    // Расчёты из StatsTab
    const purchaseStats = {
        total: coinPurchases.length,
        totalCoins: coinPurchases.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
        weekPurchases: coinPurchases.filter((p: any) => {
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
            return new Date(p.created_at) >= weekAgo
        }).length,
    }

    const byPackage = coinPurchases.reduce((acc: Record<string, number>, p: any) => {
        const key = `${p.amount || 0}_coins`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    const generationStats = {
        total: carouselGenerations.length,
        totalSpent: carouselGenerations.reduce((sum: number, g: any) => sum + Math.abs(g.amount || 0), 0),
        weekGenerations: carouselGenerations.filter((g: any) => {
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
            return new Date(g.created_at) >= weekAgo
        }).length,
    }

    const refundStats = {
        total: statsSummary?.total_refunds ?? carouselRefunds.length,
        weekRefunds: statsSummary?.week_refunds ?? 0,
        totalCoinsRefunded: statsSummary?.total_coins_refunded ?? carouselRefunds.reduce((s: number, r: any) => s + (r.amount || 0), 0),
    }

    const byStyle = carouselGenerations.reduce((acc: Record<string, number>, g: any) => {
        const meta = g.metadata as Record<string, string> | null
        const style = meta?.style || '_legacy'
        acc[style] = (acc[style] || 0) + 1
        return acc
    }, {})

    // Подписки из SubscriptionsTab
    const activeSubs = allSubscriptions.filter((s: any) => s.status === 'active')
    const cancelledSubs = allSubscriptions.filter((s: any) => s.status === 'cancelled')

    // По месяцам
    const purchasesByMonth = coinPurchases.reduce((acc: Record<string, number>, p: any) => {
        const date = new Date(p.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    const generationsByMonth = carouselGenerations.reduce((acc: Record<string, number>, g: any) => {
        const date = new Date(g.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    return (
        <>
            {/* Подписки (обзор) */}
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
                            {subscriptions.filter((s: any) => s.plan === 'pro').length}
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">ELITE</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {subscriptions.filter((s: any) => s.plan === 'elite').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Основные метрики (из StatsTab) */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={ShoppingCart} label="Покупок монет" value={purchaseStats.total}
                    subvalue={`+${purchaseStats.weekPurchases} за неделю`} color="bg-green-100 text-green-600" />
                <StatCard icon={Coins} label="Продано нейронов" value={purchaseStats.totalCoins}
                    color="bg-yellow-100 text-yellow-600" />
                <StatCard icon={Sparkles} label="Генераций" value={generationStats.total}
                    subvalue={`+${generationStats.weekGenerations} за неделю`} color="bg-orange-100 text-orange-600" />
                <StatCard icon={AlertCircle} label="Ошибки (возвраты)" value={refundStats.total}
                    subvalue={`возвращено ${refundStats.totalCoinsRefunded} нейронов`} color="bg-red-100 text-red-600" />
            </div>

            {/* Покупки по пакетам */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-500" /> Покупки по пакетам
                </h3>
                {COIN_PACKAGES.map(pkg => (
                    <ProgressBar key={pkg.id} label={pkg.name}
                        value={byPackage[`${pkg.coins}_coins`] || 0}
                        total={purchaseStats.total} color="bg-yellow-500" />
                ))}
                {purchaseStats.total === 0 && (
                    <p className="text-gray-500 text-center py-2">Пока нет покупок</p>
                )}
            </div>

            {/* Генерации по стилям */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" /> Генерации по стилям
                </h3>
                {CAROUSEL_STYLES.map(style => (
                    <ProgressBar key={style.id} label={style.name}
                        value={byStyle[style.id] || 0}
                        total={generationStats.total} color={style.color} />
                ))}
                {generationStats.total === 0 && (
                    <p className="text-gray-500 text-center py-2">Пока нет генераций</p>
                )}
            </div>

            {/* Воронка */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-orange-500" /> Воронка монетизации
                </h3>
                <FunnelBar label="Всего юзеров" value={totalUsers} max={totalUsers} color="bg-gray-400" />
                <FunnelBar label="Активные (WAU)" value={wau} max={totalUsers} color="bg-cyan-500" />
                <FunnelBar label="Открыли магазин" value={shopEvents.length} max={totalUsers} color="bg-orange-400" />
                <FunnelBar label="Нажали купить" value={buyCoinsEvents.length + buySubEvents.length} max={totalUsers} color="bg-orange-500" />
                <FunnelBar label="Подписки" value={subscriptions.length} max={totalUsers} color="bg-green-500" />
            </div>

            {/* Статистика по месяцам */}
            <MonthSelector purchasesData={purchasesByMonth} generationsData={generationsByMonth} />

            {/* Accordion: Последние покупки монет */}
            <CollapsibleSection
                icon={<ShoppingCart className="w-4 h-4 text-green-500" />}
                title="Последние покупки монет"
                count={purchaseStats.total}
                countColor="bg-green-100 text-green-600"
                isOpen={showPurchases}
                onToggle={() => setShowPurchases(!showPurchases)}
            >
                {coinPurchases.slice(0, 10).map((p: any, i: number) => (
                    <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                            <span className="text-gray-900 text-sm">{new Date(p.created_at).toLocaleDateString('ru-RU')}</span>
                            <span className="text-gray-500 text-xs ml-2">
                                {p.username ? `@${p.username}` : p.telegram_id ? `ID ${p.telegram_id}` : p.user_id?.slice(0, 8)}
                            </span>
                        </div>
                        <span className="text-green-600 font-medium">+{p.amount} нейронов</span>
                    </div>
                ))}
                {coinPurchases.length === 0 && <p className="text-gray-500 text-center py-4">Пока нет покупок</p>}
            </CollapsibleSection>

            {/* Accordion: Возвраты */}
            <CollapsibleSection
                icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                title="Возвраты монет"
                count={refundStats.total}
                countColor="bg-red-100 text-red-600"
                isOpen={showRefunds}
                onToggle={() => setShowRefunds(!showRefunds)}
            >
                <p className="text-gray-500 text-xs mb-3">Когда генерация карусели падала — монеты возвращались.</p>
                {carouselRefunds.slice(0, 10).map((r: any, i: number) => (
                    <div key={r.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                            <span className="text-gray-900 text-sm">{new Date(r.created_at).toLocaleString('ru-RU')}</span>
                            <span className="text-gray-500 text-xs ml-2">
                                {r.username ? `@${r.username}` : `ID ${r.telegram_id}`}
                            </span>
                        </div>
                        <span className="text-red-600 font-medium">+{r.amount} нейронов</span>
                    </div>
                ))}
                {carouselRefunds.length === 0 && <p className="text-gray-500 text-center py-4">Возвратов не было</p>}
            </CollapsibleSection>

            {/* Accordion: Активные подписки */}
            <CollapsibleSection
                icon={<DollarSign className="w-4 h-4 text-green-500" />}
                title="Активные подписки"
                count={activeSubs.length}
                countColor="bg-green-100 text-green-600"
                isOpen={showActiveSubs}
                onToggle={() => setShowActiveSubs(!showActiveSubs)}
            >
                {activeSubs.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                            <span className="text-gray-900 text-sm font-medium">{(s.plan || '').toUpperCase()}</span>
                            <span className="text-gray-500 text-xs ml-2">
                                {s.username ? `@${s.username}` : `ID ${s.telegram_id}`}
                            </span>
                            <span className="text-gray-400 text-xs ml-2">
                                до {new Date(s.expires_at).toLocaleDateString('ru-RU')}
                            </span>
                        </div>
                        <span className="text-green-600 font-medium text-sm">{s.amount_rub}₽/мес</span>
                    </div>
                ))}
                {activeSubs.length === 0 && <p className="text-gray-500 text-center py-4">Нет активных подписок</p>}
            </CollapsibleSection>

            {/* Accordion: Отменённые подписки */}
            <CollapsibleSection
                icon={<XCircle className="w-4 h-4 text-red-500" />}
                title="Отменённые подписки"
                count={cancelledSubs.length}
                countColor="bg-red-100 text-red-600"
                isOpen={showCancelledSubs}
                onToggle={() => setShowCancelledSubs(!showCancelledSubs)}
            >
                {cancelledSubs.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                            <span className="text-gray-900 text-sm font-medium">{(s.plan || '').toUpperCase()}</span>
                            <span className="text-gray-500 text-xs ml-2">
                                {s.username ? `@${s.username}` : `ID ${s.telegram_id}`}
                            </span>
                            {s.cancelled_at && (
                                <span className="text-red-400 text-xs ml-2">
                                    отменена {new Date(s.cancelled_at).toLocaleDateString('ru-RU')}
                                </span>
                            )}
                        </div>
                        <span className="text-red-500 font-medium text-sm">{s.amount_rub}₽</span>
                    </div>
                ))}
                {cancelledSubs.length === 0 && <p className="text-gray-500 text-center py-4">Отмен не было</p>}
            </CollapsibleSection>
        </>
    )
}

// ========== Вспомогательные компоненты ==========

function StatCard({ icon: Icon, label, value, subvalue, color }: {
    icon: any; label: string; value: number | string; subvalue?: string; color: string
}) {
    return (
        <div className="bg-gray-100 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${color}`}><Icon size={16} /></div>
                <span className="text-gray-500 text-xs">{label}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            {subvalue && <div className="text-gray-500 text-xs mt-0.5">{subvalue}</div>}
        </div>
    )
}

function ProgressBar({ label, value, total, color }: {
    label: string; value: number; total: number; color: string
}) {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0
    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900">{value} ({percent}%)</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}

function FunnelBar({ label, value, max, color }: {
    label: string; value: number; max: number; color: string
}) {
    const percent = max > 0 ? (value / max) * 100 : 0
    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-900 font-medium">{value} ({percent.toFixed(1)}%)</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(percent, 1)}%` }} />
            </div>
        </div>
    )
}

function CollapsibleSection({ icon, title, count, countColor, isOpen, onToggle, children }: {
    icon: React.ReactNode; title: string; count: number; countColor: string
    isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
    return (
        <>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-gray-900 font-medium">{title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${countColor}`}>{count}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="space-y-2">{children}</div>
                </div>
            )}
        </>
    )
}

function MonthSelector({ purchasesData, generationsData }: {
    purchasesData: Record<string, number>; generationsData: Record<string, number>
}) {
    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())

    const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
    const purchases = purchasesData[monthKey] || 0
    const generations = generationsData[monthKey] || 0

    const prevMonth = () => {
        if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1) }
        else setSelectedMonth(selectedMonth - 1)
    }
    const nextMonth = () => {
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1) }
        else setSelectedMonth(selectedMonth + 1)
    }
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{MONTH_NAMES[selectedMonth]}</div>
                    <div className="text-sm text-gray-500">{selectedYear}</div>
                </div>
                <button onClick={nextMonth} disabled={isCurrentMonth}
                    className={`p-2 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30' : 'hover:bg-gray-100'}`}>
                    <ChevronRight size={20} className="text-gray-600" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <ShoppingCart size={16} className="text-green-600" />
                        <span className="text-sm text-green-700">Покупки</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{purchases}</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Sparkles size={16} className="text-orange-600" />
                        <span className="text-sm text-orange-700">Генерации</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{generations}</div>
                </div>
            </div>
        </div>
    )
}
