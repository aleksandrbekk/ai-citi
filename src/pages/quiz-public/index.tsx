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
  const [contactEmail, setContactEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 text-lg">{error || 'Квиз не найден'}</p>
        </div>
      </div>
    )
  }

  const questions = quiz.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0
  const hasContacts = quiz.contact_config?.enabled
  const hasResults = quiz.result_config?.enabled

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
      // No questions, skip to contacts or thanks
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
      // Last question answered
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
    // Validate required fields
    const fields = quiz.contact_config?.fields
    if (fields?.name?.enabled && fields?.name?.required && !contactName.trim()) {
      return
    }
    if (fields?.phone?.enabled && fields?.phone?.required && !contactPhone.trim()) {
      return
    }
    if (fields?.email?.enabled && fields?.email?.required && !contactEmail.trim()) {
      return
    }

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
  // Start Screen
  // ==========================================
  if (step === 'start') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {quiz.cover_image_url && (
          <div className="w-full h-48 sm:h-64">
            <img
              src={quiz.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-8 max-w-md">{quiz.description}</p>
          )}
          <button
            onClick={handleStart}
            className="px-8 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl text-lg font-medium hover:shadow-lg transition-all cursor-pointer"
          >
            {quiz.cta_text || 'Начать'}
          </button>
        </div>
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

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Back button + counter */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
          <span className="text-sm text-gray-400">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* Options */}
          {(currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'multiple_choice') && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, oi) => {
                const optId = option.id || `opt-${oi}`
                const isSelected = currentSelected.includes(optId)
                return (
                  <button
                    key={optId}
                    onClick={() => toggleOption(qId, optId, isSingle)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-sm">{option.option_text}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Text input */}
          {currentQuestion.question_type === 'text' && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900 resize-none"
              rows={4}
              placeholder="Ваш ответ..."
              autoFocus
            />
          )}
        </div>

        {/* Next button */}
        <div className="px-4 pb-6 max-w-lg mx-auto w-full">
          <button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {currentQuestionIndex < totalQuestions - 1 ? 'Далее' : hasContacts ? 'Далее' : 'Отправить'}
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

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="h-1.5 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 w-[95%]" />
        </div>

        <div className="px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
        </div>

        <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{contactTitle}</h2>
          {contactDesc && <p className="text-gray-500 mb-6">{contactDesc}</p>}

          <div className="space-y-4">
            {fields?.name?.enabled && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {fields.name.label}{fields.name.required && ' *'}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900"
                  placeholder="Ваше имя"
                />
              </div>
            )}

            {fields?.phone?.enabled && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {fields.phone.label}{fields.phone.required && ' *'}
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900"
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
            )}

            {fields?.email?.enabled && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {fields.email.label}{fields.email.required && ' *'}
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900"
                  placeholder="email@example.com"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-6 max-w-lg mx-auto w-full">
          <button
            onClick={handleContactSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              'Отправить'
            )}
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-8 text-center">
        {rc?.image_url && (
          <img src={rc.image_url} alt="" className="w-48 h-48 object-cover rounded-2xl mb-6" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{rc?.title || 'Результат'}</h1>
        {rc?.description && <p className="text-gray-600 mb-8 max-w-md">{rc.description}</p>}
        <button
          onClick={() => setStep('thanks')}
          className="px-8 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all cursor-pointer"
        >
          Далее
        </button>
      </div>
    )
  }

  // ==========================================
  // Thanks Screen
  // ==========================================
  if (step === 'thanks') {
    const tc = quiz.thank_you_config
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{tc?.title || 'Спасибо!'}</h1>
        {tc?.description && <p className="text-gray-600 mb-8 max-w-md">{tc.description}</p>}
        {tc?.cta_text && tc?.cta_url && (
          <a
            href={tc.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all cursor-pointer"
          >
            {tc.cta_text}
          </a>
        )}
      </div>
    )
  }

  return null
}
