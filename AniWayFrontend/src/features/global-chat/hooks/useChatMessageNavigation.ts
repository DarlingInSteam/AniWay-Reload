import { useCallback, useEffect, useRef } from 'react';
import type { MessageView as MessageDto } from '@/types/social';

interface UseChatMessageNavigationOptions {
  messages: MessageDto[];
  hasMore: boolean;
  loadOlderMessages: () => Promise<void>;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (messageId: string | null) => void;
  onMissingMessage?: (messageId: string) => void;
}

interface UseChatMessageNavigationResult {
  registerMessageNode: (messageId: string, node: HTMLDivElement | null) => void;
  handleJumpToMessage: (messageId: string) => Promise<void>;
}

export function useChatMessageNavigation(options: UseChatMessageNavigationOptions): UseChatMessageNavigationResult {
  const {
    messages,
    hasMore,
    loadOlderMessages,
    highlightedMessageId,
    setHighlightedMessageId,
    onMissingMessage,
  } = options;

  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollTargetRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const registerMessageNode = useCallback((messageId: string, node: HTMLDivElement | null) => {
    if (node) {
      messageRefs.current.set(messageId, node);
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  const handleJumpToMessage = useCallback(async (messageId: string) => {
    const node = messageRefs.current.get(messageId);
    if (node) {
      setHighlightedMessageId(messageId);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hasMore) {
      pendingScrollTargetRef.current = messageId;
      await loadOlderMessages();
      return;
    }

    onMissingMessage?.(messageId);
  }, [hasMore, loadOlderMessages, onMissingMessage, setHighlightedMessageId]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      lastMessageIdRef.current = null;
      return;
    }

    if (lastMessageIdRef.current !== lastMessage.id) {
      lastMessageIdRef.current = lastMessage.id;
      const node = messageRefs.current.get(lastMessage.id);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!pendingScrollTargetRef.current) return;
    const target = pendingScrollTargetRef.current;
    const node = messageRefs.current.get(target);
    if (node) {
      setHighlightedMessageId(target);
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pendingScrollTargetRef.current = null;
    }
  }, [messages, setHighlightedMessageId]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedMessageId, setHighlightedMessageId]);

  return {
    registerMessageNode,
    handleJumpToMessage,
  };
}

export type { UseChatMessageNavigationResult };
