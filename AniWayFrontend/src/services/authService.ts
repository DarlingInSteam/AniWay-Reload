import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

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
    const response = await fetch(`${this.baseUrl}/users/me`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    return response.json()
  }

  // Обновить профиль пользователя
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to update profile')
    }

    return response.json()
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
