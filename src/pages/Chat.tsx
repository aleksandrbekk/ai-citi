import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, Bot, User, Lock, Paperclip, Mic, MicOff, X, Image, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Проверка TMA на мобильном для отступа
const getTMAPadding = () => {
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isTMA && isMobile
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

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
}

export default function Chat() {
  const navigate = useNavigate()
  const tariffs = useAuthStore((state) => state.tariffs)
  const hasPaidAccess = tariffs.length > 0
  const needsPadding = getTMAPadding()

  // Загрузка истории из localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('chat-history')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Убираем attachments с blob URL (они не сохраняются)
        return parsed.map((m: Message) => ({ ...m, attachments: undefined }))
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
    return []
  })
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

  // Сохранение истории в localStorage
  useEffect(() => {
    if (messages.length > 0) {
      // Сохраняем только текст, без attachments
      const toSave = messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content
      }))
      localStorage.setItem('chat-history', JSON.stringify(toSave))
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachments([])
    setIsLoading(true)

    try {
      // Подготавливаем историю для API
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      // Подготавливаем изображения для отправки
      const images: { mimeType: string; data: string }[] = []

      if (userMessage.attachments) {
        for (const att of userMessage.attachments) {
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
          message: userMessage.content,
          history,
          images: images.length > 0 ? images : undefined
        }
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
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

  // Если нет подписки - показываем экран блокировки
  if (!hasPaidAccess) {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-[#FFF8F5] to-white flex flex-col ${needsPadding ? 'pt-[100px]' : ''}`}>
        {/* Header */}
        <div className={`sticky ${needsPadding ? 'top-[100px]' : 'top-0'} z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3`}>
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Ассистент</h1>
              <p className="text-xs text-gray-400">Требуется подписка</p>
            </div>
          </div>
        </div>

        {/* Locked content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock size={40} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
            <p className="text-gray-500 mb-6">
              AI-ассистент доступен только для пользователей с активной подпиской.
              Оформи подписку, чтобы получить доступ к умному помощнику.
            </p>
            <button
              onClick={() => navigate('/school')}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
            >
              Оформить подписку
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#FFF8F5] to-white flex flex-col ${needsPadding ? 'pt-[100px]' : ''}`}>
      {/* Header */}
      <div className={`sticky ${needsPadding ? 'top-[100px]' : 'top-0'} z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3`}>
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Ассистент</h1>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Онлайн
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/30">
              <Bot size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Привет!</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              Я твой AI-ассистент. Задай мне любой вопрос, прикрепи фото или запиши голосовое сообщение.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
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
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
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
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

      {/* Input */}
      <div className={`sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-3 ${needsPadding ? 'pb-8' : 'pb-safe'}`}>
        <div className="flex gap-2 items-end">
          {/* Attach button */}
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-3 rounded-full transition-all ${showAttachMenu ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Paperclip size={20} />
          </button>

          {/* Text input or Recording indicator */}
          {isRecording ? (
            <div className="flex-1 px-4 py-3 bg-red-50 border-2 border-red-400 rounded-2xl flex items-center gap-3">
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
              className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/50 text-gray-800 placeholder:text-gray-400 max-h-[120px] caret-gray-800"
              rows={1}
              disabled={isLoading}
            />
          )}

          {/* Voice button */}
          <button
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="p-3 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95"
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
  )
}
