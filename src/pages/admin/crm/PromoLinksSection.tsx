import { useState, useEffect } from 'react'
import { Plus, Copy, Trash2, Check, ExternalLink, Coins, Gift } from 'lucide-react'
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

    // Form state
    const [newCode, setNewCode] = useState('')
    const [newCoins, setNewCoins] = useState(50)
    const [newDescription, setNewDescription] = useState('')
    const [newMaxUses, setNewMaxUses] = useState<number | ''>('')

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
        } finally {
            setIsLoading(false)
        }
    }

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewCode(code)
    }

    const createPromoLink = async () => {
        if (!newCode.trim()) {
            toast.error('Введите код промо-ссылки')
            return
        }

        try {
            const { error } = await supabase
                .from('promo_links')
                .insert({
                    code: newCode.toUpperCase(),
                    coins_amount: newCoins,
                    description: newDescription || null,
                    max_uses: newMaxUses || null,
                })

            if (error) throw error

            toast.success('Промо-ссылка создана!')
            setNewCode('')
            setNewCoins(50)
            setNewDescription('')
            setNewMaxUses('')
            setShowForm(false)
            fetchPromoLinks()
        } catch (error: unknown) {
            console.error('Error creating promo link:', error)
            const err = error as { code?: string }
            if (err.code === '23505') {
                toast.error('Код уже существует')
            } else {
                toast.error('Ошибка создания')
            }
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

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    if (isLoading) {
        return <div className="text-center py-8 text-gray-500">Загрузка...</div>
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Gift className="w-5 h-5 text-orange-400" />
                        Промо-ссылки
                    </h3>
                    <p className="text-sm text-gray-500">Одноразовые бонусы за переход</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Создать
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{promoLinks.length}</div>
                    <div className="text-xs text-gray-500">Ссылок</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-500">
                        {Array.from(stats.values()).reduce((acc, s) => acc + s.total_claims, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Активаций</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-500">
                        {Array.from(stats.values()).reduce((acc, s) => acc + s.total_coins, 0)}
                    </div>
                    <div className="text-xs text-gray-500">Монет</div>
                </div>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Код</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                    placeholder="BONUS50"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={generateCode}
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    🎲
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Монеты</label>
                            <input
                                type="number"
                                value={newCoins}
                                onChange={(e) => setNewCoins(Number(e.target.value))}
                                min={1}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Описание</label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Для Reels кампании"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Лимит</label>
                            <input
                                type="number"
                                value={newMaxUses}
                                onChange={(e) => setNewMaxUses(e.target.value ? Number(e.target.value) : '')}
                                placeholder="∞"
                                min={1}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={createPromoLink}
                            disabled={!newCode.trim()}
                            className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 rounded-lg text-sm font-medium"
                        >
                            Создать
                        </button>
                    </div>
                </div>
            )}

            {/* Links List */}
            {promoLinks.length === 0 ? (
                <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
                    <Gift className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Нет промо-ссылок</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {promoLinks.map(link => {
                        const linkStats = getStats(link.id)
                        const expired = isExpired(link.expires_at)
                        const limitReached = link.max_uses && link.uses_count >= link.max_uses

                        return (
                            <div
                                key={link.id}
                                className={`bg-white border rounded-lg p-3 ${!link.is_active || expired || limitReached ? 'opacity-60' : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-orange-500">{link.code}</span>
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                                            <Coins className="w-3 h-3" />
                                            {link.coins_amount}
                                        </span>
                                        {!link.is_active && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Выкл</span>
                                        )}
                                        {expired && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-500 rounded text-xs">Истёк</span>
                                        )}
                                        {limitReached && (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-500 rounded text-xs">Лимит</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyLink(link.code, link.id)}
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                        >
                                            {copiedId === link.id ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                        <a
                                            href={`https://t.me/${BOT_USERNAME}?startapp=${link.code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-gray-100 rounded"
                                        >
                                            <ExternalLink className="w-4 h-4 text-gray-400" />
                                        </a>
                                        <button
                                            onClick={() => toggleActive(link.id, link.is_active)}
                                            className={`px-2 py-1 rounded text-xs ${link.is_active
                                                    ? 'bg-gray-100 text-gray-600'
                                                    : 'bg-green-100 text-green-600'
                                                }`}
                                        >
                                            {link.is_active ? 'Выкл' : 'Вкл'}
                                        </button>
                                        <button
                                            onClick={() => deletePromoLink(link.id)}
                                            className="p-1.5 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                                {link.description && (
                                    <p className="text-xs text-gray-500 mb-2">{link.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Активаций: <strong className="text-green-500">{linkStats.total_claims}</strong> / {link.max_uses || '∞'}</span>
                                    <span>Монет выдано: <strong className="text-amber-500">{linkStats.total_coins}</strong></span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
