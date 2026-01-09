import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TemplateId = 'mistakes' | 'myths' | 'checklist' | 'before-after' | 'steps' | 'custom'

export type AudiencePreset = 'networkers' | 'experts' | 'moms' | 'freelancers' | 'custom'

export type StylePreset = 'ai-citi' | 'minimal' | 'bright'

export type CarouselStatus = 'idle' | 'generating' | 'completed' | 'error'

export type CarouselMode = 'ai' | 'manual'

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
  style: 'ai-citi' as StylePreset,
  mode: 'ai' as CarouselMode,
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
        variables: state.variables,
        ctaText: state.ctaText,
        ctaQuestion: state.ctaQuestion,
        ctaBenefits: state.ctaBenefits,
      }),
    }
  )
)

