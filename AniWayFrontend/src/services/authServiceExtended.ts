import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

// Типы для активности
export interface ActivityDTO {
  id: number
  userId: number
  activityType: string
  message: string
  timestamp: string
  mangaId?: number
  mangaTitle?: string
  chapterId?: number
  chapterNumber?: number
  reviewId?: number
  actionUrl?: string
}

// Типы для статистики
export interface ReadingStatistics {
  totalMangaRead?: number
  totalChaptersRead?: number
  totalPagesRead?: number
  totalReadingTimeMinutes?: number
  favoriteGenres?: string[]
  readingStreak?: number
  averageRating?: number
}

class AuthService {
  private baseUrl = '/api'
  private tokenKey = 'authToken'

  // Получить токен из localStorage
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  // Сохранить токен в localStorage
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
  }

  // Удалить токен из localStorage
  removeToken(): void {
    localStorage.removeItem(this.tokenKey)
  }

  // Проверка аутентификации
  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false
    
    try {
      // Декодируем JWT токен для проверки срока действия
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 > Date.now()
    } catch {
      return false
    }
  }

  // Получить заголовки для аутентифицированных запросов
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  // Регистрация
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Registration failed')
    }

    const authResponse: AuthResponse = await response.json()
    this.setToken(authResponse.token)
    return authResponse
  }

  // Вход
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Login failed')
    }

    const authResponse: AuthResponse = await response.json()
    this.setToken(authResponse.token)
    return authResponse
  }

  // Выход
  async logout(): Promise<void> {
    this.removeToken()
    // Можно добавить запрос на сервер для инвалидации токена
  }

  // Получить текущего пользователя
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    return response.json()
  }

  // Обновить профиль пользователя
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    return response.json()
  }

  // Получить пользователя по ID (исправлен эндпоинт)
  async getUserById(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/users/${id}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    return response.json()
  }

  // === НОВЫЕ МЕТОДЫ ДЛЯ АКТИВНОСТИ ===

  /**
   * Получить активность пользователя
   */
  async getUserActivity(userId: number, limit: number = 20): Promise<ActivityDTO[]> {
    const response = await fetch(`${this.baseUrl}/auth/activity/user/${userId}?limit=${limit}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user activity')
    }

    return response.json()
  }

  /**
   * Получить активность чтения пользователя
   */
  async getUserReadingActivity(userId: number, limit: number = 20): Promise<ActivityDTO[]> {
    const response = await fetch(`${this.baseUrl}/auth/activity/user/${userId}/reading?limit=${limit}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user reading activity')
    }

    return response.json()
  }

  /**
   * Получить активность отзывов пользователя
   */
  async getUserReviewActivity(userId: number, limit: number = 20): Promise<ActivityDTO[]> {
    const response = await fetch(`${this.baseUrl}/auth/activity/user/${userId}/reviews?limit=${limit}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user review activity')
    }

    return response.json()
  }

  // === НОВЫЕ МЕТОДЫ ДЛЯ СТАТИСТИКИ ===

  /**
   * Получить статистику чтения пользователя
   */
  async getReadingStatistics(): Promise<ReadingStatistics> {
    const response = await fetch(`${this.baseUrl}/auth/progress/stats`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch reading statistics')
    }

    const stats = await response.json()
    
    // Преобразуем строковые значения в числовые если необходимо
    return {
      totalMangaRead: parseInt(stats.totalMangaRead) || 0,
      totalChaptersRead: parseInt(stats.totalChaptersRead) || 0,
      totalPagesRead: parseInt(stats.totalPagesRead) || 0,
      totalReadingTimeMinutes: parseInt(stats.totalReadingTimeMinutes) || 0,
      favoriteGenres: Array.isArray(stats.favoriteGenres) ? stats.favoriteGenres : [],
      readingStreak: parseInt(stats.readingStreak) || 0,
      averageRating: parseFloat(stats.averageRating) || 0
    }
  }

  // Получить роль пользователя из токена
  getUserRole(): string | null {
    const token = this.getToken()
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.role || null
    } catch {
      return null
    }
  }

  // Проверка роли администратора
  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN'
  }

  // Проверка роли переводчика
  isTranslator(): boolean {
    const role = this.getUserRole()
    return role === 'TRANSLATOR' || role === 'ADMIN'
  }
}

export const authService = new AuthService()
