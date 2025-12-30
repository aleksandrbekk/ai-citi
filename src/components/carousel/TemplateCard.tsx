import { cn } from '@/lib/utils'

interface TemplateCardProps {
  icon: string
  title: string
  slides: number
  isSelected: boolean
  onClick: () => void
}

export function TemplateCard({ icon, title, slides, isSelected, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white/10 backdrop-blur-lg border-2 rounded-2xl p-4 transition-all",
        isSelected 
          ? "border-orange-500 bg-orange-500/20" 
          : "border-zinc-700 hover:border-zinc-600"
      )}
    >
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-white font-semibold text-sm mb-1">{title}</div>
      <div className="text-zinc-400 text-xs">{slides} слайдов</div>
    </button>
  )
}

