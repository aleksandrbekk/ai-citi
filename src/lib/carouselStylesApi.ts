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
  // Shop fields
  is_in_shop?: boolean
  price_neurons?: number
  is_free?: boolean
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
  // Shop fields
  is_in_shop?: boolean
  price_neurons?: number
  is_free?: boolean
  // Creator tracking (для комиссии 50% при продаже)
  created_by?: number  // telegram_id создателя
  updated_by?: number  // telegram_id последнего редактора
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
 * Получить стили по списку style_id (без фильтрации по is_active)
 * Используется для загрузки купленных стилей пользователя
 */
export async function getCarouselStylesByIds(styleIds: string[]): Promise<CarouselStyleDB[]> {
  if (styleIds.length === 0) return []

  try {
    // Формируем запрос с фильтром по списку style_id
    // Используем in.(id1,id2,id3) синтаксис PostgREST
    const idsParam = styleIds.join(',')
    const response = await supabaseFetch(`?style_id=in.(${idsParam})`)

    if (!response.ok) {
      console.error('Failed to fetch carousel styles by IDs:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching carousel styles by IDs:', error)
    return []
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
 * Удалить стиль (полное удаление из БД)
 */
export async function deleteCarouselStyle(id: string): Promise<boolean> {
  try {
    const response = await supabaseFetch(`?id=eq.${id}`, {
      method: 'DELETE',
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

/**
 * Удалить content_system_prompt из всех стилей
 * (глобальный промпт теперь хранится отдельно в carousel_settings)
 */
export async function removeContentSystemPromptFromAllStyles(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  try {
    const allStyles = await getAllCarouselStyles()

    for (const style of allStyles) {
      // Проверяем, есть ли content_system_prompt в config
      if (style.config && 'content_system_prompt' in style.config) {
        // Создаём новый config без content_system_prompt
        const { content_system_prompt, ...cleanConfig } = style.config as Record<string, unknown>

        console.log(`Removing content_system_prompt from style: ${style.name}`)

        try {
          const result = await updateCarouselStyle(style.id, {
            config: cleanConfig,
          })

          if (result) {
            updated++
            console.log(`✓ Cleaned style: ${style.name}`)
          } else {
            errors.push(`Failed to update style: ${style.name}`)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Error updating ${style.name}: ${msg}`)
        }
      }
    }

    return {
      success: errors.length === 0,
      updated,
      errors,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      updated: 0,
      errors: [msg],
    }
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

// ============================================
// МАГАЗИН СТИЛЕЙ (AI SHOP)
// ============================================

const PURCHASED_STYLES_URL = `${SUPABASE_URL}/rest/v1/user_purchased_styles`
const RPC_URL = `${SUPABASE_URL}/rest/v1/rpc`

export interface ShopStyle {
  id: string
  style_id: string
  name: string
  description: string | null
  emoji: string
  preview_color: string
  preview_image: string | null
  price_neurons: number
  is_free: boolean
  is_in_shop: boolean
  example_images: string[]
}

export interface PurchasedStyle {
  id: string
  telegram_id: number
  style_id: string
  price_paid: number
  purchased_at: string
}

/**
 * Получить стили доступные в магазине
 */
export async function getShopStyles(): Promise<ShopStyle[]> {
  try {
    const response = await supabaseFetch(
      '?is_active=eq.true&is_in_shop=eq.true&select=id,style_id,name,description,emoji,preview_color,preview_image,price_neurons,is_free,is_in_shop,example_images&order=sort_order.asc'
    )

    if (!response.ok) {
      console.error('Failed to fetch shop styles:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching shop styles:', error)
    return []
  }
}

/**
 * Получить купленные стили пользователя
 */
export async function getUserPurchasedStyles(telegramId: number): Promise<PurchasedStyle[]> {
  try {
    const response = await fetch(
      `${PURCHASED_STYLES_URL}?telegram_id=eq.${telegramId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch purchased styles:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching purchased styles:', error)
    return []
  }
}

/**
 * Проверить, владеет ли пользователь стилем
 */
export async function userOwnsStyle(telegramId: number, styleId: string): Promise<boolean> {
  try {
    // Сначала проверим, бесплатный ли стиль
    const styleResponse = await supabaseFetch(`?style_id=eq.${styleId}&select=is_free`)
    if (styleResponse.ok) {
      const styles = await styleResponse.json()
      if (styles.length > 0 && styles[0].is_free) {
        return true
      }
    }

    // Проверяем покупку
    const response = await fetch(
      `${PURCHASED_STYLES_URL}?telegram_id=eq.${telegramId}&style_id=eq.${styleId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    )

    if (!response.ok) return false

    const purchases = await response.json()
    return purchases.length > 0
  } catch (error) {
    console.error('Error checking style ownership:', error)
    return false
  }
}

/**
 * Купить стиль за нейроны
 */
export async function purchaseStyle(
  telegramId: number,
  styleId: string,
  price: number
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    const response = await fetch(
      `${RPC_URL}/purchase_style`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({
          p_telegram_id: telegramId,
          p_style_id: styleId,
          p_price: price,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Purchase failed:', error)
      return { success: false, error: 'Ошибка сервера' }
    }

    const result = await response.json()

    if (!result.success) {
      const errorMessages: Record<string, string> = {
        already_owned: 'Этот стиль уже куплен',
        user_not_found: 'Пользователь не найден',
        insufficient_balance: `Недостаточно нейронов. Нужно: ${result.price}, у вас: ${result.balance}`,
      }
      return {
        success: false,
        error: errorMessages[result.error] || result.error,
      }
    }

    return {
      success: true,
      newBalance: result.new_balance,
    }
  } catch (error) {
    console.error('Error purchasing style:', error)
    return { success: false, error: 'Ошибка при покупке' }
  }
}

/**
 * Обновить настройки магазина для стиля (админ)
 */
export async function updateStyleShopSettings(
  styleId: string,
  settings: {
    is_in_shop?: boolean
    price_neurons?: number
    is_free?: boolean
  }
): Promise<boolean> {
  try {
    const response = await supabaseFetch(
      `?style_id=eq.${styleId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(settings),
        headers: {
          'Prefer': 'return=minimal',
        },
      },
      true // useServiceKey
    )

    return response.ok
  } catch (error) {
    console.error('Error updating style shop settings:', error)
    return false
  }
}

/**
 * Получить доступные стили пользователя (бесплатные + купленные)
 */
export async function getUserAvailableStyles(telegramId: number): Promise<string[]> {
  try {
    // Получаем все активные стили
    const stylesResponse = await supabaseFetch('?is_active=eq.true&select=style_id,is_free')
    if (!stylesResponse.ok) return []
    const allStyles = await stylesResponse.json()

    // Получаем купленные
    const purchasedResponse = await fetch(
      `${PURCHASED_STYLES_URL}?telegram_id=eq.${telegramId}&select=style_id`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    )

    const purchasedStyles = purchasedResponse.ok
      ? (await purchasedResponse.json()).map((p: { style_id: string }) => p.style_id)
      : []

    // Объединяем: бесплатные + купленные
    const availableIds = allStyles
      .filter((s: { style_id: string; is_free: boolean }) =>
        s.is_free || purchasedStyles.includes(s.style_id)
      )
      .map((s: { style_id: string }) => s.style_id)

    return availableIds
  } catch (error) {
    console.error('Error getting user available styles:', error)
    return []
  }
}
