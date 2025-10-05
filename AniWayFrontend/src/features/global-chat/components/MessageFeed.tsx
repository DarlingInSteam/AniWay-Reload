import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CornerDownLeft, Loader2, Undo2 } from 'lucide-react';
import type { MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { buildProfileSlug } from '@/utils/profileSlug';
import { getUserDisplay, initials, isSameCalendarDay } from '../utils/messageHelpers';

interface MessageFeedProps {
  messages: MessageDto[];
  users: Record<number, UserMini>;
  currentUserId?: number | null;
  highlightedMessageId: string | null;
  hasMore: boolean;
  loadingMessages: boolean;
  dayFormatter: Intl.DateTimeFormat;
  timeFormatter: Intl.DateTimeFormat;
  registerMessageNode: (messageId: string, node: HTMLDivElement | null) => void;
  onLoadOlderMessages: () => Promise<void>;
  onJumpToMessage: (messageId: string) => Promise<void>;
  onReply: (message: MessageDto) => void;
  resolveReplyPreview: (message: MessageDto) => MessageDto | null;
}

export function MessageFeed({
  messages,
  users,
  currentUserId,
  highlightedMessageId,
  hasMore,
  loadingMessages,
  dayFormatter,
  timeFormatter,
  registerMessageNode,
  onLoadOlderMessages,
  onJumpToMessage,
  onReply,
  resolveReplyPreview,
}: MessageFeedProps) {
  const replySnippets = useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach(message => {
      if (!message.id) return;
      const content = message.content
        .replace(/[`*_>#~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      map.set(message.id, content.slice(0, 140));
    });
    return map;
  }, [messages]);

  if (loadingMessages && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/50">
        <CornerDownLeft className="h-6 w-6 rotate-90 text-white/35" />
        <p>Здесь пока тихо. Начните обсуждение первым.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-3">
      {hasMore && (
        <button
          type="button"
          onClick={onLoadOlderMessages}
          disabled={loadingMessages}
          className="mx-auto flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-white/60 transition hover:border-white/25 hover:text-white disabled:pointer-events-none disabled:opacity-50"
        >
          {loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
          Ранние сообщения
        </button>
      )}

      {messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : null;
        const author = getUserDisplay(users, message.senderId, currentUserId);
        const replyTarget = resolveReplyPreview(message);
        const isOwn = currentUserId === message.senderId;
        const isHighlighted = highlightedMessageId === message.id;
        const profileSlug = buildProfileSlug(
          message.senderId,
          users[message.senderId]?.displayName || users[message.senderId]?.username || author
        );
        const messageDate = new Date(message.createdAt);
        const previousDate = previous ? new Date(previous.createdAt) : null;
        const showDateSeparator = !previousDate || !isSameCalendarDay(messageDate, previousDate);
        const spacingClass = index === 0 ? 'mt-2' : 'mt-3';
        const replySnippet = replyTarget ? replySnippets.get(replyTarget.id) ?? '' : '';

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && (
              <div className="relative my-6 flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-white/30">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {dayFormatter.format(messageDate)}
                </span>
              </div>
            )}
            <div
              ref={node => registerMessageNode(message.id, node)}
              className={cn('group flex w-full px-1', isOwn ? 'justify-end' : 'justify-start', spacingClass)}
            >
              <div
                className={cn(
                  'flex max-w-[760px] items-start gap-3',
                  isOwn ? 'flex-row-reverse text-right' : 'text-left'
                )}
              >
                <Link
                  to={`/profile/${profileSlug}`}
                  className="flex-shrink-0"
                  title={author}
                >
                  <Avatar className={cn('h-8 w-8 border border-white/15 bg-black/60 text-[11px] transition hover:border-primary/60', isOwn && 'ml-1')}>
                    {users[message.senderId]?.avatar ? (
                      <AvatarImage src={users[message.senderId]?.avatar} alt={author} />
                    ) : (
                      <AvatarFallback>{initials(author)}</AvatarFallback>
                    )}
                  </Avatar>
                </Link>
                <div className={cn('flex min-w-0 flex-1 flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45',
                      isOwn && 'flex-row-reverse text-right'
                    )}
                  >
                    {isOwn ? (
                      <span className="font-semibold text-white">Вы</span>
                    ) : (
                      <Link
                        to={`/profile/${profileSlug}`}
                        className="font-semibold text-white transition hover:text-primary"
                      >
                        {author}
                      </Link>
                    )}
                    <span className="text-white/35">{timeFormatter.format(messageDate)}</span>
                  </div>

                  {replyTarget ? (
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 text-xs text-white/60 transition hover:text-white',
                        isOwn && 'justify-end'
                      )}
                      onClick={() => onJumpToMessage(replyTarget.id)}
                    >
                      <span className="text-white/45">↩</span>
                      <span className="truncate text-left">
                        {getUserDisplay(users, replyTarget.senderId, currentUserId)}: {replySnippet || 'Сообщение'}
                      </span>
                    </button>
                  ) : message.replyToMessageId ? (
                    <div className={cn('flex items-center gap-2 text-xs text-white/50', isOwn && 'justify-end')}>
                      <span className="text-white/40">↩</span>
                      <span>Ответ на сообщение из архива.</span>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => onJumpToMessage(message.replyToMessageId!)}
                          className="rounded-full border border-white/10 px-2 py-[2px] text-[10px] uppercase tracking-[0.25em] text-white/60 transition hover:border-white/30 hover:text-white"
                        >
                          Найти
                        </button>
                      )}
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'glass-panel w-full px-4 py-3 text-sm leading-relaxed text-white/85 transition',
                      isOwn ? 'border-primary/30 bg-primary/20 text-white' : 'border-white/15 bg-white/10 text-white/90',
                      isHighlighted && 'ring-2 ring-primary/60'
                    )}
                  >
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                      <MarkdownRenderer value={message.content} />
                    </div>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-3 text-[11px] text-white/40 opacity-0 transition group-hover:opacity-100',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-white/50 transition hover:text-white"
                      onClick={() => {
                        onReply(message);
                        onJumpToMessage(message.id);
                      }}
                    >
                      <CornerDownLeft className="h-3 w-3" />
                      Ответить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
