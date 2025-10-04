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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Search, Check, CheckCheck, RefreshCcw, Loader2 } from 'lucide-react';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  const filteredConversations = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return inbox.conversations;
    return inbox.conversations.filter(conversation => {
      const title = conversationTitle(conversation, users, currentUserId).toLowerCase();
      const preview = conversation.lastMessage?.content?.toLowerCase() ?? '';
      return title.includes(normalized) || preview.includes(normalized);
    });
  }, [searchTerm, inbox.conversations, users, currentUserId]);

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, []);

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

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation) return false;
    setIsDeleting(true);
    setError(null);
    try {
      await inbox.deleteConversation(selectedConversation.id);
      setMessageText('');
      setDraftTarget(null);
      return true;
    } catch (err: any) {
      console.error('Failed to delete conversation', err);
      setError(err?.message || 'Не удалось удалить диалог.');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [inbox, selectedConversation]);

  const renderLastMessageStatus = useCallback((conversation: ConversationDto) => {
    const last = conversation.lastMessage;
    if (!last || last.senderId !== currentUserId) return null;
    const isRead = conversation.unreadCount === 0;
    return isRead ? (
      <CheckCheck className="h-4 w-4 text-primary/80" />
    ) : (
      <Check className="h-4 w-4 text-slate-400" />
    );
  }, [currentUserId]);

  return (
    <div className={cn('flex h-full flex-col gap-6', className)}>
      {Boolean(inbox.error) && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Не удалось загрузить сообщения. Убедитесь, что вы авторизованы и попробуйте позже.
        </div>
      )}

      <div className="grid flex-1 min-h-0 gap-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20 lg:grid-cols-[320px_1fr]">
        <div className="flex h-full min-h-0 flex-col border-r border-white/5 bg-black/30">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Поиск диалога"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
              />
            </div>
            <Button size="icon" variant="ghost" onClick={inbox.refresh} disabled={inbox.loadingConversations}>
              {inbox.loadingConversations ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[11px] uppercase tracking-wide text-white/40">
            <span>Диалоги</span>
            <span>{filteredConversations.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
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
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      'border-primary/60 bg-primary/15 text-white shadow-[0_0_18px_rgba(59,130,246,0.15)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border border-white/10 bg-black/60">
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
              {filteredConversations.map(conversation => {
                const title = conversationTitle(conversation, users, currentUserId);
                const isActive = selectedConversation?.id === conversation.id && !draftTarget;
                const lastMessagePreview = conversation.lastMessage?.content || 'Нет сообщений';
                const unread = conversation.unreadCount > 0;
                const otherId = conversation.participantIds.find(id => id !== currentUserId);
                const avatarUser = otherId ? users[otherId] : undefined;
                const timestamp = formatTimestamp(conversation.lastMessageAt);
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTarget(null);
                        inbox.selectConversation(conversation.id);
                      }}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-left transition',
                        isActive
                          ? 'border-primary/60 bg-primary/15 shadow-[0_0_18px_rgba(59,130,246,0.15)]'
                          : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border border-white/10 bg-black/60">
                          {avatarUser?.avatar ? (
                            <AvatarImage src={avatarUser.avatar} alt={title} />
                          ) : (
                            <AvatarFallback>{initials(title)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-white">{title}</span>
                            <span className="shrink-0 text-[11px] text-white/50">{timestamp}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-300">
                            {renderLastMessageStatus(conversation)}
                            <span className="truncate">{lastMessagePreview}</span>
                          </div>
                        </div>
                        {unread && (
                          <span className="ml-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/80 px-2 text-[11px] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
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

  <div className="flex h-full min-h-0 flex-col bg-gradient-to-br from-black/20 via-black/10 to-black/5">
          {draftTarget ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10 bg-black/60">
                    {draftTarget.avatar ? (
                      <AvatarImage src={draftTarget.avatar} alt={draftResolvedName || 'Новый диалог'} />
                    ) : (
                      <AvatarFallback>{initials(draftResolvedName || draftTarget.username || 'Новый диалог')}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{draftResolvedName}</h3>
                    <p className="text-xs text-white/50">Новый личный диалог</p>
                    {draftProfileSlug && (
                      <Link
                        to={`/profile/${draftProfileSlug}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary transition hover:text-primary/80"
                      >
                        Просмотр профиля
                      </Link>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDraftTarget(null)}>
                  Закрыть
                </Button>
              </div>

              <div className="flex flex-1 items-center justify-center px-6">
                <div className="w-full max-w-sm rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-slate-300">
                  <p>Начните беседу. Диалог появится в списке после отправки первого сообщения.</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/5 px-6 py-4">
                {error && <p className="text-sm text-red-300">{error}</p>}
                <Textarea
                  ref={messageInputRef}
                  placeholder="Напишите первое сообщение"
                  value={messageText}
                  onChange={event => setMessageText(event.target.value)}
                  onKeyDown={handleEnterSend}
                  disabled={inbox.loadingMessages}
                  className="min-h-[90px] resize-none rounded-2xl border border-white/10 bg-black/40 text-sm text-white placeholder:text-white/40 focus:border-primary/60"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <EmojiPickerButton
                      onEmojiSelect={handleInsertEmoji}
                      disabled={inbox.loadingMessages}
                      anchorClassName="h-10 w-10"
                    />
                    <span>
                      <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Enter</kbd> чтобы отправить.
                    </span>
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
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/10 bg-black/60">
                    {privateOtherId && users[privateOtherId]?.avatar ? (
                      <AvatarImage src={users[privateOtherId].avatar} alt={privateOtherName || 'Диалог'} />
                    ) : (
                      <AvatarFallback>{initials(conversationTitle(selectedConversation, users, currentUserId))}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {conversationTitle(selectedConversation, users, currentUserId)}
                    </h3>
                    <p className="text-xs text-white/50">
                      {selectedConversation.participantIds
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
                </div>
                <div className="flex items-center gap-2">
                  {inbox.hasMoreMessages && (
                    <Button size="sm" variant="outline" onClick={inbox.loadOlderMessages} disabled={inbox.loadingMessages}>
                      Загрузить ранние сообщения
                    </Button>
                  )}
                  {selectedConversation.type === 'PRIVATE' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-300 transition hover:text-red-100"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить чат
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить диалог?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm text-slate-300">
                            {privateOtherName
                              ? `Общая история с ${privateOtherName} будет скрыта из списка диалогов. Сообщения могут сохраниться у собеседника.`
                              : 'Диалог будет скрыт из вашего списка. Сообщения могут сохраниться у собеседника.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-500 focus:ring-red-400 disabled:opacity-60"
                            disabled={isDeleting}
                            onClick={async () => {
                              const success = await handleDeleteConversation();
                              if (!success) {
                                // returning false keeps dialog closed; error message shown below composer
                              }
                            }}
                          >
                            {isDeleting ? 'Удаляем…' : 'Удалить'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                  {inbox.loadingMessages && inbox.messages.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    inbox.messages.map(message => {
                      const author = resolveMessageAuthor(message, users, currentUserId);
                      const isOwn = message.senderId === currentUserId;
                      return (
                        <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')} key={message.id}>
                          <div
                            className={cn(
                              'group relative max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-lg transition',
                              isOwn
                                ? 'bg-primary/20 text-white shadow-primary/20'
                                : 'bg-white/10 text-slate-100 shadow-black/10'
                            )}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-white/40">
                              <span>{author}</span>
                              <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{message.content}</p>
                            {message.replyToMessageId && (
                              <p className="mt-2 rounded-xl border border-dashed border-white/20 bg-white/10 p-2 text-[11px] text-white/70">
                                Ответ на сообщение #{message.replyToMessageId.slice(0, 8)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {inbox.messages.length === 0 && !inbox.loadingMessages && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-6 py-8 text-center text-sm text-slate-300">
                      Сообщений пока нет. Напишите первое сообщение!
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 px-6 py-4">
                <div className="space-y-3">
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <Textarea
                    ref={messageInputRef}
                    placeholder="Введите сообщение"
                    value={messageText}
                    onChange={event => setMessageText(event.target.value)}
                    onKeyDown={handleEnterSend}
                    disabled={(!selectedConversation && !draftTarget) || inbox.loadingMessages}
                    className="min-h-[90px] resize-none rounded-2xl border border-white/10 bg-black/40 text-sm text-white placeholder:text-white/40 focus:border-primary/60"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <EmojiPickerButton
                        onEmojiSelect={handleInsertEmoji}
                        disabled={inbox.loadingMessages || (!selectedConversation && !draftTarget)}
                        anchorClassName="h-10 w-10"
                      />
                      <span>
                        <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">Enter</kbd> чтобы отправить.
                      </span>
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
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-slate-300">
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-8 py-10 shadow-inner shadow-black/30">
                <p className="text-lg font-semibold text-white">Выберите диалог</p>
                <p className="mt-2 text-sm text-white/50">Найдите контакт слева или начните новый чат через поиск.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesWorkspace;
