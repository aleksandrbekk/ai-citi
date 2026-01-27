import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
  text?: string
}

export function PageLoader({ text = 'Загрузка...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  )
}

export default PageLoader
