import React, { useState, useEffect } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'

export const AuthPage: React.FC = () => {
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { isAuthenticated } = useAuth()

  // Определяем режим на основе URL
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register')
    } else {
      setMode('login')
    }
  }, [location.pathname])

  // Перенаправляем авторизованных пользователей
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/'
    }
  }, [isAuthenticated])

  const handleSuccess = () => {
    // Перенаправляем на главную после успешной авторизации
    window.location.href = '/'
  }

  const switchToRegister = () => {
    window.location.href = '/register'
  }

  const switchToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-manga-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">AniWay</h1>
          <p className="text-muted-foreground">Ваша библиотека манги</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        <a href="/" className="text-primary hover:text-primary/80 text-sm">
          ← Вернуться на главную
        </a>
      </div>
    </div>
  )
}
