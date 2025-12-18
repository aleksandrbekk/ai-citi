import { Link } from 'react-router-dom'
import { Folder, ChevronRight } from 'lucide-react'

export default function SchoolIndex() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">📚 Мои курсы</h1>
      
      <div className="space-y-3">
        {/* Папка ПЛАТИНА */}
        <Link
          to="/school/platinum"
          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/50 hover:border-amber-400 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
            <Folder className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg text-amber-400">ПЛАТИНА</div>
            <div className="text-sm text-zinc-400">11 модулей • Полный доступ</div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </Link>
      </div>
    </div>
  )
}

