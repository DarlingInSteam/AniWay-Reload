import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import VerificationCodeInput from '@/components/auth/VerificationCodeInput';

type Step = 'email' | 'code' | 'password' | 'done';

const EMAIL_REGEX = /.+@.+\..+/;

export const ResetPasswordRequestPage: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(['','','','','','']);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [ttl, setTtl] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // timers
  useEffect(()=>{ if(ttl<=0) return; const t=setTimeout(()=>setTtl(s=>s-1),1000); return ()=>clearTimeout(t);},[ttl]);
  useEffect(()=>{ if(resendCooldown<=0) return; const t=setTimeout(()=>setResendCooldown(s=>s-1),1000); return ()=>clearTimeout(t);},[resendCooldown]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if(!EMAIL_REGEX.test(email)) { setError('Введите корректный email'); return; }
    setLoading(true);
    try {
      const resp = await authService.requestPasswordResetCode(email);
      setRequestId(resp.requestId || null);
      setTtl(resp.ttlSeconds || 0);
      setResendCooldown(45);
      setStep('code');
    } catch (e:any) {
      setError(e.message || 'Ошибка отправки');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if(!requestId) { setError('Нет идентификатора запроса'); return; }
    const full = code.join('');
    if(full.length!==6) { setError('Введите 6 цифр'); return; }
    setLoading(true);
    try {
      const resp = await authService.verifyPasswordResetCode(requestId, full);
      setVerificationToken(resp.verificationToken);
      setStep('password');
    } catch (e:any) {
      setError(e.message || 'Неверный код');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if(resendCooldown>0 || !email) return;
    try {
      setLoading(true);
      await authService.requestPasswordResetCode(email);
      setResendCooldown(45);
    } catch (e:any) {
      setError(e.message || 'Ошибка повтора');
    } finally { setLoading(false); }
  };

  const handlePerform = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if(!verificationToken) { setError('Нет verificationToken'); return; }
    if(newPassword.length < 6) { setError('Пароль >= 6 символов'); return; }
    if(newPassword !== confirmPassword) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      await authService.performPasswordReset(verificationToken, newPassword);
      setStep('done');
    } catch (e:any) {
      setError(e.message || 'Ошибка смены пароля');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <div className="bg-card shadow-xl rounded-lg p-8 border border-border/30">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Сброс пароля</h2>
          <p className="text-muted-foreground mt-2">
            {step==='email' && 'Подтвердите email'}
            {step==='code' && `Введите код (${ttl > 0 ? ttl + 's' : 'истекает скоро'})`}
            {step==='password' && 'Создайте новый пароль'}
            {step==='done' && 'Готово'}
          </p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-md"><p className="text-red-400 text-sm">{error}</p></div>}

        {step==='email' && (
          <form onSubmit={handleRequest} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="Введите email" className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        )}

        {step==='code' && (
          <form onSubmit={handleVerify} className="space-y-6">
            <VerificationCodeInput value={code} onChange={setCode} autoFocus />
            <div className="text-center text-sm text-muted-foreground">Код отправлен на {email}</div>
            <div className="flex justify-between items-center">
              <button type="button" onClick={()=>{setStep('email'); setCode(['','','','','','']);}} className="text-xs text-muted-foreground hover:text-white">Изменить email</button>
              <button type="button" onClick={handleResend} disabled={resendCooldown>0||loading} className="text-xs text-primary disabled:opacity-40">
                {resendCooldown>0 ? `Отправить снова (${resendCooldown})` : 'Отправить ещё раз'}
              </button>
            </div>
            <button type="submit" disabled={loading || code.join('').length!==6} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
          </form>
        )}

        {step==='password' && (
          <form onSubmit={handlePerform} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Новый пароль</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Повторите пароль</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/80 disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Сменить пароль'}
            </button>
          </form>
        )}

        {step==='done' && (
          <div className="space-y-4 text-center">
            <div className="text-green-400 text-sm">Пароль изменён. Вы уже вошли.</div>
            <a href="/" className="text-primary hover:text-primary/80 text-sm">Перейти на главную</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordRequestPage;
