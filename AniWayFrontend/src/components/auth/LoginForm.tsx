import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LoginRequest } from '../../types'
import { authService } from '../../services/authService'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [twoStep, setTwoStep] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loginCode, setLoginCode] = useState('')
  const [codePhase, setCodePhase] = useState<'idle' | 'requested' | 'verifying'>('idle')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'Ошибка входа')
      }
      const body = await resp.json()
      if (body.twoStep) {
        setRequestId(body.requestId)
        setTwoStep(true)
        setCodePhase('requested')
      } else if (body.token) {
        authService.setToken(body.token)
        onSuccess?.()
      } else {
        throw new Error('Некорректный ответ сервера')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestId) return
    setError(null)
    setCodePhase('verifying')
    try {
      await authService.verifyLoginCode(requestId, loginCode.trim())
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подтверждения')
      setCodePhase('requested')
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
          <h2 className="text-3xl font-bold text-white">Вход</h2>
          <p className="text-muted-foreground mt-2">{twoStep ? 'Подтвердите код из письма' : 'Войдите в свой аккаунт'}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!twoStep && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                Имя пользователя / Email
              </label>
              <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" placeholder="Введите имя пользователя или email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Пароль
              </label>
              <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md shadow-sm placeholder-muted-foreground text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" placeholder="Введите пароль" />
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (<div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Вход...</div>) : 'Войти'}
            </button>
          </form>
        )}

        {twoStep && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Код подтверждения</label>
              <input value={loginCode} onChange={e => setLoginCode(e.target.value)} maxLength={6} pattern="[0-9]*" inputMode="numeric" className="tracking-widest text-center text-xl w-full px-3 py-3 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" placeholder="••••••" />
              <p className="text-xs text-muted-foreground mt-2">Введите 6-значный код из письма. Возможна задержка 1–2 минуты.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={codePhase==='verifying'} className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">{codePhase==='verifying' ? 'Проверка...' : 'Подтвердить'}</button>
              <button type="button" onClick={() => { setTwoStep(false); setRequestId(null); setLoginCode(''); }} className="px-4 py-2 rounded-md text-sm bg-white/10 hover:bg-white/15 text-white">Отмена</button>
            </div>
          </form>
        )}

        {onSwitchToRegister && !twoStep && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">Нет аккаунта?{' '}<button onClick={onSwitchToRegister} className="font-medium text-primary hover:text-primary/80">Зарегистрироваться</button></p>
            <p className="text-xs mt-3"><a href="/reset-password" className="text-primary/80 hover:text-primary underline underline-offset-2">Забыли пароль?</a></p>
          </div>
        )}
      </div>
    </div>
  )
}
