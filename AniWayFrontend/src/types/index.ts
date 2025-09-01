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
