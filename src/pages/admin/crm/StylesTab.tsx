import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Palette, Users, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'

type Period = 'week' | 'month' | 'all'

interface StylePurchase {
    id: string
    telegram_id: number
    style_id: string
    price_paid: number
    purchased_at: string
}

interface CarouselStyle {
    style_id: string
    name: string
    emoji: string | null
    price_neurons: number
    is_in_shop: boolean
    is_free: boolean
    is_active: boolean
    preview_color: string | null
}

interface UserBasic {
    telegram_id: number
    username: string | null
    first_name: string | null
}

interface StyleStats {
    style_id: string
    name: string
    emoji: string | null
    price: number
    isInShop: boolean
    isFree: boolean
    isActive: boolean
    color: string | null
    purchasesCount: number
    revenue: number
    buyers: Array<{ telegram_id: number; username: string | null; first_name: string | null; purchased_at: string; price_paid: number }>
}

const getPeriodStart = (period: Period): Date | null => {
    if (period === 'all') return null
    const now = new Date()
    if (period === 'week') {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        return d
    }
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d
}

export function StylesTab() {
    const [period, setPeriod] = useState<Period>('all')
    const [expandedStyle, setExpandedStyle] = useState<string | null>(null)

    // Fetch styles
    const { data: styles } = useQuery({
        queryKey: ['admin-carousel-styles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('carousel_styles')
                .select('style_id, name, emoji, price_neurons, is_in_shop, is_free, is_active, preview_color')
                .order('sort_order', { ascending: true })
            if (error) throw error
            return data as CarouselStyle[]
        },
    })

    // Fetch all purchases
    const { data: purchases } = useQuery({
        queryKey: ['admin-style-purchases'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_purchased_styles')
                .select('id, telegram_id, style_id, price_paid, purchased_at')
                .order('purchased_at', { ascending: false })
            if (error) throw error
            return data as StylePurchase[]
        },
    })

    // Fetch users for buyer names
    const { data: users } = useQuery({
        queryKey: ['admin-users-basic'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('telegram_id, username, first_name')
            if (error) throw error
            return data as UserBasic[]
        },
    })

    const usersMap = useMemo(() => {
        const map = new Map<number, UserBasic>()
        users?.forEach(u => map.set(u.telegram_id, u))
        return map
    }, [users])

    // Calculate stats per style
    const styleStats = useMemo(() => {
        if (!styles || !purchases) return []

        const periodStart = getPeriodStart(period)

        const filteredPurchases = periodStart
            ? purchases.filter(p => new Date(p.purchased_at) >= periodStart)
            : purchases

        const purchasesByStyle = new Map<string, StylePurchase[]>()
        filteredPurchases.forEach(p => {
            const list = purchasesByStyle.get(p.style_id) || []
            list.push(p)
            purchasesByStyle.set(p.style_id, list)
        })

        const stats: StyleStats[] = styles.map(s => {
            const stylePurchases = purchasesByStyle.get(s.style_id) || []
            return {
                style_id: s.style_id,
                name: s.name,
                emoji: s.emoji,
                price: s.price_neurons,
                isInShop: s.is_in_shop,
                isFree: s.is_free,
                isActive: s.is_active,
                color: s.preview_color,
                purchasesCount: stylePurchases.length,
                revenue: stylePurchases.reduce((sum, p) => sum + (p.price_paid || 0), 0),
                buyers: stylePurchases.map(p => {
                    const user = usersMap.get(p.telegram_id)
                    return {
                        telegram_id: p.telegram_id,
                        username: user?.username || null,
                        first_name: user?.first_name || null,
                        purchased_at: p.purchased_at,
                        price_paid: p.price_paid,
                    }
                }),
            }
        })

        // Sort: by purchases count DESC, then by name
        stats.sort((a, b) => b.purchasesCount - a.purchasesCount || a.name.localeCompare(b.name))

        return stats
    }, [styles, purchases, period, usersMap])

    // Summary stats
    const summary = useMemo(() => {
        const totalPurchases = styleStats.reduce((sum, s) => sum + s.purchasesCount, 0)
        const totalRevenue = styleStats.reduce((sum, s) => sum + s.revenue, 0)
        const uniqueBuyers = new Set(styleStats.flatMap(s => s.buyers.map(b => b.telegram_id))).size
        const stylesWithPurchases = styleStats.filter(s => s.purchasesCount > 0).length
        return { totalPurchases, totalRevenue, uniqueBuyers, stylesWithPurchases, totalStyles: styleStats.length }
    }, [styleStats])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="space-y-3">
            {/* Период */}
            <div className="flex gap-1.5 bg-gray-50 rounded-xl p-1">
                {([
                    ['week', 'Неделя'],
                    ['month', 'Месяц'],
                    ['all', 'Всё время'],
                ] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setPeriod(key)}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                            period === key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Сводная статистика */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-3 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden col-span-2">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="text-purple-100 text-[10px] mb-0.5">Доход от стилей</div>
                    <div className="text-xl font-bold">{summary.totalRevenue.toLocaleString('ru-RU')} 🧠</div>
                    <div className="text-purple-100/80 text-[10px] mt-0.5">{summary.totalPurchases} покупок</div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-gray-400 text-[10px] mb-0.5">Покупателей</div>
                    <div className="text-lg font-bold text-gray-900">{summary.uniqueBuyers}</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">уник.</div>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-gray-400 text-[10px] mb-0.5">Активных</div>
                    <div className="text-lg font-bold text-green-600">{summary.stylesWithPurchases}</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">из {summary.totalStyles}</div>
                </div>
            </div>

            {/* Список стилей */}
            <div className="space-y-2">
                {styleStats.map(style => {
                    const isExpanded = expandedStyle === style.style_id
                    return (
                        <div
                            key={style.style_id}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                            {/* Карточка стиля */}
                            <button
                                onClick={() => setExpandedStyle(isExpanded ? null : style.style_id)}
                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                            >
                                {/* Превью цвет */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                    style={{ backgroundColor: style.color || '#f3f4f6' }}
                                >
                                    {style.emoji || '🎨'}
                                </div>

                                {/* Инфо */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-gray-900 truncate">{style.name}</span>
                                        {!style.isActive && (
                                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">OFF</span>
                                        )}
                                        {style.isInShop && (
                                            <ShoppingCart size={10} className="text-orange-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-gray-400">
                                            {style.isFree ? 'Бесплатный' : `${style.price} 🧠`}
                                        </span>
                                        {style.purchasesCount > 0 && (
                                            <span className="text-[10px] text-gray-400">
                                                • {style.revenue} 🧠 выручка
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Счётчик и шеврон */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                                        style.purchasesCount > 0
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-gray-100 text-gray-400'
                                    )}>
                                        <Users size={10} />
                                        {style.purchasesCount}
                                    </div>
                                    {style.purchasesCount > 0 && (
                                        isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Раскрывающийся список покупателей */}
                            {isExpanded && style.buyers.length > 0 && (
                                <div className="border-t border-gray-100 bg-gray-50/50">
                                    {style.buyers.map((buyer, idx) => (
                                        <div
                                            key={`${buyer.telegram_id}-${idx}`}
                                            className="flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                    {(buyer.first_name || buyer.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-medium text-gray-900 truncate block">
                                                        {buyer.first_name || buyer.username || `ID: ${buyer.telegram_id}`}
                                                    </span>
                                                    {buyer.username && (
                                                        <span className="text-[10px] text-gray-400 truncate block">@{buyer.username}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-[10px] text-gray-400">{formatDate(buyer.purchased_at)}</span>
                                                <span className="text-xs font-bold text-orange-600">{buyer.price_paid} 🧠</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                {styleStats.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        <Palette size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Стили не найдены</p>
                    </div>
                )}
            </div>
        </div>
    )
}
