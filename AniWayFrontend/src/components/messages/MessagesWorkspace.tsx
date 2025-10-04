import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useMessagingInbox from '@/hooks/useMessagingInbox';
import useUserMiniBatch, { UserMini } from '@/hooks/useUserMiniBatch';
import type { ConversationView as ConversationDto, MessageView as MessageDto } from '@/types/social';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import { buildProfileSlug } from '@/utils/profileSlug';
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton';

type ComposeUserInput = {
  id: number;
  displayName?: string;
  username?: string;
  avatar?: string;
  session?: number;
};

interface MessagesWorkspaceProps {
  currentUserId?: number | null;
  className?: string;
  initialComposeUser?: ComposeUserInput;
}

function conversationTitle(
  conversation: ConversationDto,
  users: Record<number, UserMini>,
  currentUserId?: number | null
): string {
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

function resolveMessageAuthor(
  message: MessageDto,
  users: Record<number, UserMini>,
  currentUserId?: number | null
): string {
  if (message.senderId === currentUserId) {
    return 'Вы';
  }
  const user = users[message.senderId];
  return user?.displayName || user?.username || `ID ${message.senderId}`;
}

export const MessagesWorkspace: React.FC<MessagesWorkspaceProps> = ({ currentUserId, className, initialComposeUser }) => {
  const inbox = useMessagingInbox({ pageSize: 25, conversationRefreshIntervalMs: 40000, messageRefreshIntervalMs: 5000 });
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draftTarget, setDraftTarget] = useState<ComposeUserInput | null>(initialComposeUser ?? null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialComposeUser?.id) {
      setDraftTarget(prev => {
        if (prev?.id === initialComposeUser.id && prev?.session === initialComposeUser.session) {
          return { ...prev, ...initialComposeUser };
        }
        return initialComposeUser;
      });
      setMessageText('');
    }
  }, [initialComposeUser?.id, initialComposeUser?.displayName, initialComposeUser?.username, initialComposeUser?.avatar, initialComposeUser?.session]);

  const participantIds = useMemo(() => {
    const ids = new Set<number>();
    inbox.conversations.forEach(conversation => {
      conversation.participantIds.forEach(id => {
        if (id !== currentUserId && typeof id === 'number') {
          ids.add(id);
        }
      });
    });
    inbox.messages.forEach(message => {
      if (typeof message.senderId === 'number' && message.senderId !== currentUserId) {
        ids.add(message.senderId);
      }
    });
    if (draftTarget?.id && (!currentUserId || draftTarget.id !== currentUserId)) {
      ids.add(draftTarget.id);
    }
    return Array.from(ids);
  }, [inbox.conversations, inbox.messages, currentUserId, draftTarget?.id]);

  const users = useUserMiniBatch(participantIds);
  const selectedConversation = inbox.selectedConversation;
  const draftResolvedName = draftTarget ? (users[draftTarget.id]?.displayName || draftTarget.displayName || draftTarget.username || `Пользователь ${draftTarget.id}`) : null;
  const draftProfileSlug = draftTarget ? buildProfileSlug(draftTarget.id, draftResolvedName ?? undefined) : null;
  const privateOtherId = selectedConversation && selectedConversation.type === 'PRIVATE'
    ? selectedConversation.participantIds.find(id => id !== currentUserId)
    : null;
  const privateOtherName = privateOtherId != null ? (users[privateOtherId]?.displayName || users[privateOtherId]?.username || `Пользователь ${privateOtherId}`) : null;
  const privateOtherSlug = privateOtherId != null ? buildProfileSlug(privateOtherId, privateOtherName ?? undefined) : null;

  useEffect(() => {
    if (!draftTarget) return;
    const existing = inbox.conversations.find(conversation =>
      conversation.type === 'PRIVATE' && conversation.participantIds.includes(draftTarget.id)
    );
    if (existing) {
      inbox.selectConversation(existing.id);
      setDraftTarget(null);
    }
  }, [draftTarget, inbox.conversations, inbox.selectConversation]);

  const handleSend = useCallback(async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      if (selectedConversation?.id) {
        await inbox.sendMessage(selectedConversation.id, trimmed);
      } else if (draftTarget?.id) {
        const conversation = await apiClient.createConversation(draftTarget.id);
        await inbox.selectConversation(conversation.id);
        await inbox.refresh();
        await inbox.sendMessage(conversation.id, trimmed);
        setDraftTarget(null);
      } else {
        return;
      }
      setMessageText('');
    } catch (err: any) {
      console.error('Failed to send message', err);
      setError(err?.message || 'Не удалось отправить сообщение.');
    }
  }, [draftTarget, inbox, messageText, selectedConversation]);

  const handleEnterSend = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInsertEmoji = useCallback((emoji: string) => {
    const textarea = messageInputRef.current;
    const currentValue = messageText;
    if (!textarea) {
      setMessageText(prev => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;
    setMessageText(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + emoji.length;
      textarea.setSelectionRange(caret, caret);
    });
  }, [messageText]);

  return (
    <div className={cn('flex h-full flex-col gap-6', className)}>
      {Boolean(inbox.error) && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Не удалось загрузить сообщения. Убедитесь, что вы авторизованы и попробуйте позже.
        </div>
      )}

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-3">
        <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/90">Диалоги</h3>
            <Button size="sm" variant="outline" onClick={inbox.refresh} disabled={inbox.loadingConversations}>
              Обновить
            </Button>
          </div>
          <div className="mt-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {inbox.loadingConversations && inbox.conversations.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : (
              <ul className="space-y-2">
              {draftTarget && (
                <li>
                  <button
                    type="button"
                    onClick={() => setDraftTarget(draftTarget)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-3 text-left transition',
                      'border-primary/60 bg-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10 bg-black/40">
                        {draftTarget.avatar ? (
                          <AvatarImage src={draftTarget.avatar} alt={draftTarget.displayName || draftTarget.username || 'Новый диалог'} />
                        ) : (
                          <AvatarFallback>{initials(draftTarget.displayName || draftTarget.username || 'Новый диалог')}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">{draftTarget.displayName || draftTarget.username || 'Новый диалог'}</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">Новый</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-300">Отправьте первое сообщение</p>
                      </div>
                    </div>
                  </button>
                </li>
              )}
              {inbox.conversations.map(conversation => {
                const title = conversationTitle(conversation, users, currentUserId);
                const isActive = selectedConversation?.id === conversation.id && !draftTarget;
                const lastMessagePreview = conversation.lastMessage?.content || 'Нет сообщений';
                const unread = conversation.unreadCount > 0;
                const otherId = conversation.participantIds.find(id => id !== currentUserId);
                const avatarUser = otherId ? users[otherId] : undefined;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTarget(null);
                        inbox.selectConversation(conversation.id);
                      }}
                      className={cn(
                        'w-full rounded-xl border px-3 py-3 text-left transition',
                        isActive
                          ? 'border-primary/60 bg-primary/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      )}
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
                              <span className="rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                {conversation.unreadCount}
                              </span>
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
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          {draftTarget ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {draftResolvedName}
                  </h3>
                  <p className="text-xs text-slate-400">Новый личный диалог</p>
                  {draftProfileSlug && (
                    <Link
                      to={`/profile/${draftProfileSlug}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary transition hover:text-primary/80"
                    >
                      Просмотр профиля
                    </Link>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDraftTarget(null)}>
                  Закрыть
                </Button>
              </div>

              <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-center text-sm text-slate-300 px-6">
                <p>
                  Начните беседу. Диалог появится в списке после отправки первого сообщения.
                </p>
              </div>

              <div className="space-y-3">
                {error && <p className="text-sm text-red-300">{error}</p>}
                <Textarea
                  ref={messageInputRef}
                  placeholder="Напишите первое сообщение"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  onKeyDown={handleEnterSend}
                  disabled={inbox.loadingMessages}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <EmojiPickerButton
                      onEmojiSelect={handleInsertEmoji}
                      disabled={inbox.loadingMessages}
                      anchorClassName="h-10 w-10"
                    />
                    <p className="text-xs text-slate-400">
                      <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Enter</kbd> чтобы отправить.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => { setMessageText(''); setDraftTarget(null); }}>
                    Отменить
                    </Button>
                    <Button onClick={handleSend} disabled={!messageText.trim() || inbox.loadingMessages}>
                      Отправить
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedConversation ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {conversationTitle(selectedConversation, users, currentUserId)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Участники: {selectedConversation.participantIds
                      .map(id => {
                        if (id === currentUserId) return 'Вы';
                        const user = users[id];
                        return user?.displayName || user?.username || `ID ${id}`;
                      })
                      .join(', ')}
                  </p>
                  {privateOtherSlug && (
                    <Link
                      to={`/profile/${privateOtherSlug}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary transition hover:text-primary/80"
                    >
                      Профиль собеседника
                    </Link>
                  )}
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
                        className={cn(
                          'max-w-[85%] rounded-xl border px-3 py-2 text-sm leading-relaxed',
                          isOwn
                            ? 'ml-auto border-primary/50 bg-primary/10 text-white'
                            : 'border-white/10 bg-white/5 text-slate-200'
                        )}
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
                  ref={messageInputRef}
                  placeholder="Введите сообщение"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  onKeyDown={handleEnterSend}
                  disabled={(!selectedConversation && !draftTarget) || inbox.loadingMessages}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <EmojiPickerButton
                      onEmojiSelect={handleInsertEmoji}
                      disabled={inbox.loadingMessages || (!selectedConversation && !draftTarget)}
                      anchorClassName="h-10 w-10"
                    />
                    <p className="text-xs text-slate-400">
                      <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Enter</kbd> чтобы отправить.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setMessageText('')} disabled={!messageText.trim()}>
                      Очистить
                    </Button>
                    <Button onClick={handleSend} disabled={!messageText.trim() || inbox.loadingMessages}>
                      Отправить
                    </Button>
                  </div>
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
    </div>
  );
};

export default MessagesWorkspace;
