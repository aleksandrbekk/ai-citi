import { useState, useEffect } from 'react'
import { isAdmin } from '@/config/admins'
import { getTelegramUser } from '@/lib/telegram'
import { getCarouselStyles, getGlobalSystemPrompt } from '@/lib/carouselStylesApi'
import { VASIA_CORE, FORMAT_UNIVERSAL, STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'
import { supabase } from '@/lib/supabase'

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

type LogEntry = {
    time: string
    type: 'info' | 'success' | 'error' | 'warn'
    message: string
}

export default function CarouselTest() {
    const telegramUser = getTelegramUser()
    const [topic, setTopic] = useState('10 советов для продуктивности')
    const [styleId, setStyleId] = useState('cosmic_glow')
    const [isLoading, setIsLoading] = useState(false)
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [styles, setStyles] = useState<Array<{ id: string; title: string }>>([])
    const [engineStatus, setEngineStatus] = useState<'unknown' | 'ready' | 'no-config'>('unknown')

    // Проверка доступа
    if (!isAdmin(telegramUser?.id)) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-xl font-bold text-white mb-2">Доступ запрещён</h2>
                    <p className="text-[#94A3B8]">Эта страница доступна только администраторам</p>
                </div>
            </div>
        )
    }

    const addLog = (type: LogEntry['type'], message: string) => {
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [{ time, type, message }, ...prev])
    }

    // Загрузка стилей  
    useEffect(() => {
        async function loadStyles() {
            try {
                const dbStyles = await getCarouselStyles()
                if (dbStyles.length > 0) {
                    setStyles(dbStyles.map((s: any) => ({ id: s.id, title: s.title || s.id })))
                    addLog('info', `Загружено ${dbStyles.length} стилей из БД`)
                } else {
                    // Fallback на hardcoded
                    const ids = Object.keys(STYLE_CONFIGS) as StyleId[]
                    setStyles(ids.map(id => ({ id, title: id })))
                    addLog('warn', 'Стили из БД пусты, используем hardcoded')
                }
            } catch {
                addLog('error', 'Не удалось загрузить стили')
            }
        }
        loadStyles()
        checkEngineConfig()
    }, [])

    // Проверка конфига AI Engine
    async function checkEngineConfig() {
        try {
            const { data, error } = await supabase
                .from('ai_engine_config')
                .select('id, text_provider, text_model, image_provider, image_model, telegram_bot_token, use_internal_engine')
                .eq('is_active', true)
                .limit(1)
                .single()

            if (error || !data) {
                setEngineStatus('no-config')
                addLog('error', `Конфиг AI Engine не найден: ${error?.message || 'нет данных'}`)
                return
            }

            setEngineStatus('ready')
            addLog('success', `Конфиг: ${data.text_provider}/${data.text_model}, ${data.image_provider}/${data.image_model}`)
            addLog('info', `Feature flag: ${data.use_internal_engine ? '🟢 ENGINE' : '🔵 N8N'}`)

            if (!data.telegram_bot_token) {
                addLog('warn', '⚠️ Telegram bot token не задан — результат не придёт в Telegram')
            }
        } catch (err) {
            setEngineStatus('no-config')
            addLog('error', `Ошибка чтения конфига: ${err}`)
        }
    }

    // Запуск генерации через AI Engine Edge Function
    async function handleGenerate() {
        if (isLoading) return
        setIsLoading(true)
        addLog('info', '🚀 Запускаю генерацию через AI Engine...')

        try {
            // Собираем payload (аналог index.tsx)
            const chatId = telegramUser?.id
            if (!chatId) throw new Error('Нет Telegram ID')

            // Получаем styleConfig
            const styleConfig = STYLE_CONFIGS[styleId as StyleId] || {}
            const globalSystemPrompt = await getGlobalSystemPrompt()
            const stylePrompt = (styleConfig as unknown as Record<string, unknown>)?.style_prompt as string || ''

            addLog('info', `Topic: "${topic}"`)
            addLog('info', `Style: ${styleId}`)
            addLog('info', `StylePrompt length: ${stylePrompt.length}`)
            addLog('info', `SystemPrompt length: ${globalSystemPrompt.length}`)

            const payload = {
                chatId,
                topic: topic.trim(),
                userPhoto: null,
                cta: 'ПОДПИШИСЬ',
                ctaType: 'subscribe',
                gender: 'male',
                styleId,
                styleConfig,
                globalSystemPrompt,
                stylePrompt,
                vasiaCore: VASIA_CORE,
                formatConfig: FORMAT_UNIVERSAL,
                formatId: 'expert',
            }

            addLog('info', `Payload size: ${JSON.stringify(payload).length} bytes`)

            // Отправляем в carousel-engine Edge Function
            const url = `${SUPABASE_URL}/functions/v1/carousel-engine`
            addLog('info', `POST → ${url}`)

            const startTime = Date.now()
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(payload),
            })

            const elapsed = Date.now() - startTime
            const result = await response.json()

            if (response.ok) {
                addLog('success', `✅ Ответ за ${elapsed}ms: ${JSON.stringify(result)}`)
                addLog('info', '📱 Результат придёт в Telegram (пайплайн работает в фоне)')
            } else {
                addLog('error', `❌ Ошибка ${response.status}: ${JSON.stringify(result)}`)
            }
        } catch (err) {
            addLog('error', `💥 ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Запуск через n8n (для сравнения)
    async function handleGenerateN8N() {
        if (isLoading) return
        setIsLoading(true)
        addLog('info', '🔵 Запускаю генерацию через N8N...')

        try {
            const chatId = telegramUser?.id
            if (!chatId) throw new Error('Нет Telegram ID')

            const styleConfig = STYLE_CONFIGS[styleId as StyleId] || {}
            const globalSystemPrompt = await getGlobalSystemPrompt()
            const stylePrompt = (styleConfig as unknown as Record<string, unknown>)?.style_prompt as string || ''

            const payload = {
                chatId,
                topic: topic.trim(),
                userPhoto: null,
                cta: 'ПОДПИШИСЬ',
                ctaType: 'subscribe',
                gender: 'male',
                styleId,
                styleConfig,
                globalSystemPrompt,
                stylePrompt,
                vasiaCore: VASIA_CORE,
                formatConfig: FORMAT_UNIVERSAL,
                formatId: 'expert',
            }

            const startTime = Date.now()
            const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const elapsed = Date.now() - startTime

            if (response.ok) {
                addLog('success', `✅ N8N ответ за ${elapsed}ms`)
            } else {
                const text = await response.text()
                addLog('error', `❌ N8N ошибка ${response.status}: ${text.substring(0, 200)}`)
            }
        } catch (err) {
            addLog('error', `💥 N8N: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            setIsLoading(false)
        }
    }

    const logColors: Record<string, string> = {
        info: 'text-blue-400',
        success: 'text-green-400',
        error: 'text-red-400',
        warn: 'text-yellow-400',
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                </div>
                <div>
                    <h1 className="text-xl font-bold">Carousel Test</h1>
                    <p className="text-[#94A3B8] text-sm">
                        Тест AI Engine •{' '}
                        <span className={engineStatus === 'ready' ? 'text-green-400' : 'text-red-400'}>
                            {engineStatus === 'ready' ? '🟢 Конфиг ОК' : engineStatus === 'no-config' ? '🔴 Нет конфига' : '⏳'}
                        </span>
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="space-y-4 mb-6">
                {/* Topic */}
                <div>
                    <label className="block text-sm text-[#94A3B8] mb-1">Тема карусели</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        className="w-full px-4 py-3 bg-[#1E293B] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Введите тему..."
                    />
                </div>

                {/* Style */}
                <div>
                    <label className="block text-sm text-[#94A3B8] mb-1">Стиль</label>
                    <select
                        value={styleId}
                        onChange={e => setStyleId(e.target.value)}
                        className="w-full px-4 py-3 bg-[#1E293B] border border-[#334155] rounded-xl text-white focus:ring-2 focus:ring-orange-500"
                    >
                        {styles.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className="px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <span>⚡</span>
                        )}
                        AI Engine
                    </button>

                    <button
                        onClick={handleGenerateN8N}
                        disabled={isLoading || !topic.trim()}
                        className="px-4 py-3 bg-[#1E293B] border border-[#334155] text-white rounded-xl font-medium hover:bg-[#334155] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <span>🔵</span>
                        )}
                        N8N
                    </button>
                </div>
            </div>

            {/* Logs Console */}
            <div className="bg-[#0A0F1A] rounded-xl border border-[#1E293B] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B]/50 border-b border-[#334155]">
                    <span className="text-sm font-medium text-[#94A3B8]">📋 Console</span>
                    <button
                        onClick={() => setLogs([])}
                        className="text-xs text-[#64748B] hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                </div>
                <div className="p-3 max-h-[50vh] overflow-y-auto font-mono text-xs space-y-1">
                    {logs.length === 0 ? (
                        <p className="text-[#64748B]">Нет логов. Нажми "AI Engine" для теста.</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-[#64748B] whitespace-nowrap">{log.time}</span>
                                <span className={logColors[log.type]}>{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="mt-4 p-4 bg-[#1E293B] rounded-xl border border-[#334155]">
                <h3 className="font-medium text-sm text-[#94A3B8] mb-2">ℹ️ Как тестировать:</h3>
                <ol className="text-xs text-[#64748B] space-y-1 list-decimal list-inside">
                    <li>Заполни конфиг в админке → AI Engine (API ключи, токен бота)</li>
                    <li>Выбери тему и стиль</li>
                    <li>Нажми "⚡ AI Engine" — результат придёт в Telegram</li>
                    <li>Кнопка "🔵 N8N" — для сравнения с текущим движком</li>
                    <li>Логи генерации видны в Admin → AI Engine → Логи</li>
                </ol>
            </div>
        </div>
    )
}
