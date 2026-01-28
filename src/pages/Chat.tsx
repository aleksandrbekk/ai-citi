import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, User, Paperclip, Mic, MicOff, X, Image, FileText, Zap, Crown, Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import ChatListDrawer from '@/components/chat/ChatListDrawer'
import Paywall from '@/components/Paywall'
import { toast } from 'sonner'

// Типы лимитов
interface LimitInfo {
  tariff: string
  daily: number
  used: number
  remaining: number
  model?: string
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
  const tariffs = useAuthStore((state) => state.tariffs)

  // Проверка подписки — доступ только с активным тарифом
  const hasSubscription = tariffs.length > 0

  if (!hasSubscription) {
    return (
      <Paywall
        title="AI-Ассистент"
        description="Умный помощник для работы и бизнеса доступен по подписке"
        feature="Безлимитные диалоги с AI"
      />
    )
  }

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

  // Получаем сообщения из store
  const chatMessages = getActiveChatMessages()
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])

  // Синхронизация localMessages со store
  useEffect(() => {
    setLocalMessages(chatMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      attachments: undefined
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
      toast.error('Голосовой ввод не поддерживается в вашем браузере')
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

    addMessage({
      role: 'user',
      content: userMessageContent
    })

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
      const history = localMessages.map(m => ({
        role: m.role,
        content: m.content
      }))

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
          userId: user?.id
        }
      })

      if (error) throw error

      if (data.error === 'limit_exceeded') {
        setLimitError(data.message)
        setLimitInfo({
          tariff: data.tariff,
          daily: data.limit,
          used: data.used,
          remaining: 0
        })
        setLocalMessages(prev => prev.slice(0, -1))
        return
      }

      if (data.limit) {
        setLimitInfo({
          ...data.limit,
          model: data.model
        })
        setLimitError(null)
      }

      addMessage({
        role: 'assistant',
        content: data.reply
      })

      const assistantMessage: LocalMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply
      }

      setLocalMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Chat error:', error)

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

  // Цвета тарифов
  const getTariffColor = (tariff: string) => {
    switch (tariff) {
      case 'elite':
      case 'platinum':
        return 'from-amber-400 to-amber-500'
      case 'vip':
        return 'from-purple-400 to-purple-500'
      case 'pro':
      case 'standard':
        return 'from-cyan-400 to-cyan-500'
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

  // Название чата
  const activeChat = chats.find(c => c.id === activeChatId)
  const chatTitle = activeChat?.title || 'Ассистент'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Chat List Drawer */}
      <ChatListDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {/* Кнопка меню */}
        <button
          onClick={toggleDrawer}
          className="p-2 -ml-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
        >
          <Menu size={22} className="text-gray-600" />
        </button>

        {/* Аватар и название */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
            <Bot size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-gray-900 truncate">{chatTitle}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Онлайн
            </p>
          </div>
        </div>

        {/* Счётчик лимита */}
        {limitInfo && (
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r ${getTariffColor(limitInfo.tariff)} text-white text-[10px] font-semibold`}>
              {limitInfo.tariff !== 'basic' && <Crown size={10} />}
              <span>{getTariffLabel(limitInfo.tariff)}</span>
            </div>
            <div className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
              limitInfo.remaining === 0
                ? 'bg-red-100 text-red-600'
                : limitInfo.remaining <= 3
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-green-100 text-green-600'
            }`}>
              {limitInfo.remaining}/{limitInfo.daily}
            </div>
          </div>
        )}
      </div>

      {/* Баннер лимита */}
      <AnimatePresence>
        {limitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 mb-1">Лимит исчерпан</h3>
                <p className="text-sm text-orange-700 mb-3">
                  Вы использовали все {limitInfo?.daily || 10} запросов на сегодня.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/shop')}
                    className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-xl transition-shadow"
                  >
                    Улучшить тариф
                  </button>
                  <button
                    onClick={() => setLimitError(null)}
                    className="px-4 py-2 bg-white text-orange-600 text-sm font-medium rounded-xl border border-orange-200 hover:bg-orange-50 transition-colors"
                  >
                    Понятно
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {localMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 px-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cyan-500/20"
            >
              <Bot size={40} className="text-white" />
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Привет!
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              Я твой AI-ассистент. Задай любой вопрос или прикрепи фото.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {localMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={16} className="text-white" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.attachments.map(att => (
                      <div key={att.id}>
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
                  <div
                    className={`px-4 py-3 rounded-2xl ${message.role === 'user'
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-br-md shadow-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User size={16} className="text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center shadow-sm">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5 items-center">
                <motion.span
                  className="w-2 h-2 bg-cyan-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-2 h-2 bg-cyan-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                />
                <motion.span
                  className="w-2 h-2 bg-cyan-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
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
                  <img src={att.url} alt={att.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-[10px] text-gray-500 truncate w-14 text-center">{att.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm"
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
            className="px-4 py-3 bg-white border-t border-gray-100"
          >
            <div className="flex gap-3">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition-colors"
              >
                <Image size={20} />
                <span className="text-sm font-medium">Фото</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors"
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

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <div className={`border rounded-2xl bg-white transition-all duration-200 ${
          isRecording
            ? 'border-red-300 bg-red-50/50'
            : 'border-gray-200 focus-within:border-orange-400 focus-within:shadow-sm focus-within:shadow-orange-500/10'
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
              placeholder="Напиши сообщение..."
              className="w-full px-4 pt-3 pb-2 bg-transparent resize-none focus:outline-none text-gray-900 placeholder:text-gray-400 max-h-[120px] caret-orange-500"
              rows={1}
              disabled={isLoading}
            />
          )}

          <div className="flex items-center justify-between px-3 pb-3">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showAttachMenu
                  ? 'bg-orange-100 text-orange-500'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Paperclip size={20} />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2.5 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:active:scale-100"
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
