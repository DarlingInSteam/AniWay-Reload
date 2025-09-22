import React, { useState } from 'react';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

interface AsyncState { loading: boolean; error: string | null; success: string | null }
const initialState: AsyncState = { loading: false, error: null, success: null };

export const SecuritySection: React.FC = () => {
  const { user, logout } = useAuth();
  const [changePwd, setChangePwd] = useState({ current: '', next: '', repeat: '' });
  const [changeState, setChangeState] = useState<AsyncState>(initialState);

  const [resetEmail, setResetEmail] = useState('');
  const [resetRequestId, setResetRequestId] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetState, setResetState] = useState<AsyncState>(initialState);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [newResetPasswordRepeat, setNewResetPasswordRepeat] = useState('');

  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<AsyncState>(initialState);
  const [confirmUsername, setConfirmUsername] = useState('');

  const handleChangePassword = async () => {
    if (changePwd.next !== changePwd.repeat) {
      setChangeState({ loading: false, error: 'Пароли не совпадают', success: null });
      return;
    }
    setChangeState({ loading: true, error: null, success: null });
    try {
      await authService.changePassword(changePwd.current, changePwd.next);
      setChangeState({ loading: false, error: null, success: 'Пароль изменён' });
      setChangePwd({ current: '', next: '', repeat: '' });
    } catch (e:any) {
      setChangeState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleResetRequest = async () => {
    setResetState({ loading: true, error: null, success: null });
    try {
      const resp = await authService.requestPasswordResetCode(resetEmail);
      if (resp.requestId) {
        setResetRequestId(resp.requestId);
        setResetState({ loading: false, error: null, success: 'Код отправлен на почту' });
      } else {
        setResetState({ loading: false, error: null, success: 'Если email существует – код отправлен' });
      }
    } catch(e:any) {
      setResetState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleResetVerify = async () => {
    if (!resetRequestId) return;
    setResetState({ loading: true, error: null, success: null });
    try {
      const resp = await authService.verifyPasswordResetCode(resetRequestId, resetCode.trim());
      setResetToken(resp.verificationToken);
      setResetState({ loading: false, error: null, success: 'Код подтверждён, введите новый пароль' });
    } catch(e:any) {
      setResetState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleResetPerform = async () => {
    if (!resetToken) return;
    if (newResetPassword !== newResetPasswordRepeat) {
      setResetState({ loading: false, error: 'Пароли не совпадают', success: null });
      return;
    }
    setResetState({ loading: true, error: null, success: null });
    try {
      await authService.performPasswordReset(resetToken, newResetPassword);
      setResetState({ loading: false, error: null, success: 'Пароль сброшен, выполните вход' });
      setResetToken(null); setResetRequestId(null); setResetCode('');
    } catch(e:any) {
      setResetState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleDeleteRequest = async () => {
    setDeleteState({ loading: true, error: null, success: null });
    try {
      const resp = await authService.requestAccountDeletionCode();
      setDeleteRequestId(resp.requestId);
      setDeleteState({ loading: false, error: null, success: 'Код отправлен' });
    } catch(e:any) {
      setDeleteState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleDeleteVerify = async () => {
    if (!deleteRequestId) return;
    setDeleteState({ loading: true, error: null, success: null });
    try {
      const resp = await authService.verifyAccountDeletionCode(deleteRequestId, deleteCode.trim());
      setDeleteToken(resp.verificationToken);
      setDeleteState({ loading: false, error: null, success: 'Подтвердите удаление' });
    } catch(e:any) {
      setDeleteState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  const handleDeletePerform = async () => {
    if (!deleteToken) return;
    if (confirmUsername !== user?.username) {
      setDeleteState({ loading: false, error: 'Введите точное имя пользователя', success: null });
      return;
    }
    setDeleteState({ loading: true, error: null, success: null });
    try {
      await authService.performAccountDeletion(deleteToken);
      setDeleteState({ loading: false, error: null, success: 'Аккаунт удалён' });
      await logout();
      window.location.href = '/';
    } catch(e:any) {
      setDeleteState({ loading: false, error: e.message || 'Ошибка', success: null });
    }
  };

  return (
    <div className="space-y-10">
      <section className="bg-card/40 border border-border/40 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Смена пароля</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <input type="password" placeholder="Текущий" className="bg-background border border-border/30 rounded px-3 py-2" value={changePwd.current} onChange={e=>setChangePwd({...changePwd,current:e.target.value})} />
          <input type="password" placeholder="Новый" className="bg-background border border-border/30 rounded px-3 py-2" value={changePwd.next} onChange={e=>setChangePwd({...changePwd,next:e.target.value})} />
          <input type="password" placeholder="Повтор" className="bg-background border border-border/30 rounded px-3 py-2" value={changePwd.repeat} onChange={e=>setChangePwd({...changePwd,repeat:e.target.value})} />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button disabled={changeState.loading} onClick={handleChangePassword} className="px-4 py-2 rounded bg-primary hover:bg-primary/80 disabled:opacity-40 text-sm font-medium">Изменить</button>
          {changeState.error && <span className="text-red-400 text-sm">{changeState.error}</span>}
          {changeState.success && <span className="text-green-400 text-sm">{changeState.success}</span>}
        </div>
      </section>

      <section className="bg-card/40 border border-border/40 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Сброс пароля (если забыли)</h2>
        {!resetRequestId && !resetToken && (
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <input type="email" placeholder="Email" className="flex-1 bg-background border border-border/30 rounded px-3 py-2" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} />
            <button disabled={resetState.loading || !resetEmail} onClick={handleResetRequest} className="px-4 py-2 rounded bg-primary hover:bg-primary/80 disabled:opacity-40 text-sm font-medium">Отправить код</button>
          </div>
        )}
        {resetRequestId && !resetToken && (
          <div className="flex flex-col md:flex-row gap-4 mt-4 items-start">
            <input type="text" placeholder="Код" className="bg-background border border-border/30 rounded px-3 py-2" value={resetCode} onChange={e=>setResetCode(e.target.value)} />
            <button disabled={resetState.loading || !resetCode} onClick={handleResetVerify} className="px-4 py-2 rounded bg-primary hover:bg-primary/80 disabled:opacity-40 text-sm font-medium">Подтвердить код</button>
          </div>
        )}
        {resetToken && (
          <div className="flex flex-col md:flex-row gap-4 mt-4 items-start">
            <input type="password" placeholder="Новый пароль" className="bg-background border border-border/30 rounded px-3 py-2" value={newResetPassword} onChange={e=>setNewResetPassword(e.target.value)} />
            <input type="password" placeholder="Повтор" className="bg-background border border-border/30 rounded px-3 py-2" value={newResetPasswordRepeat} onChange={e=>setNewResetPasswordRepeat(e.target.value)} />
            <button disabled={resetState.loading || !newResetPassword} onClick={handleResetPerform} className="px-4 py-2 rounded bg-primary hover:bg-primary/80 disabled:opacity-40 text-sm font-medium">Сбросить</button>
          </div>
        )}
        <div className="mt-4 flex gap-4 items-center">
          {resetState.error && <span className="text-red-400 text-sm">{resetState.error}</span>}
          {resetState.success && <span className="text-green-400 text-sm">{resetState.success}</span>}
        </div>
      </section>

      <section className="bg-card/40 border border-border/40 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-red-400">Удаление аккаунта</h2>
        {!deleteRequestId && !deleteToken && (
          <button disabled={deleteState.loading} onClick={handleDeleteRequest} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-medium">Запросить код</button>
        )}
        {deleteRequestId && !deleteToken && (
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <input type="text" placeholder="Код" className="bg-background border border-border/30 rounded px-3 py-2" value={deleteCode} onChange={e=>setDeleteCode(e.target.value)} />
            <button disabled={deleteState.loading || !deleteCode} onClick={handleDeleteVerify} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-medium">Подтвердить код</button>
          </div>
        )}
        {deleteToken && (
          <div className="flex flex-col gap-4 items-start max-w-lg">
            <p className="text-sm text-muted-foreground">Действие необратимо. Введите имя пользователя <span className="text-white font-semibold">{user?.username}</span> для подтверждения.</p>
            <input type="text" placeholder="Имя пользователя" className="bg-background border border-border/30 rounded px-3 py-2" value={confirmUsername} onChange={e=>setConfirmUsername(e.target.value)} />
            <button disabled={deleteState.loading || !confirmUsername} onClick={handleDeletePerform} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-medium">Удалить аккаунт</button>
          </div>
        )}
        <div className="mt-4 flex gap-4 items-center">
          {deleteState.error && <span className="text-red-400 text-sm">{deleteState.error}</span>}
          {deleteState.success && <span className="text-green-400 text-sm">{deleteState.success}</span>}
        </div>
      </section>
    </div>
  );
};

export default SecuritySection;
