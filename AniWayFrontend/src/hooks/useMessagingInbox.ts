import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ConversationView as ConversationDto,
  MessageView as MessageDto,
  MessagePageView as MessagePageDto,
} from '@/types/social';

interface UseMessagingInboxOptions {
  pageSize?: number;
  conversationRefreshIntervalMs?: number;
  messageRefreshIntervalMs?: number;
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
  addConversation: (conversation: ConversationDto) => void;
  refresh: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, replyToMessageId?: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 30;
const DEFAULT_CONVERSATION_REFRESH = 45000;
const DEFAULT_MESSAGE_REFRESH = 5000;

export function useMessagingInbox(options?: UseMessagingInboxOptions): UseMessagingInboxResult {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const conversationRefreshInterval = options?.conversationRefreshIntervalMs ?? DEFAULT_CONVERSATION_REFRESH;
  const messageRefreshInterval = options?.messageRefreshIntervalMs ?? DEFAULT_MESSAGE_REFRESH;
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagePage, setMessagePage] = useState<MessagePageDto | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const queryClient = useQueryClient();
  const selectedIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MessageDto[]>([]);
  const conversationIntervalRef = useRef<number | null>(null);
  const messageIntervalRef = useRef<number | null>(null);

  const markConversationRead = useCallback(async (conversationId: string, lastMessageId: string) => {
    try {
      await apiClient.markConversationRead(conversationId, lastMessageId);
      setConversations(prev => prev.map(conversation =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0, lastMessageAt: conversation.lastMessageAt }
          : conversation
      ));
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] }).catch(() => {});
    } catch (err) {
      console.warn('Failed to mark conversation as read', err);
    }
  }, [queryClient]);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return conversations.find(conversation => conversation.id === selectedId) || null;
  }, [selectedId, conversations]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  useEffect(() => {
    if (conversationIntervalRef.current) {
      window.clearInterval(conversationIntervalRef.current);
      conversationIntervalRef.current = null;
    }
    if (conversationRefreshInterval <= 0) {
      return () => {};
    }
    conversationIntervalRef.current = window.setInterval(() => {
      loadConversations().catch(() => {});
    }, conversationRefreshInterval);
    return () => {
      if (conversationIntervalRef.current) {
        window.clearInterval(conversationIntervalRef.current);
        conversationIntervalRef.current = null;
      }
    };
  }, [conversationRefreshInterval, loadConversations]);

  const loadMessages = useCallback(async (conversationId: string, params?: { before?: string; after?: string }) => {
    if (!params?.after) {
      setLoadingMessages(true);
    }
    setError(null);
    try {
      const page = await apiClient.getConversationMessages(conversationId, {
        before: params?.before,
        after: params?.after,
        size: pageSize,
      });
      setMessages(prev => {
        if (!params?.before && !params?.after) {
          messagesRef.current = [...page.messages];
          return [...page.messages];
        }
        if (params?.before) {
          const existingIds = new Set(prev.map(message => message.id));
          const filtered = page.messages.filter(message => !existingIds.has(message.id));
          const merged = [...filtered, ...prev];
          messagesRef.current = merged;
          return merged;
        }
        if (params?.after) {
          const existingIds = new Set(prev.map(message => message.id));
          const filtered = page.messages.filter(message => !existingIds.has(message.id));
          if (filtered.length === 0) {
            return prev;
          }
          const merged = [...prev, ...filtered];
          messagesRef.current = merged;
          return merged;
        }
        return prev;
      });
      setMessagePage(prev => {
        if (!prev || (!params?.before && !params?.after)) {
          return page;
        }
        if (params?.before) {
          const existingIds = new Set((prev.messages ?? []).map(message => message.id));
          const filtered = page.messages.filter(message => !existingIds.has(message.id));
          return {
            ...prev,
            hasMore: page.hasMore,
            nextCursor: page.nextCursor,
            messages: [...filtered, ...prev.messages],
          };
        }
        if (params?.after) {
          const existingIds = new Set((prev.messages ?? []).map(message => message.id));
          const filtered = page.messages.filter(message => !existingIds.has(message.id));
          return {
            ...prev,
            messages: [...prev.messages, ...filtered],
          };
        }
        return prev;
      });
      if (!params?.before && page.messages.length > 0) {
        const lastLoadedMessage = page.messages[page.messages.length - 1];
        setConversations(prev => prev.map(conversation =>
          conversation.id === conversationId
            ? { ...conversation, lastMessage: lastLoadedMessage, lastMessageAt: lastLoadedMessage.createdAt, unreadCount: 0 }
            : conversation
        ));
      }
      if (!params?.before && page.messages.length > 0) {
        const lastMessage = page.messages[page.messages.length - 1];
        await markConversationRead(conversationId, lastMessage.id);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
      setError(err);
    } finally {
      if (!params?.after) {
        setLoadingMessages(false);
      }
    }
  }, [pageSize, markConversationRead]);

  useEffect(() => {
    if (messageIntervalRef.current) {
      window.clearInterval(messageIntervalRef.current);
      messageIntervalRef.current = null;
    }
    if (!selectedId || messageRefreshInterval <= 0) {
      return () => {};
    }
    messageIntervalRef.current = window.setInterval(() => {
      const active = selectedIdRef.current;
      if (!active) return;
      const currentMessages = messagesRef.current;
      const lastMessageId = currentMessages[currentMessages.length - 1]?.id;
      if (lastMessageId) {
        loadMessages(active, { after: lastMessageId }).catch(() => {});
      } else {
        loadMessages(active).catch(() => {});
      }
    }, messageRefreshInterval);
    return () => {
      if (messageIntervalRef.current) {
        window.clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
    };
  }, [selectedId, messageRefreshInterval, loadMessages]);

  const selectConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setSelectedId(conversationId);
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !messagePage?.hasMore || !messages.length) return;
    const oldestMessageId = messages[0].id;
    await loadMessages(selectedId, { before: oldestMessageId });
  }, [loadMessages, selectedId, messagePage?.hasMore, messages]);

  const sendMessage = useCallback(async (conversationId: string, content: string, replyToMessageId?: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      const message = await apiClient.sendConversationMessage(conversationId, trimmed, replyToMessageId);
      setMessages(prev => {
        const next = [...prev, message];
        messagesRef.current = next;
        return next;
      });
      setMessagePage(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev);
      setConversations(prev => {
        // Обновляем существующий диалог
        return prev.map(conversation =>
          conversation.id === conversationId
            ? {
              ...conversation,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: 0,
            }
            : conversation
        );
      });
      await markConversationRead(conversationId, message.id);
    } catch (err) {
      console.error('Failed to send message', err);
      setError(err);
      throw err;
    }
  }, [markConversationRead]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setError(null);
    try {
      await apiClient.deleteConversation(conversationId);

      let removedSelected = false;
      let fallbackId: string | null = null;

      setConversations(prev => {
        const filtered = prev.filter(conversation => conversation.id !== conversationId);
        if (selectedIdRef.current === conversationId) {
          removedSelected = true;
          fallbackId = filtered[0]?.id ?? null;
        }
        return filtered;
      });

      if (removedSelected) {
        setMessages([]);
        messagesRef.current = [];
        setMessagePage(null);
        setSelectedId(fallbackId ?? null);
      }

      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] }).catch(() => {});
    } catch (err) {
      console.error('Failed to delete conversation', err);
      setError(err);
      throw err;
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await loadConversations();
    if (selectedId) {
      await loadMessages(selectedId);
    }
  }, [loadConversations, loadMessages, selectedId]);

  const addConversation = useCallback((conversation: ConversationDto) => {
    setConversations(prev => {
      // Проверяем, не существует ли уже
      const exists = prev.some(c => c.id === conversation.id);
      if (exists) {
        return prev;
      }
      // Добавляем в начало списка
      return [conversation, ...prev];
    });
  }, []);

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
    addConversation,
    refresh,
    loadOlderMessages,
    sendMessage,
    deleteConversation,
  };
}

export default useMessagingInbox;
