import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CategoryView, MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
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
  isAuthenticated: boolean;
  registerMessageNode: (messageId: string, node: HTMLDivElement | null) => void;
  resolveReplyPreview: (message: MessageDto) => MessageDto | null;
  onJumpToMessage: (messageId: string) => Promise<void>;
  onLoadOlderMessages: () => Promise<void>;
  onReplyToMessage: (message: MessageDto | null) => void;
  onSendMessage: (content: string) => Promise<void>;
  onCancelReply: () => void;
  className?: string;
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
  isAuthenticated,
  registerMessageNode,
  resolveReplyPreview,
  onJumpToMessage,
  onLoadOlderMessages,
  onReplyToMessage,
  onSendMessage,
  onCancelReply,
  className,
}: SelectedCategoryPanelProps) {
  const hasCategory = Boolean(category);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<number, number>>({});
  const motionControls = useAnimation();

  useEffect(() => {
    if (!category) return;
    motionControls.set({ opacity: 0, y: 8 });
    void motionControls.start({ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } });
  }, [category?.id, motionControls]);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node || !category?.id) {
      return;
    }

    const handleScroll = () => {
      scrollPositionsRef.current[category.id] = node.scrollTop;
    };

    node.addEventListener('scroll', handleScroll);
    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [category?.id]);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    if (!category?.id) {
      node.scrollTop = 0;
      return;
    }

    const stored = scrollPositionsRef.current[category.id];
    if (typeof stored === 'number') {
      node.scrollTop = stored;
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, [category?.id]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      {hasCategory && category ? (
        <>
          <motion.div
            ref={scrollContainerRef}
            animate={motionControls}
            initial={false}
            className="flex-1 min-h-0 overflow-y-auto px-2 pt-2 sm:px-4 lg:px-6 scrollbar-thin"
          >
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
          </motion.div>
          <div className="mt-1 w-full shrink-0 px-2 pb-0.5 sm:px-4 sm:pb-1 lg:px-6 lg:pb-2">
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
    </div>
  );
}
