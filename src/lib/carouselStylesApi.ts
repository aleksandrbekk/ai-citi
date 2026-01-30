/**
 * API для управления стилями каруселей через Supabase REST API
 *
 * Этот модуль вызывает Supabase REST API напрямую для проекта со стилями.
 * Это позволяет работать со стилями независимо от настроек окружения Vercel.
 *
 * Чтение: работает с anon key (RLS разрешает SELECT для активных стилей)
 * Запись: требует service_role_key (в Edge Function или backend)
 */

// URL Supabase проекта со стилями каруселей
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co'
const REST_API_URL = `${SUPABASE_URL}/rest/v1/carousel_styles`

// Anon key для авторизации запросов (публичный ключ)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

export interface CarouselStyleDB {
  id: string
  style_id: string
  name: string
  description: string | null
  emoji: string
  audience: 'universal' | 'female' | 'male'
  preview_color: string
  preview_image: string | null
  is_active: boolean
  config: Record<string, unknown>
  example_images: string[]
  created_at: string
  updated_at: string
}

export interface CarouselStyleInput {
  style_id: string
  name: string
  description?: string | null
  emoji?: string
  audience?: 'universal' | 'female' | 'male'
  preview_color?: string
  preview_image?: string | null
  is_active?: boolean
  config: Record<string, unknown>
  example_images?: string[]
}

/**
 * Базовый fetch с авторизацией для Supabase REST API
 */
async function supabaseFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    ...(options.headers as Record<string, string> || {}),
  }

  return fetch(`${REST_API_URL}${endpoint}`, {
    ...options,
    headers,
  })
}

/**
 * Получить все активные стили каруселей
 */
export async function getCarouselStyles(): Promise<CarouselStyleDB[]> {
  try {
    const response = await supabaseFetch('?is_active=eq.true&order=created_at.asc')

    if (!response.ok) {
      console.error('Failed to fetch carousel styles:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching carousel styles:', error)
    return []
  }
}

/**
 * Получить все стили (включая неактивные) - для админки
 *
 * ВАЖНО: RLS разрешает чтение только активных стилей для anon.
 * Для чтения неактивных стилей нужен service_role или изменение RLS.
 * Временно возвращаем все стили (если RLS позволяет).
 */
export async function getAllCarouselStyles(): Promise<CarouselStyleDB[]> {
  try {
    // Пробуем получить все стили - RLS может ограничить
    const response = await supabaseFetch('?order=created_at.asc')

    if (!response.ok) {
      console.error('Failed to fetch all carousel styles:', response.status)
      // Fallback: получить только активные
      return getCarouselStyles()
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching all carousel styles:', error)
    return []
  }
}

/**
 * Получить стиль по ID
 */
export async function getCarouselStyleById(id: string): Promise<CarouselStyleDB | null> {
  try {
    const response = await supabaseFetch(`?id=eq.${id}`)

    if (!response.ok) {
      console.error('Failed to fetch carousel style:', response.status)
      return null
    }

    const data = await response.json()
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching carousel style:', error)
    return null
  }
}

/**
 * Получить стиль по style_id
 */
export async function getCarouselStyleByStyleId(styleId: string): Promise<CarouselStyleDB | null> {
  try {
    const response = await supabaseFetch(`?style_id=eq.${styleId}`)

    if (!response.ok) {
      console.error('Failed to fetch carousel style by style_id:', response.status)
      return null
    }

    const data = await response.json()
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching carousel style by style_id:', error)
    return null
  }
}

/**
 * Создать новый стиль
 *
 * ВАЖНО: Требует service_role_key. С anon key не работает из-за RLS.
 * Для работы нужно задеплоить Edge Function carousel-styles.
 */
export async function createCarouselStyle(style: CarouselStyleInput): Promise<CarouselStyleDB | null> {
  try {
    const response = await supabaseFetch('', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(style),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create carousel style:', response.status, error)
      // Показываем пользователю понятное сообщение
      if (response.status === 403 || response.status === 401) {
        throw new Error('Недостаточно прав для создания стиля. Обратитесь к администратору.')
      }
      return null
    }

    const data = await response.json()
    return data?.[0] || data
  } catch (error) {
    console.error('Error creating carousel style:', error)
    throw error
  }
}

/**
 * Обновить стиль
 *
 * ВАЖНО: Требует service_role_key. С anon key не работает из-за RLS.
 */
export async function updateCarouselStyle(
  id: string,
  updates: Partial<CarouselStyleInput>
): Promise<CarouselStyleDB | null> {
  try {
    const response = await supabaseFetch(`?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to update carousel style:', response.status, error)
      if (response.status === 403 || response.status === 401) {
        throw new Error('Недостаточно прав для редактирования стиля. Обратитесь к администратору.')
      }
      return null
    }

    const data = await response.json()
    return data?.[0] || data
  } catch (error) {
    console.error('Error updating carousel style:', error)
    throw error
  }
}

/**
 * Удалить стиль (мягкое удаление - деактивация)
 *
 * ВАЖНО: Требует service_role_key. С anon key не работает из-за RLS.
 */
export async function deleteCarouselStyle(id: string): Promise<boolean> {
  try {
    const response = await supabaseFetch(`?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to delete carousel style:', response.status, error)
      if (response.status === 403 || response.status === 401) {
        throw new Error('Недостаточно прав для удаления стиля. Обратитесь к администратору.')
      }
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting carousel style:', error)
    throw error
  }
}

/**
 * Дублировать стиль
 */
export async function duplicateCarouselStyle(
  id: string,
  newStyleId: string,
  newName: string
): Promise<CarouselStyleDB | null> {
  const original = await getCarouselStyleById(id)
  if (!original) return null

  const duplicate: CarouselStyleInput = {
    style_id: newStyleId,
    name: newName,
    description: original.description,
    emoji: original.emoji,
    audience: original.audience,
    preview_color: original.preview_color,
    preview_image: original.preview_image,
    is_active: false, // Дубликат по умолчанию неактивен
    config: original.config,
    example_images: original.example_images,
  }

  return createCarouselStyle(duplicate)
}
