import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type StyleId, getDefaultStyle } from '@/lib/carouselStyles'
import { type BundleId } from '@/lib/styleBundles'

export type TemplateId = 'mistakes' | 'myths' | 'checklist' | 'before-after' | 'steps' | 'custom'

export type AudiencePreset = 'networkers' | 'experts' | 'moms' | 'freelancers' | 'custom'

// Re-export StyleId for components (базовые стили)
export type { StyleId }

// Re-export BundleId for components
export type { BundleId }

// StylePreset теперь string для поддержки купленных стилей с произвольными ID
export type StylePreset = string

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
  primaryColor: string | null
  enabledBundles: BundleId[]
  format: string
  objectImage: string | null
  objectPlacement: string

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
  setPrimaryColor: (color: string | null) => void
  setEnabledBundles: (bundles: BundleId[]) => void
  setFormat: (format: string) => void
  setObjectImage: (image: string | null) => void
  setObjectPlacement: (placement: string) => void
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
  primaryColor: null as string | null,
  enabledBundles: ['base'] as BundleId[],
  format: 'expert',
  objectImage: null as string | null,
  objectPlacement: '',
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
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setEnabledBundles: (bundles) => set({ enabledBundles: bundles }),
      setFormat: (format) => set({ format }),
      setObjectImage: (image) => set({ objectImage: image }),
      setObjectPlacement: (placement) => set({ objectPlacement: placement }),
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
      partialize: (state) => ({
        selectedTemplate: state.selectedTemplate,
        customTemplateDescription: state.customTemplateDescription,
        // userPhoto НЕ сохраняем - загружается из БД
        audience: state.audience,
        customAudience: state.customAudience,
        style: state.style,
        mode: state.mode,
        gender: state.gender,
        primaryColor: state.primaryColor,
        enabledBundles: state.enabledBundles,
        format: state.format,
        objectImage: state.objectImage,
        objectPlacement: state.objectPlacement,
        variables: state.variables,
        ctaText: state.ctaText,
        ctaQuestion: state.ctaQuestion,
        ctaBenefits: state.ctaBenefits,
      }),
    }
  )
)

