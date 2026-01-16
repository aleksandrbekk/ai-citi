import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  ref?: string // short_code
}

const UTM_STORAGE_KEY = 'utm_params'
const UTM_VISIT_KEY = 'utm_visit_tracked'

// Получение UTM параметров из URL
export const getUtmParams = (): UtmParams | null => {
  // Сначала проверяем URL
  const urlParams = new URLSearchParams(window.location.search)

  // Также проверяем Telegram start_param
  const tgStartParam = (window.Telegram?.WebApp?.initDataUnsafe as any)?.start_param

  const params: UtmParams = {}

  // Из URL
  if (urlParams.get('utm_source')) params.utm_source = urlParams.get('utm_source')!
  if (urlParams.get('utm_medium')) params.utm_medium = urlParams.get('utm_medium')!
  if (urlParams.get('utm_campaign')) params.utm_campaign = urlParams.get('utm_campaign')!
  if (urlParams.get('utm_content')) params.utm_content = urlParams.get('utm_content')!
  if (urlParams.get('utm_term')) params.utm_term = urlParams.get('utm_term')!
  if (urlParams.get('ref')) params.ref = urlParams.get('ref')!

  // Из Telegram start_param (формат: ref_shortcode или utm_source_medium_campaign)
  if (tgStartParam) {
    if (tgStartParam.startsWith('ref_')) {
      params.ref = tgStartParam.replace('ref_', '')
    } else {
      // Может содержать закодированные параметры
      params.ref = tgStartParam
    }
  }

  return Object.keys(params).length > 0 ? params : null
}

// Сохранение UTM в localStorage
export const saveUtmParams = (params: UtmParams) => {
  localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({
    ...params,
    savedAt: Date.now()
  }))
}

// Получение сохранённых UTM
export const getSavedUtmParams = (): (UtmParams & { savedAt: number }) | null => {
  try {
    const saved = localStorage.getItem(UTM_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // UTM параметры валидны 30 дней
      if (Date.now() - parsed.savedAt < 30 * 24 * 60 * 60 * 1000) {
        return parsed
      }
      localStorage.removeItem(UTM_STORAGE_KEY)
    }
  } catch (e) {
    console.error('Error reading UTM params:', e)
  }
  return null
}

// Определение типа устройства
const getDeviceType = (): string => {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

// Трекинг визита
export const trackUtmVisit = async (telegramId?: number) => {
  // Проверяем, не трекали ли уже
  const visitTracked = sessionStorage.getItem(UTM_VISIT_KEY)
  if (visitTracked) return

  // Получаем UTM параметры (из URL или сохранённые)
  let params = getUtmParams()

  if (!params) {
    params = getSavedUtmParams()
  } else {
    // Сохраняем новые параметры
    saveUtmParams(params)
  }

  if (!params || !params.ref) {
    // Нет UTM для трекинга
    return
  }

  try {
    // Находим кампанию по short_code
    const { data: campaign } = await supabase
      .from('utm_campaigns')
      .select('id')
      .eq('short_code', params.ref)
      .eq('is_active', true)
      .single()

    if (!campaign) {
      console.log('UTM campaign not found for ref:', params.ref)
      return
    }

    // Генерируем visitor hash для анонимных
    const visitorHash = !telegramId
      ? btoa(navigator.userAgent + screen.width + screen.height).substring(0, 64)
      : null

    // Трекаем визит через RPC функцию
    await supabase.rpc('track_utm_visit', {
      p_campaign_id: campaign.id,
      p_telegram_id: telegramId || null,
      p_visitor_hash: visitorHash,
      p_user_agent: navigator.userAgent.substring(0, 500),
      p_referrer: document.referrer || null,
      p_device_type: getDeviceType()
    })

    // Отмечаем что визит записан
    sessionStorage.setItem(UTM_VISIT_KEY, '1')

    console.log('UTM visit tracked for campaign:', params.ref)
  } catch (error) {
    console.error('Error tracking UTM visit:', error)
  }
}

// Трекинг конверсии
export const trackUtmConversion = async (
  telegramId: number,
  conversionType: 'registration' | 'purchase' | 'subscription',
  conversionValue: number = 0,
  metadata: Record<string, any> = {}
) => {
  try {
    await supabase.rpc('track_utm_conversion', {
      p_telegram_id: telegramId,
      p_conversion_type: conversionType,
      p_conversion_value: conversionValue,
      p_metadata: metadata
    })

    console.log('UTM conversion tracked:', conversionType)
  } catch (error) {
    console.error('Error tracking UTM conversion:', error)
  }
}

// Хук для автоматического трекинга
export const useUtmTracking = (telegramId?: number) => {
  useEffect(() => {
    // Трекаем при загрузке
    trackUtmVisit(telegramId)
  }, [telegramId])

  return {
    trackConversion: (type: 'registration' | 'purchase' | 'subscription', value?: number, metadata?: Record<string, any>) => {
      if (telegramId) {
        trackUtmConversion(telegramId, type, value, metadata)
      }
    }
  }
}

export default useUtmTracking
