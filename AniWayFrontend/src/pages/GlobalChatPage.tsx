import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalChat } from '@/hooks/useGlobalChat';
import useUserMiniBatch from '@/hooks/useUserMiniBatch';
import type { MessageView as MessageDto } from '@/types/social';
import { cn } from '@/lib/utils';
import { ChannelSidebar } from '@/features/global-chat/components/ChannelSidebar';
import { SelectedCategoryPanel, SelectedCategoryScrollHelpers } from '@/features/global-chat/components/SelectedCategoryPanel';
import { CategoryCreateDialog, CategoryCreatePayload } from '@/features/global-chat/components/CategoryCreateDialog';
import { CategoryEditDialog, CategoryEditPayload } from '@/features/global-chat/components/CategoryEditDialog';
import { useChatMessageNavigation } from '@/features/global-chat/hooks/useChatMessageNavigation';
import { ChatMobileToggle } from '@/features/global-chat/components/ChatMobileToggle';
import { MobileChannelDrawer } from '@/features/global-chat/components/MobileChannelDrawer';

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
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>(selectedCategory ? 'chat' : 'channels');
  const manualMobileToggleRef = useRef(false);

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

  const scrollHelpersRef = useRef<SelectedCategoryScrollHelpers | null>(null);

  const { registerMessageNode, handleJumpToMessage } = useChatMessageNavigation({
    messages,
    hasMore,
    loadOlderMessages,
    highlightedMessageId,
    setHighlightedMessageId,
    ensureMessageVisible: async messageId => {
      const helpers = scrollHelpersRef.current;
      if (!helpers) {
        return false;
      }
      const index = messages.findIndex(message => message.id === messageId);
      if (index === -1) {
        return false;
      }
      helpers.scrollToIndex(index, 'center');
      return true;
    },
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

  useEffect(() => {
    if (!selectedCategory) {
      setMobileView('channels');
      manualMobileToggleRef.current = false;
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory && !manualMobileToggleRef.current) {
      setMobileView('chat');
    }
  }, [selectedCategory]);

  const resolveReplyPreview = useCallback(
    (message: MessageDto) => {
      if (!message.replyToMessageId) return null;
      const referenced = messages.find(m => m.id === message.replyToMessageId);
      return referenced || null;
    },
    [messages]
  );

  const handleSelectCategory = useCallback((categoryId: number) => {
    selectCategory(categoryId);
    setMobileView('chat');
    manualMobileToggleRef.current = true;
  }, [selectCategory]);

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

  const handleShowChannels = useCallback(() => {
    setMobileView('channels');
    manualMobileToggleRef.current = true;
  }, []);

  const handleShowChat = useCallback(() => {
    if (!hasSelectedCategory) return;
    setMobileView('chat');
    manualMobileToggleRef.current = true;
  }, [hasSelectedCategory]);

  const handleScrollHelpersChange = useCallback((helpers: SelectedCategoryScrollHelpers | null) => {
    scrollHelpersRef.current = helpers;
  }, []);

  const showChannelSidebar = mobileView === 'channels';
  const showChatPanel = mobileView === 'chat';

  return (
    <div className="h-[calc(100vh-88px)] flex flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0 flex-col gap-3 overflow-hidden px-4 pt-1 pb-[2px] sm:px-6 sm:pt-1.5 sm:pb-[2px] lg:px-10 lg:pt-2 lg:pb-[2px]">
        <div className="lg:hidden">
          <ChatMobileToggle
            showList={showChannelSidebar}
            showFeed={showChatPanel}
            hasSelectedCategory={hasSelectedCategory}
            onShowList={handleShowChannels}
            onShowFeed={handleShowChat}
          />
        </div>

        <div className="flex flex-1 min-h-0 flex-col gap-1 overflow-hidden">
          <div className="hidden lg:block">
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
              onSelectCategory={handleSelectCategory}
              onRefreshAll={refreshAll}
              onRefreshCategories={refreshCategories}
              onRefreshMessages={refreshMessages}
              onLoadOlderMessages={loadOlderMessages}
              onMarkSelectedCategoryRead={markSelectedCategoryRead}
              onOpenCreateCategory={() => setCreateDialogOpen(true)}
              onOpenEditCategory={() => setEditDialogOpen(true)}
            />
          </div>

          <div
            className={cn(
              'flex flex-1 min-h-0 flex-col overflow-hidden',
              !showChatPanel && 'hidden lg:flex',
              'lg:flex'
            )}
          >
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
              onScrollHelpersChange={handleScrollHelpersChange}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChannelSidebar && (
          <MobileChannelDrawer
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
            onSelectCategory={handleSelectCategory}
            onRefreshAll={refreshAll}
            onRefreshCategories={refreshCategories}
            onRefreshMessages={refreshMessages}
            onLoadOlderMessages={loadOlderMessages}
            onMarkSelectedCategoryRead={markSelectedCategoryRead}
            onOpenCreateCategory={() => setCreateDialogOpen(true)}
            onOpenEditCategory={() => setEditDialogOpen(true)}
            onClose={handleShowChat}
          />
        )}
      </AnimatePresence>

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
