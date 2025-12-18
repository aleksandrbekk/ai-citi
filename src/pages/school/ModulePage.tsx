import { useParams, Link } from 'react-router-dom'
import { useModule, useLessons } from '@/hooks/useCourse'
import { ArrowLeft, Play, FileText, ChevronRight } from 'lucide-react'

export default function ModulePage() {
  const { tariffSlug, moduleId } = useParams<{ tariffSlug: string; moduleId: string }>()
  const { data: module, isLoading: moduleLoading } = useModule(moduleId!)
  const { data: lessons, isLoading: lessonsLoading } = useLessons(moduleId!)

  if (moduleLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Шапка */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/school/${tariffSlug}`} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1">{module?.title}</h1>
      </div>

      {/* Список уроков */}
      <div className="space-y-2">
        {lessons?.map((lesson, index) => (
          <Link
            key={lesson.id}
            to={`/school/${tariffSlug}/${moduleId}/lesson/${lesson.id}`}
            className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="font-medium">{lesson.title}</div>
              <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                {lesson.video_url && (
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3" /> Видео
                  </span>
                )}
                {lesson.has_homework && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> ДЗ
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </Link>
        ))}
      </div>

      {(!lessons || lessons.length === 0) && (
        <div className="text-center text-zinc-500 py-12">
          Уроки скоро появятся
        </div>
      )}
    </div>
  )
}


