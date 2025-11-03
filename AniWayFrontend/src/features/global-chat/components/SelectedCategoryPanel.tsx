import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CategoryView, MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { MessageFeed } from './MessageFeed';
import { MessageComposer } from './MessageComposer';
import { NoCategorySelected } from './NoCategorySelected';
import { ArrowDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

type ScrollAlignment = 'start' | 'center' | 'end' | 'auto';

export interface SelectedCategoryScrollHelpers {
  scrollToIndex: (index: number, align?: ScrollAlignment) => void;
}

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
  onScrollHelpersChange?: (helpers: SelectedCategoryScrollHelpers | null) => void;
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
  onScrollHelpersChange,
  className,
}: SelectedCategoryPanelProps) {
  const hasCategory = Boolean(category);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<number, number>>({});
  const motionControls = useAnimation();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldStickToBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 160,
    overscan: 8,
  });

  const handleRegisterMessageNode = useCallback((messageId: string, node: HTMLDivElement | null) => {
    registerMessageNode(messageId, node);
    if (node) {
      virtualizer.measureElement(node);
    }
  }, [registerMessageNode, virtualizer]);

  const scrollToIndex = useCallback((index: number, align: ScrollAlignment = 'auto') => {
    if (messages.length === 0) return;
    const clamped = Math.min(Math.max(index, 0), messages.length - 1);
    virtualizer.scrollToIndex(clamped, { align });
  }, [messages.length, virtualizer]);

  useEffect(() => {
    onScrollHelpersChange?.({ scrollToIndex });
    return () => {
      onScrollHelpersChange?.(null);
    };
  }, [onScrollHelpersChange, scrollToIndex]);

  const evaluateScrollPosition = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const { scrollTop, scrollHeight, clientHeight } = node;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const atBottom = distanceFromBottom < 96;
    shouldStickToBottomRef.current = atBottom;
    setShowScrollToBottom(prev => {
      if (atBottom) {
        return prev ? false : prev;
      }
      return prev ? prev : true;
    });
  }, []);

  const scrollToLatest = useCallback(() => {
    if (messages.length === 0) return;
    shouldStickToBottomRef.current = true;
    scrollToIndex(messages.length - 1, 'end');
    requestAnimationFrame(evaluateScrollPosition);
  }, [evaluateScrollPosition, messages.length, scrollToIndex]);

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
      evaluateScrollPosition();
    };

    handleScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [category?.id, evaluateScrollPosition]);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    if (!category?.id) {
      node.scrollTop = 0;
      shouldStickToBottomRef.current = true;
      setShowScrollToBottom(false);
      virtualizer.scrollToOffset(0, { align: 'start' });
      return;
    }

    const stored = scrollPositionsRef.current[category.id];
    if (typeof stored === 'number') {
      node.scrollTop = stored;
      virtualizer.scrollToOffset(stored, { align: 'start' });
    } else {
      scrollToIndex(messages.length - 1, 'end');
    }
    requestAnimationFrame(evaluateScrollPosition);
  }, [category?.id, evaluateScrollPosition, messages.length, scrollToIndex, virtualizer]);

  useEffect(() => {
    if (!category?.id) {
      return;
    }
    const last = messages[messages.length - 1];
    if (!last) {
      shouldStickToBottomRef.current = true;
      setShowScrollToBottom(false);
      return;
    }
    const shouldAutoStick = shouldStickToBottomRef.current || last.senderId === currentUserId;
    if (shouldAutoStick) {
      requestAnimationFrame(() => {
        if (messages.length === 0) return;
        scrollToIndex(messages.length - 1, 'end');
        evaluateScrollPosition();
      });
    } else {
      setShowScrollToBottom(prev => (prev ? prev : true));
    }
  }, [messages, currentUserId, category?.id, evaluateScrollPosition, scrollToIndex]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      {hasCategory && category ? (
        <>
          <div className="relative flex-1 min-h-0">
            <motion.div
              ref={scrollContainerRef}
              animate={motionControls}
              initial={false}
              className="h-full overflow-y-auto px-2 pt-2 sm:px-4 lg:px-6 scrollbar-thin"
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
                virtualItems={virtualizer.getVirtualItems()}
                totalSize={virtualizer.getTotalSize()}
                registerMessageNode={handleRegisterMessageNode}
                onLoadOlderMessages={onLoadOlderMessages}
                onJumpToMessage={onJumpToMessage}
                onReply={message => onReplyToMessage(message)}
                resolveReplyPreview={resolveReplyPreview}
              />
            </motion.div>
            {showScrollToBottom && messages.length > 0 && (
              <button
                type="button"
                onClick={scrollToLatest}
                aria-label="Прокрутить вниз"
                className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-primary/80 text-white shadow-lg transition hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/60"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mt-0.5 w-full shrink-0 px-2 pb-0 sm:px-4 sm:pb-0 lg:px-6 lg:pb-0">
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
