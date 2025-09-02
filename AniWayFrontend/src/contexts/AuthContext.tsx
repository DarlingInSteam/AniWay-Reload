import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isTranslator: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Инициализация - проверяем токен и загружаем пользователя
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userData = await authService.getCurrentUser()
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        authService.removeToken()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (data: LoginRequest): Promise<void> => {
    try {
      const response: AuthResponse = await authService.login(data)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      const response: AuthResponse = await authService.register(data)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authService.logout()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Всё равно очищаем локальное состояние
      setUser(null)
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await authService.updateProfile(data)
      setUser(updatedUser)
    } catch (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: authService.isAdmin(),
    isTranslator: authService.isTranslator()
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC для защищенных маршрутов
interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requireTranslator?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireTranslator = false 
}) => {
  const { isAuthenticated, isAdmin, isTranslator, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Требуется авторизация
          </h2>
          <p className="text-gray-600 mb-6">
            Для доступа к этой странице необходимо войти в систему
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Войти
          </a>
        </div>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Доступ запрещён
          </h2>
          <p className="text-gray-600">
            У вас нет прав администратора для доступа к этой странице
          </p>
        </div>
      </div>
    )
  }

  if (requireTranslator && !isTranslator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Доступ запрещён
          </h2>
          <p className="text-gray-600">
            У вас нет прав переводчика для доступа к этой странице
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
