import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Hash, RefreshCcw, Plus, Reply, CornerDownLeft, Loader2, ArchiveRestore, Archive, Shield, Undo2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import useUserMiniBatch, { UserMini } from '@/hooks/useUserMiniBatch';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MessageView as MessageDto } from '@/types/social';

function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'U';
}

function getUserDisplay(users: Record<number, UserMini>, userId: number, currentUserId?: number | null): string {
  if (currentUserId && userId === currentUserId) return 'Вы';
  const user = users[userId];
  return user?.displayName || user?.username || `ID ${userId}`;
}

export const GlobalChatPage: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const chat = useGlobalChat({ includeArchived: isAdmin });
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

  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollTargetRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

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
  }, [selectedCategory?.id]);

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

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-manga-black via-manga-black/95 to-manga-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">
              <MessageSquare className="h-4 w-4" />
              Глобальный чат
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Категории общения AniWay</h1>
            <p className="mt-1 text-sm text-white/60">
              Выбирайте канал общения, отвечайте на сообщения и следите за важными обновлениями сообщества.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refreshAll} disabled={loadingCategories || loadingMessages}>
              {loadingCategories || loadingMessages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!!chatError && (
          <GlassPanel className="mb-6 border border-red-500/40 bg-red-500/10 text-sm text-red-200">
            Не удалось загрузить данные чата. Попробуйте обновить страницу или зайдите позже.
          </GlassPanel>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[360px,1fr]">
          <div className="space-y-6">
            <GlassPanel className="space-y-4" padding="md">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Hash className="h-4 w-4 text-primary/80" />
                  Категории
                </h2>
                <Button variant="ghost" size="icon" onClick={refreshCategories} disabled={loadingCategories}>
                  {loadingCategories ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                </Button>
              </div>

              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {loadingCategories && categories.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-slate-300">
                    Категории ещё не созданы.
                  </div>
                ) : (
                  categories.map(category => {
                    const isActive = selectedCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => selectCategory(category.id)}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition',
                          isActive ? 'border-primary/60 bg-primary/15 shadow-lg shadow-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{category.title}</p>
                              {category.isDefault && (
                                <Badge variant="secondary" className="bg-primary/20 text-primary">
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
                              <p className="mt-1 text-xs text-white/60">{category.description}</p>
                            )}
                          </div>
                          {category.unreadCount > 0 && (
                            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600/90 px-2 text-[11px] font-semibold text-white">
                              {category.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </GlassPanel>

            {isAdmin && (
              <GlassPanel className="space-y-5 border-white/15 bg-white/5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Shield className="h-4 w-4" />
                  Управление
                </div>

                <form onSubmit={handleCreateCategory} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Новая категория</h3>
                    <Plus className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={event => setNewTitle(event.target.value)}
                      placeholder="Название"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newSlug}
                      onChange={event => setNewSlug(event.target.value)}
                      placeholder="Slug (опционально)"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                    />
                    <Textarea
                      value={newDescription}
                      onChange={event => setNewDescription(event.target.value)}
                      placeholder="Описание"
                      className="min-h-[90px] border-white/10 bg-black/30 text-sm"
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
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Создать категорию'}
                  </Button>
                </form>

                {selectedCategory && (
                  <form onSubmit={handleUpdateCategory} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Редактирование</h3>
                      {selectedCategory.isArchived ? (
                        <Archive className="h-4 w-4 text-orange-300" />
                      ) : (
                        <ArchiveRestore className="h-4 w-4 text-primary/70" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={event => setEditTitle(event.target.value)}
                      placeholder="Название"
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
                    />
                    <Textarea
                      value={editDescription}
                      onChange={event => setEditDescription(event.target.value)}
                      placeholder="Описание"
                      className="min-h-[90px] border-white/10 bg-black/30 text-sm"
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
                    <Button type="submit" className="w-full" disabled={updating}>
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить изменения'}
                    </Button>
                  </form>
                )}
              </GlassPanel>
            )}
          </div>

          <GlassPanel className="flex min-h-[640px] flex-col border-white/10 bg-white/5" padding="lg">
            {selectedCategory ? (
              <>
                <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">
                      <Hash className="h-4 w-4" />
                      {selectedCategory.slug}
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{selectedCategory.title}</h2>
                    {selectedCategory.description && (
                      <p className="mt-1 text-sm text-white/60">{selectedCategory.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadOlderMessages}
                      disabled={!hasMore || loadingMessages}
                    >
                      {loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                      <span className="ml-1">Ранние сообщения</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshMessages}
                      disabled={loadingMessages}
                    >
                      <RefreshCcw className="h-3 w-3" />
                      <span className="ml-1">Обновить</span>
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto px-1">
                      {loadingMessages && messages.length === 0 ? (
                        <div className="flex min-h-[320px] items-center justify-center">
                          <LoadingSpinner />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-white/60">
                          <MessageSquare className="h-6 w-6 text-white/40" />
                          <p>Будьте первыми, кто напишет в этом канале!</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pb-6">
                          {hasMore && (
                            <div className="flex justify-center py-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={loadOlderMessages}
                                disabled={loadingMessages}
                              >
                                {loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                                <span className="ml-1">Загрузить ещё</span>
                              </Button>
                            </div>
                          )}

                          {messages.map(message => {
                            const author = getUserDisplay(users, message.senderId, user?.id);
                            const replyTarget = resolveReplyPreview(message);
                            const isOwn = user?.id === message.senderId;
                            const isHighlighted = highlightedMessageId === message.id;
                            const isReplyToYou = !!replyTarget && replyTarget.senderId === user?.id;
                            return (
                              <div
                                key={message.id}
                                ref={node => {
                                  if (node) {
                                    messageRefs.current.set(message.id, node);
                                  } else {
                                    messageRefs.current.delete(message.id);
                                  }
                                }}
                                className={cn(
                                  'group relative flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all',
                                  isOwn ? 'border-primary/50 bg-primary/15' : 'border-white/10 bg-white/5',
                                  !isOwn && isReplyToYou && 'border-red-500/60 bg-red-500/10',
                                  isHighlighted && 'ring-2 ring-primary/60'
                                )}
                              >
                                <Avatar className="h-10 w-10 border border-white/10 bg-black/40">
                                  {users[message.senderId]?.avatar ? (
                                    <AvatarImage src={users[message.senderId]?.avatar} alt={author} />
                                  ) : (
                                    <AvatarFallback>{initials(author)}</AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                    <span className="font-semibold text-white/90">{author}</span>
                                    <span className="text-white/40">{new Date(message.createdAt).toLocaleString()}</span>
                                    {isReplyToYou && (
                                      <Badge variant="secondary" className="bg-red-500/20 text-red-200 border-red-500/40">
                                        Ответ вам
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{message.content}</p>
                                  {replyTarget ? (
                                    <button
                                      type="button"
                                      className="mt-3 w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs text-white/70 transition hover:border-primary/40 hover:bg-primary/10"
                                      onClick={() => handleJumpToMessage(replyTarget.id)}
                                    >
                                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                                        <Reply className="h-3 w-3" /> Ответ для {getUserDisplay(users, replyTarget.senderId, user?.id)}
                                      </p>
                                      <p className="mt-1 line-clamp-2 text-[13px] text-white/80">{replyTarget.content}</p>
                                    </button>
                                  ) : message.replyToMessageId ? (
                                    <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60">
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
                                  <div className="mt-3 hidden items-center gap-2 text-xs text-white/60 group-hover:flex">
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
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                      {replyTo && (
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
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
                          <p className="mt-2 line-clamp-3 text-white/80">{replyTo.content}</p>
                        </div>
                      )}

                      {outgoingError && (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                          {outgoingError}
                        </div>
                      )}

                      <Textarea
                        value={messageText}
                        onChange={event => setMessageText(event.target.value)}
                        onKeyDown={handleEnterSend}
                        placeholder={isAuthenticated ? 'Напишите сообщение для сообщества…' : 'Авторизуйтесь, чтобы писать в глобальный чат'}
                        disabled={!isAuthenticated || loadingMessages}
                        className="min-h-[120px] border-white/10 bg-black/40 text-sm"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-white/40">
                          Нажмите <kbd className="rounded bg-white/10 px-1 py-0.5">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5">Enter</kbd>, чтобы отправить быстро.
                        </p>
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
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-white/60">
                <MessageSquare className="h-10 w-10 text-white/40" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Выберите категорию</h2>
                  <p className="mt-2 text-sm text-white/60">Слева представлены каналы глобального чата AniWay. Выберите любой, чтобы начать общение.</p>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default GlobalChatPage;
