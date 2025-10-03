import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import type {
  ConversationView as ConversationDto,
  MessageView as MessageDto,
  MessagePageView as MessagePageDto,
} from '@/types/social';

interface UseMessagingInboxOptions {
  pageSize?: number;
}

export interface UseMessagingInboxResult {
  conversations: ConversationDto[];
  selectedConversation: ConversationDto | null;
  messages: MessageDto[];
  hasMoreMessages: boolean;
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: unknown;
  selectConversation: (conversationId: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 30;

export function useMessagingInbox(options?: UseMessagingInboxOptions): UseMessagingInboxResult {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagePage, setMessagePage] = useState<MessagePageDto | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return conversations.find(conversation => conversation.id === selectedId) || null;
  }, [selectedId, conversations]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const data = await apiClient.listConversations(0, pageSize);
      setConversations(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
      setError(err);
    } finally {
      setLoadingConversations(false);
    }
  }, [pageSize, selectedId]);

  const loadMessages = useCallback(async (conversationId: string, params?: { before?: string }) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const page = await apiClient.getConversationMessages(conversationId, {
        before: params?.before,
        size: pageSize,
      });
      if (params?.before) {
        setMessages(prev => [...page.messages, ...prev]);
      } else {
        setMessages(page.messages);
      }
      setMessagePage(page);
      const lastMessage = page.messages[page.messages.length - 1];
      if (lastMessage) {
        try {
          await apiClient.markConversationRead(conversationId, lastMessage.id);
        } catch (err) {
          console.warn('Failed to mark conversation as read', err);
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
      setError(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [pageSize]);

  const selectConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setSelectedId(conversationId);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !messagePage?.hasMore || !messages.length) return;
    const oldestMessageId = messages[0].id;
    await loadMessages(selectedId, { before: oldestMessageId });
  }, [loadMessages, selectedId, messagePage?.hasMore, messages]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const message = await apiClient.sendConversationMessage(conversationId, trimmed);
      setMessages(prev => [...prev, message]);
      setMessagePage(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev);
      setConversations(prev => prev.map(conversation =>
        conversation.id === conversationId
          ? {
            ...conversation,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: 0,
          }
          : conversation
      ));
    } catch (err) {
      console.error('Failed to send message', err);
      setError(err);
      throw err;
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadConversations();
    if (selectedId) {
      await loadMessages(selectedId);
    }
  }, [loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  return {
    conversations,
    selectedConversation,
    messages,
    hasMoreMessages: !!messagePage?.hasMore,
    loadingConversations,
    loadingMessages,
    error,
    selectConversation,
    refresh,
    loadOlderMessages,
    sendMessage,
  };
}

export default useMessagingInbox;
