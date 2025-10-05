import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProfilePanel from './ProfilePanel';
import type { FriendRequestView } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';

interface ProfileFriendRequestsProps {
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
  users: Record<number, UserMini>;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
}

function renderName(users: Record<number, UserMini>, id: number): string {
  const info = users[id];
  if (info) {
    return info.displayName || info.username || `ID ${id}`;
  }
  return `ID ${id}`;
}

export const ProfileFriendRequests: React.FC<ProfileFriendRequestsProps> = ({
  incoming,
  outgoing,
  users,
  onAccept,
  onDecline,
}) => {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (action: () => Promise<void>, id: string) => {
    setPendingId(id);
    setError(null);
    try {
      await action();
    } catch (err: any) {
      console.error('Friend request action failed', err);
      setError(err?.message || 'Не удалось обработать запрос.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <ProfilePanel title="Заявки в друзья" className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-white/80">Входящие</h3>
          {incoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-6 text-center text-xs text-slate-400">
              Нет новых заявок
            </div>
          ) : (
            <ul className="space-y-3">
              {incoming.map(request => (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{renderName(users, request.requesterId)}</p>
                    {request.message && (
                      <p className="mt-1 text-xs text-slate-300">“{request.message}”</p>
                    )}
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                      Отправлено {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handle(() => onAccept(request.id), request.id)}
                      disabled={pendingId === request.id}
                    >
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handle(() => onDecline(request.id), request.id)}
                      disabled={pendingId === request.id}
                    >
                      Отклонить
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-white/80">Исходящие</h3>
          {outgoing.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-6 text-center text-xs text-slate-400">
              Вы не отправляли заявок
            </div>
          ) : (
            <ul className="space-y-3">
              {outgoing.map(request => (
                <li
                  key={request.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{renderName(users, request.receiverId)}</p>
                    {request.message && (
                      <p className="mt-1 text-xs text-slate-300">“{request.message}”</p>
                    )}
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                      Отправлено {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Ожидает ответа</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ProfilePanel>
  );
};

export default ProfileFriendRequests;
