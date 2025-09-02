import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { RegisterRequest } from '../../types'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: ''
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Валидация пароля
    if (formData.password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)

    try {
      await register(formData)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card shadow-xl rounded-lg p-8 border border-border/30">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Регистрация</h2>
          <p className="text-muted-foreground mt-2">Создайте новый аккаунт</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
              Имя пользователя
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
              placeholder="Введите имя пользователя"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
              placeholder="Введите email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
              placeholder="Введите пароль"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
              placeholder="Повторите пароль"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Регистрация...
              </div>
            ) : (
              'Зарегистрироваться'
            )}
          </button>
        </form>

        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <button
                onClick={onSwitchToLogin}
                className="font-medium text-primary hover:text-primary/80"
              >
                Войти
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
