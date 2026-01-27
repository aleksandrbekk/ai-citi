import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, MessageSquare, Pencil, Trash2, Check, ArrowLeft } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import type { Chat } from '@/types/chat'

// Проверка TMA на мобильном для отступа
const isTMAMobile = () => {
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isTMA && isMobile
}

interface ChatListDrawerProps {
  isOpen: boolean
  onClose: () => void
}

function ChatItem({ chat, isActive }: { chat: Chat; isActive: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chat.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { setActiveChat, renameChat, deleteChat } = useChatStore()

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      renameChat(chat.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    deleteChat(chat.id)
    setShowDeleteConfirm(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200/50'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      {/* Подтверждение удаления */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-red-50 rounded-xl flex items-center justify-center gap-2 z-10"
          >
            <span className="text-sm text-red-600">Удалить?</span>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => !isEditing && setActiveChat(chat.id)}
        className="w-full p-3 text-left"
        disabled={isEditing}
      >
        <div className="flex items-start gap-3">
          {/* Индикатор активности */}
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            isActive ? 'bg-orange-500' : 'bg-gray-300'
          }`} />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') {
                    setEditTitle(chat.title)
                    setIsEditing(false)
                  }
                }}
                autoFocus
                className="w-full px-2 py-1 text-sm font-medium bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            ) : (
              <h3 className={`text-sm font-medium truncate ${
                isActive ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {chat.title}
              </h3>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {chat.messages.length} {getMessageWord(chat.messages.length)}
            </p>
          </div>

          {/* Кнопки действий (видны при hover или активном чате) */}
          <div className={`flex items-center gap-1 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditTitle(chat.title)
                setIsEditing(true)
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(true)
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </button>
    </motion.div>
  )
}

// Склонение слова "сообщение"
function getMessageWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'сообщений'
  }

  if (lastDigit === 1) {
    return 'сообщение'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'сообщения'
  }

  return 'сообщений'
}

export default function ChatListDrawer({ isOpen, onClose }: ChatListDrawerProps) {
  const { chats, activeChatId, createChat } = useChatStore()
  const needsTopPadding = isTMAMobile()

  const handleNewChat = () => {
    createChat()
    // Drawer автоматически закроется в store
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col ${needsTopPadding ? 'pt-[100px]' : ''}`}
          >
            {/* Header с кнопкой назад */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
              <button
                onClick={onClose}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                <h2 className="text-base font-semibold text-gray-900">Мои чаты</h2>
              </div>
            </div>

            {/* New chat button */}
            <div className="px-3 py-3">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                <Plus size={18} />
                <span>Новый чат</span>
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              {chats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Нет чатов. Создайте новый!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                    {chats.map(chat => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={chat.id === activeChatId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
