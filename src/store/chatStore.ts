import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Chat, ChatMessage, ChatState } from '@/types/chat'

// Генерация уникального ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Генерация названия чата из первого сообщения
const generateTitleFromMessage = (content: string): string => {
  // Берём первые 30 символов сообщения
  const trimmed = content.trim().substring(0, 30)
  return trimmed.length < content.trim().length ? `${trimmed}...` : trimmed
}

// Миграция старых данных из chat-history
const migrateOldChatHistory = (): Chat[] => {
  try {
    const oldHistory = localStorage.getItem('chat-history')
    if (oldHistory) {
      const oldMessages = JSON.parse(oldHistory) as { id: string; role: 'user' | 'assistant'; content: string }[]
      if (oldMessages.length > 0) {
        // Создаём чат из старой истории
        const migratedChat: Chat = {
          id: generateId(),
          title: 'Прежний чат',
          messages: oldMessages.map(m => ({
            ...m,
            timestamp: Date.now()
          })),
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        // Удаляем старый ключ после миграции
        localStorage.removeItem('chat-history')
        return [migratedChat]
      }
    }
  } catch (e) {
    console.error('Failed to migrate old chat history:', e)
  }
  return []
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChatId: null,
      isDrawerOpen: false,

      createChat: () => {
        const newChat: Chat = {
          id: generateId(),
          title: 'Новый чат',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          chats: [newChat, ...state.chats],
          activeChatId: newChat.id,
          isDrawerOpen: false // Закрываем drawer при создании нового чата
        }))

        return newChat.id
      },

      deleteChat: (chatId: string) => {
        set(state => {
          const newChats = state.chats.filter(c => c.id !== chatId)
          // Если удаляем активный чат, переключаемся на первый доступный
          const newActiveChatId = state.activeChatId === chatId
            ? (newChats[0]?.id || null)
            : state.activeChatId

          return {
            chats: newChats,
            activeChatId: newActiveChatId
          }
        })
      },

      renameChat: (chatId: string, newTitle: string) => {
        set(state => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? { ...chat, title: newTitle, updatedAt: Date.now() }
              : chat
          )
        }))
      },

      setActiveChat: (chatId: string) => {
        set({ activeChatId: chatId, isDrawerOpen: false })
      },

      addMessage: (messageData) => {
        const { activeChatId, chats, createChat } = get()

        // Если нет активного чата, создаём новый
        let chatId = activeChatId
        if (!chatId || !chats.find(c => c.id === chatId)) {
          chatId = createChat()
        }

        const newMessage: ChatMessage = {
          id: generateId(),
          timestamp: Date.now(),
          ...messageData
        }

        set(state => ({
          chats: state.chats.map(chat => {
            if (chat.id !== chatId) return chat

            const updatedChat = {
              ...chat,
              messages: [...chat.messages, newMessage],
              updatedAt: Date.now()
            }

            // Автоматически переименовываем чат на основе первого сообщения пользователя
            if (chat.title === 'Новый чат' && messageData.role === 'user' && chat.messages.length === 0) {
              updatedChat.title = generateTitleFromMessage(messageData.content)
            }

            return updatedChat
          })
        }))
      },

      clearActiveChat: () => {
        const { activeChatId } = get()
        if (!activeChatId) return

        set(state => ({
          chats: state.chats.map(chat =>
            chat.id === activeChatId
              ? { ...chat, messages: [], updatedAt: Date.now() }
              : chat
          )
        }))
      },

      toggleDrawer: () => {
        set(state => ({ isDrawerOpen: !state.isDrawerOpen }))
      },

      setDrawerOpen: (open: boolean) => {
        set({ isDrawerOpen: open })
      },

      getActiveChat: () => {
        const { chats, activeChatId } = get()
        return chats.find(c => c.id === activeChatId) || null
      },

      getActiveChatMessages: () => {
        const chat = get().getActiveChat()
        return chat?.messages || []
      }
    }),
    {
      name: 'chat-storage-v2',
      onRehydrateStorage: () => (state) => {
        // После восстановления проверяем, нужна ли миграция
        if (state && state.chats.length === 0) {
          const migrated = migrateOldChatHistory()
          if (migrated.length > 0) {
            state.chats = migrated
            state.activeChatId = migrated[0].id
          }
        }
      },
      partialize: (state) => ({
        chats: state.chats.map(chat => ({
          ...chat,
          // Не сохраняем attachments с blob URL
          messages: chat.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        })),
        activeChatId: state.activeChatId
      })
    }
  )
)
