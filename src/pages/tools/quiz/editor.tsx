import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Plus, Trash2, ChevronUp, ChevronDown, Link2 } from 'lucide-react'
import { useUserQuizzes, type QuizQuestionItem, type QuizOptionItem, type ContactConfig, type ResultConfig, type ThankYouConfig } from '@/hooks/useUserQuizzes'
import { QuizImageUpload } from '@/components/quiz/QuizImageUpload'
import { toast } from 'sonner'

type TabId = 'start' | 'questions' | 'contacts' | 'results' | 'thanks'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'start', label: 'Стартовая', emoji: '📋' },
  { id: 'questions', label: 'Вопросы', emoji: '❓' },
  { id: 'contacts', label: 'Контакты', emoji: '📇' },
  { id: 'results', label: 'Результаты', emoji: '📊' },
  { id: 'thanks', label: 'Спасибо', emoji: '✅' },
]

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateQuiz, saveQuestions, getQuizWithQuestions } = useUserQuizzes()

  const [activeTab, setActiveTab] = useState<TabId>('start')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Quiz data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [ctaText, setCtaText] = useState('Начать')
  const [isPublished, setIsPublished] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)

  // Questions
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([])

  // Contacts config
  const defaultContactConfig: ContactConfig = {
    enabled: false,
    title: 'Оставьте контакты',
    description: 'И мы свяжемся с вами',
    fields: {
      name: { enabled: true, required: true, label: 'Имя' },
      phone: { enabled: true, required: true, label: 'Телефон (WhatsApp/TG)' },
      telegram: { enabled: false, required: false, label: 'Telegram' },
      email: { enabled: false, required: false, label: 'Email' },
    },
  }
  const [contactConfig, setContactConfig] = useState<ContactConfig>(defaultContactConfig)

  // Result config
  const [resultConfig, setResultConfig] = useState<ResultConfig>({
    enabled: false,
    title: 'Результат',
    description: '',
    image_url: null,
  })

  // Thank you config
  const [thankYouConfig, setThankYouConfig] = useState<ThankYouConfig>({
    title: 'Спасибо!',
    description: 'Ваши ответы приняты',
    cta_text: null,
    cta_url: null,
  })

  // Load quiz
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      const data = await getQuizWithQuestions(id)
      if (cancelled) return

      if (data) {
        setTitle(data.title || '')
        setDescription(data.description || '')
        setCoverImageUrl(data.cover_image_url)
        setCtaText(data.cta_text || 'Начать')
        setIsPublished(data.is_published)
        setSlug(data.slug)
        setQuestions(data.questions || [])
        if (data.contact_config) {
          setContactConfig({
            ...defaultContactConfig,
            ...data.contact_config,
            fields: {
              ...defaultContactConfig.fields,
              ...data.contact_config.fields,
            },
          })
        }
        if (data.result_config) setResultConfig(data.result_config)
        if (data.thank_you_config) setThankYouConfig(data.thank_you_config)
      }

      setIsLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save
  const handleSave = async () => {
    if (!id) return
    setIsSaving(true)

    const quizUpdated = await updateQuiz(id, {
      title,
      description: description || null,
      cover_image_url: coverImageUrl,
      cta_text: ctaText,
      is_published: isPublished,
      slug: slug || undefined,
      contact_config: contactConfig,
      result_config: resultConfig,
      thank_you_config: thankYouConfig,
    })

    const questionsUpdated = await saveQuestions(id, questions)

    if (quizUpdated && questionsUpdated) {
      toast.success('Сохранено!')
    } else {
      toast.error('Ошибка сохранения')
    }

    setIsSaving(false)
  }

  // Question helpers
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: 'single_choice',
        order_index: questions.length,
        is_required: true,
        options: [
          { option_text: '', is_correct: false, order_index: 0 },
          { option_text: '', is_correct: false, order_index: 1 },
        ],
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i })))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newQuestions.length) return
    ;[newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]]
    setQuestions(newQuestions.map((q, i) => ({ ...q, order_index: i })))
  }

  const updateQuestion = (index: number, updates: Partial<QuizQuestionItem>) => {
    setQuestions(questions.map((q, i) => (i === index ? { ...q, ...updates } : q)))
  }

  const addOption = (questionIndex: number) => {
    const q = questions[questionIndex]
    updateQuestion(questionIndex, {
      options: [
        ...q.options,
        { option_text: '', is_correct: false, order_index: q.options.length },
      ],
    })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const q = questions[questionIndex]
    updateQuestion(questionIndex, {
      options: q.options.filter((_, i) => i !== optionIndex).map((o, i) => ({ ...o, order_index: i })),
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<QuizOptionItem>) => {
    const q = questions[questionIndex]
    updateQuestion(questionIndex, {
      options: q.options.map((o, i) => (i === optionIndex ? { ...o, ...updates } : o)),
    })
  }

  const moveOption = (questionIndex: number, optionIndex: number, direction: 'up' | 'down') => {
    const q = questions[questionIndex]
    const newOptions = [...q.options]
    const swapIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1
    if (swapIndex < 0 || swapIndex >= newOptions.length) return
    ;[newOptions[optionIndex], newOptions[swapIndex]] = [newOptions[swapIndex], newOptions[optionIndex]]
    updateQuestion(questionIndex, { options: newOptions.map((o, i) => ({ ...o, order_index: i })) })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/tools/quiz')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" aria-label="Назад">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 placeholder-gray-400" placeholder="Название квиза" />
          {slug && (
            <a href={`/q/${slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Предпросмотр">
              <Eye className="w-5 h-5 text-gray-500" />
            </a>
          )}
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all text-sm disabled:opacity-50 cursor-pointer">
            <Save className="w-4 h-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm'
                  : 'bg-white/60 text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'start' && (
          <StartTab title={title} setTitle={setTitle} description={description} setDescription={setDescription} coverImageUrl={coverImageUrl} setCoverImageUrl={setCoverImageUrl} ctaText={ctaText} setCtaText={setCtaText} isPublished={isPublished} setIsPublished={setIsPublished} slug={slug} setSlug={setSlug} />
        )}
        {activeTab === 'questions' && (
          <QuestionsTab questions={questions} addQuestion={addQuestion} removeQuestion={removeQuestion} moveQuestion={moveQuestion} updateQuestion={updateQuestion} addOption={addOption} removeOption={removeOption} updateOption={updateOption} moveOption={moveOption} />
        )}
        {activeTab === 'contacts' && (
          <ContactsTab config={contactConfig} setConfig={setContactConfig} />
        )}
        {activeTab === 'results' && (
          <ResultsTab config={resultConfig} setConfig={setResultConfig} />
        )}
        {activeTab === 'thanks' && (
          <ThanksTab config={thankYouConfig} setConfig={setThankYouConfig} />
        )}
      </div>
    </div>
  )
}

// ==========================================
// Tab 1: Стартовая
// ==========================================

function StartTab({
  title, setTitle, description, setDescription,
  coverImageUrl, setCoverImageUrl,
  ctaText, setCtaText,
  isPublished, setIsPublished, slug, setSlug,
}: {
  title: string; setTitle: (v: string) => void
  description: string; setDescription: (v: string) => void
  coverImageUrl: string | null; setCoverImageUrl: (v: string | null) => void
  ctaText: string; setCtaText: (v: string) => void
  isPublished: boolean; setIsPublished: (v: boolean) => void
  slug: string | null; setSlug: (v: string | null) => void
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Стартовая страница</h3>

        <div className="space-y-4">
          <QuizImageUpload imageUrl={coverImageUrl} onImageChange={setCoverImageUrl} label="Обложка" aspectRatio="16:9" />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Заголовок</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Заголовок квиза" maxLength={200} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 resize-none" rows={3} placeholder="Описание квиза" maxLength={500} />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Текст кнопки</label>
            <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Начать" maxLength={50} />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Публикация</h3>

        {slug && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Ссылка на квиз</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">/q/</span>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 text-sm" placeholder="my-quiz" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-900">Опубликовать квиз</p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
          </label>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Tab 2: Вопросы
// ==========================================

function QuestionsTab({
  questions, addQuestion, removeQuestion, moveQuestion,
  updateQuestion, addOption, removeOption, updateOption, moveOption,
}: {
  questions: QuizQuestionItem[]
  addQuestion: () => void
  removeQuestion: (i: number) => void
  moveQuestion: (i: number, d: 'up' | 'down') => void
  updateQuestion: (i: number, u: Partial<QuizQuestionItem>) => void
  addOption: (qi: number) => void
  removeOption: (qi: number, oi: number) => void
  updateOption: (qi: number, oi: number, u: Partial<QuizOptionItem>) => void
  moveOption: (qi: number, oi: number, d: 'up' | 'down') => void
}) {
  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Нет вопросов</p>
          <button onClick={addQuestion} className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all cursor-pointer">
            <Plus className="w-4 h-4 inline mr-1" />
            Добавить первый вопрос
          </button>
        </div>
      ) : (
        <>
          {questions.map((question, qi) => (
            <div key={question.id || `new-${qi}`} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button onClick={() => moveQuestion(qi, 'up')} disabled={qi === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveQuestion(qi, 'down')} disabled={qi === questions.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 font-medium">#{qi + 1}</span>
                    <select value={question.question_type} onChange={(e) => updateQuestion(qi, { question_type: e.target.value as QuizQuestionItem['question_type'] })} className="text-xs px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                      <option value="single_choice">Один ответ</option>
                      <option value="multiple_choice">Несколько ответов</option>
                      <option value="text">Текст</option>
                    </select>
                  </div>

                  <input type="text" value={question.question_text} onChange={(e) => updateQuestion(qi, { question_text: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 text-sm" placeholder="Текст вопроса" />

                  {/* Question image */}
                  <div className="mt-2">
                    <QuizImageUpload imageUrl={question.question_image_url} onImageChange={(url: string | null) => updateQuestion(qi, { question_image_url: url })} compact aspectRatio="16:9" />
                  </div>

                  {/* Options */}
                  {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                    <div className="mt-3 space-y-2">
                      {question.options.map((option, oi) => (
                        <div key={option.id || `opt-${oi}`}>
                          <div className="flex items-center gap-2">
                            <input
                              type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                              checked={option.is_correct}
                              onChange={() => {
                                if (question.question_type === 'single_choice') {
                                  const newOptions = question.options.map((o, i) => ({ ...o, is_correct: i === oi }))
                                  updateQuestion(qi, { options: newOptions })
                                } else {
                                  updateOption(qi, oi, { is_correct: !option.is_correct })
                                }
                              }}
                              className="w-4 h-4 text-orange-500 cursor-pointer"
                            />
                            <input type="text" value={option.option_text} onChange={(e) => updateOption(qi, oi, { option_text: e.target.value })} className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 text-sm" placeholder={`Вариант ${oi + 1}`} />
                            <button onClick={() => moveOption(qi, oi, 'up')} disabled={oi === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveOption(qi, oi, 'down')} disabled={oi === question.options.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {question.options.length > 1 && (
                              <button onClick={() => removeOption(qi, oi)} className="p-1 text-red-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {/* Option image */}
                          <div className="ml-6 mt-1">
                            <QuizImageUpload imageUrl={option.option_image_url} onImageChange={(url: string | null) => updateOption(qi, oi, { option_image_url: url })} compact aspectRatio="4:3" />
                          </div>
                        </div>
                      ))}
                      {question.options.length < 6 && (
                        <button onClick={() => addOption(qi)} className="text-xs text-orange-500 hover:text-orange-600 py-1 cursor-pointer">
                          + Добавить вариант
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={() => { if (confirm('Удалить вопрос?')) removeQuestion(qi) }} className="p-1.5 text-red-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer">
            <Plus className="w-4 h-4 inline mr-1" />
            Добавить вопрос
          </button>
        </>
      )}
    </div>
  )
}

// ==========================================
// Tab 3: Контакты
// ==========================================

function ContactsTab({
  config, setConfig,
}: {
  config: ContactConfig
  setConfig: (v: ContactConfig) => void
}) {
  const updateField = (field: 'name' | 'phone' | 'telegram' | 'email', key: 'enabled' | 'required', value: boolean) => {
    setConfig({
      ...config,
      fields: {
        ...config.fields,
        [field]: { ...config.fields[field], [key]: value },
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Форма контактов</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
          </label>
        </div>

        {config.enabled && (
          <div className="space-y-4">
            <QuizImageUpload imageUrl={config.image_url} onImageChange={(url: string | null) => setConfig({ ...config, image_url: url })} label="Фото формы" aspectRatio="16:9" />

            <div>
              <label className="block text-sm text-gray-600 mb-1">Заголовок формы</label>
              <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Оставьте контакты" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Описание</label>
              <input type="text" value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="И мы свяжемся с вами" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Поля формы</p>

              {(['name', 'phone', 'telegram', 'email'] as const).map((field) => (
                <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={config.fields[field].enabled} onChange={(e) => updateField(field, 'enabled', e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500" />
                    </label>
                    <span className="text-sm text-gray-700">{config.fields[field].label}</span>
                  </div>
                  {config.fields[field].enabled && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={config.fields[field].required} onChange={(e) => updateField(field, 'required', e.target.checked)} className="w-4 h-4 text-orange-500 rounded" />
                      <span className="text-xs text-gray-500">Обязательное</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// Tab 4: Результаты
// ==========================================

function ResultsTab({
  config, setConfig,
}: {
  config: ResultConfig
  setConfig: (v: ResultConfig) => void
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Страница результата</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500" />
          </label>
        </div>

        {config.enabled && (
          <div className="space-y-4">
            <QuizImageUpload imageUrl={config.image_url} onImageChange={(url: string | null) => setConfig({ ...config, image_url: url })} label="Картинка результата" aspectRatio="16:9" />

            <div>
              <label className="block text-sm text-gray-600 mb-1">Заголовок</label>
              <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Ваш результат" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Описание</label>
              <textarea value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 resize-none" rows={3} placeholder="Описание результата" />
            </div>
          </div>
        )}

        {!config.enabled && (
          <p className="text-sm text-gray-400">Отключено — после вопросов сразу покажется страница "Спасибо"</p>
        )}
      </div>
    </div>
  )
}

// ==========================================
// Tab 5: Спасибо
// ==========================================

function ThanksTab({
  config, setConfig,
}: {
  config: ThankYouConfig
  setConfig: (v: ThankYouConfig) => void
}) {
  return (
    <div className="space-y-5">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Страница "Спасибо"</h3>

        <div className="space-y-4">
          <QuizImageUpload imageUrl={config.image_url} onImageChange={(url: string | null) => setConfig({ ...config, image_url: url })} label="Картинка" aspectRatio="16:9" />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Заголовок</label>
            <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Спасибо!" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Описание</label>
            <textarea value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900 resize-none" rows={3} placeholder="Ваши ответы приняты" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Текст кнопки (необязательно)</label>
            <input type="text" value={config.cta_text || ''} onChange={(e) => setConfig({ ...config, cta_text: e.target.value || null })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="Перейти на сайт" />
          </div>

          {config.cta_text && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <Link2 className="w-3.5 h-3.5 inline mr-1" />
                Ссылка кнопки
              </label>
              <input type="url" value={config.cta_url || ''} onChange={(e) => setConfig({ ...config, cta_url: e.target.value || null })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-gray-900" placeholder="https://example.com" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
