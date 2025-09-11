// Типы для API ответов
export interface MangaResponseDTO {
  id: number
  title: string
  author: string
  artist?: string
  genre: string
  tags?: string
  engName?: string
  alternativeNames?: string
  type: 'MANGA' | 'MANHWA' | 'MANHUA' | 'WESTERN_COMIC' | 'RUSSIAN_COMIC' | 'OEL' | 'OTHER'
  ageLimit?: number
  isLicensed?: boolean
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED'
  description: string
  releaseDate: string
  coverImageUrl: string
  chapterCount: number
  totalChapters: number
  views: number
  uniqueViews: number
  createdAt: string
  updatedAt: string
}

// Типы для глав
export interface ChapterDTO {
  id: number
  mangaId: number
  chapterNumber: number
  volumeNumber?: number
  originalChapterNumber?: number
  title: string
  pageCount: number
  publishedDate: string
  createdAt: string
  updatedAt: string
}

// Типы для изображений глав
export interface ChapterImageDTO {
  id: number
  mangaId?: number
  chapterId: number
  pageNumber: number
  imageUrl: string
  imageKey: string
  fileSize: number
  mimeType: string
  width: number
  height: number
  createdAt: string
  updatedAt: string
}

// Параметры поиска
export interface SearchParams {
  query?: string
  genre?: string
  status?: string
  type?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Типы для прогресса парсинга
export interface ProgressData {
  task_id: string
  status: string
  progress: number
  message: string
  updated_at: string
  result?: any
}

// Типы для WebSocket сообщений
export interface WebSocketMessage {
  type: 'connection' | 'progress' | 'log'
  taskId?: string
  data?: ProgressData
  level?: string
  message?: string
  timestamp?: number
  sessionId?: string
}

// Типы для логов
export interface LogMessage {
  level: string
  message: string
  timestamp: number
}

// Типы для пользователей и аутентификации
export interface User {
  id: number
  username: string
  email: string
  displayName?: string
  avatar?: string
  bio?: string
  role: 'USER' | 'ADMIN' | 'TRANSLATOR'
  isEnabled: boolean
  createdAt: string
  lastLogin?: string
  
  // Statistics
  chaptersReadCount?: number
  likesGivenCount?: number
  commentsCount?: number
  
  // Deprecated fields for backward compatibility
  profilePicture?: string
  registrationDate?: string
  lastLoginDate?: string
}

export interface AuthResponse {
  token: string
  type: string
  user: User
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// Типы для системы закладок
export interface Bookmark {
  id: number
  userId: number
  mangaId: number
  status: BookmarkStatus
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  manga?: MangaResponseDTO
  // Поля для отображения информации о манге (из BookmarkDTO)
  mangaTitle?: string
  mangaCoverUrl?: string
  // Поля для прогресса чтения
  currentChapter?: number
  totalChapters?: number
  currentPage?: number
  isCompleted?: boolean
}

export type BookmarkStatus = 'READING' | 'PLAN_TO_READ' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED'

export interface BookmarkRequest {
  mangaId: number
  status: BookmarkStatus
  isFavorite?: boolean
}

// Типы для прогресса чтения
export interface ReadingProgress {
  id: number
  userId: number
  mangaId: number
  chapterId: number
  chapterNumber?: number
  pageNumber: number
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  manga?: MangaResponseDTO
  chapter?: ChapterDTO
  mangaTitle?: string
  chapterTitle?: string
}

export interface ReadingProgressRequest {
  mangaId: number
  chapterId: number
  pageNumber?: number
  isCompleted?: boolean
  chapterNumber?: number
}

// Типы для пользовательского профиля
export interface UserProfile {
  user: User
  bookmarks: Bookmark[]
  readingProgress: ReadingProgress[]
  favoriteGenres?: string[]
  readingStats?: ReadingStats
}

export interface ReadingStats {
  totalMangaRead: number
  totalChaptersRead: number
  totalPagesRead: number
  favoriteGenres: string[]
  readingStreak: number
  averageRating?: number
}

// Типы для поиска пользователей (админ функции)
export interface UserSearchParams {
  query?: string
  role?: 'USER' | 'ADMIN' | 'TRANSLATOR'
  page?: number
  limit?: number
  sortBy?: 'username' | 'email' | 'registrationDate' | 'lastLoginDate'
  sortOrder?: 'asc' | 'desc'
}

export interface UserSearchResult {
  users: User[]
  total: number
  page: number
  totalPages: number
}

// Типы для комментариев
export * from './comments'
