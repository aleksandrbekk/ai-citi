import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, Bot, User, Paperclip, Mic, MicOff, X, Image, FileText, Trash2, Zap, Crown, Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import ChatListDrawer from '@/components/chat/ChatListDrawer'

// Типы лимитов
interface LimitInfo {
  tariff: string
  daily: number
  used: number
  remaining: number
  model?: string
}

// Проверка TMA на мобильном для отступа
const getTMAPadding = () => {
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isTMA && isMobile
}

// Проверка, нужно ли показывать кнопку "назад"
// В TMA на мобильном есть своя кнопка X от Telegram
const shouldShowBackButton = () => {
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const platform = (tg as any)?.platform
  const isTMAMobile = isTMA && (platform === 'android' || platform === 'ios')
  return !isTMAMobile
}

interface Attachment {
  id: string
  type: 'image' | 'file'
  name: string
  url: string
  file?: File
}

// Конвертация файла в base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      // Убираем prefix "data:image/jpeg;base64," и оставляем только base64
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
}

export default function Chat() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const needsPadding = getTMAPadding()
  const showBackButton = shouldShowBackButton()

  // Chat store
  const {
    chats,
    activeChatId,
    isDrawerOpen,
    addMessage,
    getActiveChatMessages,
    setDrawerOpen,
    toggleDrawer
  } = useChatStore()

  // Состояние лимита
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)

  // Получаем сообщения из store и конвертируем для локального использования
  const chatMessages = getActiveChatMessages()
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])

  // Синхронизация localMessages со store
  useEffect(() => {
    setLocalMessages(chatMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      attachments: undefined // Attachments не сохраняются в store
    })))
  }, [activeChatId, chatMessages.length])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [localMessages])

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
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'ru-RU'

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
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
      alert('Голосовой ввод не поддерживается в вашем браузере')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: Date.now().toString() + Math.random(),
        type,
        name: file.name,
        url: URL.createObjectURL(file),
        file
      }
      setAttachments(prev => [...prev, attachment])
    })

    setShowAttachMenu(false)
    e.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return

    const userMessageContent = input.trim()
    const userAttachments = attachments.length > 0 ? [...attachments] : undefined

    // Добавляем сообщение пользователя в store
    addMessage({
      role: 'user',
      content: userMessageContent
    })

    // Локальное обновление с attachments (для отображения)
    const tempUserMessage: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      attachments: userAttachments
    }

    setLocalMessages(prev => [...prev, tempUserMessage])
    setInput('')
    setAttachments([])
    setIsLoading(true)

    try {
      // Подготавливаем историю для API
      const history = localMessages.map(m => ({
        role: m.role,
        content: m.content
      }))

      // Подготавливаем изображения для отправки
      const images: { mimeType: string; data: string }[] = []

      if (userAttachments) {
        for (const att of userAttachments) {
          if (att.type === 'image' && att.file) {
            const base64 = await fileToBase64(att.file)
            images.push({
              mimeType: att.file.type || 'image/jpeg',
              data: base64
            })
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          message: userMessageContent,
          history,
          images: images.length > 0 ? images : undefined,
          userId: user?.id // Для логирования
        }
      })

      if (error) throw error

      // Проверяем ошибку лимита
      if (data.error === 'limit_exceeded') {
        setLimitError(data.message)
        setLimitInfo({
          tariff: data.tariff,
          daily: data.limit,
          used: data.used,
          remaining: 0
        })
        // Удаляем последнее сообщение пользователя из локального состояния
        setLocalMessages(prev => prev.slice(0, -1))
        return
      }

      // Обновляем информацию о лимите
      if (data.limit) {
        setLimitInfo({
          ...data.limit,
          model: data.model // Добавляем использованную модель
        })
        setLimitError(null)
      }

      // Добавляем ответ ассистента в store
      addMessage({
        role: 'assistant',
        content: data.reply
      })

      // Локальное обновление
      const assistantMessage: LocalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply
      }

      setLocalMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Chat error:', error)

      // Проверяем ошибку лимита в catch
      if (error?.message?.includes('limit_exceeded')) {
        setLimitError('Достигнут лимит запросов на сегодня')
        setLocalMessages(prev => prev.slice(0, -1))
        return
      }

      const errorMessage: LocalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извини, произошла ошибка. Попробуй ещё раз.'
      }
      setLocalMessages(prev => [...prev, errorMessage])
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

  // Очистка текущего чата
  const handleClearChat = () => {
    if (confirm('Очистить историю текущего чата?')) {
      // Очищаем в store
      const { clearActiveChat } = useChatStore.getState()
      clearActiveChat()
      // Очищаем локально
      setLocalMessages([])
    }
  }

  // Функция получения цвета тарифа
  const getTariffColor = (tariff: string) => {
    switch (tariff) {
      case 'elite':
      case 'platinum':
        return 'from-amber-400 to-amber-500'
      case 'vip':
        return 'from-purple-400 to-purple-500'
      case 'pro':
      case 'standard':
        return 'from-blue-400 to-blue-500'
      default:
        return 'from-gray-400 to-gray-500'
    }
  }

  const getTariffLabel = (tariff: string) => {
    switch (tariff) {
      case 'elite':
      case 'platinum':
        return 'ELITE'
      case 'vip':
        return 'VIP'
      case 'pro':
      case 'standard':
        return 'PRO'
      default:
        return 'BASIC'
    }
  }

  // Получаем название активного чата
  const activeChat = chats.find(c => c.id === activeChatId)
  const chatTitle = activeChat?.title || 'AI Ассистент'

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col ${needsPadding ? 'pt-[100px]' : ''}`}>
      {/* Chat List Drawer */}
      <ChatListDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header - Minimal Chrome (AI-Native UI) */}
      <div className={`sticky ${needsPadding ? 'top-[100px]' : 'top-0'} z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100/30 px-4 py-3 flex items-center gap-3`}>
        {/* Кнопка назад - только на desktop и в браузере */}
        {showBackButton && (
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        )}

        {/* Кнопка меню чатов */}
        <button
          onClick={toggleDrawer}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200 cursor-pointer"
        >
          <Menu size={22} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center shadow-sm">
            <Bot size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[#1E293B] truncate">{chatTitle}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
              Онлайн
            </p>
          </div>
        </div>

        {/* Счётчик лимита и модель */}
        {limitInfo && (
          <div className="flex items-center gap-1.5">
            {/* Тариф */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r ${getTariffColor(limitInfo.tariff)} text-white text-[10px] font-semibold`}>
              {limitInfo.tariff !== 'basic' && <Crown size={10} />}
              <span>{getTariffLabel(limitInfo.tariff)}</span>
            </div>
            {/* Модель */}
            {limitInfo.model && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-medium text-gray-600">
                <Zap size={10} />
                <span>{limitInfo.model.replace('gemini-', '').replace('-', ' ')}</span>
              </div>
            )}
            {/* Счётчик */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
              limitInfo.remaining === 0
                ? 'bg-red-100 text-red-600'
                : limitInfo.remaining <= 3
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-green-100 text-green-600'
            }`}>
              <span>{limitInfo.remaining}/{limitInfo.daily}</span>
            </div>
          </div>
        )}
        {/* Кнопка очистки чата */}
        {localMessages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-red-50 rounded-xl transition-colors text-gray-400 hover:text-red-500"
            title="Очистить чат"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Баннер ошибки лимита */}
      <AnimatePresence>
        {limitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-1">Лимит исчерпан</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Вы использовали все {limitInfo?.daily || 10} запросов на сегодня.
                  Обновите тариф для увеличения лимита.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/shop')}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-500/20"
                  >
                    Улучшить тариф
                  </button>
                  <button
                    onClick={() => setLimitError(null)}
                    className="px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-xl border border-amber-200"
                  >
                    Понятно
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages - AI-Native Layout */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {localMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center py-16 px-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm"
            >
              <Bot size={40} className="text-white" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-semibold text-[#1E293B] mb-2"
            >
              Привет!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 max-w-sm mx-auto leading-relaxed text-sm"
            >
              Я твой AI-ассистент. Задай мне любой вопрос, прикрепи фото или запиши голосовое сообщение.
            </motion.p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {localMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <Bot size={16} className="text-white" />
                </motion.div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                {/* Вложения */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.attachments.map(att => (
                      <div key={att.id} className="relative">
                        {att.type === 'image' ? (
                          <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-xl object-cover" />
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                            <FileText size={16} className="text-gray-500" />
                            <span className="text-sm text-gray-700 truncate max-w-[150px]">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message.content && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className={`px-4 py-2.5 rounded-2xl ${message.role === 'user'
                      ? 'bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white rounded-br-md shadow-sm'
                      : 'bg-[#F9FAFB] border-l-2 border-[#6366F1]/20 text-[#1E293B] rounded-bl-md'
                      }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </motion.div>
                )}
              </div>

              {message.role === 'user' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-8 h-8 bg-gradient-to-br from-[#F97316] to-[#FB923C] rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <User size={16} className="text-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-[#F9FAFB] border-l-2 border-[#6366F1]/20 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5 items-center">
                <motion.span
                  className="w-1.5 h-1.5 bg-[#6366F1] rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-[#6366F1] rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-[#6366F1] rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map(att => (
              <div key={att.id} className="relative flex-shrink-0">
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-[10px] text-gray-500 truncate w-14 text-center">{att.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attach menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-2 bg-white border-t border-gray-100"
          >
            <div className="flex gap-4">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl"
              >
                <Image size={20} />
                <span className="text-sm font-medium">Фото</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl"
              >
                <FileText size={20} />
                <span className="text-sm font-medium">Файл</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
      />

      {/* Input - Minimal Chrome */}
      <div className={`sticky bottom-0 bg-gradient-to-t from-white via-white/98 to-transparent backdrop-blur-xl px-4 py-3 ${needsPadding ? 'pb-8' : 'pb-safe'}`}>
        <div className={`border rounded-xl bg-white/95 backdrop-blur-sm transition-all duration-200 ${isRecording ? 'border-red-300 bg-red-50/50' : 'border-gray-200/60 focus-within:border-[#6366F1] focus-within:shadow-sm'}`}>
          {/* Text input or Recording indicator */}
          {isRecording ? (
            <div className="px-4 py-4 flex items-center gap-3">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-medium">Слушаю...</span>
              <div className="flex gap-1 ml-auto">
                <span className="w-1 h-4 bg-red-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite]" />
                <span className="w-1 h-6 bg-red-500 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.1s]" />
                <span className="w-1 h-4 bg-red-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.2s]" />
                <span className="w-1 h-5 bg-red-500 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.3s]" />
                <span className="w-1 h-3 bg-red-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.4s]" />
              </div>
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напиши сообщение..."
              className="w-full px-4 pt-3 pb-2 bg-transparent resize-none focus:outline-none text-[#1E293B] placeholder:text-gray-400 max-h-[120px] caret-[#6366F1]"
              rows={1}
              disabled={isLoading}
            />
          )}

          {/* Bottom buttons row */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left: Attach button */}
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${showAttachMenu ? 'bg-[#E0E7FF] text-[#6366F1]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              <Paperclip size={20} />
            </button>

            {/* Right: Voice & Send buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${isRecording ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2 bg-gradient-to-r from-[#F97316] to-[#FB923C] rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-sm hover:shadow-[#F97316]/20 active:scale-95 disabled:active:scale-100"
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
    </div>
  )
}
