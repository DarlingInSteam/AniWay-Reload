import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, fetchUnreadCount, markAllRead, markRead, openSse, NotificationItem } from './api';
import type { InboxSummaryView } from '@/types/social';

interface NotificationState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (ids: number[]) => Promise<void>;
  markAll: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const Ctx = createContext<NotificationState | undefined>(undefined);

interface ProviderProps {
  userId: number | null;
  token?: string | null;
  children: React.ReactNode;
}

const PAGE_SIZE = 30;

const FRIEND_NOTIFICATION_TYPES = new Set(['FRIEND_REQUEST_RECEIVED', 'FRIEND_REQUEST_ACCEPTED']);
const DIRECT_MESSAGE_NOTIFICATION_TYPES = new Set(['DIRECT_MESSAGE', 'DIRECT_MESSAGE_REPLY']);
const CHANNEL_REPLY_NOTIFICATION_TYPES = new Set(['CHANNEL_MESSAGE_REPLY']);

function handleFriendNotificationSideEffects(notification: NotificationItem) {
  if (!FRIEND_NOTIFICATION_TYPES.has(notification.type)) return;
  try {
    const url = new URL(window.location.href);
    if (!url.pathname.startsWith('/profile')) return;
    if (url.searchParams.get('tab') === 'friends') return;
    url.searchParams.set('tab', 'friends');
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  } catch {
    // ignore
  }
}

export const NotificationProvider: React.FC<ProviderProps> = ({ userId, token = null, children }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sseCloseRef = useRef<(() => void) | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const seenNotificationIds = useRef<Set<number>>(new Set());

  const reset = () => {
    setItems([]); setUnread(0); setPage(0); setHasMore(true);
    seenNotificationIds.current.clear();
  };

  const applyInboxSummaryHint = useCallback((notification: NotificationItem) => {
    if (!notification || notification.status !== 'UNREAD') {
      return;
    }
    if (!DIRECT_MESSAGE_NOTIFICATION_TYPES.has(notification.type) &&
        !CHANNEL_REPLY_NOTIFICATION_TYPES.has(notification.type) &&
        notification.type !== 'FRIEND_REQUEST_RECEIVED') {
      return;
    }
    queryClient.setQueryData<InboxSummaryView | undefined>(['inbox-summary'], (prev) => {
      const base: InboxSummaryView = prev ?? { directUnread: 0, channelUnread: 0, pendingFriendRequests: 0 };
      if (DIRECT_MESSAGE_NOTIFICATION_TYPES.has(notification.type)) {
        return {
          ...base,
          directUnread: Math.min(99, base.directUnread + 1),
        };
      }
      if (CHANNEL_REPLY_NOTIFICATION_TYPES.has(notification.type)) {
        return {
          ...base,
          channelUnread: Math.min(99, base.channelUnread + 1),
        };
      }
      if (notification.type === 'FRIEND_REQUEST_RECEIVED') {
        return {
          ...base,
          pendingFriendRequests: base.pendingFriendRequests + 1,
        };
      }
      return base;
    });
  }, [queryClient]);

  const establishSse = useCallback(() => {
    if (!userId) return;
    if (sseCloseRef.current) sseCloseRef.current();
    sseCloseRef.current = openSse(userId, (n) => {
      if (seenNotificationIds.current.has(n.id)) {
        return;
      }
      seenNotificationIds.current.add(n.id);
      setItems(prev => [n, ...prev].slice(0, 300));
      if (n.status === 'UNREAD') {
        setUnread(u => u + 1);
        applyInboxSummaryHint(n);
      }
      handleFriendNotificationSideEffects(n);
    }, () => {
      // error -> schedule reconnect
      if (!userId) return;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts.current++));
      reconnectTimer.current = window.setTimeout(() => establishSse(), delay);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) { reset(); return; }
    reconnectAttempts.current = 0;
    establishSse();
    return () => { if (sseCloseRef.current) sseCloseRef.current(); };
  }, [userId, establishSse]);

  const loadPage = async (targetPage: number) => {
    if (!userId || loading || !hasMore) return;
    setLoading(true);
    try {
      const resp = await fetchNotifications(token, userId, 'ALL', targetPage, PAGE_SIZE);
      setItems(p => {
        if (targetPage === 0) {
          seenNotificationIds.current.clear();
        }
        resp.items.forEach(item => seenNotificationIds.current.add(item.id));
        return targetPage === 0 ? resp.items : [...p, ...resp.items];
      });
      setUnread(resp.unreadCount);
      setHasMore(resp.items.length === PAGE_SIZE);
      setPage(targetPage);
    } finally { setLoading(false); }
  };

  const loadMore = async () => loadPage(page + 1);
  const refresh = async () => loadPage(0);

  useEffect(() => { if (userId) { refresh(); fetchUnreadCount(token, userId).then(setUnread).catch(()=>{}); } }, [userId]);

  const doMarkRead = async (ids: number[]) => {
    if (!userId) return; await markRead(token, userId, ids);
    setItems(list => list.map(i => ids.includes(i.id) ? { ...i, status: 'READ', readAtEpoch: Date.now() } : i));
    setUnread(u => Math.max(0, u - ids.length));
  };

  const doMarkAll = async () => {
    if (!userId) return; await markAllRead(token, userId);
    setItems(list => list.map(i => i.status === 'UNREAD' ? { ...i, status: 'READ', readAtEpoch: Date.now() } : i));
    setUnread(0);
  };

  const clearAll = async () => {
    setItems([]);
    setUnread(0);
    setPage(0);
    setHasMore(false);
    seenNotificationIds.current.clear();
  };
  const value: NotificationState = { items, unread, loading, loadMore, refresh, markRead: doMarkRead, markAll: doMarkAll, clearAll };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
