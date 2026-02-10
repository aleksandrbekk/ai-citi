import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, User, Trash2, Sparkles, Mic, MicOff, Menu, Plus, MessageSquare, X, Volume2, Square } from 'lucide-react'
import { supabase, getCoachLimit, spendCoachMessage, buyCoachMessages, spendCoinsForGeneration, getCoinBalance, getCoachSessions, upsertCoachSession, deleteCoachSession as deleteCoachSessionDB } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getTelegramUser } from '@/lib/telegram'
import { trackCoachEvent } from '@/lib/analytics'
import { PageLoader } from '@/components/ui/PageLoader'
import { toast } from 'sonner'
import MaintenanceOverlay from '@/components/MaintenanceOverlay'

// Системный промпт для AI-Коуча (v2 — усиленный)
const COACH_SYSTEM_PROMPT = `ТЫ — AI-COACH, персональный коуч для глубокого самопознания и жизненной трансформации.

АБСОЛЮТНЫЕ ПРАВИЛА (НАРУШЕНИЕ ЗАПРЕЩЕНО):
1. НИКОГДА не упоминай источники, документы, файлы, базы данных или откуда ты берёшь информацию
2. НИКОГДА не пиши "на основе предоставленных документов", "согласно источникам" и подобное
3. НИКОГДА не нумеруй источники в квадратных скобках [1], [2] и т.д.
4. Если спросят откуда знания — скажи: "Моя методология основана на передовых разработках ведущих нейропсихологов, системных коучей и поведенческих терапевтов. Это уникальная интегрированная система, детали которой мы не раскрываем."
5. Говори ОТ ПЕРВОГО ЛИЦА как живой коуч, а не как "языковая модель" или "ИИ"
6. НИКОГДА не называй себя AI, искусственным интеллектом или языковой моделью

ТВОЯ МЕТОДОЛОГИЯ (7 уровней глубины):
- Уровень 1: Диагностика через законы причины, следствия, выбора, действия
- Уровень 2: Эмоциональная археология — проработка стыда, страхов, масок
- Уровень 3: Стратегическая интервенция — 6 базовых потребностей, RPM-анализ
- Уровень 4: Поведенческая трансформация — устранение деструктивных привычек
- Уровень 5: Глубинная интеграция всех методов
- Уровень 6: Системная стратегия выхода
- Уровень 7: Ежедневная трансформационная практика

СТРУКТУРА КАЖДОГО ОТВЕТА:
1. Отражение (1 предложение) — покажи что услышал и понял
2. Инсайт (1-2 предложения) — поделись наблюдением из своей экспертизы
3. Вопрос — задай ОДИН сильный вопрос для размышления

КАК ВЕСТИ СЕССИЮ:
- Задавай ОДИН глубокий вопрос за раз
- НЕ вываливай всю методологию разом
- Слушай → задавай уточняющий вопрос → помогай осознать
- Веди к инсайтам через диалог, а не через лекции
- Будь тёплым, но честным — как мудрый наставник
- Используй метафоры и примеры из жизни
- Максимум 2-3 абзаца в ответе
- Отвечай на русском языке

ЕСЛИ ПОЛЬЗОВАТЕЛЬ СПРАШИВАЕТ "ЧТО ТЫ УМЕЕШЬ":
"Я помогу тебе:
🔍 Распутать сложные жизненные ситуации
🎯 Найти истинные цели (не навязанные извне)
💡 Увидеть слепые зоны в мышлении и поведении
🔄 Выйти из деструктивных паттернов
⚡ Перезапустить энергию и мотивацию

Моя методология объединяет лучшие мировые практики нейропсихологии, системного коучинга и поведенческой трансформации.

Расскажи, что тебя сейчас беспокоит — и мы начнём."

СТИЛЬ ОБЩЕНИЯ:
- Ты на "ты" с клиентом
- Ты спокойный, уверенный, глубокий
- Без воды, без "бла-бла-бла"
- Каждый ответ должен продвигать человека вперёд
- Если человек растерян — помоги сфокусироваться
- Если человек в боли — поддержи и направь

ПРИМЕР ИДЕАЛЬНОГО ОТВЕТА:

Человек: "Чувствую выгорание на работе"

Ты: "Выгорание — это мощный сигнал. Обычно за ним стоит не усталость от работы как таковой, а потеря связи с тем, ради чего ты вообще это начинал.

Скажи, когда ты в последний раз чувствовал настоящий азарт от того, что делаешь? Не обязанность, а живой интерес?"`

// RAG Engine ID для AI-Coach
const RAG_ENGINE_ID = 'ai-coach-search_1770521915522'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function KarmalogikChat() {
  const user = useAuthStore((state) => state.user)
  const telegramUser = getTelegramUser()
  const navigate = useNavigate()

  // Лимит сообщений
  const [isLoadingLimit, setIsLoadingLimit] = useState(true)
  const [messagesRemaining, setMessagesRemaining] = useState(0)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [coinBalance, setCoinBalance] = useState(0)

  // Чат и сессии
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [sessions, setSessions] = useState<{ id: string; title: string; date: string; messages: Message[] }[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>(() => crypto.randomUUID())
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загрузка лимита + сессий из БД
  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        // Параллельно грузим лимит, сессии и баланс
        const [limit, dbSessions, balance] = await Promise.all([
          getCoachLimit(telegramUser.id),
          getCoachSessions(telegramUser.id),
          getCoinBalance(telegramUser.id)
        ])
        setMessagesRemaining(limit.messages_remaining)
        setCoinBalance(balance)

        if (dbSessions.length > 0) {
          // Найти активную сессию
          const active = dbSessions.find(s => s.is_active)
          if (active) {
            setActiveSessionId(active.session_id)
            setMessages(active.messages || [])
          }
          // Остальные — в список сессий
          const otherSessions = dbSessions
            .filter(s => !s.is_active && s.messages && (s.messages as Message[]).length > 0)
            .map(s => ({
              id: s.session_id,
              title: s.title || 'Сессия',
              date: new Date(s.updated_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
              messages: s.messages as Message[]
            }))
          setSessions(otherSessions)
        }
      }
      setIsLoadingLimit(false)
    }
    loadData()
  }, [telegramUser?.id])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [loadingTTSId, setLoadingTTSId] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // TTS — озвучка сообщений коуча
  const playTTS = async (messageId: string, text: string) => {
    // Если играет это же сообщение — остановить
    if (playingMessageId === messageId && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingMessageId(null)
      return
    }

    trackCoachEvent('tts_played')
    // Остановить предыдущее
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setLoadingTTSId(messageId)

    try {
      const response = await supabase.functions.invoke('tts', {
        body: { text }
      })

      if (response.error) throw response.error
      const { audioContent } = response.data

      if (!audioContent) throw new Error('No audio')

      // Декодируем base64 и воспроизводим
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      )
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setPlayingMessageId(null)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = () => {
        setPlayingMessageId(null)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
        toast.error('Не удалось воспроизвести')
      }

      audioRef.current = audio
      setPlayingMessageId(messageId)
      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      toast.error('Озвучка временно недоступна')
    } finally {
      setLoadingTTSId(null)
    }
  }

  // Очистка аудио при размонтировании / сворачивании
  useEffect(() => {
    const stopAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
        setPlayingMessageId(null)
      }
    }

    const handleVisibility = () => {
      if (document.hidden) stopAudio()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', stopAudio)

    return () => {
      stopAudio()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', stopAudio)
    }
  }, [])

  // Дебаунс-сохранение в БД после изменения сообщений
  useEffect(() => {
    if (messages.length > 0 && telegramUser?.id) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const firstMsg = messages.find(m => m.role === 'user')
        const title = firstMsg ? firstMsg.content.slice(0, 40) + (firstMsg.content.length > 40 ? '...' : '') : 'Новая сессия'
        upsertCoachSession(telegramUser.id, activeSessionId, title, messages, true)
      }, 2000)
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [messages, activeSessionId, telegramUser?.id])

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

  // Инициализация голосового ввода
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'ru-RU'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || ''
        if (transcript) {
          setInput(prev => prev ? prev + ' ' + transcript : transcript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        setIsRecording(false)
        if (event.error === 'not-allowed') {
          toast.error('Разреши доступ к микрофону в настройках')
        } else if (event.error !== 'aborted') {
          toast.error('Голосовой ввод недоступен на этом устройстве')
        }
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Голосовой ввод не поддерживается')
      return
    }
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch {
        toast.error('Голосовой ввод недоступен на этом устройстве')
        setIsRecording(false)
      }
    }
  }

  // Сессии — синхронизация через БД
  const saveCurrentSession = async () => {
    if (messages.length === 0 || !telegramUser?.id) return
    const firstMsg = messages.find(m => m.role === 'user')
    const title = firstMsg ? firstMsg.content.slice(0, 40) + (firstMsg.content.length > 40 ? '...' : '') : 'Сессия'
    await upsertCoachSession(telegramUser.id, activeSessionId, title, messages, false)
    // Добавить в локальный список
    const newSession = {
      id: activeSessionId,
      title,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      messages: [...messages]
    }
    setSessions(prev => [newSession, ...prev.filter(s => s.id !== activeSessionId)].slice(0, 20))
  }

  const startNewSession = async () => {
    await saveCurrentSession()
    const newId = crypto.randomUUID()
    setActiveSessionId(newId)
    setMessages([])
    setDrawerOpen(false)
  }

  const loadSession = async (session: { id: string; messages: Message[] }) => {
    // Сохранить текущую как неактивную
    if (messages.length > 0 && telegramUser?.id) {
      const firstMsg = messages.find(m => m.role === 'user')
      const title = firstMsg ? firstMsg.content.slice(0, 40) + (firstMsg.content.length > 40 ? '...' : '') : 'Сессия'
      await upsertCoachSession(telegramUser.id, activeSessionId, title, messages, false)
    }
    // Загрузить выбранную как активную
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setSessions(prev => prev.filter(s => s.id !== session.id))
    if (telegramUser?.id) {
      const firstMsg = session.messages.find(m => m.role === 'user')
      const title = firstMsg ? firstMsg.content.slice(0, 40) + (firstMsg.content.length > 40 ? '...' : '') : 'Сессия'
      await upsertCoachSession(telegramUser.id, session.id, title, session.messages, true)
    }
    setDrawerOpen(false)
  }

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (telegramUser?.id) {
      await deleteCoachSessionDB(telegramUser.id, id)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    // Проверка лимита сообщений
    if (messagesRemaining <= 0) {
      setShowBuyModal(true)
      return
    }

    // Списываем сообщение
    if (telegramUser?.id) {
      const spendResult = await spendCoachMessage(telegramUser.id)
      if (!spendResult.success) {
        setShowBuyModal(true)
        return
      }
      setMessagesRemaining(spendResult.messages_remaining)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    trackCoachEvent('message_sent')

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

  // Загрузка лимита
  if (isLoadingLimit) {
    return <PageLoader />
  }

  // Покупка сообщений за нейроны
  const handleBuyMessages = async () => {
    if (!telegramUser?.id) return
    setIsBuying(true)
    try {
      // Обновляем баланс перед покупкой
      const freshBalance = await getCoinBalance(telegramUser.id)
      setCoinBalance(freshBalance)
      if (freshBalance < 30) {
        setShowBuyModal(false)
        navigate('/shop')
        return
      }
      const spendResult = await spendCoinsForGeneration(telegramUser.id, 30, 'Покупка 20 сообщений AI-Coach', { type: 'coach_messages' })
      if (!spendResult.success) {
        toast.error('Не удалось списать нейроны')
        setIsBuying(false)
        return
      }
      setCoinBalance(prev => prev - 30)
      const buyResult = await buyCoachMessages(telegramUser.id, 20)
      if (buyResult.success) {
        setMessagesRemaining(buyResult.messages_remaining)
        setShowBuyModal(false)
        toast.success('Готово! +20 сообщений')
      }
    } catch {
      toast.error('Ошибка при покупке')
    }
    setIsBuying(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      <MaintenanceOverlay />
      {/* Sessions Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Сессии</h2>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={startNewSession}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-orange-500/20 cursor-pointer"
                >
                  <Plus size={18} />
                  Новая сессия
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                {sessions.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">Пока нет сохранённых сессий</p>
                )}
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 group"
                  >
                    <button
                      onClick={() => loadSession(session)}
                      className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors text-left cursor-pointer"
                    >
                      <MessageSquare size={16} className="text-amber-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 truncate">{session.title}</p>
                        <p className="text-[10px] text-gray-400">{session.date} · {session.messages.length} сообщ.</p>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-amber-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
        >
          <Menu size={22} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <img
            src="/images/ai-coach-avatar.png"
            alt="AI-Coach"
            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-orange-500/20"
          />
          <div>
            <h1 className="text-base font-semibold text-gray-900">AI-Coach</h1>
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Sparkles size={10} />
              Твой внутренний компас ✨
            </p>
          </div>
        </div>

        {/* Счётчик сообщений */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          messagesRemaining <= 0 ? 'bg-red-100 text-red-600' :
          messagesRemaining <= 5 ? 'bg-amber-100 text-amber-600' :
          'bg-green-100 text-green-600'
        }`}>
          {messagesRemaining} сообщ.
        </div>

        <button
          onClick={() => setShowBuyModal(true)}
          className="p-2 hover:bg-amber-50 rounded-xl transition-colors text-gray-400 hover:text-amber-500 cursor-pointer"
          aria-label="Купить сообщения"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 px-4"
          >
            <motion.img
              src="/images/ai-coach-avatar.png"
              alt="AI-Coach"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-28 h-28 rounded-2xl object-cover mx-auto mb-4 shadow-xl shadow-orange-500/20"
            />
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              AI-Coach
            </h2>
            <p className="text-xs text-amber-600 mb-4">Твой внутренний компас ✨</p>

            {/* Coach welcome message */}
            <div className="text-left bg-white/80 backdrop-blur-xl border border-amber-100 rounded-2xl p-4 max-w-sm mx-auto mb-5 shadow-sm">
              <p className="text-gray-800 text-sm leading-relaxed">
                Привет{telegramUser?.first_name ? `, ${telegramUser.first_name}` : ''}! 👋
              </p>
              <p className="text-gray-700 text-sm leading-relaxed mt-2">
                Я — твой персональный коуч. Моя задача — помочь тебе увидеть то, что ты пока не замечаешь, и найти свои ответы.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed mt-2">
                Я работаю с:
              </p>
              <ul className="mt-1 space-y-1 text-sm text-gray-700">
                <li>🔍 Жизненные развилки и сложные решения</li>
                <li>🔄 Выгорание, потеря мотивации, рассфокус</li>
                <li>💡 Отношения, конфликты, границы</li>
                <li>🎯 Поиск целей и предназначения</li>
                <li>⚡ Энергия, ресурсы, самореализация</li>
              </ul>
              <p className="text-gray-600 text-xs mt-3 italic">
                Методология основана на лучших мировых практиках нейропсихологии и системного коучинга.
              </p>
            </div>

            {/* Quick prompts */}
            <p className="text-xs text-gray-400 mb-2">С чего начнём?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                '🔥 Чувствую выгорание',
                '🤔 Не могу принять решение',
                '💔 Проблемы в отношениях',
                '🎯 Хочу найти свою цель',
                '😰 Тревога и неуверенность'
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt.replace(/^[^\s]+\s/, ''))}
                  className="px-3 py-2 bg-white/80 border border-amber-200 rounded-xl text-sm text-gray-700 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200 cursor-pointer"
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
                <img
                  src="/images/ai-coach-avatar.png"
                  alt="Coach"
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
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
                {/* TTS кнопка — только для сообщений коуча */}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => playTTS(message.id, message.content)}
                    disabled={loadingTTSId === message.id}
                    className="mt-1 ml-1 p-1.5 rounded-lg hover:bg-amber-50 transition-colors group cursor-pointer"
                    title={playingMessageId === message.id ? 'Остановить' : 'Озвучить'}
                  >
                    {loadingTTSId === message.id ? (
                      <Loader2 size={14} className="text-amber-500 animate-spin" />
                    ) : playingMessageId === message.id ? (
                      <Square size={14} className="text-orange-500 fill-orange-500" />
                    ) : (
                      <Volume2 size={14} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                    )}
                  </button>
                )}
              </div>

              {message.role === 'user' && (
                telegramUser?.photo_url ? (
                  <img
                    src={telegramUser.photo_url}
                    alt="You"
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )
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
            <img
              src="/images/ai-coach-avatar.png"
              alt="Coach"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div className="bg-white border border-amber-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="text-sm text-amber-600 mr-2">Размышляю...</span>
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
        <div className={`border rounded-2xl bg-white/95 backdrop-blur-sm transition-all duration-200 ${isRecording
          ? 'border-red-300 bg-red-50/50'
          : 'border-amber-200 focus-within:border-amber-400 focus-within:shadow-lg focus-within:shadow-amber-500/10'
          }`}>
          {isRecording ? (
            <div className="px-4 py-4 flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-medium">Слушаю...</span>
              <div className="flex gap-1 ml-auto">
                {[4, 6, 4, 5, 3].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-red-400 rounded-full animate-bounce"
                    style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задай вопрос о жизни, отношениях, выборе..."
              className="w-full px-4 pt-3 pb-2 bg-transparent resize-none focus:outline-none text-gray-800 placeholder:text-gray-400 max-h-[120px] caret-amber-500"
              rows={2}
              disabled={isLoading}
            />
          )}

          <div className="flex items-center justify-end px-3 pb-3 gap-2">
            {recognitionRef.current && (
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-xl transition-all cursor-pointer ${isRecording
                  ? 'bg-red-500 text-white'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}

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

      {/* Модалка покупки сообщений */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBuyModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Купи ещё запросы</h3>
              {/* Баланс нейронов */}
              <p className="text-sm text-gray-500 mt-3">Ваш баланс:</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <img src="/neirocoin.png" alt="Нейро" className="w-7 h-7 object-contain drop-shadow-sm" />
                <span className="font-bold text-orange-600 text-lg">{coinBalance} нейронов</span>
              </div>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 mb-5 text-center">
              <p className="text-2xl font-bold text-orange-600">30 нейронов</p>
              <p className="text-xs text-orange-400 mt-1">= 20 сообщений</p>
            </div>
            {coinBalance >= 30 ? (
              <button
                onClick={handleBuyMessages}
                disabled={isBuying}
                className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isBuying ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Купить 20 сообщений'
                )}
              </button>
            ) : (
              <button
                onClick={() => { setShowBuyModal(false); navigate('/shop') }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Пополнить баланс
                <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
              </button>
            )}
            <button
              onClick={() => setShowBuyModal(false)}
              className="w-full py-2.5 mt-2 text-gray-400 text-sm cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
