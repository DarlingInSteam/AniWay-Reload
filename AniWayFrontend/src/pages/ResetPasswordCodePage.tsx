import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import GlassPanel from '@/components/ui/GlassPanel';

interface Props {}

export const ResetPasswordCodePage: React.FC<Props> = () => {
  const params = new URLSearchParams(window.location.search);
  const initialRequestId = params.get('requestId') || '';
  const initialEmail = params.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [code, setCode] = useState('');
  const [verificationToken, setVerificationToken] = useState<string|null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'code' | 'password' | 'done'>('code');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoginError, setAutoLoginError] = useState<string|null>(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !code) { setError('Введите код'); return; }
    setError(null); setLoading(true);
    try {
      const resp = await authService.verifyPasswordResetCode(requestId, code);
      setVerificationToken(resp.verificationToken);
      setStep('password');
    } catch (ex: any) {
      setError(ex?.message || 'Не удалось подтвердить код');
    } finally { setLoading(false); }
  };

  const perform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken) { setError('Нет токена подтверждения'); return; }
    if (newPassword.length < 6) { setError('Пароль >= 6 символов'); return; }
    setError(null); setLoading(true);
    try {
      const resp = await authService.performPasswordReset(verificationToken, newPassword);
      if (!resp?.token) {
        setAutoLoginError('Пароль изменён, но токен не получен');
      }
      setStep('done');
    } catch (ex: any) {
      setError(ex?.message || 'Не удалось изменить пароль');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex justify-center mt-10 px-4">
      <GlassPanel className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-white mb-4">Подтверждение кода</h1>
        {step === 'code' && (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide mb-1 text-slate-300">Request ID</label>
              <input value={requestId} onChange={e=>setRequestId(e.target.value)} className="w-full rounded bg-slate-800/70 border border-white/10 px-3 py-2 text-sm" placeholder="UUID" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide mb-1 text-slate-300">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded bg-slate-800/70 border border-white/10 px-3 py-2 text-sm" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide mb-1 text-slate-300">Код</label>
              <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="w-full tracking-widest text-center rounded bg-slate-800/70 border border-white/10 px-3 py-2 text-lg font-mono" placeholder="123456" required />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Проверка...' : 'Подтвердить код'}</Button>
            <div className="text-center text-xs text-slate-400"><a href="/reset-password" className="hover:underline">Запросить код снова</a></div>
          </form>
        )}
        {step === 'password' && (
          <form onSubmit={perform} className="space-y-4">
            <div className="text-slate-300 text-sm">Код подтверждён. Введите новый пароль:</div>
            <div>
              <label className="block text-xs uppercase tracking-wide mb-1 text-slate-300">Новый пароль</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded bg-slate-800/70 border border-white/10 px-3 py-2 text-sm" required />
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Сохраняем...' : 'Сменить пароль'}</Button>
          </form>
        )}
        {step === 'done' && (
          <div className="space-y-4">
            <div className="text-green-400 text-sm">Пароль успешно изменён.</div>
            {autoLoginError && <div className="text-amber-400 text-xs">{autoLoginError}</div>}
            <a href="/" className="inline-block text-primary text-sm hover:underline">Перейти на главную</a>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default ResetPasswordCodePage;
