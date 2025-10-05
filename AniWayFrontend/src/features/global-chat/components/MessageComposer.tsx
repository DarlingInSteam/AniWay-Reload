import { useCallback, useRef, useState } from 'react';
import { MessageSquare, Reply } from 'lucide-react';
import type { MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmojiPickerButton } from '@/components/chat/EmojiPickerButton';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { getUserDisplay } from '../utils/messageHelpers';
import { toast } from 'sonner';

interface MessageComposerProps {
  replyTo: MessageDto | null;
  users: Record<number, UserMini>;
  currentUserId?: number | null;
  isAuthenticated: boolean;
  loadingMessages: boolean;
  onCancelReply: () => void;
  onSendMessage: (content: string) => Promise<void>;
}

export function MessageComposer({
  replyTo,
  users,
  currentUserId,
  isAuthenticated,
  loadingMessages,
  onCancelReply,
  onSendMessage,
}: MessageComposerProps) {
  const [messageText, setMessageText] = useState('');
  const [outgoingError, setOutgoingError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = useCallback(async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !isAuthenticated || loadingMessages) {
      return;
    }
    setOutgoingError(null);
    try {
      await onSendMessage(trimmed);
      setMessageText('');
    } catch (err: any) {
      const message = err?.message || 'Не удалось отправить сообщение';
      setOutgoingError(message);
      toast.error(message);
    }
  }, [isAuthenticated, loadingMessages, messageText, onSendMessage]);

  const handleEnterSend = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current;
      const currentValue = messageText;
      if (!textarea) {
        setMessageText(prev => prev + emoji);
        return;
      }
      const start = textarea.selectionStart ?? currentValue.length;
      const end = textarea.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;
      setMessageText(nextValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + emoji.length;
        textarea.setSelectionRange(caret, caret);
      });
    },
    [messageText]
  );

  return (
    <div className="space-y-3">
      {replyTo && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
              <Reply className="h-3 w-3" /> Ответ пользователю {getUserDisplay(users, replyTo.senderId, currentUserId)}
            </p>
            <button type="button" onClick={onCancelReply} className="text-xs text-white/50 transition hover:text-white">
              Очистить
            </button>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/5 bg-white/5 p-2">
            <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
              <MarkdownRenderer value={replyTo.content} />
            </div>
          </div>
        </div>
      )}

      {outgoingError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          {outgoingError}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 px-1 py-1">
        <Textarea
          ref={textareaRef}
          value={messageText}
          onChange={event => setMessageText(event.target.value)}
          onKeyDown={handleEnterSend}
          placeholder={isAuthenticated ? 'Напишите сообщение для сообщества…' : 'Авторизуйтесь, чтобы писать в глобальный чат'}
          disabled={!isAuthenticated || loadingMessages}
          className="min-h-[120px] resize-none border-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <EmojiPickerButton onEmojiSelect={handleInsertEmoji} disabled={!isAuthenticated || loadingMessages} anchorClassName="h-9 w-9" />
          <span>
            Нажмите <kbd className="rounded bg-white/10 px-1 py-0.5">Ctrl</kbd> + <kbd className="rounded bg-white/10 px-1 py-0.5">Enter</kbd>, чтобы отправить быстро.
          </span>
        </div>
        <Button
          onClick={handleSend}
          disabled={!isAuthenticated || loadingMessages || !messageText.trim()}
          className="min-w-[140px]"
        >
          <MessageSquare className="mr-2 h-4 w-4" /> Отправить
        </Button>
      </div>
    </div>
  );
}
