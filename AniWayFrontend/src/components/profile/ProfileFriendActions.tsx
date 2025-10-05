import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ProfilePanel from './ProfilePanel';
import type { FriendSummary, FriendRequestView } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import type { FriendshipStatus } from '@/hooks/useFriendData';

interface ProfileFriendActionsProps {
  isOwnProfile: boolean;
  targetUser: UserMini | null;
  summary: FriendSummary | null;
  status: FriendshipStatus;
  incomingRequestForTarget: FriendRequestView | null;
  outgoingRequestForTarget: FriendRequestView | null;
  friendsCount: number;
  onSendRequest: (message?: string) => Promise<void>;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onDeclineRequest: (requestId: string) => Promise<void>;
  onRemoveFriend: (userId: number) => Promise<void>;
  isAuthenticated: boolean;
  loading?: boolean;
}

export const ProfileFriendActions: React.FC<ProfileFriendActionsProps> = ({
  isOwnProfile,
  targetUser,
  summary,
  status,
  incomingRequestForTarget,
  outgoingRequestForTarget,
  friendsCount,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  isAuthenticated,
  loading,
}) => {
  const [pendingAction, setPendingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestMessageError, setRequestMessageError] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (isOwnProfile) {
      return 'Управляйте связями и следите за активностью друзей.';
    }
    if (!targetUser) return null;
    switch (status) {
      case 'friends':
        return `Вы и ${targetUser.displayName || targetUser.username} дружите.`;
      case 'incoming':
        return `${targetUser.displayName || targetUser.username} отправил(а) вам заявку.`;
      case 'outgoing':
        return `Вы отправили заявку пользователю ${targetUser.displayName || targetUser.username}.`;
      case 'none':
        return `Добавьте ${targetUser.displayName || targetUser.username} в друзья, чтобы общаться и следить за обновлениями.`;
      default:
        return null;
    }
  }, [isOwnProfile, status, targetUser]);

  const handleAction = async (runner: () => Promise<void>) => {
    setPendingAction(true);
    setStatusMessage(null);
    try {
      await runner();
      setStatusMessage('Действие выполнено.');
    } catch (err: any) {
      console.error('Friend action failed', err);
      setStatusMessage(err?.message || 'Не удалось выполнить действие.');
    } finally {
      setPendingAction(false);
    }
  };

  const renderSummary = () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-2xl font-semibold text-white">{summary?.friends ?? friendsCount}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Друзей</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-2xl font-semibold text-white">{summary?.incomingPending ?? 0}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Входящих</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p className="text-2xl font-semibold text-white">{summary?.outgoingPending ?? 0}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Исходящих</p>
      </div>
    </div>
  );

  const renderActions = () => {
    if (loading) {
      return <p className="text-sm text-slate-300">Загрузка данных друзей...</p>;
    }

    if (!isAuthenticated && !isOwnProfile) {
      return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-300">
          <p>Войдите в аккаунт, чтобы добавлять друзей.</p>
          <Button asChild className="mt-3">
            <Link to="/login">Перейти к входу</Link>
          </Button>
        </div>
      );
    }

    if (isOwnProfile) {
      return renderSummary();
    }

    switch (status) {
      case 'friends':
        return (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={pendingAction}
              onClick={() => handleAction(() => onRemoveFriend(targetUser?.id || 0))}
            >
              Удалить из друзей
            </Button>
          </div>
        );
      case 'incoming':
        if (!incomingRequestForTarget) return null;
        return (
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={pendingAction}
              onClick={() => handleAction(() => onAcceptRequest(incomingRequestForTarget.id))}
            >
              Принять заявку
            </Button>
            <Button
              variant="outline"
              disabled={pendingAction}
              onClick={() => handleAction(() => onDeclineRequest(incomingRequestForTarget.id))}
            >
              Отклонить
            </Button>
          </div>
        );
      case 'outgoing':
        return (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Заявка отправлена {targetUser ? `пользователю ${targetUser.displayName || targetUser.username}` : ''}. Ожидайте ответа.
          </div>
        );
      case 'none':
        return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button disabled={pendingAction} onClick={() => handleAction(() => onSendRequest(undefined))}>
              Добавить в друзья
            </Button>
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={pendingAction}>С сообщением...</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Заявка с сообщением</DialogTitle>
                  <DialogDescription>
                    Расскажите, почему вы хотите добавить этого пользователя в друзья.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={requestMessage}
                  onChange={event => {
                    setRequestMessage(event.target.value);
                    if (requestMessageError) {
                      setRequestMessageError(null);
                    }
                  }}
                  placeholder="Напишите короткое приветствие"
                  maxLength={500}
                />
                {requestMessageError && <p className="text-sm text-red-400">{requestMessageError}</p>}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRequestDialogOpen(false);
                      setRequestMessageError(null);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={() => {
                      if (!requestMessage.trim()) {
                        setRequestMessageError('Введите сообщение');
                        return;
                      }
                      void handleAction(async () => {
                        await onSendRequest(requestMessage.trim());
                        setRequestMessage('');
                        setRequestMessageError(null);
                        setRequestDialogOpen(false);
                      });
                    }}
                    disabled={pendingAction || !requestMessage.trim()}
                  >
                    Отправить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ProfilePanel
      title={isOwnProfile ? 'Мои друзья' : 'Дружба'}
      className="space-y-5"
      actions={statusMessage ? <span className="text-xs text-slate-400">{statusMessage}</span> : undefined}
    >
      {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
      {renderActions()}
    </ProfilePanel>
  );
};

export default ProfileFriendActions;
