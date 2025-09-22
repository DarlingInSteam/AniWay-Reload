import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { RegisterRequest } from '../../types'
import { authService } from '../../services/authService'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [step, setStep] = useState<'email' | 'code' | 'account'>('email')
  const [email, setEmail] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [formData, setFormData] = useState<RegisterRequest>({ username: '', email: '', password: '' })
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
      const payload: RegisterRequest = { ...formData, email, verificationToken: verificationToken || undefined }
      await register(payload)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  // Request verification code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) { setError('Введите email'); return }
    setLoading(true)
    try {
      const resp = await authService.requestEmailCode(email)
      setRequestId(resp.requestId)
      setResendCooldown(45)
      setStep('code')
    } catch (e:any) {
      setError(e.message || 'Не удалось отправить код')
    } finally { setLoading(false) }
  }

  // Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!requestId) { setError('Нет запроса'); return }
    const fullCode = code.join('')
    if (fullCode.length !== 6) { setError('Введите 6 цифр'); return }
    setLoading(true)
    try {
      const resp = await authService.verifyEmailCode(requestId, fullCode)
      if (resp.success) {
        setVerificationToken(resp.verificationToken)
        setFormData(prev => ({ ...prev, email }))
        setStep('account')
      } else {
        setError('Неверный код')
      }
    } catch (e:any) {
      setError(e.message || 'Ошибка подтверждения')
    } finally { setLoading(false) }
  }

  // Resend logic
  const handleResend = async () => {
    if (resendCooldown > 0) return
    if (!email) return
    try {
      setLoading(true)
      await authService.requestEmailCode(email)
      setResendCooldown(45)
    } catch (e:any) {
      setError(e.message || 'Ошибка повтора')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (step === 'code' && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [step])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleCodeChange = (idx: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return
    const next = [...code]
    next[idx] = val
    setCode(next)
    if (val && idx < 5) {
      inputsRef.current[idx+1]?.focus()
    }
  }

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputsRef.current[idx-1]?.focus()
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
          <p className="text-muted-foreground mt-2">{step === 'email' && 'Подтвердите email'}{step === 'code' && 'Введите код'}{step === 'account' && 'Создайте аккаунт'}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="Введите email" className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        )}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((c,i)=>(
                <input key={i} ref={el=>inputsRef.current[i]=el} value={c} onChange={e=>handleCodeChange(i,e.target.value)} onKeyDown={e=>handleCodeKeyDown(i,e)} maxLength={1} className="w-12 h-14 text-center text-xl bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">Введите 6-значный код отправленный на {email}</div>
            <div className="flex justify-between items-center">
              <button type="button" onClick={()=>{setStep('email'); setCode(['','','','','',''])}} className="text-xs text-muted-foreground hover:text-white">Изменить email</button>
              <button type="button" disabled={resendCooldown>0||loading} onClick={handleResend} className="text-xs text-primary disabled:opacity-40">{resendCooldown>0?`Отправить снова (${resendCooldown})`:'Отправить ещё раз'}</button>
            </div>
            <button type="submit" disabled={loading || code.join('').length!==6} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
          </form>
        )}
        {step === 'account' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Имя пользователя</label>
              <input name="username" value={formData.username} onChange={handleChange} required className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Пароль</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Подтвердите пароль</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Регистрация...' : 'Завершить'}
            </button>
          </form>
        )}

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
