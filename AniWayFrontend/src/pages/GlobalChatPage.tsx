import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import useUserMiniBatch from '@/hooks/useUserMiniBatch';
import type { MessageView as MessageDto } from '@/types/social';
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

  const handleReplyToMessage = useCallback((message: MessageDto | null) => {
    setReplyTo(message);
  }, [setReplyTo]);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, [setReplyTo]);

  return (
    <div className="h-[calc(100vh-88px)] flex flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0 flex-col gap-2 overflow-hidden px-4 py-2 sm:px-6 sm:py-3 lg:px-10 lg:py-4">
        <ChannelSidebar
          categories={categories}
          filteredCategories={filteredCategories}
          loading={loadingCategories}
          loadingMessages={loadingMessages}
          selectedCategoryId={selectedCategoryId}
          selectedCategory={selectedCategory ?? null}
          hasSelectedCategory={hasSelectedCategory}
          hasMore={hasMore}
          isAdmin={isAdmin}
          categoryQuery={categoryQuery}
          onCategoryQueryChange={setCategoryQuery}
          onSelectCategory={selectCategory}
          onRefreshAll={refreshAll}
          onRefreshCategories={refreshCategories}
          onRefreshMessages={refreshMessages}
          onLoadOlderMessages={loadOlderMessages}
          onMarkSelectedCategoryRead={markSelectedCategoryRead}
          onOpenCreateCategory={() => setCreateDialogOpen(true)}
          onOpenEditCategory={() => setEditDialogOpen(true)}
        />
  <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
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
            isAuthenticated={isAuthenticated}
            registerMessageNode={registerMessageNode}
            resolveReplyPreview={resolveReplyPreview}
            onJumpToMessage={handleJumpToMessage}
            onLoadOlderMessages={loadOlderMessages}
            onReplyToMessage={handleReplyToMessage}
            onSendMessage={handleSendMessage}
            onCancelReply={handleCancelReply}
          />
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
