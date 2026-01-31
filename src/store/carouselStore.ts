import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type StyleId, getDefaultStyle, STYLES_INDEX } from '@/lib/carouselStyles'
import { type BundleId } from '@/lib/styleBundles'

// Валидные ID стилей
const VALID_STYLE_IDS = STYLES_INDEX.map(s => s.id)

export type TemplateId = 'mistakes' | 'myths' | 'checklist' | 'before-after' | 'steps' | 'custom'

export type AudiencePreset = 'networkers' | 'experts' | 'moms' | 'freelancers' | 'custom'

// Re-export StyleId for components
export type { StyleId }

// Re-export BundleId for components
export type { BundleId }

// Legacy alias (deprecated, use StyleId)
export type StylePreset = StyleId

export type CarouselStatus = 'idle' | 'generating' | 'completed' | 'error'

export type CarouselMode = 'ai' | 'manual'

export type Gender = 'male' | 'female' | null

interface CarouselState {
  // Шаблон
  selectedTemplate: TemplateId | null
  customTemplateDescription: string

  // Настройки
  userPhoto: string | null
  audience: AudiencePreset
  customAudience: string
  style: StylePreset
  mode: CarouselMode
  gender: Gender
  enabledBundles: BundleId[]

  // Контент
  variables: Record<string, string>
  ctaText: string
  ctaQuestion: string
  ctaBenefits: string

  // Результат
  generatedSlides: string[]
  status: CarouselStatus
  error: string | null

  // Действия
  setTemplate: (template: TemplateId | null) => void
  setCustomTemplateDescription: (description: string) => void
  setUserPhoto: (photo: string | null) => void
  setAudience: (audience: AudiencePreset) => void
  setCustomAudience: (audience: string) => void
  setStyle: (style: StylePreset) => void
  setMode: (mode: CarouselMode) => void
  setGender: (gender: Gender) => void
  setEnabledBundles: (bundles: BundleId[]) => void
  toggleBundle: (bundleId: BundleId) => void
  setCtaText: (text: string) => void
  setCtaQuestion: (text: string) => void
  setCtaBenefits: (text: string) => void
  setVariable: (key: string, value: string) => void
  setVariables: (variables: Record<string, string>) => void
  setGeneratedSlides: (slides: string[]) => void
  setStatus: (status: CarouselStatus) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  selectedTemplate: null,
  customTemplateDescription: '',
  userPhoto: null,
  audience: 'networkers' as AudiencePreset,
  customAudience: '',
  style: getDefaultStyle(),
  mode: 'ai' as CarouselMode,
  gender: null as Gender,
  enabledBundles: ['base'] as BundleId[],
  variables: {},
  ctaText: '',
  ctaQuestion: 'Хочешь так же?',
  ctaBenefits: '',
  generatedSlides: [],
  status: 'idle' as CarouselStatus,
  error: null,
}

export const useCarouselStore = create<CarouselState>()(
  persist(
    (set) => ({
      ...initialState,

      setTemplate: (template) => set({ selectedTemplate: template }),
      setCustomTemplateDescription: (description) => set({ customTemplateDescription: description }),
      setUserPhoto: (photo) => set({ userPhoto: photo }),
      setAudience: (audience) => set({ audience }),
      setCustomAudience: (audience) => set({ customAudience: audience }),
      setStyle: (style) => set({ style }),
      setMode: (mode) => set({ mode }),
      setGender: (gender) => set({ gender }),
      setEnabledBundles: (bundles) => set({ enabledBundles: bundles }),
      toggleBundle: (bundleId) => set((state) => {
        const isEnabled = state.enabledBundles.includes(bundleId)
        if (isEnabled) {
          // Нельзя отключить если это единственный включённый набор
          if (state.enabledBundles.length === 1) return state
          return { enabledBundles: state.enabledBundles.filter((id) => id !== bundleId) }
        } else {
          return { enabledBundles: [...state.enabledBundles, bundleId] }
        }
      }),
      setCtaText: (text) => set({ ctaText: text }),
      setCtaQuestion: (text) => set({ ctaQuestion: text }),
      setCtaBenefits: (text) => set({ ctaBenefits: text }),
      setVariable: (key, value) => set((state) => ({
        variables: { ...state.variables, [key]: value }
      })),
      setVariables: (variables) => set({ variables }),
      setGeneratedSlides: (slides) => set({ generatedSlides: slides }),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'carousel-storage',
      version: 2, // Версия для миграции
      partialize: (state) => ({
        selectedTemplate: state.selectedTemplate,
        customTemplateDescription: state.customTemplateDescription,
        // userPhoto НЕ сохраняем - загружается из БД
        audience: state.audience,
        customAudience: state.customAudience,
        style: state.style,
        mode: state.mode,
        gender: state.gender,
        enabledBundles: state.enabledBundles,
        variables: state.variables,
        ctaText: state.ctaText,
        ctaQuestion: state.ctaQuestion,
        ctaBenefits: state.ctaBenefits,
      }),
      // Миграция: валидация и фикс битых данных при загрузке
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<CarouselState>
        console.log('[CarouselStore] Migrating from version:', version)

        // Валидируем style
        if (!state.style || !VALID_STYLE_IDS.includes(state.style as StyleId)) {
          console.log('[CarouselStore] Invalid style detected, resetting to default:', state.style)
          state.style = getDefaultStyle()
        }

        // Валидируем enabledBundles
        if (!Array.isArray(state.enabledBundles) || state.enabledBundles.length === 0) {
          state.enabledBundles = ['base'] as BundleId[]
        }

        // Валидируем mode
        if (state.mode !== 'ai' && state.mode !== 'manual') {
          state.mode = 'ai'
        }

        // Валидируем gender
        if (state.gender !== 'male' && state.gender !== 'female' && state.gender !== null) {
          state.gender = null
        }

        return state as CarouselState
      },
    }
  )
)

