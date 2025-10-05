import React from 'react';
import { Link } from 'react-router-dom';
import { CornerDownLeft, Loader2, Reply, Undo2 } from 'lucide-react';
import type { MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { buildProfileSlug } from '@/utils/profileSlug';
import { getUserDisplay, initials, isSameCalendarDay, minutesBetween } from '../utils/messageHelpers';

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
  if (loadingMessages && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="glass-panel mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-sm text-white/60">
        <CornerDownLeft className="h-6 w-6 rotate-90 text-white/40" />
        <p>Будьте первыми, кто напишет в этом канале!</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3">
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadOlderMessages}
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
        const author = getUserDisplay(users, message.senderId, currentUserId);
        const replyTarget = resolveReplyPreview(message);
        const isOwn = currentUserId === message.senderId;
        const isHighlighted = highlightedMessageId === message.id;
        const isReplyToYou = !!replyTarget && replyTarget.senderId === currentUserId;
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
              ref={node => registerMessageNode(message.id, node)}
              className={cn('group flex items-end gap-3', isOwn ? 'justify-end' : 'justify-start', spacingClass)}
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
              <div className={cn('flex min-w-0 max-w-[900px] flex-col gap-1', isOwn ? 'items-end text-right' : 'items-start')}>
                {startsNewGroup && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    {isOwn ? (
                      <span className="font-semibold text-primary">Вы</span>
                    ) : (
                      <Link to={`/profile/${profileSlug}`} className="font-semibold text-primary transition hover:text-primary/80">
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
                      onClick={() => onJumpToMessage(replyTarget.id)}
                    >
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                        <Reply className="h-3 w-3" /> Ответ для {getUserDisplay(users, replyTarget.senderId, currentUserId)}
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
                          onClick={() => onJumpToMessage(message.replyToMessageId!)}
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
                      onReply(message);
                      onJumpToMessage(message.id);
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
  );
}
