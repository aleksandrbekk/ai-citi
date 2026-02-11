import { useState, useEffect } from 'react'
import {
    Save,
    RefreshCw,
    Cpu,
    Image,
    Send,
    Sliders,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    EyeOff,
    Zap,
    ToggleLeft,
    ToggleRight,
    Plus,
    Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ============================================================
// TYPES
// ============================================================

interface ApiKeyEntry {
    key: string
    label: string
    enabled: boolean
}

interface AIEngineConfig {
    id: string
    text_provider: string
    text_api_key: string
    text_model: string
    text_fallback_provider: string | null
    text_fallback_key: string | null
    text_fallback_model: string | null
    text_api_keys: ApiKeyEntry[] | null
    text_fallback_keys: ApiKeyEntry[] | null
    image_provider: string
    image_api_key: string
    image_model: string
    image_api_keys: ApiKeyEntry[] | null
    image_fallback_provider: string | null
    image_fallback_model: string | null
    image_fallback_key: string | null
    image_fallback_keys: ApiKeyEntry[] | null
    telegram_bot_token: string
    cloudinary_cloud: string
    cloudinary_preset: string
    max_retries: number
    use_search_grounding: boolean
    use_internal_engine: boolean
    is_active: boolean
    updated_at: string
    updated_by: number | null
}

interface GenerationLog {
    id: string
    user_id: number
    topic: string
    style_id: string
    text_provider: string
    text_model: string
    image_provider: string
    image_model: string
    status: string
    error_message: string | null
    error_stage: string | null
    text_gen_ms: number | null
    image_gen_ms: number | null
    upload_ms: number | null
    telegram_ms: number | null
    total_ms: number | null
    slides_count: number | null
    created_at: string
}

// ============================================================
// CONSTANTS
// ============================================================

const TEXT_PROVIDERS = [
    { value: 'gemini', label: 'Google Gemini', desc: 'Vertex AI, Google Search grounding' },
    { value: 'openrouter', label: 'OpenRouter', desc: 'Claude, GPT-4o, Llama и другие' },
]

const TEXT_MODELS = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
    { value: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash (OR)', provider: 'openrouter' },
    { value: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro (OR)', provider: 'openrouter' },
    { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'openrouter' },
    { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'openrouter' },
    { value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', provider: 'openrouter' },
]

const IMAGE_PROVIDERS = [
    { value: 'openrouter', label: 'OpenRouter', desc: 'Gemini, Claude и другие модели для картинок' },
    { value: 'gemini', label: 'Gemini Image', desc: 'Google AI Studio, нативная генерация' },
    { value: 'imagen', label: 'Google Imagen', desc: 'Vertex AI, лучшее качество' },
    { value: 'ideogram', label: 'Ideogram', desc: 'Хороший текст на картинках' },
]

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    generating_text: 'bg-blue-100 text-blue-700',
    generating_images: 'bg-violet-100 text-violet-700',
    uploading: 'bg-cyan-100 text-cyan-700',
    sending: 'bg-orange-100 text-orange-700',
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
}

// ============================================================
// COMPONENT
// ============================================================

export function AIEngineSettings() {
    const [config, setConfig] = useState<AIEngineConfig | null>(null)
    const [logs, setLogs] = useState<GenerationLog[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config')
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

    // Load config and logs
    useEffect(() => {
        loadConfig()
        loadLogs()
    }, [])

    async function loadConfig() {
        try {
            const { data, error } = await supabase
                .from('ai_engine_config')
                .select('*')
                .limit(1)
                .single()

            if (error && error.code === 'PGRST116') {
                // No config yet — create default
                const { data: newData, error: insertError } = await supabase
                    .from('ai_engine_config')
                    .insert({})
                    .select()
                    .single()
                if (insertError) throw insertError
                setConfig(newData)
            } else if (error) {
                throw error
            } else {
                setConfig(data)
            }
        } catch (err) {
            console.error('Failed to load AI Engine config:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadLogs() {
        try {
            const { data, error } = await supabase
                .from('ai_generation_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setLogs(data || [])
        } catch (err) {
            console.error('Failed to load generation logs:', err)
        }
    }

    async function saveConfig() {
        if (!config) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('ai_engine_config')
                .update({
                    text_provider: config.text_provider,
                    text_api_key: config.text_api_key,
                    text_model: config.text_model,
                    text_fallback_provider: config.text_fallback_provider,
                    text_fallback_key: config.text_fallback_key,
                    text_fallback_model: config.text_fallback_model,
                    text_api_keys: config.text_api_keys,
                    text_fallback_keys: config.text_fallback_keys,
                    image_provider: config.image_provider,
                    image_api_key: config.image_api_key,
                    image_model: config.image_model,
                    image_api_keys: config.image_api_keys,
                    image_fallback_provider: config.image_fallback_provider,
                    image_fallback_model: config.image_fallback_model,
                    image_fallback_key: config.image_fallback_key,
                    image_fallback_keys: config.image_fallback_keys,
                    telegram_bot_token: config.telegram_bot_token,
                    cloudinary_cloud: config.cloudinary_cloud,
                    cloudinary_preset: config.cloudinary_preset,
                    max_retries: config.max_retries,
                    use_search_grounding: config.use_search_grounding,
                    use_internal_engine: config.use_internal_engine,
                    is_active: config.is_active,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', config.id)

            if (error) throw error
            alert('✅ Конфигурация сохранена!')
        } catch (err) {
            console.error('Failed to save config:', err)
            alert('❌ Ошибка сохранения')
        } finally {
            setSaving(false)
        }
    }

    function updateConfig(field: keyof AIEngineConfig, value: unknown) {
        if (!config) return
        setConfig({ ...config, [field]: value })
    }

    function toggleKeyVisibility(field: string) {
        setShowKeys(prev => ({ ...prev, [field]: !prev[field] }))
    }

    function maskKey(key: string): string {
        if (!key) return '—'
        if (key.length <= 8) return '•'.repeat(key.length)
        return key.substring(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.substring(key.length - 4)
    }

    function formatMs(ms: number | null): string {
        if (ms === null) return '—'
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(1)}s`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-400" />
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        AI Engine
                    </h2>
                    <p className="text-gray-500 mt-1">Настройки генерации каруселей без n8n</p>
                </div>

                {/* Feature flag toggle */}
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${config?.use_internal_engine
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                        }`}>
                        {config?.use_internal_engine ? '⚡ AI Engine' : '🔵 n8n'}
                    </span>
                    <button
                        onClick={() => updateConfig('use_internal_engine', !config?.use_internal_engine)}
                        className="transition-all hover:scale-105"
                    >
                        {config?.use_internal_engine ? (
                            <ToggleRight className="w-10 h-10 text-emerald-500" />
                        ) : (
                            <ToggleLeft className="w-10 h-10 text-gray-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'config'
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                        : 'bg-white/80 text-gray-500 hover:text-gray-900 border border-gray-200'
                        }`}
                >
                    <Sliders className="w-4 h-4 inline mr-2" />
                    Конфигурация
                </button>
                <button
                    onClick={() => { setActiveTab('logs'); loadLogs() }}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'logs'
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                        : 'bg-white/80 text-gray-500 hover:text-gray-900 border border-gray-200'
                        }`}
                >
                    <Activity className="w-4 h-4 inline mr-2" />
                    Логи ({logs.length})
                </button>
            </div>

            {/* === CONFIG TAB === */}
            {activeTab === 'config' && config && (
                <div className="space-y-5">
                    {/* Text Generation */}
                    <Section title="Генерация текста" icon={<Cpu className="w-5 h-5 text-orange-500" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Провайдер</Label>
                                <select
                                    value={config.text_provider}
                                    onChange={e => updateConfig('text_provider', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                >
                                    {TEXT_PROVIDERS.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Модель</Label>
                                <select
                                    value={config.text_model}
                                    onChange={e => updateConfig('text_model', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                >
                                    {TEXT_MODELS.filter(m => m.provider === config.text_provider).map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label>API ключ</Label>
                            <ApiKeyInput
                                value={config.text_api_key}
                                onChange={v => updateConfig('text_api_key', v)}
                                visible={showKeys['text_api_key'] || false}
                                onToggle={() => toggleKeyVisibility('text_api_key')}
                                masked={maskKey(config.text_api_key)}
                                placeholder="AI ключ для текстового провайдера"
                            />
                        </div>

                        {config.text_provider === 'gemini' && (
                            <div className="mt-4 flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={config.use_search_grounding}
                                    onChange={e => updateConfig('use_search_grounding', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="text-gray-600 text-sm">Google Search Grounding (актуальные данные)</span>
                            </div>
                        )}

                        {/* Multi-key rotation */}
                        {config.text_provider !== 'gemini' && (
                            <div className="mt-4">
                                <Label>Ротация ключей (текст)</Label>
                                <p className="text-xs text-gray-400 mb-2">Если один ключ упирается в лимит, следующий подхватывает</p>
                                <MultiKeyEditor
                                    keys={config.text_api_keys}
                                    onChange={keys => updateConfig('text_api_keys', keys)}
                                    placeholder="API key для текстового провайдера"
                                />
                            </div>
                        )}

                        {/* Fallback */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                            <p className="text-sm text-gray-500 mb-3">⚡ Резервный провайдер (fallback)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Провайдер</Label>
                                    <select
                                        value={config.text_fallback_provider || ''}
                                        onChange={e => updateConfig('text_fallback_provider', e.target.value || null)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">Нет</option>
                                        {TEXT_PROVIDERS.filter(p => p.value !== config.text_provider).map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {config.text_fallback_provider && (
                                    <div>
                                        <Label>Модель fallback</Label>
                                        <select
                                            value={config.text_fallback_model || ''}
                                            onChange={e => updateConfig('text_fallback_model', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                        >
                                            <option value="">Та же что основная</option>
                                            {TEXT_MODELS.filter(m => m.provider === config.text_fallback_provider).map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {config.text_fallback_provider && (
                                <div className="mt-3">
                                    <ApiKeyInput
                                        value={config.text_fallback_key || ''}
                                        onChange={v => updateConfig('text_fallback_key', v)}
                                        visible={showKeys['text_fallback_key'] || false}
                                        onToggle={() => toggleKeyVisibility('text_fallback_key')}
                                        masked={maskKey(config.text_fallback_key || '')}
                                        placeholder="Fallback API key"
                                        small
                                    />
                                </div>
                            )}
                            {config.text_fallback_provider && config.text_fallback_provider !== 'gemini' && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-400 mb-2">Ротация fallback ключей</p>
                                    <MultiKeyEditor
                                        keys={config.text_fallback_keys}
                                        onChange={keys => updateConfig('text_fallback_keys', keys)}
                                        placeholder="Fallback API key"
                                    />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Image Generation */}
                    <Section title="Генерация изображений" icon={<Image className="w-5 h-5 text-cyan-500" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Провайдер</Label>
                                <select
                                    value={config.image_provider}
                                    onChange={e => updateConfig('image_provider', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                >
                                    {IMAGE_PROVIDERS.map(p => (
                                        <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Модель</Label>
                                <input
                                    type="text"
                                    value={config.image_model}
                                    onChange={e => updateConfig('image_model', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    placeholder="imagen-4"
                                />
                            </div>
                        </div>

                        {(config.image_provider === 'ideogram' || config.image_provider === 'gemini') && (
                            <div className="mt-4">
                                <Label>API ключ {config.image_provider === 'gemini' ? 'Google AI Studio' : 'Ideogram'}</Label>
                                <ApiKeyInput
                                    value={config.image_api_key}
                                    onChange={v => updateConfig('image_api_key', v)}
                                    visible={showKeys['image_api_key'] || false}
                                    onToggle={() => toggleKeyVisibility('image_api_key')}
                                    masked={maskKey(config.image_api_key)}
                                    placeholder={config.image_provider === 'gemini' ? 'Google AI Studio API key' : 'Ideogram API key'}
                                />
                            </div>
                        )}

                        {/* Multi-key rotation for images */}
                        {config.image_provider !== 'imagen' && (
                            <div className="mt-4">
                                <Label>Ротация ключей (картинки)</Label>
                                <p className="text-xs text-gray-400 mb-2">Если один ключ упирается в лимит, следующий подхватывает</p>
                                <MultiKeyEditor
                                    keys={config.image_api_keys}
                                    onChange={keys => updateConfig('image_api_keys', keys)}
                                    placeholder="API key для провайдера картинок"
                                />
                            </div>
                        )}

                        {/* Image Fallback */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                            <p className="text-sm text-gray-500 mb-3">⚡ Резервный провайдер картинок (fallback)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Провайдер</Label>
                                    <select
                                        value={config.image_fallback_provider || ''}
                                        onChange={e => updateConfig('image_fallback_provider', e.target.value || null)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">Нет</option>
                                        {IMAGE_PROVIDERS.filter(p => p.value !== config.image_provider).map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {config.image_fallback_provider && (
                                    <div>
                                        <Label>Модель fallback</Label>
                                        <input
                                            type="text"
                                            value={config.image_fallback_model || ''}
                                            onChange={e => updateConfig('image_fallback_model', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="Та же модель"
                                        />
                                    </div>
                                )}
                            </div>
                            {config.image_fallback_provider && config.image_fallback_provider !== 'imagen' && (
                                <div className="mt-3">
                                    <ApiKeyInput
                                        value={config.image_fallback_key || ''}
                                        onChange={v => updateConfig('image_fallback_key', v)}
                                        visible={showKeys['image_fallback_key'] || false}
                                        onToggle={() => toggleKeyVisibility('image_fallback_key')}
                                        masked={maskKey(config.image_fallback_key || '')}
                                        placeholder="Fallback image API key"
                                        small
                                    />
                                </div>
                            )}
                            {config.image_fallback_provider && config.image_fallback_provider !== 'imagen' && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-400 mb-2">Ротация fallback ключей (картинки)</p>
                                    <MultiKeyEditor
                                        keys={config.image_fallback_keys}
                                        onChange={keys => updateConfig('image_fallback_keys', keys)}
                                        placeholder="Fallback image API key"
                                    />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Delivery */}
                    <Section title="Доставка" icon={<Send className="w-5 h-5 text-emerald-500" />}>
                        <div>
                            <Label>Telegram Bot Token</Label>
                            <ApiKeyInput
                                value={config.telegram_bot_token}
                                onChange={v => updateConfig('telegram_bot_token', v)}
                                visible={showKeys['telegram_bot_token'] || false}
                                onToggle={() => toggleKeyVisibility('telegram_bot_token')}
                                masked={maskKey(config.telegram_bot_token)}
                                placeholder="123456:ABC-DEF..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <Label>Cloudinary Cloud</Label>
                                <input
                                    type="text"
                                    value={config.cloudinary_cloud}
                                    onChange={e => updateConfig('cloudinary_cloud', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    placeholder="ds8ylsl2x"
                                />
                            </div>
                            <div>
                                <Label>Upload Preset</Label>
                                <input
                                    type="text"
                                    value={config.cloudinary_preset}
                                    onChange={e => updateConfig('cloudinary_preset', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    placeholder="carousel_unsigned"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Settings */}
                    <Section title="Настройки" icon={<Sliders className="w-5 h-5 text-orange-500" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Макс. повторов при ошибке</Label>
                                <input
                                    type="number"
                                    value={config.max_retries}
                                    onChange={e => updateConfig('max_retries', parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={5}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={saveConfig}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                        >
                            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            )}

            {/* === LOGS TAB === */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-gray-500 text-sm">Последние 50 генераций</p>
                        <button
                            onClick={loadLogs}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-gray-900 hover:border-gray-300 transition-all text-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Обновить
                        </button>
                    </div>

                    {logs.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-gray-500">Нет логов генераций</p>
                            <p className="text-sm mt-1">Они появятся после первой генерации через AI Engine</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 hover:border-orange-300 hover:shadow-sm transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                {log.status === 'success' ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                ) : log.status === 'error' ? (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                ) : (
                                                    <Clock className="w-5 h-5 text-amber-500" />
                                                )}
                                                <span className="font-medium text-gray-900">
                                                    {log.topic?.substring(0, 60) || 'Без темы'}
                                                    {(log.topic?.length || 0) > 60 ? '...' : ''}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[log.status] || 'bg-gray-100 text-gray-500'}`}>
                                                    {log.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span>👤 {log.user_id}</span>
                                                <span>🎨 {log.style_id || '—'}</span>
                                                <span>📝 {log.text_provider}/{log.text_model}</span>
                                                <span>🖼 {log.image_provider}/{log.image_model}</span>
                                                {log.slides_count && <span>📊 {log.slides_count} слайдов</span>}
                                            </div>

                                            {/* Timings */}
                                            {log.total_ms && (
                                                <div className="flex items-center gap-3 mt-2 text-xs">
                                                    <span className="text-blue-500">📝 {formatMs(log.text_gen_ms)}</span>
                                                    <span className="text-violet-500">🖼 {formatMs(log.image_gen_ms)}</span>
                                                    <span className="text-cyan-500">☁️ {formatMs(log.upload_ms)}</span>
                                                    <span className="text-orange-500">📤 {formatMs(log.telegram_ms)}</span>
                                                    <span className="text-emerald-600 font-medium">Σ {formatMs(log.total_ms)}</span>
                                                </div>
                                            )}

                                            {/* Error */}
                                            {log.error_message && (
                                                <div className="mt-2 px-3 py-2 bg-red-50 rounded-lg text-red-600 text-xs border border-red-100">
                                                    {log.error_stage && <span className="font-medium">Этап: {log.error_stage} — </span>}
                                                    {log.error_message}
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                            {new Date(log.created_at).toLocaleString('ru-RU', {
                                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-sm font-medium text-gray-600 mb-1.5">{children}</label>
}

function ApiKeyInput({
    value,
    onChange,
    visible,
    onToggle,
    masked,
    placeholder,
    small = false,
}: {
    value: string
    onChange: (v: string) => void
    visible: boolean
    onToggle: () => void
    masked: string
    placeholder: string
    small?: boolean
}) {
    return (
        <div className="relative">
            <input
                type={visible ? 'text' : 'password'}
                value={visible ? value : masked}
                onChange={e => onChange(e.target.value)}
                onFocus={() => { if (!visible) onToggle() }}
                className={`w-full bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12 transition-all ${small ? 'px-3 py-2 text-sm' : 'px-4 py-3'
                    }`}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    )
}

function MultiKeyEditor({
    keys,
    onChange,
    placeholder,
}: {
    keys: ApiKeyEntry[] | null
    onChange: (keys: ApiKeyEntry[]) => void
    placeholder: string
}) {
    const list = keys || []
    const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})

    const addKey = () => {
        onChange([...list, { key: '', label: `Key ${list.length + 1}`, enabled: true }])
    }

    const removeKey = (index: number) => {
        onChange(list.filter((_, i) => i !== index))
    }

    const updateKey = (index: number, field: keyof ApiKeyEntry, value: unknown) => {
        const updated = [...list]
        updated[index] = { ...updated[index], [field]: value }
        onChange(updated)
    }

    const toggleVisible = (index: number) => {
        setVisibleKeys(prev => ({ ...prev, [index]: !prev[index] }))
    }

    return (
        <div className="space-y-2">
            {list.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={e => updateKey(i, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 shrink-0"
                    />
                    <input
                        type="text"
                        value={entry.label}
                        onChange={e => updateKey(i, 'label', e.target.value)}
                        className="w-28 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm shrink-0"
                        placeholder="Label"
                    />
                    <div className="flex-1 relative">
                        <input
                            type={visibleKeys[i] ? 'text' : 'password'}
                            value={entry.key}
                            onChange={e => updateKey(i, 'key', e.target.value)}
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono pr-10"
                            placeholder={placeholder}
                        />
                        <button
                            type="button"
                            onClick={() => toggleVisible(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            aria-label={visibleKeys[i] ? 'Скрыть ключ' : 'Показать ключ'}
                        >
                            {visibleKeys[i] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                    <button
                        onClick={() => removeKey(i)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
                        aria-label="Удалить ключ"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addKey}
                className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium cursor-pointer transition-colors"
            >
                <Plus className="w-4 h-4" />
                Добавить ключ
            </button>
        </div>
    )
}
