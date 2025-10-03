import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { CategoryView, CreateCategoryPayload, MessagePageView as MessagePageDto, MessageView as MessageDto, UpdateCategoryPayload } from '@/types/social';

interface UseGlobalChatOptions {
  pageSize?: number;
  includeArchived?: boolean;
  autoRefreshIntervalMs?: number;
}

interface UseGlobalChatResult {
  categories: CategoryView[];
  selectedCategoryId: number | null;
  selectedCategory: CategoryView | null;
  messages: MessageDto[];
  hasMore: boolean;
  loadingCategories: boolean;
  loadingMessages: boolean;
  error: unknown;
  replyTo: MessageDto | null;
  highlightedMessageId: string | null;
  selectCategory: (categoryId: number) => void;
  setReplyTo: (message: MessageDto | null) => void;
  setHighlightedMessageId: (messageId: string | null) => void;
  refreshCategories: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshAll: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<MessageDto | null>;
  markSelectedCategoryRead: () => Promise<void>;
  createCategory: (payload: CreateCategoryPayload) => Promise<CategoryView | null>;
  updateCategory: (categoryId: number, payload: UpdateCategoryPayload) => Promise<CategoryView | null>;
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_REFRESH_INTERVAL = 60000;

export function useGlobalChat(options?: UseGlobalChatOptions): UseGlobalChatResult {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const includeArchived = options?.includeArchived ?? false;
  const refreshInterval = options?.autoRefreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL;

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagePage, setMessagePage] = useState<MessagePageDto | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const selectedCategoryRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const sortCategories = useCallback((items: CategoryView[]) => {
    return [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, []);

  const selectedCategory = useMemo(() => {
    if (selectedCategoryId == null) return null;
    return categories.find(category => category.id === selectedCategoryId) ?? null;
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategoryId;
  }, [selectedCategoryId]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError(null);
    try {
      const data = await apiClient.listChatCategories(includeArchived);
      setCategories(sortCategories(data));
      setSelectedCategoryId(prev => {
        if (prev != null && data.some(category => category.id === prev)) {
          return prev;
        }
        const primary = data.find(category => category.isDefault && !category.isArchived)
          ?? data.find(category => !category.isArchived)
          ?? data[0]
          ?? null;
        return primary ? primary.id : null;
      });
    } catch (err) {
      console.error('Failed to load chat categories', err);
      setError(err);
    } finally {
      setLoadingCategories(false);
    }
  }, [includeArchived, sortCategories]);

  const markCategoryRead = useCallback(async (categoryId: number, lastMessageId: string) => {
    try {
      await apiClient.markCategoryRead(categoryId, lastMessageId);
      setCategories(prev => prev.map(category => (
        category.id === categoryId
          ? { ...category, unreadCount: 0 }
          : category
      )));
      queryClient.invalidateQueries({ queryKey: ['inbox-summary'] }).catch(() => {});
    } catch (err) {
      console.warn('Failed to mark category as read', err);
    }
  }, [queryClient]);

  const loadMessages = useCallback(async (categoryId: number, params?: { before?: string; after?: string }) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const page = await apiClient.getCategoryMessages(categoryId, {
        before: params?.before,
        after: params?.after,
        size: pageSize,
      });
      const isCurrentCategory = selectedCategoryRef.current === categoryId;
      if (!isCurrentCategory) {
        return;
      }
      const isBefore = Boolean(params?.before);
      const isAfter = Boolean(params?.after);
      setMessagePage(page);
      setMessages(prev => {
        if (isBefore) {
          return [...page.messages, ...prev];
        }
        if (isAfter) {
          return [...prev, ...page.messages];
        }
        return [...page.messages];
      });
      const lastMessage = page.messages[page.messages.length - 1];
      if (!isBefore && !isAfter && lastMessage && selectedCategoryRef.current === categoryId) {
        await markCategoryRead(categoryId, lastMessage.id);
      }
    } catch (err) {
      console.error('Failed to load chat messages', err);
      setError(err);
    } finally {
      setLoadingMessages(false);
    }
  }, [pageSize, markCategoryRead]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedCategoryId || !messagePage?.hasMore || messages.length === 0) return;
    const oldestMessageId = messages[0].id;
    await loadMessages(selectedCategoryId, { before: oldestMessageId });
  }, [selectedCategoryId, messagePage?.hasMore, messages, loadMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedCategoryId) return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    try {
      const message = await apiClient.sendCategoryMessage(selectedCategoryId, trimmed, replyTo?.id);
      setMessages(prev => [...prev, message]);
      setMessagePage(prev => prev ? { ...prev, messages: [...prev.messages, message] } : { messages: [message], hasMore: false, nextCursor: null });
      setReplyTo(null);
      await markCategoryRead(selectedCategoryId, message.id);
      return message;
    } catch (err) {
      console.error('Failed to send chat message', err);
      setError(err);
      throw err;
    }
  }, [selectedCategoryId, replyTo?.id, markCategoryRead]);

  const refreshCategories = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  const refreshMessages = useCallback(async () => {
    if (selectedCategoryId) {
      await loadMessages(selectedCategoryId);
    }
  }, [selectedCategoryId, loadMessages]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCategories(), refreshMessages()]);
  }, [refreshCategories, refreshMessages]);

  const markSelectedCategoryRead = useCallback(async () => {
    if (!selectedCategoryId || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    await markCategoryRead(selectedCategoryId, lastMessage.id);
  }, [markCategoryRead, messages, selectedCategoryId]);

  const createCategory = useCallback(async (payload: CreateCategoryPayload) => {
    try {
      const created = await apiClient.createChatCategory(payload);
      setSelectedCategoryId(created.id);
      await loadCategories();
      return created;
    } catch (err) {
      console.error('Failed to create chat category', err);
      setError(err);
      throw err;
    }
  }, [loadCategories]);

  const updateCategory = useCallback(async (categoryId: number, payload: UpdateCategoryPayload) => {
    try {
      const updated = await apiClient.updateChatCategory(categoryId, payload);
      const nextSelected = updated.isArchived ? null : updated.id;
      setSelectedCategoryId(nextSelected);
      await loadCategories();
      return updated;
    } catch (err) {
      console.error('Failed to update chat category', err);
      setError(err);
      throw err;
    }
  }, [loadCategories]);

  const selectCategory = useCallback((categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setReplyTo(null);
    setHighlightedMessageId(null);
  }, []);

  const setReplyToMessage = useCallback((message: MessageDto | null) => {
    setReplyTo(message);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (refreshInterval > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        loadCategories();
      }, refreshInterval);
    }
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadCategories, refreshInterval]);

  useEffect(() => {
    if (selectedCategoryId != null) {
      loadMessages(selectedCategoryId);
    } else {
      setMessages([]);
      setMessagePage(null);
    }
  }, [selectedCategoryId, loadMessages]);

  return {
    categories,
    selectedCategoryId,
    selectedCategory,
    messages,
    hasMore: Boolean(messagePage?.hasMore),
    loadingCategories,
    loadingMessages,
    error,
    replyTo,
    highlightedMessageId,
    selectCategory,
    setReplyTo: setReplyToMessage,
    setHighlightedMessageId,
    refreshCategories,
    refreshMessages,
    refreshAll,
    loadOlderMessages,
    sendMessage,
    markSelectedCategoryRead,
    createCategory,
    updateCategory,
  };
}

export default useGlobalChat;
