// ===========================================
// ПОЛЬЗОВАТЕЛИ
// ===========================================

export interface User {
  id: string
  telegramId: number
  username?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  languageCode: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  userId: string
  level: number
  xp: number
  xpToNextLevel: number
  coins: number
  premiumCoins: number
  subscription: 'free' | 'pro' | 'business'
  subscriptionExpiresAt?: string
  stats: {
    learning: number
    content: number
    sales: number
    discipline: number
  }
  createdAt: string
  updatedAt: string
}

// ===========================================
// INSTAGRAM
// ===========================================

export interface InstagramAccount {
  id: string
  userId: string
  instagramUserId: string
  username?: string
  accessToken: string
  tokenExpiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ===========================================
// ПОСТЫ
// ===========================================

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'

export interface ScheduledPost {
  id: string
  userId: string
  instagramAccountId?: string
  caption?: string
  scheduledAt?: string
  status: PostStatus
  publishedAt?: string
  instagramPostId?: string
  instagramPermalink?: string
  errorMessage?: string
  retryCount: number
  source: 'manual' | 'ai_ferma'
  createdAt: string
  updatedAt: string
  // Relations
  postMedia?: PostMedia[]
}

export interface PostMedia {
  id: string
  postId: string
  orderIndex: number
  storagePath: string
  publicUrl: string
  width?: number
  height?: number
  fileSize?: number
  createdAt: string
}

// ===========================================
// ФОРМЫ
// ===========================================

export interface CreatePostInput {
  caption?: string
  scheduledAt?: string
  status?: PostStatus
  source?: 'manual' | 'ai_ferma'
}

export interface UpdatePostInput {
  caption?: string
  scheduledAt?: string
  status?: PostStatus
}

export interface UploadMediaInput {
  postId: string
  file: File
  orderIndex: number
}

// ===========================================
// API RESPONSES
// ===========================================

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
