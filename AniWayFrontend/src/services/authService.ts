import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

class AuthService {
  private baseUrl = '/api'
  private tokenKey = 'authToken'
  private userIdKey = 'userId'
  private legacyUserIdKeys = ['userID', 'currentUserId']
  private userRoleKey = 'userRole'
  private legacyUserRoleKeys = ['user_role']

  private normalizeUserId(value: unknown): string | null {
    if (value == null) return null
    const raw = String(value).trim()
    if (!raw) return null
    const lowered = raw.toLowerCase()
    if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan') return null
    if (!/^\d+$/.test(raw)) return null
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return String(parsed)
  }

  private normalizeUserRole(value: unknown): string | null {
    if (value == null) return null
    const raw = String(value).trim()
    if (!raw) return null
    const lowered = raw.toLowerCase()
    if (lowered === 'null' || lowered === 'undefined') return null
    return raw.toUpperCase().replace(/^ROLE_/, '')
  }

  private cacheUser(user: User | null | undefined): void {
    if (user && user.id) {
      const normalizedId = this.normalizeUserId(user.id)
      if (normalizedId) {
        localStorage.setItem(this.userIdKey, normalizedId)
      } else {
        this.clearCachedUserIds()
      }
    } else {
      this.clearCachedUserIds()
    }

    if (user && user.role) {
      const normalizedRole = this.normalizeUserRole(user.role)
      if (normalizedRole) {
        localStorage.setItem(this.userRoleKey, normalizedRole)
      } else {
        this.clearCachedRoles()
      }
    } else {
      this.clearCachedRoles()
    }
  }

  private clearCachedUserIds(): void {
    localStorage.removeItem(this.userIdKey)
    this.legacyUserIdKeys.forEach((key) => localStorage.removeItem(key))
  }

  private clearCachedRoles(): void {
    localStorage.removeItem(this.userRoleKey)
    this.legacyUserRoleKeys.forEach((key) => localStorage.removeItem(key))
  }

  private clearCachedUser(): void {
    this.clearCachedUserIds()
    this.clearCachedRoles()
  }

  private backfillCacheFromToken(token: string | null): void {
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''))
      if (payload) {
        const normalizedId = this.normalizeUserId(payload.userId ?? payload.userID ?? payload.sub ?? payload.id)
        if (normalizedId) {
          localStorage.setItem(this.userIdKey, normalizedId)
        }
        const normalizedRole = this.normalizeUserRole(payload.role ?? (Array.isArray(payload.authorities) ? payload.authorities[0] : undefined))
        if (normalizedRole) {
          localStorage.setItem(this.userRoleKey, normalizedRole)
        }
      }
    } catch {
      // ignore invalid tokens
    }
  }

  // Получить токен из localStorage
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey)
  }

  // Сохранить токен в localStorage
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
    this.backfillCacheFromToken(token)
  }

  // Удалить токен из localStorage
  removeToken(): void {
    localStorage.removeItem(this.tokenKey)
    this.clearCachedUser()
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
    this.cacheUser(authResponse.user)
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

  async performPasswordReset(verificationToken: string, newPassword: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/password/reset/perform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken, newPassword })
    })
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Failed to reset password')
    }
    const body = await res.json() as any;
    if (body?.token) {
      this.setToken(body.token);
        this.cacheUser(body.user);
      return { token: body.token, user: body.user } as AuthResponse;
    }
    throw new Error('Malformed response from reset perform');
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
    this.cacheUser(authResponse.user)
    return authResponse
  }

  // Запрос кода входа (двухшаговый login)
  async requestLoginCode(data: LoginRequest): Promise<{requestId: string, ttlSeconds: number}> {
    const res = await fetch(`${this.baseUrl}/auth/login/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || 'Failed to request login code')
    }
    return res.json()
  }

  async verifyLoginCode(requestId: string, code: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, code })
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || 'Failed to verify login code')
    }
    const body = await res.json()
    if (body?.token) {
      this.setToken(body.token)
        this.cacheUser(body.user)
      return { token: body.token, user: body.user }
    }
    throw new Error('Malformed login verify response')
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
    const user = await response.json()
    this.cacheUser(user)
    return user
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
    const updated = await response.json()
    this.cacheUser(updated)
    return updated
  }

  // Получить пользователя по ID
  async getUserById(id: number): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/users/${id}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }
    const user = await response.json()
    this.cacheUser(user)
    return user
  }

  // Получить роль пользователя из токена
  getUserRole(): string | null {
    const cached = this.normalizeUserRole(localStorage.getItem(this.userRoleKey))
    if (cached) {
      return cached
    }
    const token = this.getToken()
    if (!token) return null
    this.backfillCacheFromToken(token)
    const hydrated = this.normalizeUserRole(localStorage.getItem(this.userRoleKey))
    if (hydrated) {
      return hydrated
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const raw = payload.role || payload.authorities?.[0] || null
      if (!raw) return null
      const normalized = this.normalizeUserRole(raw)
      if (normalized) {
        localStorage.setItem(this.userRoleKey, normalized)
      }
      return normalized
    } catch {
      return null
    }
  }

  // Получить ID пользователя из токена или загрузить с сервера
  async getCurrentUserId(): Promise<number | null> {
    const cached = this.normalizeUserId(localStorage.getItem(this.userIdKey))
    if (cached) {
      return Number.parseInt(cached, 10)
    }
    const token = this.getToken()
    if (!token) return null

    try {
      this.backfillCacheFromToken(token)
      const hydrated = this.normalizeUserId(localStorage.getItem(this.userIdKey))
      if (hydrated) {
        return Number.parseInt(hydrated, 10)
      }

      const payload = JSON.parse(atob(token.split('.')[1]))

      if (payload.userId || payload.id) {
        const normalized = this.normalizeUserId(payload.userId ?? payload.id)
        if (normalized) {
          localStorage.setItem(this.userIdKey, normalized)
          return Number.parseInt(normalized, 10)
        }
      }

      const currentUser = await this.getCurrentUser()
      const normalized = this.normalizeUserId(currentUser?.id)
      if (normalized) {
        localStorage.setItem(this.userIdKey, normalized)
        return Number.parseInt(normalized, 10)
      }
      return null
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
