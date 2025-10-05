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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, Search, Check, CheckCheck, RefreshCcw, Loader2, MoreVertical, ArrowLeft, MessageSquare, Undo2, X, Copy, Reply as ReplyIcon, CornerDownLeft } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { toast } from 'sonner';

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

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

function createReplySnippet(content: string, limit = 160): string {
  return content
    .replace(/[`*_>#~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export const MessagesWorkspace: React.FC<MessagesWorkspaceProps> = ({ currentUserId, className, initialComposeUser }) => {
  const inbox = useMessagingInbox({ pageSize: 25, conversationRefreshIntervalMs: 40000, messageRefreshIntervalMs: 5000 });
  const { hasMoreMessages, loadOlderMessages } = inbox;
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draftTarget, setDraftTarget] = useState<ComposeUserInput | null>(initialComposeUser ?? null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollTargetRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageDto | null>(null);

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

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    []
  );

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, []);

  const handleJumpToMessage = useCallback(
    async (messageId: string) => {
      const node = messageRefs.current.get(messageId);
      if (node) {
        setHighlightedMessageId(messageId);
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (hasMoreMessages) {
        pendingScrollTargetRef.current = messageId;
        await loadOlderMessages();
      } else {
        toast.info('Сообщение находится вне текущей истории. Загрузите ранние сообщения.');
      }
    },
    [hasMoreMessages, loadOlderMessages]
  );

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Сообщение скопировано');
    } catch (err: any) {
      console.error('Failed to copy message', err);
      toast.error('Не удалось скопировать сообщение');
    }
  }, []);

  const resolveReplyPreview = useCallback(
    (message: MessageDto) => {
      if (!message.replyToMessageId) {
        return null;
      }
      return inbox.messages.find(item => item.id === message.replyToMessageId) ?? null;
    },
    [inbox.messages]
  );

  const handleQuoteMessage = useCallback(
    (content: string) => {
      const quoted = content
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
      setMessageText(prev => {
        const base = prev.trim().length > 0 ? `${prev.replace(/\s+$/, '')}\n` : '';
        return `${base}${quoted}\n`;
      });
      requestAnimationFrame(() => {
        const node = messageInputRef.current;
        if (node) {
          node.focus();
          const length = node.value.length;
          node.setSelectionRange(length, length);
        }
      });
    },
    [messageInputRef]
  );

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

  useEffect(() => {
    if (selectedConversation || draftTarget) {
      setMobileView('conversation');
    }
  }, [selectedConversation?.id, draftTarget?.id]);

  useEffect(() => {
    if (!selectedConversation && !draftTarget) {
      setMobileView('list');
    }
  }, [selectedConversation, draftTarget]);

  useEffect(() => {
    setReplyTarget(null);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (draftTarget) {
      setReplyTarget(null);
    }
  }, [draftTarget?.id]);

  useEffect(() => {
    const last = inbox.messages[inbox.messages.length - 1];
    if (!last) {
      lastMessageIdRef.current = null;
      return;
    }
    if (lastMessageIdRef.current !== last.id) {
      lastMessageIdRef.current = last.id;
      const node = messageRefs.current.get(last.id);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [inbox.messages]);

  useEffect(() => {
    if (!pendingScrollTargetRef.current) return;
    const target = pendingScrollTargetRef.current;
    const node = messageRefs.current.get(target);
    if (node) {
      setHighlightedMessageId(target);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollTargetRef.current = null;
    }
  }, [inbox.messages]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId]);

  const handleSend = useCallback(async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setError(null);
    try {
      if (draftTarget?.id) {
        let conversationId: string | null = null;
        const existingConversation = inbox.conversations.find(
          conversation =>
            conversation.type === 'PRIVATE' && conversation.participantIds.includes(draftTarget.id)
        );

        if (existingConversation) {
          conversationId = existingConversation.id;
          await inbox.selectConversation(existingConversation.id);
        } else {
          const conversation = await apiClient.createConversation(draftTarget.id);
          inbox.addConversation(conversation);
          conversationId = conversation.id;
          await inbox.selectConversation(conversation.id);
        }

        if (conversationId) {
          await inbox.sendMessage(conversationId, trimmed);
        }

        setDraftTarget(null);
      } else if (selectedConversation?.id) {
        await inbox.sendMessage(selectedConversation.id, trimmed, replyTarget?.id);
      } else {
        return;
      }
      setMessageText('');
      setReplyTarget(null);
    } catch (err: any) {
      console.error('Failed to send message', err);
      setError(err?.message || 'Не удалось отправить сообщение.');
    }
  }, [draftTarget, inbox, messageText, selectedConversation, replyTarget]);

  const handleEnterSend = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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

  const handleReplyToMessage = useCallback((message: MessageDto) => {
    setReplyTarget(message);
    setHighlightedMessageId(message.id);
    requestAnimationFrame(() => {
      const node = messageInputRef.current;
      if (!node) return;
      node.focus();
      const end = node.value.length;
      node.setSelectionRange(end, end);
    });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

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

  const hasActiveConversation = Boolean(selectedConversation || draftTarget);
  const showList = mobileView === 'list';
  const showConversation = mobileView === 'conversation';

  const replyAuthor = replyTarget ? resolveMessageAuthor(replyTarget, users, currentUserId) : null;
  const replyPreviewSnippet = replyTarget ? createReplySnippet(replyTarget.content, 140) : null;
  const replyPreviewBlock = replyTarget ? (
    <div className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-xs text-white/75">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary/80">
        <CornerDownLeft className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.26em] text-white/45">Ответ для {replyAuthor || 'сообщения'}</span>
          {selectedConversation && (
            <button
              type="button"
              onClick={() => void handleJumpToMessage(replyTarget.id)}
              className="rounded-full border border-white/10 px-3 py-[2px] text-[10px] uppercase tracking-[0.3em] text-white/60 transition hover:border-primary/40 hover:text-white"
            >
              Показать
            </button>
          )}
        </div>
        {replyPreviewSnippet && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/70">{replyPreviewSnippet}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleCancelReply}
        aria-label="Отменить ответ"
        className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return (
    <div className={cn('h-[calc(100vh-88px)] flex flex-col overflow-hidden text-white', className)}>
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0 flex-col gap-2 px-4 pt-1 pb-[2px] sm:px-6 sm:pt-1.5 sm:pb-[2px] lg:px-10 lg:pt-2 lg:pb-[2px]">
        {Boolean(inbox.error) && (
          <div className="rounded-2xl border border-red-500/40 px-4 py-3 text-sm text-red-200">
            Не удалось загрузить сообщения. Убедитесь, что вы авторизованы и попробуйте позже.
          </div>
        )}

        <div className="flex items-center justify-end pb-2 lg:hidden">
          <div className="flex items-center gap-1 rounded-full border border-white/15 px-0.5">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition border border-transparent',
                showList ? 'border-white/30 text-white' : 'text-white/70 hover:text-white/90 hover:border-white/20'
              )}
            >
              Диалоги
            </button>
            <button
              type="button"
              onClick={() => setMobileView('conversation')}
              disabled={!hasActiveConversation}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition border border-transparent',
                showConversation ? 'border-white/30 text-white' : 'text-white/70 hover:text-white/90 hover:border-white/20',
                !hasActiveConversation && 'cursor-not-allowed opacity-35 hover:text-white/70'
              )}
            >
              Чат
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          <div
            className={cn(
              'flex min-h-0 flex-col',
              showList ? 'flex' : 'hidden',
              'lg:flex lg:w-[280px] xl:w-[320px] lg:border-r lg:border-white/15 lg:pr-6'
            )}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3 pt-2 text-[11px] uppercase tracking-[0.3em] text-white/45 sm:px-3 lg:px-0">
              <MessageSquare className="h-4 w-4 text-primary/70" />
              Диалоги
            </div>

            <div className="px-2 pt-3 sm:px-3 lg:px-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  id="messages-search"
                  type="search"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Поиск диалога"
                  className="h-9 w-full rounded-xl border border-white/15 bg-transparent pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-1 pb-4 sm:px-2 lg:px-0 scrollbar-thin">
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
                        onClick={() => {
                          setDraftTarget(draftTarget);
                          setMobileView('conversation');
                        }}
                        className="group w-full rounded-2xl border border-primary/40 px-4 py-3 text-left text-white transition hover:border-primary/60"
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
                              <span className="truncate text-sm font-semibold">{draftTarget.displayName || draftTarget.username || 'Новый диалог'}</span>
                              <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/80">
                                Новый
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-white/60">Отправьте первое сообщение</p>
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
                            setMobileView('conversation');
                          }}
                          className={cn(
                            'group w-full rounded-2xl border px-4 py-3 text-left transition',
                            isActive
                              ? 'border-white/40 text-white'
                              : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white'
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
                                <span className="shrink-0 text-[11px] font-medium text-white/45">{timestamp}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-white/55">
                                {renderLastMessageStatus(conversation)}
                                <span className="truncate">{lastMessagePreview}</span>
                              </div>
                            </div>
                            {unread && (
                              <span className="ml-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-primary/70 px-2 text-[11px] font-semibold text-primary/90">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {inbox.conversations.length === 0 && !inbox.loadingConversations && (
                    <li className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/60">
                      У вас пока нет диалогов. Найдите друзей и начните общение!
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            showConversation ? 'flex' : 'hidden',
            'lg:flex lg:pl-6'
          )}
        >
          {draftTarget ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 lg:hidden"
                    onClick={() => setMobileView('list')}
                    aria-label="Вернуться к списку диалогов"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
                  onClick={() => {
                    setDraftTarget(null);
                    setMessageText('');
                    setMobileView('list');
                  }}
                  aria-label="Закрыть диалог"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-1 items-center justify-center px-4 sm:px-6">
                <div className="w-full max-w-sm rounded-2xl border border-dashed border-white/15 px-6 py-8 text-center text-sm text-white/70">
                  <MessageSquare className="mx-auto mb-3 h-6 w-6 text-white/40" />
                  <p>Начните беседу. Диалог появится в списке после отправки первого сообщения.</p>
                </div>
              </div>

              <div className="border-t border-white/12 px-4 py-4 sm:px-6">
                <div className="space-y-2">
                  {error && <p className="rounded-2xl border border-red-500/40 px-4 py-2 text-sm text-red-100">{error}</p>}
                  {replyPreviewBlock}
                  <div className="w-full rounded-2xl border border-white/15 px-3 py-2">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={messageInputRef}
                        placeholder="Напишите первое сообщение"
                        value={messageText}
                        onChange={event => setMessageText(event.target.value)}
                        onKeyDown={handleEnterSend}
                        disabled={inbox.loadingMessages}
                        className="min-h-[72px] w-full resize-none border-none bg-transparent px-1 py-1 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!messageText.trim() || inbox.loadingMessages}
                        className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full bg-primary/80 text-lg font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 lg:hidden"
                    onClick={() => setMobileView('list')}
                    aria-label="Вернуться к списку диалогов"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
                      aria-label="Действия диалога"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2 text-xs" onClick={inbox.refresh}>
                      <RefreshCcw className="h-3 w-3" />
                      Обновить диалог
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn('gap-2 text-xs', !inbox.hasMoreMessages && 'pointer-events-none opacity-50')}
                      onClick={async () => {
                        if (!inbox.hasMoreMessages) return;
                        await inbox.loadOlderMessages();
                      }}
                    >
                      <Undo2 className="h-3 w-3" />
                      Ранние сообщения
                    </DropdownMenuItem>
                    {selectedConversation.type === 'PRIVATE' && (
                      <DropdownMenuItem
                        className="gap-2 text-xs text-red-300 hover:text-red-100"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Удалить чат
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
                {inbox.loadingMessages && inbox.messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : inbox.messages.length === 0 ? (
                  <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/60">
                    <MessageSquare className="h-6 w-6 text-white/40" />
                    <p>Сообщений пока нет. Напишите первое сообщение!</p>
                  </div>
                ) : (
                  <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
                    {inbox.hasMoreMessages && (
                      <div className="flex justify-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={inbox.loadOlderMessages}
                          disabled={inbox.loadingMessages}
                          className="gap-2 text-xs"
                        >
                          {inbox.loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Загрузить ещё
                        </Button>
                      </div>
                    )}

                    {inbox.messages.map((message, index) => {
                      const previous = index > 0 ? inbox.messages[index - 1] : null;
                      const author = resolveMessageAuthor(message, users, currentUserId);
                      const replyPreview = resolveReplyPreview(message);
                      const replySnippet = replyPreview ? createReplySnippet(replyPreview.content) : '';
                      const isOwn = message.senderId === currentUserId;
                      const messageDate = new Date(message.createdAt);
                      const previousDate = previous ? new Date(previous.createdAt) : null;
                      const showDateSeparator = !previousDate || !isSameCalendarDay(messageDate, previousDate);
                      const startsNewGroup =
                        !previous ||
                        previous.senderId !== message.senderId ||
                        !previousDate ||
                        !isSameCalendarDay(messageDate, previousDate) ||
                        minutesBetween(messageDate, previousDate) > 6;
                      const showAvatar = !isOwn && startsNewGroup;
                      const spacingClass = index === 0 ? 'mt-1' : startsNewGroup ? 'mt-6' : 'mt-2';
                      const isHighlighted = highlightedMessageId === message.id;
                      const senderProfileSlug =
                        typeof message.senderId === 'number'
                          ? buildProfileSlug(
                              message.senderId,
                              users[message.senderId]?.displayName || users[message.senderId]?.username || author
                            )
                          : null;

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && (
                            <div className="relative my-6 flex items-center justify-center">
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
                                {dayFormatter.format(messageDate)}
                              </span>
                            </div>
                          )}
                          <div
                            ref={node => {
                              if (node) {
                                messageRefs.current.set(message.id, node);
                              } else {
                                messageRefs.current.delete(message.id);
                              }
                            }}
                            className={cn('group flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start', spacingClass)}
                          >
                            {!isOwn && (
                              <div className="flex w-9 justify-center">
                                <Link
                                  to={senderProfileSlug ? `/profile/${senderProfileSlug}` : '#'}
                                  className={cn(
                                    'transition',
                                    showAvatar ? 'opacity-100' : 'pointer-events-none opacity-0',
                                    !senderProfileSlug && 'pointer-events-none'
                                  )}
                                  title={author}
                                >
                                  <Avatar className="h-9 w-9 border border-white/10 bg-black/50 text-[11px] transition hover:border-primary/60">
                                    {users[message.senderId]?.avatar ? (
                                      <AvatarImage src={users[message.senderId]?.avatar} alt={author} />
                                    ) : (
                                      <AvatarFallback>{initials(author)}</AvatarFallback>
                                    )}
                                  </Avatar>
                                </Link>
                              </div>
                            )}
                            <div
                              className={cn(
                                'flex min-w-0 max-w-[760px] flex-col gap-1.5',
                                isOwn ? 'items-end text-right' : 'items-start'
                              )}
                            >
                              {startsNewGroup && (
                                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
                                  {senderProfileSlug && !isOwn ? (
                                    <Link
                                      to={`/profile/${senderProfileSlug}`}
                                      className="font-semibold text-white transition hover:text-primary"
                                    >
                                      {author}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold text-white/90">{author}</span>
                                  )}
                                  <span className="text-white/35 tracking-normal lowercase">
                                    {timeFormatter.format(messageDate)}
                                  </span>
                                </div>
                              )}
                              <div
                                className={cn(
                                  'w-full rounded-xl border px-3 py-2 text-[13px] leading-relaxed transition shadow-sm',
                                  isOwn
                                    ? 'border-primary/30 bg-primary/20 text-white'
                                    : 'border-white/10 bg-white/[0.07] text-white/90',
                                  isHighlighted && 'ring-1 ring-primary/60'
                                )}
                              >
                                {replyPreview ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      'mb-2 flex w-full items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-left text-xs text-white/70 transition hover:border-primary/40 hover:bg-white/10 hover:text-white',
                                      isOwn && 'flex-row-reverse text-right'
                                    )}
                                    onClick={() => void handleJumpToMessage(replyPreview.id)}
                                  >
                                    <CornerDownLeft className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-white/50" />
                                    <div className={cn('min-w-0 flex-1', isOwn && 'text-right')}>
                                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                                        {resolveMessageAuthor(replyPreview, users, currentUserId)}
                                      </p>
                                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/75">{replySnippet || 'Сообщение'}</p>
                                    </div>
                                  </button>
                                ) : message.replyToMessageId ? (
                                  <div className={cn('mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-white/12 px-3 py-1.5 text-xs text-white/60', isOwn && 'justify-end text-right')}>
                                    <span className="text-white/45">↩</span>
                                    <span>Ответ на сообщение из архива.</span>
                                    {hasMoreMessages && (
                                      <button
                                        type="button"
                                        onClick={() => void handleJumpToMessage(message.replyToMessageId!)}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-[3px] text-[10px] uppercase tracking-[0.25em] text-white/70 transition hover:border-primary/40 hover:text-white"
                                      >
                                        <Undo2 className="h-3 w-3" />
                                        Загрузить контекст
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                                <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                                  <MarkdownRenderer value={message.content} />
                                </div>
                              </div>
                              <div className="pointer-events-none mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-white/60 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => handleReplyToMessage(message)}
                                >
                                  <CornerDownLeft className="mr-1 h-3 w-3" /> Ответить
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => handleQuoteMessage(message.content)}
                                >
                                  <ReplyIcon className="mr-1 h-3 w-3" /> Цитировать
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => void handleCopyMessage(message.content)}
                                >
                                  <Copy className="mr-1 h-3 w-3" /> Скопировать
                                </Button>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-white/12 px-4 py-4 sm:px-6">
                <div className="space-y-2">
                  {error && <p className="rounded-2xl border border-red-500/40 px-4 py-2 text-sm text-red-100">{error}</p>}
                  {replyPreviewBlock}
                  <div className="w-full rounded-2xl border border-white/15 px-3 py-2">
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={messageInputRef}
                        placeholder="Введите сообщение"
                        value={messageText}
                        onChange={event => setMessageText(event.target.value)}
                        onKeyDown={handleEnterSend}
                        disabled={(!selectedConversation && !draftTarget) || inbox.loadingMessages}
                        className="min-h-[72px] w-full resize-none border-none bg-transparent px-1 py-1 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!messageText.trim() || inbox.loadingMessages}
                        className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full bg-primary/80 text-lg font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="border border-white/10 bg-background/95 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить диалог?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-white/70">
                      {privateOtherName
                        ? `История с ${privateOtherName} будет скрыта из списка. Сообщения останутся у собеседника.`
                        : 'Диалог будет скрыт из вашего списка. Сообщения останутся у собеседника.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-500 focus:ring-red-400 disabled:opacity-60"
                      disabled={isDeleting}
                      onClick={async () => {
                        const success = await handleDeleteConversation();
                        if (success) {
                          setDeleteDialogOpen(false);
                        }
                      }}
                    >
                      {isDeleting ? 'Удаляем…' : 'Удалить'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-white/60">
              <div className="w-full max-w-sm rounded-2xl border border-dashed border-white/15 px-8 py-10">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/40" />
                <p className="text-lg font-semibold text-white">Выберите диалог</p>
                <p className="mt-2 text-sm text-white/60">Найдите контакт слева или начните новый чат через поиск.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default MessagesWorkspace;
