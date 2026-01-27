// Типы для системы чатов

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments?: {
    id: string
    type: 'image' | 'file'
    name: string
    url: string
  }[]
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ChatState {
  chats: Chat[]
  activeChatId: string | null
  isDrawerOpen: boolean

  // Actions
  createChat: () => string
  deleteChat: (chatId: string) => void
  renameChat: (chatId: string, newTitle: string) => void
  setActiveChat: (chatId: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearActiveChat: () => void
  toggleDrawer: () => void
  setDrawerOpen: (open: boolean) => void

  // Getters
  getActiveChat: () => Chat | null
  getActiveChatMessages: () => ChatMessage[]
}
