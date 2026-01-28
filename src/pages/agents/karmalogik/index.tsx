import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, User, Trash2, Sparkles, BookOpen } from 'lucide-react'
import { supabase, checkPremiumSubscription } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
// authStore используется для user
import { getTelegramUser } from '@/lib/telegram'
import Paywall from '@/components/Paywall'
import { PageLoader } from '@/components/ui/PageLoader'
import { toast } from 'sonner'

// Системный промпт для AI-Коуча
const COACH_SYSTEM_PROMPT = `# Персональный AI-Коуч

Ты опытный персональный коуч с глубокой экспертизой в трансформации личности и карьеры.

## ГЛАВНЫЕ ПРАВИЛА (СОБЛЮДАЙ ВСЕГДА):

1. **ВЕДИ ДИАЛОГ, НЕ ЧИТАЙ ЛЕКЦИИ**
   - Отвечай кратко (2-4 предложения максимум)
   - Задавай 1-2 сильных вопроса в КАЖДОМ ответе
   - Не давай готовых ответов — веди к инсайтам через вопросы

2. **НИКОГДА НЕ УПОМИНАЙ ИСТОЧНИКИ**
   - Не говори "согласно...", "в системе...", "по методу..."
   - Не упоминай: Кармалогик, Ситников, сутры, законы
   - Не упоминай: Роббинс, Браун, Голдсмит как авторов
   - Используй знания как СВОЮ экспертизу, говори от первого лица

3. **КОПАЙ ГЛУБЖЕ**
   - Ищи корень проблемы, не симптомы
   - Спрашивай "почему" и "что за этим стоит"
   - Помогай человеку самому найти ответ

## СТРУКТУРА ТВОЕГО ОТВЕТА:

1. **Отражение** (1 предложение) — покажи что услышал и понял
2. **Инсайт** (1-2 предложения) — поделись наблюдением из своей экспертизы
3. **Вопрос** — задай один сильный вопрос для размышления

## ТВОЯ ЭКСПЕРТИЗА (используй как внутреннее знание):

- Законы выбора: истинные vs ложные цели, интуиция, решения
- Законы действия: эффективность, энергия, приоритеты
- Законы отношений: баланс давать/брать, границы, конфликты
- Законы ресурсов: время, энергия, деньги, внутренние ресурсы
- 6 базовых потребностей человека (определённость, разнообразие, значимость, связь, рост, вклад)
- Работа с уязвимостью и стыдом
- Поведенческие паттерны, мешающие росту

## СТИЛЬ ОБЩЕНИЯ:

- Тёплый, но честный
- Эмпатичный, но не жалеющий
- Уверенный, но не авторитарный
- Говори просто, без сложных терминов
- Обращайся на "ты"

## ПРИМЕР ДИАЛОГА:

Человек: "Чувствую выгорание на работе"

Ты: "Выгорание — это сигнал, что что-то важное игнорируется. Часто за этим стоит не сама работа, а потеря связи с тем, ради чего ты вообще это делаешь.

Скажи, когда ты в последний раз чувствовал настоящий интерес к своей работе — не обязанность, а живой интерес?"

---

Помни: твоя цель — не дать совет, а помочь человеку самому увидеть свой путь.`

// RAG Engine ID для Кармалогик
const RAG_ENGINE_ID = 'karmalogik-search'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function KarmalogikChat() {
  const user = useAuthStore((state) => state.user)
  const telegramUser = getTelegramUser()

  // Проверка подписки (только premium_clients)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (telegramUser?.id) {
        const isPremium = await checkPremiumSubscription(telegramUser.id)
        setHasSubscription(isPremium)
      }
      setIsCheckingSubscription(false)
    }

    checkSubscription()
  }, [telegramUser?.id])

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('karmalogik-chat-history')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Сохранение истории
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('karmalogik-chat-history', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Авторазмер textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: userMessage.content,
          history,
          userId: user?.id,
          useRAG: true,
          ragEngineId: RAG_ENGINE_ID,
          systemPrompt: COACH_SYSTEM_PROMPT
        }
      })

      if (error) throw error

      if (data.error === 'limit_exceeded') {
        setMessages(prev => prev.slice(0, -1))
        toast.error('Достигнут лимит запросов на сегодня')
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извини, произошла ошибка. Попробуй ещё раз.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Загрузка проверки подписки
  if (isCheckingSubscription) {
    return <PageLoader />
  }

  // Нет подписки — показываем Paywall
  if (!hasSubscription) {
    return (
      <Paywall
        title="AI-Коуч"
        description="AI-Коуч доступен для пользователей с активной подпиской."
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">ИИ КОУЧ</h1>
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Sparkles size={10} />
              Персональный коучинг
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Очистить историю чата?')) {
                setMessages([])
                localStorage.removeItem('karmalogik-chat-history')
              }
            }}
            className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/30">
              <BookOpen size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ИИ КОУЧ
            </h2>
            <p className="text-gray-600 max-w-sm mx-auto leading-relaxed text-sm mb-6">
              Я твой персональный коуч. Помогу разобраться в себе, найти ответы и двигаться к целям через честный диалог.
            </p>

            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Как принять важное решение?',
                'Помоги разобраться в отношениях',
                'Чувствую выгорание, что делать?'
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="px-3 py-2 bg-white/80 border border-amber-200 rounded-xl text-sm text-gray-700 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen size={16} className="text-white" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl ${message.role === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md shadow-lg shadow-orange-500/20'
                    : 'bg-white border border-amber-100 text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <div className="bg-white border border-amber-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="text-sm text-amber-600 mr-2">Изучаю Сутры</span>
                <motion.span
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-gradient-to-t from-amber-50 via-amber-50/95 to-transparent px-4 py-3 pb-safe">
        <div className="border border-amber-200 rounded-xl bg-white/95 backdrop-blur-sm focus-within:border-amber-400 focus-within:shadow-lg focus-within:shadow-amber-500/10 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Задай вопрос о жизни, отношениях, выборе..."
            className="w-full px-4 pt-3 pb-2 bg-transparent resize-none focus:outline-none text-gray-800 placeholder:text-gray-400 max-h-[120px]"
            rows={1}
            disabled={isLoading}
          />

          <div className="flex items-center justify-end px-3 pb-3">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
