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
              className={cn('group flex w-full gap-3 px-1', isOwn ? 'justify-end' : 'justify-start', spacingClass)}
            >
              {!isOwn && (
                <div className="flex min-w-[28px] justify-center">
                  <Link
                    to={`/profile/${profileSlug}`}
                    className={cn('transition', showAvatar ? 'opacity-100' : 'pointer-events-none opacity-0')}
                    title={author}
                  >
                    <Avatar className="h-5 w-5 border border-white/15 bg-black/60 text-[10px] transition hover:border-primary/50">
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
                      <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-red-100">
                        Ответ вам
                      </span>
                    )}
                  </div>
                )}
                {replyTarget ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-xs text-white/60 transition hover:text-white"
                    onClick={() => onJumpToMessage(replyTarget.id)}
                  >
                    <span className="text-white/50">↩</span>
                    <span className="truncate text-left">
                      {getUserDisplay(users, replyTarget.senderId, currentUserId)}: {replySnippet || 'Сообщение'}
                    </span>
                  </button>
                ) : message.replyToMessageId ? (
                  <div className="flex items-center gap-2 text-xs text-white/50">
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
                    'relative w-full text-sm leading-relaxed text-white/80',
                    isHighlighted && 'rounded-xl bg-white/10 px-3 py-2 shadow-[0_0_0_1px_rgba(148,163,184,0.15)]'
                  )}
                >
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                    <MarkdownRenderer value={message.content} />
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-white/40 opacity-0 transition group-hover:opacity-100">
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
          </React.Fragment>
        );
      })}
    </div>
  );
}
