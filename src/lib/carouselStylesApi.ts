/**
 * API для управления стилями каруселей через Supabase REST API
 *
 * Этот модуль вызывает Supabase REST API напрямую для проекта со стилями.
 * Это позволяет работать со стилями независимо от настроек окружения Vercel.
 *
 * ВАЖНО: Этот проект (syxjkircmiwpnpagznay) содержит ТОЛЬКО стили каруселей.
 * Основные данные приложения (пользователи, платежи) в другом проекте.
 */

// URL Supabase проекта AI CITI (debcwvxlvozjlqkhnauy)
const SUPABASE_URL = 'https://debcwvxlvozjlqkhnauy.supabase.co'
const REST_API_URL = `${SUPABASE_URL}/rest/v1/carousel_styles`
const SETTINGS_API_URL = `${SUPABASE_URL}/rest/v1/carousel_settings`

// Anon key для чтения (публичный)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYmN3dnhsdm96amxxa2huYXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDk5NTksImV4cCI6MjA4MTQyNTk1OX0.PYX-O9CbKiNuVsR8CtidbvgTcPWqwUeuHcWq6uY2BG4'

// Service role key для записи (обходит RLS)
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_CAROUSEL_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlYmN3dnhsdm96amxxa2huYXV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg0OTk1OSwiZXhwIjoyMDgxNDI1OTU5fQ.JQdPDqFfs055C4FzabojTUsU6X6qmIrNnJgTN_L21S8'

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
 * @param endpoint - REST API endpoint
 * @param options - fetch options
 * @param useServiceKey - использовать service key для записи (по умолчанию false)
 */
async function supabaseFetch(
  endpoint: string,
  options: RequestInit = {},
  useServiceKey = false
): Promise<Response> {
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json', // Явно указываем JSON array формат, не single object
    'Authorization': `Bearer ${key}`,
    'apikey': key,
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
 */
export async function getAllCarouselStyles(): Promise<CarouselStyleDB[]> {
  try {
    // Используем service key для доступа к неактивным стилям
    const response = await supabaseFetch('?order=created_at.asc', {}, true)

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
 * Создать новый стиль (требует админ-доступ)
 */
export async function createCarouselStyle(style: CarouselStyleInput): Promise<CarouselStyleDB | null> {
  try {
    const response = await supabaseFetch('', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(style),
    }, true) // useServiceKey = true

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
 * Обновить стиль (требует админ-доступ)
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
    }, true) // useServiceKey = true

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
 */
export async function deleteCarouselStyle(id: string): Promise<boolean> {
  try {
    const response = await supabaseFetch(`?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
      }),
    }, true) // useServiceKey = true

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

/**
 * Seed default styles from hardcoded STYLES_INDEX and STYLE_CONFIGS
 * Используется для первичной инициализации таблицы carousel_styles
 */
// ========== ГЛОБАЛЬНЫЕ НАСТРОЙКИ КАРУСЕЛЕЙ ==========

export interface CarouselSettings {
  id: string
  global_system_prompt: string
  created_at: string
  updated_at: string
}

/**
 * Fetch для таблицы carousel_settings
 */
async function settingsFetch(
  endpoint: string,
  options: RequestInit = {},
  useServiceKey = false
): Promise<Response> {
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    ...(options.headers as Record<string, string> || {}),
  }

  return fetch(`${SETTINGS_API_URL}${endpoint}`, {
    ...options,
    headers,
  })
}

/**
 * Получить глобальные настройки каруселей
 */
export async function getCarouselSettings(): Promise<CarouselSettings | null> {
  try {
    const response = await settingsFetch('?limit=1')

    if (!response.ok) {
      console.error('Failed to fetch carousel settings:', response.status)
      return null
    }

    const data = await response.json()
    return data?.[0] || null
  } catch (error) {
    console.error('Error fetching carousel settings:', error)
    return null
  }
}

/**
 * Получить глобальный системный промпт
 */
export async function getGlobalSystemPrompt(): Promise<string> {
  const settings = await getCarouselSettings()
  return settings?.global_system_prompt || ''
}

/**
 * Обновить глобальные настройки (upsert)
 */
export async function updateCarouselSettings(
  globalSystemPrompt: string
): Promise<CarouselSettings | null> {
  try {
    // Сначала проверяем, есть ли уже запись
    const existing = await getCarouselSettings()

    if (existing) {
      // UPDATE существующей записи
      const response = await settingsFetch(`?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          global_system_prompt: globalSystemPrompt,
          updated_at: new Date().toISOString(),
        }),
      }, true)

      if (!response.ok) {
        const error = await response.text()
        console.error('Failed to update carousel settings:', response.status, error)
        throw new Error('Не удалось сохранить настройки')
      }

      const data = await response.json()
      return data?.[0] || data
    } else {
      // INSERT новой записи
      const response = await settingsFetch('', {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          global_system_prompt: globalSystemPrompt,
        }),
      }, true)

      if (!response.ok) {
        const error = await response.text()
        console.error('Failed to create carousel settings:', response.status, error)
        throw new Error('Не удалось создать настройки')
      }

      const data = await response.json()
      return data?.[0] || data
    }
  } catch (error) {
    console.error('Error updating carousel settings:', error)
    throw error
  }
}

// ========== SEED СТИЛЕЙ ==========

export async function seedDefaultStyles(): Promise<{ success: boolean; created: number; errors: string[] }> {
  // Динамический импорт чтобы избежать циклической зависимости
  const { STYLES_INDEX, STYLE_CONFIGS } = await import('./carouselStyles')

  const errors: string[] = []
  let created = 0

  // Локальные превью изображения
  const localPreviews: Record<string, string> = {
    APPLE_GLASSMORPHISM: '/styles/apple.jpg',
    AESTHETIC_BEIGE: '/styles/beige.jpg',
    SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
    MINIMALIST_LINE_ART: '/styles/minimal.jpg',
    GRADIENT_MESH_3D: '/styles/gradient.jpg',
  }

  // Количество примеров для каждого стиля
  const exampleCounts: Record<string, number> = {
    APPLE_GLASSMORPHISM: 9,
    AESTHETIC_BEIGE: 9,
    SOFT_PINK_EDITORIAL: 7,
    MINIMALIST_LINE_ART: 9,
    GRADIENT_MESH_3D: 9,
  }

  for (const styleMeta of STYLES_INDEX) {
    try {
      // Проверяем, не существует ли уже такой стиль
      const existing = await getCarouselStyleByStyleId(styleMeta.id)
      if (existing) {
        console.log(`Style ${styleMeta.id} already exists, skipping`)
        continue
      }

      const config = STYLE_CONFIGS[styleMeta.id] || {}
      const exampleCount = exampleCounts[styleMeta.id] || 9
      const exampleImages = Array.from(
        { length: exampleCount },
        (_, i) => `/styles/${styleMeta.id}/example_${i + 1}.jpeg`
      )

      const styleInput: CarouselStyleInput = {
        style_id: styleMeta.id,
        name: styleMeta.name,
        description: styleMeta.description,
        emoji: styleMeta.emoji,
        audience: styleMeta.audience as 'universal' | 'female' | 'male',
        preview_color: styleMeta.previewColor,
        preview_image: localPreviews[styleMeta.id] || '/styles/apple.jpg',
        is_active: true,
        config: config as unknown as Record<string, unknown>,
        example_images: exampleImages,
      }

      const result = await createCarouselStyle(styleInput)
      if (result) {
        created++
        console.log(`Created style: ${styleMeta.name}`)
      } else {
        errors.push(`Не удалось создать стиль: ${styleMeta.name}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Ошибка при создании ${styleMeta.name}: ${msg}`)
    }
  }

  return {
    success: errors.length === 0,
    created,
    errors,
  }
}
