import { useCallback, useRef, useState } from 'react';
import type { MessageView as MessageDto } from '@/types/social';
import type { UserMini } from '@/hooks/useUserMiniBatch';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { getUserDisplay } from '../utils/messageHelpers';
import { toast } from 'sonner';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MarkdownMiniToolbar } from '@/components/markdown/MarkdownMiniToolbar';

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

  const wrapSelection = useCallback(
    (before: string, after: string = before) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setMessageText(prev => prev + before + after);
        return;
      }
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const selected = messageText.substring(start, end);
      const nextValue = messageText.slice(0, start) + before + selected + after + messageText.slice(end);
      setMessageText(nextValue);
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [messageText]
  );

  const applyMarkdownCommand = useCallback(
    (cmd: string) => {
      switch (cmd) {
        case 'bold':
          return wrapSelection('**', '**');
        case 'italic':
          return wrapSelection('*', '*');
        case 'strike':
          return wrapSelection('~~', '~~');
        case 'code':
          return wrapSelection('`', '`');
        case 'spoiler':
          return wrapSelection('>!', '!<');
        case 'link':
          return wrapSelection('[', '](url)');
        case 'spark':
          return wrapSelection('**✨', '✨**');
        case 'h1':
          return wrapSelection('\n# ', '');
        case 'h2':
          return wrapSelection('\n## ', '');
        case 'quote':
          return wrapSelection('\n> ', '');
        case 'ul':
          return wrapSelection('\n- ', '');
        case 'ol':
          return wrapSelection('\n1. ', '');
        case 'hr': {
          setMessageText(prev => {
            const base = prev.endsWith('\n') ? prev : `${prev}\n`;
            const next = `${base}\n---\n`;
            requestAnimationFrame(() => {
              if (!textareaRef.current) return;
              const pos = next.length;
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(pos, pos);
            });
            return next;
          });
          return;
        }
        default:
          return;
      }
    },
    [wrapSelection]
  );

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

  return (
    <GlassPanel padding="none" className="w-full rounded-2xl border-white/10 bg-white/5 px-3 py-2">
      <div className="space-y-2">
      {replyTo && (
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <span className="mt-[2px] text-white/50">↩</span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
                <span>Ответ {getUserDisplay(users, replyTo.senderId, currentUserId)}</span>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="tracking-normal text-white/50 transition hover:text-white"
                >
                  Очистить
                </button>
              </div>
              <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-left text-sm text-white/70">
                <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body line-clamp-3">
                  <MarkdownRenderer value={replyTo.content} />
                </div>
              </div>
            </div>
        </div>
      )}

      {outgoingError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {outgoingError}
        </div>
      )}

        <MarkdownMiniToolbar onCommand={applyMarkdownCommand} className="text-white/80" />

        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-2 py-1.5">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={event => setMessageText(event.target.value)}
              onKeyDown={handleEnterSend}
              placeholder={
                isAuthenticated ? 'Напишите сообщение…' : 'Авторизуйтесь, чтобы писать в глобальный чат'
              }
              disabled={!isAuthenticated || loadingMessages}
              className="min-h-[72px] w-full resize-none border-none bg-transparent px-1 py-1 text-sm text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!isAuthenticated || loadingMessages || !messageText.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full bg-primary/80 text-lg font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 transform translate-y-[1px]"
          >
            ▶
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
