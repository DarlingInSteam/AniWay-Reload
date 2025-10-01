import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import GlassPanel from '@/components/ui/GlassPanel';

const EMAIL_REGEX = /.+@.+\..+/;

export const ResetPasswordRequestPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string|null>(null);
  const [ttl, setTtl] = useState<number>(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(()=>setCooldown(cooldown-1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!ttl) return;
    const t = setTimeout(()=> setTtl(Math.max(0, ttl-1)), 1000);
    return () => clearTimeout(t);
  }, [ttl]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) { setError('Введите корректный email'); return; }
    setError(null);
    setLoading(true);
    try {
      const resp = await authService.requestPasswordResetCode(email);
      setRequestId(resp.requestId || null);
      setTtl(resp.ttlSeconds || 0);
      setSuccess(true);
      setCooldown(30);
    } catch (ex: any) {
      setError(ex?.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center mt-10 px-4">
      <GlassPanel className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-white mb-4">Восстановление пароля</h1>
        <p className="text-sm text-slate-400 mb-4">Введите email аккаунта. Если он существует – мы отправим код.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide mb-1 text-slate-300">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded bg-slate-800/70 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="you@example.com" required />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {success && <div className="text-green-400 text-sm">Если email существует – код отправлен.</div>}
          {requestId && <div className="text-[11px] text-slate-400">ID запроса: <span className="font-mono">{requestId}</span></div>}
          {ttl>0 && <div className="text-[11px] text-slate-400">Код истечёт через {ttl}s</div>}
          <Button type="submit" disabled={loading || cooldown>0} className="w-full">{loading ? 'Отправка...' : cooldown>0 ? `Повтор через ${cooldown}s` : 'Отправить код'}</Button>
        </form>
        {requestId && (
          <div className="mt-4 text-center">
            <a href={`/reset-password/code?requestId=${requestId}&email=${encodeURIComponent(email)}`} className="text-primary text-sm hover:underline">У меня уже есть код →</a>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default ResetPasswordRequestPage;
