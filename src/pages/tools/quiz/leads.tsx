import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Phone, Mail, User, ChevronDown, ChevronUp } from 'lucide-react'
import { useUserQuizzes, type QuizLead } from '@/hooks/useUserQuizzes'

export default function QuizLeads() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getLeads, getQuizWithQuestions } = useUserQuizzes()

  const [leads, setLeads] = useState<QuizLead[]>([])
  const [quizTitle, setQuizTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setIsLoading(true)

    const [leadsData, quizData] = await Promise.all([
      getLeads(id),
      getQuizWithQuestions(id),
    ])

    setLeads(leadsData)
    if (quizData) setQuizTitle(quizData.title)
    setIsLoading(false)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/tools/quiz')}
            className="p-2 rounded-xl bg-white/80 border border-gray-200 hover:bg-white transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Заявки</h1>
            {quizTitle && <p className="text-sm text-gray-500">{quizTitle}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            <span className="text-sm text-gray-600">Всего заявок:</span>
            <span className="font-bold text-gray-900">{leads.length}</span>
          </div>
        </div>

        {/* Leads List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Загрузка...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Нет заявок</h2>
            <p className="text-gray-500">Заявки появятся после прохождения квиза</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                  className="w-full p-4 flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {lead.name || 'Без имени'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </span>
                      )}
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>
                  {expandedLead === lead.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedLead === lead.id && lead.answers && lead.answers.length > 0 && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Ответы:</p>
                    <div className="space-y-2">
                      {lead.answers.map((answer, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-gray-500">{answer.question_text}</p>
                          <p className="text-gray-900 font-medium">{answer.answer_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
