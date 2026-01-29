import { useState, useEffect } from 'react'
import { Plus, Copy, Trash2, Check, ExternalLink, Coins, Gift, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface PromoLink {
    id: string
    code: string
    coins_amount: number
    description: string | null
    is_active: boolean
    max_uses: number | null
    uses_count: number
    expires_at: string | null
    created_at: string
}

interface ClaimStats {
    promo_link_id: string
    total_claims: number
    total_coins: number
}

const BOT_USERNAME = 'aiciti_bot'

export default function PromoLinksSection() {
    const [promoLinks, setPromoLinks] = useState<PromoLink[]>([])
    const [stats, setStats] = useState<Map<string, ClaimStats>>(new Map())
    const [isLoading, setIsLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    // Упрощённая форма: только монеты и описание
    const [newCoins, setNewCoins] = useState(50)
    const [newDescription, setNewDescription] = useState('')

    useEffect(() => {
        fetchPromoLinks()
    }, [])

    const fetchPromoLinks = async () => {
        try {
            const { data: links, error: linksError } = await supabase
                .from('promo_links')
                .select('*')
                .order('created_at', { ascending: false })

            if (linksError) throw linksError
            setPromoLinks(links || [])

            // Fetch claim stats
            const { data: claimsData } = await supabase
                .from('promo_claims')
                .select('promo_link_id, coins_awarded')

            if (claimsData) {
                const statsMap = new Map<string, ClaimStats>()
                claimsData.forEach((claim: { promo_link_id: string; coins_awarded: number }) => {
                    const existing = statsMap.get(claim.promo_link_id) || {
                        promo_link_id: claim.promo_link_id,
                        total_claims: 0,
                        total_coins: 0
                    }
                    existing.total_claims++
                    existing.total_coins += claim.coins_awarded
                    statsMap.set(claim.promo_link_id, existing)
                })
                setStats(statsMap)
            }
        } catch (error) {
            console.error('Error fetching promo links:', error)
            toast.error('Ошибка загрузки')
        } finally {
            setIsLoading(false)
        }
    }

    // Автогенерация кода
    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
    }

    const createPromoLink = async () => {
        if (newCoins < 1) {
            toast.error('Укажите количество монет')
            return
        }

        setIsCreating(true)
        try {
            const code = generateCode() // Автогенерация кода

            const { error } = await supabase
                .from('promo_links')
                .insert({
                    code: code,
                    coins_amount: newCoins,
                    description: newDescription.trim() || null,
                })

            if (error) throw error

            toast.success(`Промо-ссылка ${code} создана!`)
            setNewCoins(50)
            setNewDescription('')
            setShowForm(false)
            await fetchPromoLinks()
        } catch (error: unknown) {
            console.error('Error creating promo link:', error)
            toast.error('Ошибка создания')
        } finally {
            setIsCreating(false)
        }
    }

    const toggleActive = async (id: string, isActive: boolean) => {
        const { error } = await supabase
            .from('promo_links')
            .update({ is_active: !isActive })
            .eq('id', id)

        if (!error) {
            setPromoLinks(links =>
                links.map(link =>
                    link.id === id ? { ...link, is_active: !isActive } : link
                )
            )
            toast.success(isActive ? 'Деактивировано' : 'Активировано')
        }
    }

    const deletePromoLink = async (id: string) => {
        if (!confirm('Удалить промо-ссылку?')) return

        const { error } = await supabase
            .from('promo_links')
            .delete()
            .eq('id', id)

        if (!error) {
            setPromoLinks(links => links.filter(link => link.id !== id))
            toast.success('Удалено')
        }
    }

    const copyLink = async (code: string, id: string) => {
        const link = `https://t.me/${BOT_USERNAME}?startapp=${code}`
        await navigator.clipboard.writeText(link)
        setCopiedId(id)
        toast.success('Ссылка скопирована!')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const getStats = (id: string) => stats.get(id) || { total_claims: 0, total_coins: 0 }

    const totalClaims = Array.from(stats.values()).reduce((acc, s) => acc + s.total_claims, 0)
    const totalCoins = Array.from(stats.values()).reduce((acc, s) => acc + s.total_coins, 0)

    if (isLoading) {
        return <div className="text-center py-8 text-gray-500">Загрузка...</div>
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Gift className="w-5 h-5 text-orange-500" />
                        Промо-ссылки
                    </h3>
                    <p className="text-sm text-gray-500">Одноразовые бонусы за переход</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors text-sm font-medium w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4" />
                    Создать промо
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{promoLinks.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Ссылок</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{totalClaims}</div>
                    <div className="text-xs text-gray-500 mt-1">Активаций</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{totalCoins}</div>
                    <div className="text-xs text-gray-500 mt-1">Монет выдано</div>
                </div>
            </div>

            {/* Create Form - упрощённая */}
            {showForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
                    <h4 className="font-medium text-gray-900">Новая промо-ссылка</h4>

                    {/* Монеты - ползунок с пресетами */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-3">
                            Количество монет: <span className="font-bold text-orange-600 text-lg">{newCoins}</span>
                        </label>

                        {/* Пресеты */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[10, 25, 50, 100, 200, 500].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setNewCoins(preset)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${newCoins === preset
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>

                        {/* Ползунок */}
                        <input
                            type="range"
                            min={10}
                            max={500}
                            step={10}
                            value={newCoins}
                            onChange={(e) => setNewCoins(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>10</span>
                            <span>500</span>
                        </div>
                    </div>

                    {/* Источник трафика */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-2">
                            Источник трафика
                        </label>
                        <input
                            type="text"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Instagram Reels, Telegram, YouTube..."
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Кнопки */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={createPromoLink}
                            disabled={isCreating || newCoins < 1}
                            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Создание...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Создать ссылку
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Links List */}
            {promoLinks.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Нет промо-ссылок</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        Создать первую
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {promoLinks.map(link => {
                        const linkStats = getStats(link.id)

                        return (
                            <div
                                key={link.id}
                                className={`bg-white border rounded-xl p-4 transition-all ${link.is_active
                                    ? 'border-gray-200 hover:border-gray-300'
                                    : 'border-gray-200 opacity-50'
                                    }`}
                            >
                                {/* Row 1: Code + Coins + Actions */}
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                    <div className="flex flex-col gap-2">
                                        {/* Code badge */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                                                {link.code}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold">
                                                <Coins className="w-4 h-4" />
                                                {link.coins_amount}
                                            </span>
                                            {!link.is_active && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs">
                                                    Неактивна
                                                </span>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {link.description && (
                                            <p className="text-sm text-gray-600">
                                                📍 {link.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => copyLink(link.code, link.id)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Копировать ссылку"
                                        >
                                            {copiedId === link.id ? (
                                                <Check className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Copy className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                        <a
                                            href={`https://t.me/${BOT_USERNAME}?startapp=${link.code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Открыть ссылку"
                                        >
                                            <ExternalLink className="w-5 h-5 text-gray-400" />
                                        </a>
                                        <button
                                            onClick={() => toggleActive(link.id, link.is_active)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${link.is_active
                                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                                : 'bg-green-100 hover:bg-green-200 text-green-700'
                                                }`}
                                        >
                                            {link.is_active ? 'Выкл' : 'Вкл'}
                                        </button>
                                        <button
                                            onClick={() => deletePromoLink(link.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Удалить"
                                        >
                                            <Trash2 className="w-5 h-5 text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-500">Активаций:</span>
                                        <span className="text-sm font-bold text-green-600">{linkStats.total_claims}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-500">Выдано:</span>
                                        <span className="text-sm font-bold text-amber-600">{linkStats.total_coins}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
