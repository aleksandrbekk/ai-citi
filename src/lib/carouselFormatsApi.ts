/**
 * API для управления форматами каруселей через Supabase REST API
 * Паттерн аналогичен carouselStylesApi.ts
 */

const SUPABASE_URL = 'https://debcwvxlvozjlqkhnauy.supabase.co'
const FORMATS_API_URL = `${SUPABASE_URL}/rest/v1/carousel_formats`

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYmN3dnhsdm96amxxa2huYXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDk5NTksImV4cCI6MjA4MTQyNTk1OX0.PYX-O9CbKiNuVsR8CtidbvgTcPWqwUeuHcWq6uY2BG4'
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_CAROUSEL_SERVICE_KEY || ''

// ========== ТИПЫ ==========

export interface CarouselFormatDB {
    id: string
    format_id: string
    name: string
    emoji: string
    description: string | null
    slide_count: number
    content_system_prompt: string
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export interface CarouselFormatInput {
    format_id: string
    name: string
    emoji?: string
    description?: string | null
    slide_count?: number
    content_system_prompt?: string
    is_active?: boolean
    sort_order?: number
}

// ========== БАЗОВЫЙ FETCH ==========

async function formatsFetch(
    endpoint: string,
    options: RequestInit = {},
    useServiceKey = false
): Promise<Response> {
    if (useServiceKey && !SUPABASE_SERVICE_KEY) {
        throw new Error('VITE_CAROUSEL_SERVICE_KEY не установлен. Админские операции недоступны.')
    }
    const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        ...(options.headers as Record<string, string> || {}),
    }

    return fetch(`${FORMATS_API_URL}${endpoint}`, {
        ...options,
        headers,
    })
}

// ========== ЧТЕНИЕ (для юзеров) ==========

/**
 * Получить все активные форматы (для Settings Panel)
 */
export async function getActiveFormats(): Promise<CarouselFormatDB[]> {
    try {
        const response = await formatsFetch('?is_active=eq.true&order=sort_order.asc')
        if (!response.ok) {
            console.error('Failed to fetch active formats:', response.status)
            return []
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching active formats:', error)
        return []
    }
}

/**
 * Получить формат по format_id
 */
export async function getFormatByFormatId(formatId: string): Promise<CarouselFormatDB | null> {
    try {
        const response = await formatsFetch(`?format_id=eq.${formatId}`)
        if (!response.ok) return null
        const data = await response.json()
        return data?.[0] || null
    } catch (error) {
        console.error('Error fetching format:', error)
        return null
    }
}

// ========== АДМИНСКИЕ ОПЕРАЦИИ (CRUD) ==========

/**
 * Получить формат по UUID id (для редактора)
 */
export async function getFormatById(id: string): Promise<CarouselFormatDB | null> {
    try {
        const response = await formatsFetch(`?id=eq.${id}`, {}, true)
        if (!response.ok) return null
        const data = await response.json()
        return data?.[0] || null
    } catch (error) {
        console.error('Error fetching format by id:', error)
        return null
    }
}

/**
 * Получить ВСЕ форматы (для админки)
 */
export async function getAllFormats(): Promise<CarouselFormatDB[]> {
    try {
        const response = await formatsFetch('?order=sort_order.asc', {}, true)
        if (!response.ok) {
            console.error('Failed to fetch all formats:', response.status)
            return getActiveFormats() // fallback
        }
        return await response.json()
    } catch (error) {
        console.error('Error fetching all formats:', error)
        return []
    }
}

/**
 * Создать формат (админ)
 */
export async function createFormat(format: CarouselFormatInput): Promise<CarouselFormatDB | null> {
    try {
        const response = await formatsFetch('', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(format),
        }, true)

        if (!response.ok) {
            const error = await response.text()
            console.error('Failed to create format:', response.status, error)
            return null
        }

        const data = await response.json()
        return data?.[0] || data
    } catch (error) {
        console.error('Error creating format:', error)
        throw error
    }
}

/**
 * Обновить формат (админ)
 */
export async function updateFormat(
    id: string,
    updates: Partial<CarouselFormatInput>
): Promise<CarouselFormatDB | null> {
    try {
        const response = await formatsFetch(`?id=eq.${id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
        }, true)

        if (!response.ok) {
            const error = await response.text()
            console.error('Failed to update format:', response.status, error)
            return null
        }

        const data = await response.json()
        return data?.[0] || data
    } catch (error) {
        console.error('Error updating format:', error)
        throw error
    }
}

/**
 * Удалить формат (админ)
 */
export async function deleteFormat(id: string): Promise<boolean> {
    try {
        const response = await formatsFetch(`?id=eq.${id}`, {
            method: 'DELETE',
        }, true)

        if (!response.ok) {
            console.error('Failed to delete format:', response.status)
            return false
        }
        return true
    } catch (error) {
        console.error('Error deleting format:', error)
        return false
    }
}

/**
 * Переключить активность формата (админ)
 */
export async function toggleFormatActive(id: string, isActive: boolean): Promise<boolean> {
    const result = await updateFormat(id, { is_active: isActive })
    return result !== null
}
