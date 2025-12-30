import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TemplateCard } from '@/components/carousel/TemplateCard'
import { useCarouselStore } from '@/store/carouselStore'

const TEMPLATES = [
  { id: 'mistakes', icon: '🔥', title: '5 ошибок', slides: 8 },
  { id: 'myths', icon: '💡', title: 'Мифы vs Реальность', slides: 7 },
  { id: 'checklist', icon: '📋', title: 'Чеклист', slides: 6 },
  { id: 'before-after', icon: '✨', title: 'До/После', slides: 7 },
  { id: 'steps', icon: '🎯', title: '5 шагов', slides: 8 },
] as const

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { selectedTemplate, setTemplate, customTemplateDescription, setCustomTemplateDescription } = useCarouselStore()

  const handleTemplateSelect = (templateId: string) => {
    setTemplate(templateId as any)
    navigate('/agents/carousel/settings')
  }

  const handleCustomContinue = () => {
    if (customTemplateDescription.trim()) {
      setTemplate('custom')
      navigate('/agents/carousel/settings')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents')}
          className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Карусели</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Шаблоны */}
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              icon={template.icon}
              title={template.title}
              slides={template.slides}
              isSelected={selectedTemplate === template.id}
              onClick={() => handleTemplateSelect(template.id)}
            />
          ))}
        </div>

        {/* Разделитель */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-500 text-sm">или</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Свой формат */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">✏️ Свой формат</label>
          <textarea
            value={customTemplateDescription}
            onChange={(e) => setCustomTemplateDescription(e.target.value)}
            placeholder="Опишите формат карусели..."
            className="w-full p-3 bg-white/5 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none"
            rows={4}
          />
          {customTemplateDescription.trim() && (
            <button
              onClick={handleCustomContinue}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold"
            >
              Продолжить →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

