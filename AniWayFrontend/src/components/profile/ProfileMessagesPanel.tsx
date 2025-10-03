import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfilePanel from './ProfilePanel';
import useMessagingInbox from '@/hooks/useMessagingInbox';
import useUserMiniBatch, { UserMini } from '@/hooks/useUserMiniBatch';
import type { ConversationView as ConversationDto, MessageView as MessageDto } from '@/types/social';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProfileMessagesPanelProps {
  currentUserId?: number | null;
}

function conversationTitle(conversation: ConversationDto, users: Record<number, UserMini>, currentUserId?: number | null): string {
  if (conversation.type === 'PRIVATE') {
    const otherId = conversation.participantIds.find(id => id !== currentUserId);
    const other = otherId ? users[otherId] : null;
    return other?.displayName || other?.username || 'Диалог';
  }
  return conversation.categoryTitle || 'Групповой чат';
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'U';
}

function resolveMessageAuthor(message: MessageDto, users: Record<number, UserMini>, currentUserId?: number | null): string {
  if (message.senderId === currentUserId) {
    return 'Вы';
  }
  const user = users[message.senderId];
  return user?.displayName || user?.username || `ID ${message.senderId}`;
}

export const ProfileMessagesPanel: React.FC<ProfileMessagesPanelProps> = ({ currentUserId }) => {
  const inbox = useMessagingInbox({ pageSize: 25 });
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const participantIds = useMemo(() => {
    const ids = new Set<number>();
    inbox.conversations.forEach(conversation => {
      conversation.participantIds.forEach(id => { if (id !== currentUserId && typeof id === 'number') ids.add(id); });
    });
    inbox.messages.forEach(message => {
      if (typeof message.senderId === 'number' && message.senderId !== currentUserId) {
        ids.add(message.senderId);
      }
    });
    return Array.from(ids);
  }, [inbox.conversations, inbox.messages, currentUserId]);

  const users = useUserMiniBatch(participantIds);

  const selectedConversation = inbox.selectedConversation;

  const handleSend = async () => {
    if (!selectedConversation?.id) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await inbox.sendMessage(selectedConversation.id, trimmed);
      setMessageText('');
    } catch (err: any) {
      console.error('Failed to send message', err);
      setError(err?.message || 'Не удалось отправить сообщение.');
    }
  };

  return (
    <ProfilePanel title="Личные сообщения" className="space-y-6">
      {Boolean(inbox.error) && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Не удалось загрузить сообщения. Убедитесь, что вы авторизованы и попробуйте позже.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/90">Диалоги</h3>
            <Button size="sm" variant="outline" onClick={inbox.refresh} disabled={inbox.loadingConversations}>
              Обновить
            </Button>
          </div>
          {inbox.loadingConversations && inbox.conversations.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <ul className="space-y-2">
              {inbox.conversations.map(conversation => {
                const title = conversationTitle(conversation, users, currentUserId);
                const isActive = selectedConversation?.id === conversation.id;
                const lastMessagePreview = conversation.lastMessage?.content || 'Нет сообщений';
                const unread = conversation.unreadCount > 0;
                const otherId = conversation.participantIds.find(id => id !== currentUserId);
                const avatarUser = otherId ? users[otherId] : undefined;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => inbox.selectConversation(conversation.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${isActive ? 'border-primary/60 bg-primary/20' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10 bg-black/40">
                          {avatarUser?.avatar ? (
                            <AvatarImage src={avatarUser.avatar} alt={title} />
                          ) : (
                            <AvatarFallback>{initials(title)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-white">{title}</span>
                            {unread && (
                              <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{conversation.unreadCount}</span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-300">{lastMessagePreview}</p>
                          {conversation.lastMessageAt && (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              {new Date(conversation.lastMessageAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {inbox.conversations.length === 0 && !inbox.loadingConversations && (
                <li className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-300">
                  У вас пока нет диалогов. Найдите друзей и начните общение!
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          {selectedConversation ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {conversationTitle(selectedConversation, users, currentUserId)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Участники: {selectedConversation.participantIds.map(id => {
                      if (id === currentUserId) return 'Вы';
                      const user = users[id];
                      return user?.displayName || user?.username || `ID ${id}`;
                    }).join(', ')}
                  </p>
                </div>
                {inbox.hasMoreMessages && (
                  <Button size="sm" variant="outline" onClick={inbox.loadOlderMessages} disabled={inbox.loadingMessages}>
                    Загрузить ранние сообщения
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4">
                {inbox.loadingMessages && inbox.messages.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : (
                  inbox.messages.map(message => {
                    const author = resolveMessageAuthor(message, users, currentUserId);
                    const isOwn = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm leading-relaxed ${isOwn ? 'ml-auto border-primary/50 bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                          <span>{author}</span>
                          <span>{new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                        <p>{message.content}</p>
                        {message.replyToMessageId && (
                          <p className="mt-2 rounded-md border border-dashed border-white/20 bg-white/5 p-2 text-[11px] text-slate-300">
                            Ответ на сообщение #{message.replyToMessageId.slice(0, 8)}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
                {inbox.messages.length === 0 && !inbox.loadingMessages && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-300">
                    Сообщений пока нет. Напишите первое сообщение!
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {error && <p className="text-sm text-red-300">{error}</p>}
                <Textarea
                  placeholder="Введите сообщение"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  disabled={!selectedConversation || inbox.loadingMessages}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMessageText('')}
                    disabled={!messageText.trim()}
                  >
                    Очистить
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || inbox.loadingMessages}
                  >
                    Отправить
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-300">
              <p className="text-lg font-semibold text-white">Выберите диалог</p>
              <p className="text-sm text-slate-400">Выберите чат слева, чтобы просмотреть сообщения.</p>
            </div>
          )}
        </div>
      </div>
    </ProfilePanel>
  );
};

export default ProfileMessagesPanel;
