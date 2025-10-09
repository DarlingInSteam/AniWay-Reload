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
  status: 'ONGOING' | 'COMPLETED' | 'ANNOUNCED' | 'HIATUS' | 'CANCELLED'
  description: string
  releaseDate: string
  coverImageUrl: string
  chapterCount: number
  totalChapters: number
  views: number
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
  likeCount: number
  publishedDate: string
  createdAt: string
  updatedAt: string
}

export interface ChapterCreateRequest {
  mangaId: number
  chapterNumber: number
  volumeNumber?: number | null
  originalChapterNumber?: number | null
  title?: string | null
  publishedDate?: string | null
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
  genres?: string[] // Массив ID или имен жанров
  tags?: string[] // Массив ID или имен тегов
  status?: string
  type?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  ageRating?: [number, number] // Диапазон возрастного рейтинга
  rating?: [number, number] // Диапазон рейтинга
  releaseYear?: [number, number] // Диапазон года выпуска
  chapterRange?: [number, number] // Диапазон количества глав
}

// Пагинированный ответ
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  numberOfElements: number
}

export interface ChapterMetricsEntry {
  chapter_id?: string
  images?: number
  expected_images?: number | null
  duration_seconds?: number | null
  started_at?: string | null
  completed_at?: string | null
  images_per_second?: number | null
}

export interface ParsingAggregateMetrics {
  chapters: number
  total_images: number
  total_duration_seconds: number
  avg_duration_seconds: number | null
  median_duration_seconds: number | null
  min_duration_seconds: number | null
  max_duration_seconds: number | null
  images_per_second: number | null
}

export interface CommandMetrics {
  started_at?: string
  completed_at?: string
  duration_seconds?: number
}

export interface ParsingMetrics {
  chapters?: ChapterMetricsEntry[]
  aggregate?: ParsingAggregateMetrics
  command?: CommandMetrics
}

// Типы для прогресса парсинга
export interface ProgressData {
  task_id: string
  status: string
  progress: number
  message: string
  updated_at: string
  result?: any
  metrics?: ParsingMetrics
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
  level?: number // derived level from backend (tops)
  xp?: number    // derived xp
  
  // Deprecated fields for backward compatibility
  profilePicture?: string
  registrationDate?: string
  lastLoginDate?: string
}

export interface AuthResponse {
  token: string
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
  displayName?: string
  verificationToken?: string
}

export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
  // Можно добавить другие поля для будущих обновлений
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
  mangaUpdatedAt?: string
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

// Типы для админской панели
export interface AdminUserData {
  id: number
  username: string
  email: string
  displayName: string
  avatar: string
  bio: string
  role: 'USER' | 'ADMIN' | 'TRANSLATOR'
  isEnabled: boolean
  createdAt: string
  lastLogin: string
  registrationDate: string
  lastLoginDate: string
  chaptersReadCount: number
  likesGivenCount: number
  commentsCount: number
  // --- Optional security extensions (frontend tentative) ---
  banType?: 'PERM' | 'TEMP' | 'SHADOW'
  banExpiresAt?: string | null
  emailVerified?: boolean
  mfaEnabled?: boolean
  engagementScore?: number
}

export interface AdminUserFilter {
  status: 'all' | 'active' | 'banned'
  role: 'all' | 'USER' | 'ADMIN' | 'TRANSLATOR'
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface AdminUsersPageResponse {
  content: AdminUserData[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AdminUsersParams {
  page: number
  size: number
  sortBy: string
  sortOrder: string
  query: string
  role: string
}

// Типы для логов администраторов
export interface AdminActionLogDTO {
  id: number
  adminId: number | null
  adminName: string
  userId: number | null
  targetUsername?: string  // для обратной совместимости
  targetUserName?: string  // реальное поле из бэкенда
  actionType: string | null
  description: string
  reason: string
  timestamp: string
  // --- Optional new fields (may be absent until backend support) ---
  reasonCode?: string
  reasonDetails?: string
  diff?: Array<{ field: string; old: any; new: any }>
}

// Типы для комментариев
export * from './comments'

// =============================
// Leaderboard DTOs (Топы)
// =============================
export interface TopUserDTO {
  id: number
  username: string
  displayName?: string
  avatar?: string
  chaptersReadCount?: number
  likesGivenCount?: number
  commentsCount?: number
  level?: number
  xp?: number
}

export interface TopReviewDTO {
  id: number
  userId: number
  username: string
  userDisplayName?: string
  userAvatar?: string
  mangaId?: number
  mangaTitle?: string
  rating?: number
  comment?: string
  likesCount?: number
  dislikesCount?: number
  likeCount?: number
  dislikeCount?: number
  trustFactor?: number
  createdAt?: string
}

export interface TopForumThreadDTO {
  id: number
  title: string
  contentExcerpt?: string
  authorId: number
  authorName?: string
  authorAvatar?: string
  repliesCount?: number
  likesCount?: number
  likeCount?: number
  viewsCount?: number
  createdAt?: string
}

export interface TopForumPostDTO {
  id: number
  threadId: number
  contentExcerpt?: string
  authorId: number
  authorName?: string
  authorAvatar?: string
  likesCount?: number
  dislikesCount?: number
  likeCount?: number
  dislikeCount?: number
  trustFactor?: number
  createdAt?: string
}

export interface TopCommentDTO {
  id: number
  contentExcerpt?: string
  userId: number
  likesCount?: number
  dislikesCount?: number
  likeCount?: number
  dislikeCount?: number
  trustFactor?: number
  commentType?: string
  targetId?: number
  createdAt?: string
}

// Wall (profile) posts leaderboard DTO
export interface TopWallPostDTO {
  id: number
  userId: number
  content: string
  createdAt?: string
  updatedAt?: string
  editedUntil?: string
  attachments?: { id: number; filename: string; url: string; sizeBytes: number }[]
  references?: { id: number; type: string; refId: number }[]
  stats?: { score: number; up: number; down: number; userVote?: number | null; commentsCount?: number }
}
