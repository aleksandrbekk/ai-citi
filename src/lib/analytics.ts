// src/lib/analytics.ts
// Универсальный трекинг событий для product analytics

import { supabase } from './supabase'

// Генерация уникального session_id (сохраняется до перезагрузки)
function getSessionId(): string {
    const key = 'analytics_session_id'
    let sessionId = sessionStorage.getItem(key)
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        sessionStorage.setItem(key, sessionId)
    }
    return sessionId
}

// Получить telegram_id текущего пользователя
function getTelegramId(): number | null {
    // 1. Telegram Mini App
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (tgUser?.id) return tgUser.id

    // 2. Fallback: localStorage (веб-авторизация)
    try {
        const saved = localStorage.getItem('tg_user')
        if (saved) {
            const parsed = JSON.parse(saved)
            if (parsed?.id) return parsed.id
        }
    } catch {
        // ignore
    }

    return null
}

// Очередь событий для батчинга
let eventQueue: Array<{
    telegram_id: number
    event_name: string
    event_category: string | null
    event_data: Record<string, unknown>
    page_path: string
    session_id: string
}> = []

let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 3000 // Отправляем каждые 3 сек
const MAX_QUEUE_SIZE = 10   // Или когда в очереди 10+ событий

async function flushEvents() {
    if (eventQueue.length === 0) return

    const batch = [...eventQueue]
    eventQueue = []

    try {
        const { error } = await supabase.from('user_events').insert(batch)
        if (error) {
            console.error('[Analytics] Batch insert error:', error.message)
            // Не возвращаем в очередь — теряем, но не блокируем
        }
    } catch (e) {
        console.error('[Analytics] Flush error:', e)
    }
}

function scheduleFlush() {
    if (flushTimer) return
    flushTimer = setTimeout(() => {
        flushTimer = null
        flushEvents()
    }, FLUSH_INTERVAL)
}

// Очистка при закрытии страницы
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (eventQueue.length > 0) {
            // Используем sendBeacon для надёжной отправки при закрытии
            const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_events`
            const headers = {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
            try {
                // fetch с keepalive для надёжной отправки при закрытии
                fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(eventQueue),
                    keepalive: true
                }).catch(() => { })
            } catch {
                // ignore
            }
            eventQueue = []
        }
    })
}

/**
 * Трекинг события
 * 
 * @param eventName - Имя события (page_view, button_click, feature_use)
 * @param eventCategory - Категория (navigation, carousel, coach, shop, school)
 * @param eventData - Произвольные данные
 * 
 * @example
 * trackEvent('page_view', 'navigation', { page: '/carousel' })
 * trackEvent('carousel_start', 'carousel', { style: 'APPLE', topic: 'AI' })
 * trackEvent('coach_tts_played', 'coach')
 */
export function trackEvent(
    eventName: string,
    eventCategory?: string,
    eventData?: Record<string, unknown>
): void {
    const telegramId = getTelegramId()
    if (!telegramId) return // Не трекаем анонимных

    const event = {
        telegram_id: telegramId,
        event_name: eventName,
        event_category: eventCategory || null,
        event_data: eventData || {},
        page_path: window.location.pathname,
        session_id: getSessionId()
    }

    eventQueue.push(event)

    if (eventQueue.length >= MAX_QUEUE_SIZE) {
        flushEvents()
    } else {
        scheduleFlush()
    }
}

/**
 * Трекинг просмотра страницы
 * Вызывается автоматически при смене маршрута
 */
export function trackPageView(path: string): void {
    trackEvent('page_view', 'navigation', { path })
}

// Утилитные хелперы для частых событий

export function trackCarouselEvent(action: string, data?: Record<string, unknown>): void {
    trackEvent(`carousel_${action}`, 'carousel', data)
}

export function trackCoachEvent(action: string, data?: Record<string, unknown>): void {
    trackEvent(`coach_${action}`, 'coach', data)
}

export function trackShopEvent(action: string, data?: Record<string, unknown>): void {
    trackEvent(`shop_${action}`, 'shop', data)
}

export function trackSchoolEvent(action: string, data?: Record<string, unknown>): void {
    trackEvent(`school_${action}`, 'school', data)
}
