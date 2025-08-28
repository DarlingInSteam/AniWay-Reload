// Типы для API ответов
export interface MangaResponseDTO {
  id: number
  title: string
  author: string
  genre: string
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED'
  description: string
  releaseDate: string
  coverImageUrl: string
  chapterCount: number
  createdAt: string
  updatedAt: string
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
