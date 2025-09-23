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

  // Request email verification code
  async requestEmailCode(email: string): Promise<{requestId: string, expiresInSeconds: number, alreadyRegistered: boolean}> {
    const res = await fetch(`${this.baseUrl}/auth/email/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || 'Failed to request code')
    }
    return res.json()
  }

  // Verify email code
  async verifyEmailCode(requestId: string, code: string): Promise<{success: boolean, verificationToken: string, expiresInSeconds: number}> {
    const res = await fetch(`${this.baseUrl}/auth/email/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, code })
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || 'Failed to verify code')
    }
    return res.json()
  }

  // Password reset: request code (email exists or silent success)
  async requestPasswordResetCode(email: string): Promise<{requestId?: string, ttlSeconds?: number}> {
    const res = await fetch(`${this.baseUrl}/auth/password/reset/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to request password reset code')
    }
    return res.json()
  }

  async verifyPasswordResetCode(requestId: string, code: string): Promise<{verificationToken: string}> {
    const res = await fetch(`${this.baseUrl}/auth/password/reset/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, code })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to verify password reset code')
    }
    return res.json()
  }

  async performPasswordReset(verificationToken: string, newPassword: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/auth/password/reset/perform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken, newPassword })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to reset password')
    }
    return true
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/auth/password/change`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to change password')
    }
    return true
  }

  async requestAccountDeletionCode(): Promise<{requestId: string, ttlSeconds: number}> {
    const res = await fetch(`${this.baseUrl}/auth/account/delete/request-code`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to request deletion code')
    }
    return res.json()
  }

  async verifyAccountDeletionCode(requestId: string, code: string): Promise<{verificationToken: string}> {
    const res = await fetch(`${this.baseUrl}/auth/account/delete/verify-code`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ requestId, code })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to verify deletion code')
    }
    return res.json()
  }

  async performAccountDeletion(verificationToken: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/auth/account/delete/perform`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ verificationToken })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to delete account')
    }
    // After deletion, wipe token
    this.removeToken()
    return true
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

  // Получить пользователя по ID
  async getUserById(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/users/${id}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
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

  // Получить ID пользователя из токена или загрузить с сервера
  async getCurrentUserId(): Promise<number | null> {
    const token = this.getToken()
    if (!token) return null
    
    try {
      // Сначала пробуем получить ID из токена (если он там есть)
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      if (payload.userId || payload.id) {
        const userId = payload.userId || payload.id
        return userId
      }
      
      // Если ID нет в токене, получаем данные пользователя с сервера
      const currentUser = await this.getCurrentUser()
      const userId = currentUser.id || null
      return userId
    } catch (error) {
      console.error('Error getting current user ID:', error)
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
