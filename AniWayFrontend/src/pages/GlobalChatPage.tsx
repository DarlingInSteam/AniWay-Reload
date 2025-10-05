import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import useUserMiniBatch from '@/hooks/useUserMiniBatch';
import type { MessageView as MessageDto } from '@/types/social';
import { cn } from '@/lib/utils';
import { ChatPageHeader } from '@/features/global-chat/components/ChatPageHeader';
import { ChatMobileToggle } from '@/features/global-chat/components/ChatMobileToggle';
import { ChannelSidebar } from '@/features/global-chat/components/ChannelSidebar';
import { SelectedCategoryPanel } from '@/features/global-chat/components/SelectedCategoryPanel';
import { CategoryCreateDialog, CategoryCreatePayload } from '@/features/global-chat/components/CategoryCreateDialog';
import { CategoryEditDialog, CategoryEditPayload } from '@/features/global-chat/components/CategoryEditDialog';
import { useChatMessageNavigation } from '@/features/global-chat/hooks/useChatMessageNavigation';

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

  const [mobileView, setMobileView] = useState<'list' | 'feed'>('list');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');

  const hasSelectedCategory = Boolean(selectedCategory);
  const currentUserId = user?.id ?? null;

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

  const participants = useMemo(() => {
    const ids = new Set<number>();
    messages.forEach(message => ids.add(message.senderId));
    if (replyTo?.senderId) ids.add(replyTo.senderId);
    return Array.from(ids);
  }, [messages, replyTo?.senderId]);

  const users = useUserMiniBatch(participants);

  const { registerMessageNode, handleJumpToMessage } = useChatMessageNavigation({
    messages,
    hasMore,
    loadOlderMessages,
    highlightedMessageId,
    setHighlightedMessageId,
    onMissingMessage: () => toast.info('Сообщение находится вне текущей истории. Загрузите ранние сообщения.'),
  });

  useEffect(() => {
    if (chatError) {
      const message = typeof chatError === 'string' && chatError.trim().length > 0
        ? chatError
        : 'Не удалось загрузить глобальный чат';
      toast.error(message);
    }
  }, [chatError]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setMobileView('list');
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategory && editDialogOpen) {
      setEditDialogOpen(false);
    }
  }, [selectedCategory, editDialogOpen]);

  const resolveReplyPreview = useCallback(
    (message: MessageDto) => {
      if (!message.replyToMessageId) return null;
      const referenced = messages.find(m => m.id === message.replyToMessageId);
      return referenced || null;
    },
    [messages]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedCategoryId) {
        toast.error('Выберите категорию для отправки сообщения');
        throw new Error('Категория не выбрана');
      }
      await sendMessage(content);
      await markSelectedCategoryRead();
    },
    [selectedCategoryId, sendMessage, markSelectedCategoryRead]
  );

  const handleCreateCategory = useCallback(
    async (payload: CategoryCreatePayload) => {
      await createCategory(payload);
      await refreshCategories();
    },
    [createCategory, refreshCategories]
  );

  const handleUpdateCategory = useCallback(
    async (payload: CategoryEditPayload) => {
      if (!selectedCategoryId) {
        throw new Error('Категория не выбрана');
      }
      await updateCategory(selectedCategoryId, payload);
      await refreshCategories();
      await refreshMessages();
    },
    [refreshCategories, refreshMessages, selectedCategoryId, updateCategory]
  );

  const handleReplyToMessage = useCallback(
    (message: MessageDto | null) => {
      setReplyTo(message);
      if (message) {
        setMobileView('feed');
      }
    },
    [setReplyTo, setMobileView]
  );

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, [setReplyTo]);

  const handleNavigateToFeed = useCallback(() => {
    setMobileView('feed');
  }, []);

  const handleNavigateToList = useCallback(() => {
    setMobileView('list');
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-120px)] bg-slate-950/95">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),_transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 lg:px-8 lg:py-10">
        <ChatPageHeader
          isAdmin={isAdmin}
          hasSelectedCategory={hasSelectedCategory}
          onOpenCreateCategory={() => setCreateDialogOpen(true)}
          onRefreshAll={refreshAll}
          onRefreshCategories={refreshCategories}
          onRefreshMessages={refreshMessages}
        />

        <ChatMobileToggle
          showList={mobileView === 'list'}
          showFeed={mobileView === 'feed'}
          hasSelectedCategory={hasSelectedCategory}
          onShowList={handleNavigateToList}
          onShowFeed={handleNavigateToFeed}
        />

        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          <ChannelSidebar
            categories={categories}
            filteredCategories={filteredCategories}
            loading={loadingCategories}
            selectedCategoryId={selectedCategoryId}
            showSidebar={mobileView === 'list'}
            hasSelectedCategory={hasSelectedCategory}
            isAdmin={isAdmin}
            categoryQuery={categoryQuery}
            onCategoryQueryChange={setCategoryQuery}
            onSelectCategory={selectCategory}
            onNavigateToFeed={handleNavigateToFeed}
            onRefreshCategories={refreshCategories}
            onRefreshMessages={refreshMessages}
            onOpenCreateCategory={() => setCreateDialogOpen(true)}
            onOpenEditCategory={() => setEditDialogOpen(true)}
          />

          <div className={cn('min-h-0 flex-1', mobileView === 'feed' ? 'flex' : 'hidden', 'lg:flex')}>
            <SelectedCategoryPanel
              category={selectedCategory ?? null}
              messages={messages}
              users={users}
              currentUserId={currentUserId}
              highlightedMessageId={highlightedMessageId}
              hasMore={hasMore}
              loadingMessages={loadingMessages}
              replyTo={replyTo}
              dayFormatter={dayFormatter}
              timeFormatter={timeFormatter}
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              registerMessageNode={registerMessageNode}
              resolveReplyPreview={resolveReplyPreview}
              onJumpToMessage={handleJumpToMessage}
              onLoadOlderMessages={loadOlderMessages}
              onRefreshMessages={refreshMessages}
              onMarkSelectedCategoryRead={markSelectedCategoryRead}
              onOpenEditCategory={() => setEditDialogOpen(true)}
              onReplyToMessage={handleReplyToMessage}
              onBackToList={handleNavigateToList}
              onSendMessage={handleSendMessage}
              onCancelReply={handleCancelReply}
              className="h-full"
              showBackButton={mobileView === 'feed'}
            />
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <CategoryCreateDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreate={handleCreateCategory}
          />
          <CategoryEditDialog
            category={selectedCategory ?? null}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUpdate={handleUpdateCategory}
          />
        </>
      )}
    </div>
  );
};

export default GlobalChatPage;
