import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { usePublicQuiz } from '@/hooks/useUserQuizzes'

type Step = 'start' | 'question' | 'contacts' | 'result' | 'thanks'

interface AnswerData {
  question_id: string
  question_text: string
  answer_text: string
}

export default function PublicQuiz() {
  const { slug } = useParams<{ slug: string }>()
  const { quiz, isLoading, error, submitLead } = usePublicQuiz(slug)

  const [step, setStep] = useState<Step>('start')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [textAnswer, setTextAnswer] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactTelegram, setContactTelegram] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">?</span>
          </div>
          <p className="text-gray-600 text-lg">{error || 'Квиз не найден'}</p>
        </div>
      </div>
    )
  }

  const questions = quiz.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const hasContacts = quiz.contact_config?.enabled
  const hasResults = quiz.result_config?.enabled

  const hasOptionImages = (q: typeof currentQuestion) =>
    q?.options?.some((o) => o.option_image_url)

  const saveCurrentAnswer = () => {
    if (!currentQuestion) return

    const qId = currentQuestion.id || `q-${currentQuestionIndex}`
    const selected = selectedOptions[qId] || []

    let answerText = ''
    if (currentQuestion.question_type === 'text') {
      answerText = textAnswer
    } else {
      const selectedTexts = currentQuestion.options
        .filter((o) => selected.includes(o.id || `opt-${o.order_index}`))
        .map((o) => o.option_text)
      answerText = selectedTexts.join(', ')
    }

    if (answerText) {
      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          question_id: qId,
          question_text: currentQuestion.question_text,
          answer_text: answerText,
        },
      }))
    }
  }

  const handleStart = () => {
    if (totalQuestions === 0) {
      if (hasContacts) {
        setStep('contacts')
      } else {
        handleSubmit()
      }
    } else {
      setStep('question')
    }
  }

  const handleNext = () => {
    saveCurrentAnswer()
    setTextAnswer('')

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      if (hasContacts) {
        setStep('contacts')
      } else {
        handleSubmit()
      }
    }
  }

  const handleBack = () => {
    if (step === 'contacts') {
      if (totalQuestions > 0) {
        setStep('question')
        setCurrentQuestionIndex(totalQuestions - 1)
      } else {
        setStep('start')
      }
    } else if (step === 'question' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else if (step === 'question' && currentQuestionIndex === 0) {
      setStep('start')
    }
  }

  const handleSubmit = async () => {
    saveCurrentAnswer()
    setIsSubmitting(true)

    const answersArray = Object.values(answers)

    await submitLead({
      name: contactName || undefined,
      phone: contactPhone || undefined,
      telegram_username: contactTelegram || undefined,
      email: contactEmail || undefined,
      answers: answersArray,
    })

    setIsSubmitting(false)

    if (hasResults) {
      setStep('result')
    } else {
      setStep('thanks')
    }
  }

  const handleContactSubmit = () => {
    const fields = quiz.contact_config?.fields
    if (fields?.name?.enabled && fields?.name?.required && !contactName.trim()) return
    if (fields?.phone?.enabled && fields?.phone?.required && !contactPhone.trim()) return
    if (fields?.telegram?.enabled && fields?.telegram?.required && !contactTelegram.trim()) return
    if (fields?.email?.enabled && fields?.email?.required && !contactEmail.trim()) return

    handleSubmit()
  }

  const toggleOption = (questionId: string, optionId: string, isSingle: boolean) => {
    setSelectedOptions((prev) => {
      const current = prev[questionId] || []
      if (isSingle) {
        return { ...prev, [questionId]: [optionId] }
      }
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) }
      }
      return { ...prev, [questionId]: [...current, optionId] }
    })
  }

  const isNextDisabled = () => {
    if (!currentQuestion) return true
    if (!currentQuestion.is_required) return false
    const qId = currentQuestion.id || `q-${currentQuestionIndex}`
    if (currentQuestion.question_type === 'text') {
      return !textAnswer.trim()
    }
    return !(selectedOptions[qId]?.length > 0)
  }

  // ==========================================
  // Start Screen — layout from settings
  // ==========================================
  if (step === 'start') {
    const s = quiz.settings || {}
    const layout = (s.start_layout === 'center' || s.start_layout === 'side') ? s.start_layout : 'side'
    const alignment = (s.start_alignment === 'image-left' || s.start_alignment === 'image-right') ? s.start_alignment : 'image-left'
    const hText = typeof s.header_text === 'string' ? s.header_text : ''
    const fText = typeof s.footer_text === 'string' ? s.footer_text : ''

    const headerEl = hText ? <div className="px-4 py-3 text-sm text-gray-500 text-center border-b border-gray-100 bg-white/50">{hText}</div> : null
    const footerEl = fText ? <div className="px-4 py-3 text-xs text-gray-400 text-center border-t border-gray-100 bg-white/50 mt-auto">{fText}</div> : null

    if (layout === 'center') {
      return (
        <div className="min-h-screen bg-[#FFF8F5] flex flex-col">
          {headerEl}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            {quiz.cover_image_url && (
              <img src={quiz.cover_image_url} alt="" className="w-full max-w-md rounded-2xl mb-6 object-cover max-h-64" />
            )}
            <div className="max-w-lg w-full">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{quiz.title}</h1>
              {quiz.description && <p className="text-gray-600 mb-8 leading-relaxed text-lg">{quiz.description}</p>}
              <button onClick={handleStart} className="px-8 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl text-lg font-medium hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]">
                {quiz.cta_text || 'Начать'}
              </button>
            </div>
          </div>
          {footerEl}
        </div>
      )
    }

    // side layout
    const imageEl = quiz.cover_image_url ? (
      <div className="w-full sm:w-1/2 h-56 sm:h-auto sm:min-h-screen relative flex-shrink-0">
        <img src={quiz.cover_image_url} alt="" className="w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-t sm:bg-none from-[#FFF8F5] via-transparent to-transparent ${alignment === 'image-left' ? 'sm:bg-gradient-to-l sm:from-[#FFF8F5] sm:via-transparent sm:to-transparent' : 'sm:bg-gradient-to-r sm:from-[#FFF8F5] sm:via-transparent sm:to-transparent'}`} />
      </div>
    ) : null

    const textEl = (
      <div className={`flex-1 flex flex-col justify-center px-6 sm:px-10 py-8 ${quiz.cover_image_url ? 'items-start' : 'items-center text-center'}`}>
        <div className={quiz.cover_image_url ? 'max-w-md w-full' : 'max-w-lg w-full'}>
          <h1 className={`font-bold text-gray-900 mb-4 ${quiz.cover_image_url ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}`}>{quiz.title}</h1>
          {quiz.description && <p className={`text-gray-600 mb-8 leading-relaxed ${quiz.cover_image_url ? '' : 'text-lg'}`}>{quiz.description}</p>}
          <button onClick={handleStart} className="px-8 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl text-lg font-medium hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]">
            {quiz.cta_text || 'Начать'}
          </button>
        </div>
      </div>
    )

    const isImageRight = alignment === 'image-right'

    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col">
        {headerEl}
        <div className="flex-1 flex flex-col sm:flex-row">
          {isImageRight ? <>{textEl}{imageEl}</> : <>{imageEl}{textEl}</>}
        </div>
        {footerEl}
      </div>
    )
  }

  // ==========================================
  // Question Screen
  // ==========================================
  if (step === 'question' && currentQuestion) {
    const qId = currentQuestion.id || `q-${currentQuestionIndex}`
    const isSingle = currentQuestion.question_type === 'single_choice'
    const currentSelected = selectedOptions[qId] || []
    const tileMode = hasOptionImages(currentQuestion)
    const qHeaderText = typeof quiz.settings?.header_text === 'string' ? quiz.settings.header_text : ''
    const nextLabel = currentQuestionIndex < totalQuestions - 1 ? 'Далее' : hasContacts ? 'Далее' : 'Отправить'

    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col">
        {/* Header with quiz title */}
        {qHeaderText && (
          <div className="px-4 py-2.5 text-sm text-gray-500 text-center border-b border-gray-100 bg-white/50">{qHeaderText}</div>
        )}

        <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
          {/* Question title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Вопрос {currentQuestionIndex + 1}/{totalQuestions}. {currentQuestion.question_text}
          </h2>

          {currentQuestion.question_image_url && (
            <img src={currentQuestion.question_image_url} alt="" className="w-full rounded-xl mb-6 object-cover max-h-56" />
          )}

          {/* Options — tile or list */}
          {(currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'multiple_choice') && (
            tileMode ? (
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option, oi) => {
                  const optId = option.id || `opt-${oi}`
                  const isSelected = currentSelected.includes(optId)
                  return (
                    <button
                      key={optId}
                      onClick={() => toggleOption(qId, optId, isSingle)}
                      className={`text-left rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'border-orange-400 ring-2 ring-orange-400 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-orange-200'
                      }`}
                    >
                      {option.option_image_url && (
                        <img src={option.option_image_url} alt="" className="w-full aspect-[4/3] object-cover" />
                      )}
                      <div className="px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{option.option_text}</span>
                        {option.option_description && <p className="text-xs text-gray-500 mt-0.5">{option.option_description}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion.options.map((option, oi) => {
                  const optId = option.id || `opt-${oi}`
                  const isSelected = currentSelected.includes(optId)
                  return (
                    <button
                      key={optId}
                      onClick={() => toggleOption(qId, optId, isSingle)}
                      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'border-orange-400 bg-orange-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{option.option_text}</span>
                          {option.option_description && <p className="text-sm text-gray-500 mt-0.5">{option.option_description}</p>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}

          {/* Text input */}
          {currentQuestion.question_type === 'text' && (
            <textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-gray-900 resize-none shadow-sm" rows={4} placeholder="Ваш ответ..." autoFocus />
          )}
        </div>

        {/* Bottom nav */}
        <div className="px-4 pb-6 max-w-2xl mx-auto w-full flex items-center justify-end gap-3">
          <button onClick={handleBack} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-colors cursor-pointer" aria-label="Назад">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleNext} disabled={isNextDisabled()} className="px-6 py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] flex items-center gap-1.5">
            {nextLabel}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // Contacts Screen
  // ==========================================
  if (step === 'contacts') {
    const fields = quiz.contact_config?.fields
    const contactTitle = quiz.contact_config?.title || 'Оставьте контакты'
    const contactDesc = quiz.contact_config?.description || ''
    const contactImage = quiz.contact_config?.image_url

    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col">
        <div className="h-2 bg-orange-100">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 w-[95%] rounded-r-full" />
        </div>

        <div className="px-4 py-3">
          <button onClick={handleBack} className="flex items-center gap-1 text-gray-500 hover:text-orange-500 text-sm cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
        </div>

        <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
            {contactImage && (
              <img src={contactImage} alt="" className="w-full rounded-xl mb-4 object-cover max-h-40" />
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{contactTitle}</h2>
                {contactDesc && <p className="text-sm text-gray-500">{contactDesc}</p>}
              </div>
            </div>

            <div className="space-y-4">
              {fields?.name?.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{fields.name.label}{fields.name.required && ' *'}</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-gray-900" placeholder="Ваше имя" />
                </div>
              )}
              {fields?.phone?.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{fields.phone.label}{fields.phone.required && ' *'}</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-gray-900" placeholder="+7 (___) ___-__-__" />
                </div>
              )}
              {fields?.telegram?.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{fields.telegram.label}{fields.telegram.required && ' *'}</label>
                  <input type="text" value={contactTelegram} onChange={(e) => setContactTelegram(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-gray-900" placeholder="@username" />
                </div>
              )}
              {fields?.email?.enabled && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{fields.email.label}{fields.email.required && ' *'}</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-gray-900" placeholder="email@example.com" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-6 max-w-lg mx-auto w-full">
          <button onClick={handleContactSubmit} disabled={isSubmitting} className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-[0.98]">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Отправить'}
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // Result Screen
  // ==========================================
  if (step === 'result') {
    const rc = quiz.result_config
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-sm max-w-md w-full">
          {rc?.image_url && <img src={rc.image_url} alt="" className="w-full rounded-2xl mb-6 object-cover max-h-56" />}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{rc?.title || 'Результат'}</h1>
          {rc?.description && <p className="text-gray-600 mb-8">{rc.description}</p>}
          <button onClick={() => setStep('thanks')} className="px-8 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]">
            Далее
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // Thanks Screen
  // ==========================================
  if (step === 'thanks') {
    const tc = quiz.thank_you_config
    const ctaUrl = tc?.cta_url ? (tc.cta_url.startsWith('http') ? tc.cta_url : `https://${tc.cta_url}`) : null
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-sm max-w-md w-full">
          {tc?.image_url && <img src={tc.image_url} alt="" className="w-full rounded-2xl mb-6 object-cover max-h-56" />}
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg shadow-orange-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{tc?.title || 'Спасибо!'}</h1>
          {tc?.description && <p className="text-gray-600 mb-8">{tc.description}</p>}
          {tc?.cta_text && ctaUrl && (
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]">
              {tc.cta_text}
            </a>
          )}
        </div>
      </div>
    )
  }

  return null
}
