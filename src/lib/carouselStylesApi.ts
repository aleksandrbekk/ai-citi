/**
 * API для управления стилями каруселей через Edge Function
 *
 * Использует Edge Function carousel-styles для CRUD операций.
 * Edge Function имеет service_role доступ к базе данных.
 */

import { getTelegramUser } from './telegram'

// URL Supabase Functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://syxjkircmiwpnpagznay.supabase.co'
const FUNCTIONS_URL = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')
const STYLES_ENDPOINT = `${FUNCTIONS_URL}/carousel-styles`

// Anon key для авторизации Edge Function
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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
  sort_order: number
  config: Record<string, unknown>
  example_images: string[]
  created_at: string
  updated_at: string
  created_by: number | null
  updated_by: number | null
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
  sort_order?: number
  config: Record<string, unknown>
  example_images?: string[]
}

/**
 * Базовый fetch для Edge Function
 */
async function stylesFetch(
  endpoint: string = '',
  options: RequestInit = {}
): Promise<Response> {
  const user = getTelegramUser()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    ...(user?.id ? { 'x-telegram-id': String(user.id) } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  return fetch(`${STYLES_ENDPOINT}${endpoint}`, {
    ...options,
    headers,
  })
}

/**
 * Инициализация таблицы и стилей
 */
export async function initCarouselStyles(): Promise<{ success: boolean; message: string; needsSetup?: boolean; sql?: string }> {
  try {
    const response = await stylesFetch('?action=init')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error initializing carousel styles:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Получить все активные стили каруселей
 */
export async function getCarouselStyles(): Promise<CarouselStyleDB[]> {
  try {
    const response = await stylesFetch()
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
 */
export async function getAllCarouselStyles(): Promise<CarouselStyleDB[]> {
  try {
    const response = await stylesFetch('?all=true')
    if (!response.ok) {
      console.error('Failed to fetch all carousel styles:', response.status)
      return []
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
    const response = await stylesFetch(`/${id}`)
    if (!response.ok) {
      console.error('Failed to fetch carousel style:', response.status)
      return null
    }
    return await response.json()
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
    const response = await stylesFetch(`?style_id=${styleId}`)
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data) ? data[0] || null : data
  } catch (error) {
    console.error('Error fetching carousel style by style_id:', error)
    return null
  }
}

/**
 * Создать новый стиль (требует админ-доступ)
 */
export async function createCarouselStyle(style: CarouselStyleInput): Promise<CarouselStyleDB | null> {
  try {
    const response = await stylesFetch('', {
      method: 'POST',
      body: JSON.stringify(style),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to create carousel style:', error)
      throw new Error(error.error || 'Failed to create style')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating carousel style:', error)
    throw error
  }
}

/**
 * Обновить стиль (требует админ-доступ)
 */
export async function updateCarouselStyle(
  id: string,
  updates: Partial<CarouselStyleInput>
): Promise<CarouselStyleDB | null> {
  try {
    const response = await stylesFetch(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to update carousel style:', error)
      throw new Error(error.error || 'Failed to update style')
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating carousel style:', error)
    throw error
  }
}

/**
 * Удалить стиль (мягкое удаление - деактивация)
 */
export async function deleteCarouselStyle(id: string): Promise<boolean> {
  try {
    const response = await stylesFetch(`/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to delete carousel style:', error)
      throw new Error(error.error || 'Failed to delete style')
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
    is_active: false,
    sort_order: (original.sort_order || 0) + 1,
    config: original.config,
    example_images: original.example_images,
  }

  return createCarouselStyle(duplicate)
}

/**
 * Seed default styles (для ручной инициализации)
 */
export async function seedDefaultStyles(): Promise<{ success: boolean; created: number; errors: string[] }> {
  const result = await initCarouselStyles()

  if (result.needsSetup) {
    return {
      success: false,
      created: 0,
      errors: [`Таблица не существует. SQL для создания:\n${result.sql}`]
    }
  }

  if (result.success) {
    return {
      success: true,
      created: 5,
      errors: []
    }
  }

  return {
    success: false,
    created: 0,
    errors: [result.message]
  }
}
