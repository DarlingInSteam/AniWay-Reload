import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';
import type { CategoryView, MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { CategoryHeader } from './CategoryHeader';
import { MessageFeed } from './MessageFeed';
import { MessageComposer } from './MessageComposer';
import { NoCategorySelected } from './NoCategorySelected';

interface SelectedCategoryPanelProps {
  category: CategoryView | null;
  messages: MessageDto[];
  users: Record<number, UserMini>;
  currentUserId?: number | null;
  highlightedMessageId: string | null;
  hasMore: boolean;
  loadingMessages: boolean;
  replyTo: MessageDto | null;
  dayFormatter: Intl.DateTimeFormat;
  timeFormatter: Intl.DateTimeFormat;
  isAdmin: boolean;
  isAuthenticated: boolean;
  registerMessageNode: (messageId: string, node: HTMLDivElement | null) => void;
  resolveReplyPreview: (message: MessageDto) => MessageDto | null;
  onJumpToMessage: (messageId: string) => Promise<void>;
  onLoadOlderMessages: () => Promise<void>;
  onRefreshMessages: () => void;
  onMarkSelectedCategoryRead: () => void;
  onOpenEditCategory: () => void;
  onReplyToMessage: (message: MessageDto | null) => void;
  onBackToList: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onCancelReply: () => void;
  className?: string;
  showBackButton: boolean;
}

export function SelectedCategoryPanel({
  category,
  messages,
  users,
  currentUserId,
  highlightedMessageId,
  hasMore,
  loadingMessages,
  replyTo,
  dayFormatter,
  timeFormatter,
  isAdmin,
  isAuthenticated,
  registerMessageNode,
  resolveReplyPreview,
  onJumpToMessage,
  onLoadOlderMessages,
  onRefreshMessages,
  onMarkSelectedCategoryRead,
  onOpenEditCategory,
  onReplyToMessage,
  onBackToList,
  onSendMessage,
  onCancelReply,
  className,
  showBackButton,
}: SelectedCategoryPanelProps) {
  const hasCategory = Boolean(category);

  return (
    <GlassPanel
      padding="none"
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      {hasCategory && category ? (
        <>
          <CategoryHeader
            category={category}
            hasMore={hasMore}
            loadingMessages={loadingMessages}
            onRefreshMessages={onRefreshMessages}
            onLoadOlderMessages={onLoadOlderMessages}
            onMarkSelectedCategoryRead={onMarkSelectedCategoryRead}
            isAdmin={isAdmin}
            onOpenEditCategory={onOpenEditCategory}
            onBackToList={onBackToList}
            showBackButton={showBackButton}
          />
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 scrollbar-thin">
            <MessageFeed
              messages={messages}
              users={users}
              currentUserId={currentUserId}
              highlightedMessageId={highlightedMessageId}
              hasMore={hasMore}
              loadingMessages={loadingMessages}
              dayFormatter={dayFormatter}
              timeFormatter={timeFormatter}
              registerMessageNode={registerMessageNode}
              onLoadOlderMessages={onLoadOlderMessages}
              onJumpToMessage={onJumpToMessage}
              onReply={message => onReplyToMessage(message)}
              resolveReplyPreview={resolveReplyPreview}
            />
          </div>
          <div className="border-t border-white/5 bg-white/5 px-6 py-5">
            <MessageComposer
              replyTo={replyTo}
              users={users}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              loadingMessages={loadingMessages}
              onCancelReply={onCancelReply}
              onSendMessage={onSendMessage}
            />
          </div>
        </>
      ) : (
        <NoCategorySelected />
      )}
    </GlassPanel>
  );
}
