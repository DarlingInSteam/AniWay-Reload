import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Hash, RefreshCcw, Plus, Reply, CornerDownLeft, Loader2, ArchiveRestore, Undo2, MoreVertical, ArrowLeft, Pencil, Search } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import useUserMiniBatch, { UserMini } from '@/hooks/useUserMiniBatch';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MessageView as MessageDto } from '@/types/social';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { buildProfileSlug } from '@/utils/profileSlug';
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'U';
}

function getUserDisplay(users: Record<number, UserMini>, userId: number, currentUserId?: number | null): string {
  if (currentUserId && userId === currentUserId) return 'Вы';
  const user = users[userId];
  return user?.displayName || user?.username || `ID ${userId}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

export const GlobalChatPage: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const chat = useGlobalChat({ includeArchived: isAdmin, messageRefreshIntervalMs: 5000, autoRefreshIntervalMs: 20000 });
  const {
    categories,
    selectedCategory,
    selectedCategoryId,
    messages,
    hasMore,
    loadingCategories,
    loadingMessages,
    error: chatError,
    replyTo,
    highlightedMessageId,
    selectCategory,
    setReplyTo,
    setHighlightedMessageId,
    refreshCategories,
    refreshMessages,
    refreshAll,
    loadOlderMessages,
    sendMessage,
    markSelectedCategoryRead,
    createCategory,
    updateCategory,
  } = chat;
  const [messageText, setMessageText] = useState('');
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editIsArchived, setEditIsArchived] = useState(false);
  const [outgoingError, setOutgoingError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'feed'>('list');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const normalized = categoryQuery.trim().toLowerCase();
    if (!normalized) return categories;
    return categories.filter(category => {
      const title = category.title?.toLowerCase() ?? '';
      const description = category.description?.toLowerCase() ?? '';
      const slug = category.slug?.toLowerCase() ?? '';
      return title.includes(normalized) || description.includes(normalized) || slug.includes(normalized);
    });
  }, [categories, categoryQuery]);

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    []
  );

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollTargetRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const participants = useMemo(() => {
    const ids = new Set<number>();
    messages.forEach(message => { ids.add(message.senderId); });
    if (replyTo?.senderId) ids.add(replyTo.senderId);
    return Array.from(ids);
  }, [messages, replyTo?.senderId]);

  const users = useUserMiniBatch(participants);

  useEffect(() => {
    const selected = selectedCategory;
    if (!selected) {
      setEditTitle('');
      setEditDescription('');
      setEditIsDefault(false);
      setEditIsArchived(false);
    } else {
      setEditTitle(selected.title);
      setEditDescription(selected.description ?? '');
      setEditIsDefault(selected.isDefault);
      setEditIsArchived(selected.isArchived);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategoryId) {
      setMobileView('feed');
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setMobileView('list');
      setEditDialogOpen(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!createDialogOpen) {
      setNewTitle('');
      setNewSlug('');
      setNewDescription('');
      setNewIsDefault(false);
    }
  }, [createDialogOpen]);

  useEffect(() => {
    if (!editDialogOpen && selectedCategory) {
      setEditTitle(selectedCategory.title);
      setEditDescription(selectedCategory.description ?? '');
      setEditIsDefault(selectedCategory.isDefault);
      setEditIsArchived(selectedCategory.isArchived);
    }
  }, [editDialogOpen, selectedCategory]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) {
      lastMessageIdRef.current = null;
      return;
    }
    if (lastMessageIdRef.current !== last.id) {
      lastMessageIdRef.current = last.id;
      const element = messageRefs.current.get(last.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!pendingScrollTargetRef.current) return;
    const target = pendingScrollTargetRef.current;
    const node = messageRefs.current.get(target);
    if (node) {
      setHighlightedMessageId(target);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollTargetRef.current = null;
    }
  }, [messages, setHighlightedMessageId]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId, setHighlightedMessageId]);

  const handleSend = useCallback(async () => {
    if (!selectedCategoryId) {
      toast.error('Выберите категорию для отправки сообщения');
      return;
    }
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setOutgoingError(null);
    try {
      await sendMessage(trimmed);
      setMessageText('');
      await markSelectedCategoryRead();
    } catch (err: any) {
      const message = err?.message || 'Не удалось отправить сообщение';
      setOutgoingError(message);
      toast.error(message);
    }
  }, [selectedCategoryId, messageText, sendMessage, markSelectedCategoryRead]);

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

  const handleJumpToMessage = useCallback(async (messageId: string) => {
    const node = messageRefs.current.get(messageId);
    if (node) {
      setHighlightedMessageId(messageId);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (hasMore) {
      pendingScrollTargetRef.current = messageId;
      await loadOlderMessages();
    } else {
      toast.info('Сообщение находится вне текущей истории. Загрузите ранние сообщения.');
    }
  }, [setHighlightedMessageId, hasMore, loadOlderMessages]);

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) {
      toast.error('Укажите название категории');
      return;
    }
    setCreating(true);
    try {
      await createCategory({
        title,
        slug: newSlug.trim() || undefined,
        description: newDescription.trim() || undefined,
        isDefault: newIsDefault,
      });
      setNewTitle('');
      setNewSlug('');
      setNewDescription('');
      setNewIsDefault(false);
      setCreateDialogOpen(false);
      toast.success('Категория создана');
    } catch (err: any) {
      const message = err?.message || 'Не удалось создать категорию';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCategoryId) return;
    const trimmedTitle = editTitle.trim();
    const trimmedDescription = editDescription.trim();
    const payload = {
      title: trimmedTitle || undefined,
      description: trimmedDescription === '' ? '' : trimmedDescription,
      isDefault: editIsDefault,
      isArchived: editIsArchived,
    } as const;
    setUpdating(true);
    try {
      await updateCategory(selectedCategoryId, payload);
      toast.success('Категория обновлена');
      setEditDialogOpen(false);
    } catch (err: any) {
      const message = err?.message || 'Не удалось обновить категорию';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const resolveReplyPreview = useCallback((message: MessageDto) => {
    if (!message.replyToMessageId) return null;
    const referenced = messages.find(m => m.id === message.replyToMessageId);
    return referenced || null;
  }, [messages]);

  const hasSelectedCategory = Boolean(selectedCategoryId);
  const showList = mobileView === 'list';
  const showFeed = mobileView === 'feed';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      <GlassPanel padding="sm" className="mb-6 flex items-center justify-between gap-3 border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          <MessageSquare className="h-4 w-4 text-primary/70" />
          Глобальный чат
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10" onClick={() => setCreateDialogOpen(true)} aria-label="Создать канал">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10" aria-label="Действия чата">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 text-xs" onClick={refreshAll}>
                <RefreshCcw className="h-3 w-3" />
                Обновить всё
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onClick={refreshCategories}>
                <Hash className="h-3 w-3" />
                Обновить каналы
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
                onClick={refreshMessages}
              >
                <MessageSquare className="h-3 w-3" />
                Обновить сообщения
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </GlassPanel>

      {!!chatError && (
        <GlassPanel padding="sm" className="mb-6 border border-red-500/40 bg-red-500/10 text-sm text-red-200">
          Не удалось загрузить данные чата. Попробуйте обновить страницу или зайдите позже.
        </GlassPanel>
      )}

      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Глобальный чат</div>
        <div className="glass-inline flex items-center rounded-full border border-white/10 bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              showList ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/80'
            )}
          >
            Каналы
          </button>
          <button
            type="button"
            onClick={() => setMobileView('feed')}
            disabled={!hasSelectedCategory}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              showFeed ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/80',
              !hasSelectedCategory && 'cursor-not-allowed opacity-40 hover:text-white/60'
            )}
          >
            Чат
          </button>
        </div>
      </div>

      <div className="flex min-h-[520px] flex-col gap-4 lg:h-[calc(100vh-220px)] lg:flex-row">
        <GlassPanel
          padding="none"
          className={cn(
            'flex min-h-0 flex-col overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl',
            showList ? 'flex' : 'hidden',
            'lg:flex lg:w-[320px] xl:w-[360px] lg:h-full'
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              <Hash className="h-4 w-4 text-primary/70" />
              Каналы
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10" aria-label="Действия каналов">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2 text-xs" onClick={refreshCategories}>
                  <RefreshCcw className="h-3 w-3" />
                  Обновить списки
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
                  onClick={refreshMessages}
                >
                  <MessageSquare className="h-3 w-3" />
                  Обновить чат
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-3 w-3" />
                      Новая категория
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn('gap-2 text-xs', !selectedCategory && 'pointer-events-none opacity-50')}
                      onClick={() => selectedCategory && setEditDialogOpen(true)}
                    >
                      <Pencil className="h-3 w-3" />
                      Редактировать
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="px-5 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="search"
                value={categoryQuery}
                onChange={event => setCategoryQuery(event.target.value)}
                placeholder="Поиск канала"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
            <span>Всего: {categories.length}</span>
            <span>Показано: {filteredCategories.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-5 scrollbar-thin">
            {loadingCategories && categories.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : categories.length === 0 ? (
              <div className="glass-panel mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                Категории ещё не созданы.
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="glass-panel mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                Ничего не найдено. Попробуйте изменить запрос.
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredCategories.map(category => {
                  const isActive = selectedCategoryId === category.id;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectCategory(category.id);
                          setMobileView('feed');
                        }}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition backdrop-blur-md',
                          isActive
                            ? 'border-primary/40 bg-white/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/85 hover:border-white/20 hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{category.title}</p>
                              {category.isDefault && (
                                <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-primary">
                                  По умолчанию
                                </Badge>
                              )}
                              {category.isArchived && (
                                <Badge variant="outline" className="border-orange-400/40 text-orange-200">
                                  Архив
                                </Badge>
                              )}
                            </div>
                            {category.description && (
                              <p className="mt-1 truncate text-xs text-white/60">{category.description}</p>
                            )}
                          </div>
                          {category.unreadCount > 0 && (
                            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600/80 px-2 text-[11px] font-semibold text-white">
                              {category.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </GlassPanel>

        <GlassPanel
          padding="none"
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl',
            showFeed ? 'flex' : 'hidden',
            'lg:flex'
          )}
        >
          {selectedCategory ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 lg:hidden"
                    onClick={() => setMobileView('list')}
                    aria-label="Вернуться к списку каналов"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedCategory.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                      <span>#{selectedCategory.slug || 'канал'}</span>
                      {selectedCategory.isArchived && (
                        <Badge variant="outline" className="border-orange-400/40 text-orange-200">
                          Архив
                        </Badge>
                      )}
                    </div>
                    {selectedCategory.description && (
                      <p className="mt-2 max-w-xl text-xs text-white/60">{selectedCategory.description}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
                      aria-label="Действия канала"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2 text-xs" onClick={refreshMessages}>
                      <RefreshCcw className="h-3 w-3" />
                      Обновить сообщения
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn('gap-2 text-xs', !hasMore && 'pointer-events-none opacity-50')}
                      onClick={async () => {
                        if (!hasMore) return;
                        await loadOlderMessages();
                      }}
                    >
                      <Undo2 className="h-3 w-3" />
                      Ранние сообщения
                    </DropdownMenuItem>
                    {selectedCategory.unreadCount > 0 && (
                      <DropdownMenuItem className="gap-2 text-xs" onClick={markSelectedCategoryRead}>
                        <ArchiveRestore className="h-3 w-3" />
                        Пометить прочитанным
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem className="gap-2 text-xs" onClick={() => setEditDialogOpen(true)}>
                        <Pencil className="h-3 w-3" />
                        Редактировать категорию
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="glass-panel mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-sm text-white/60">
                    <MessageSquare className="h-6 w-6 text-white/40" />
                    <p>Будьте первыми, кто напишет в этом канале!</p>
                  </div>
                ) : (
                  <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3">
                    {hasMore && (
                      <div className="flex justify-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadOlderMessages}
                          disabled={loadingMessages}
                          className="gap-2 text-xs"
                        >
                          {loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          Загрузить ещё
                        </Button>
                      </div>
                    )}

                    {messages.map((message, index) => {
                      const previous = index > 0 ? messages[index - 1] : null;
                      const author = getUserDisplay(users, message.senderId, user?.id);
                      const replyTarget = resolveReplyPreview(message);
                      const isOwn = user?.id === message.senderId;
                      const isHighlighted = highlightedMessageId === message.id;
                      const isReplyToYou = !!replyTarget && replyTarget.senderId === user?.id;
                      const profileSlug = buildProfileSlug(
                        message.senderId,
                        users[message.senderId]?.displayName || users[message.senderId]?.username || author
                      );
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
                      const spacingClass = index === 0 ? '' : startsNewGroup ? 'mt-8' : 'mt-3';

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && (
                            <div className="relative my-6 flex items-center justify-center">
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/60">
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
                            className={cn(
                              'group flex items-end gap-3',
                              isOwn ? 'justify-end' : 'justify-start',
                              spacingClass
                            )}
                          >
                            {!isOwn && (
                              <div className="flex w-10 justify-center">
                                <Link
                                  to={`/profile/${profileSlug}`}
                                  className={cn('transition', showAvatar ? 'opacity-100' : 'pointer-events-none opacity-0')}
                                  title={author}
                                >
                                  <Avatar className="h-10 w-10 border border-white/10 bg-black/50 transition hover:border-primary/60">
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
                                'flex min-w-0 max-w-[900px] flex-col gap-1',
                                isOwn ? 'items-end text-right' : 'items-start'
                              )}
                            >
                              {startsNewGroup && (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                  {isOwn ? (
                                    <span className="font-semibold text-primary">Вы</span>
                                  ) : (
                                    <Link
                                      to={`/profile/${profileSlug}`}
                                      className="font-semibold text-primary transition hover:text-primary/80"
                                    >
                                      {author}
                                    </Link>
                                  )}
                                  <span className="text-white/40">{timeFormatter.format(messageDate)}</span>
                                  {isReplyToYou && (
                                    <Badge variant="secondary" className="border-red-500/40 bg-red-500/20 text-red-200">
                                      Ответ вам
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div
                                className={cn(
                                  'relative w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed backdrop-blur-md shadow-[0_12px_32px_rgba(15,23,42,0.25)]',
                                  isOwn ? 'border-primary/40 bg-white/15 text-white' : 'border-white/10 bg-white/8 text-white/90',
                                  !isOwn && isReplyToYou && 'border-red-500/50 bg-red-500/10',
                                  isHighlighted && 'ring-2 ring-primary/60'
                                )}
                              >
                                {replyTarget ? (
                                  <button
                                    type="button"
                                    className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:border-primary/40 hover:bg-white/10"
                                    onClick={() => handleJumpToMessage(replyTarget.id)}
                                  >
                                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                                      <Reply className="h-3 w-3" /> Ответ для {getUserDisplay(users, replyTarget.senderId, user?.id)}
                                    </p>
                                    <div className="mt-2 max-h-32 overflow-hidden text-[13px] text-white/80">
                                      <div className="prose prose-invert max-w-none text-[13px] leading-relaxed markdown-body">
                                        <MarkdownRenderer value={replyTarget.content} />
                                      </div>
                                    </div>
                                  </button>
                                ) : message.replyToMessageId ? (
                                  <div className="mb-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                                    <p>Ответ на сообщение из архива.</p>
                                    {hasMore && (
                                      <button
                                        type="button"
                                        onClick={() => handleJumpToMessage(message.replyToMessageId!)}
                                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 transition hover:border-primary/40 hover:text-white"
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
                              <div className="pointer-events-none mt-2 flex items-center gap-2 text-xs text-white/60 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => {
                                    setReplyTo(message);
                                    handleJumpToMessage(message.id);
                                  }}
                                >
                                  <CornerDownLeft className="mr-1 h-3 w-3" /> Ответить
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

              <div className="border-t border-white/10 px-6 py-5">
                <div className="space-y-3">
                  {replyTo && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                          <Reply className="h-3 w-3" /> Ответ пользователю {getUserDisplay(users, replyTo.senderId, user?.id)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="text-xs text-white/50 transition hover:text-white"
                        >
                          Очистить
                        </button>
                      </div>
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/5 bg-white/5 p-2">
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                          <MarkdownRenderer value={replyTo.content} />
                        </div>
                      </div>
                    </div>
                  )}

                  {outgoingError && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                      {outgoingError}
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-1 py-1">
                    <Textarea
                      ref={messageInputRef}
                      value={messageText}
                      onChange={event => setMessageText(event.target.value)}
                      onKeyDown={handleEnterSend}
                      placeholder={isAuthenticated ? 'Напишите сообщение для сообщества…' : 'Авторизуйтесь, чтобы писать в глобальный чат'}
                      disabled={!isAuthenticated || loadingMessages}
                      className="min-h-[120px] resize-none border-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
                    <div className="flex items-center gap-2">
                      <EmojiPickerButton
                        onEmojiSelect={handleInsertEmoji}
                        disabled={!isAuthenticated || loadingMessages}
                        anchorClassName="h-9 w-9"
                      />
                      <span>
                        Нажмите <kbd className="rounded bg-white/10 px-1 py-0.5">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5">Enter</kbd>, чтобы отправить быстро.
                      </span>
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={!isAuthenticated || loadingMessages || !messageText.trim()}
                      className="min-w-[140px]"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Отправить
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-white/60">
              <div className="glass-panel w-full max-w-sm rounded-2xl border border-dashed border-white/15 bg-white/5 px-8 py-10 shadow-[0_12px_40px_rgba(15,23,42,0.35)]">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/40" />
                <h2 className="text-xl font-semibold text-white">Выберите категорию</h2>
                <p className="mt-2 text-sm text-white/60">Слева представлены каналы глобального чата AniWay. Выберите любой, чтобы начать общение.</p>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      {isAdmin && (
        <>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="border border-white/10 bg-background/95 text-white">
              <DialogHeader>
                <DialogTitle>Новая категория</DialogTitle>
                <DialogDescription className="text-sm text-white/60">
                  Настройте новый канал глобального чата.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <input
                  type="text"
                  value={newTitle}
                  onChange={event => setNewTitle(event.target.value)}
                  placeholder="Название"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                />
                <input
                  type="text"
                  value={newSlug}
                  onChange={event => setNewSlug(event.target.value)}
                  placeholder="Slug (опционально)"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                />
                <Textarea
                  value={newDescription}
                  onChange={event => setNewDescription(event.target.value)}
                  placeholder="Описание"
                  className="min-h-[90px] border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40"
                />
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={event => setNewIsDefault(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40"
                  />
                  Сделать категорией по умолчанию
                </label>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Создать
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="border border-white/10 bg-background/95 text-white">
              <DialogHeader>
                <DialogTitle>Настройки категории</DialogTitle>
                <DialogDescription className="text-sm text-white/60">
                  Обновите параметры выбранного канала.
                </DialogDescription>
              </DialogHeader>
              {selectedCategory ? (
                <form onSubmit={handleUpdateCategory} className="space-y-4">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={event => setEditTitle(event.target.value)}
                    placeholder="Название"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                  />
                  <Textarea
                    value={editDescription}
                    onChange={event => setEditDescription(event.target.value)}
                    placeholder="Описание"
                    className="min-h-[90px] border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40"
                  />
                  <div className="flex flex-col gap-2 text-xs text-white/70">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editIsDefault}
                        onChange={event => setEditIsDefault(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/40"
                      />
                      Сделать категорией по умолчанию
                    </label>
                    <label className="flex items-center gap-2 text-orange-200/80">
                      <input
                        type="checkbox"
                        checked={editIsArchived}
                        onChange={event => setEditIsArchived(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-black/40"
                      />
                      Переместить в архив
                    </label>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updating}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={updating}>
                      {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                      Сохранить
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <p className="text-sm text-white/60">Выберите категорию для редактирования.</p>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default GlobalChatPage;
