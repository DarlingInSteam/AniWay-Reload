import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon, getNavigationTarget } from './notificationUtils';
import { authService } from '../services/authService';

interface NotificationItem {
  id: number;
  type: string;
  status: string;
  payload: string | null;
  createdAtEpoch: number;
}

export const NotificationsPage: React.FC = () => {
  const { items: realtimeItems, markRead, markAll, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [pages, setPages] = useState<NotificationItem[][]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [end, setEnd] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'unread'>('all');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Merge real-time items (dedupe by id) at top
  const flat = [...realtimeItems];
  const merged = React.useMemo(() => {
    const seen = new Set<number>();
    const combined: NotificationItem[] = [];
    flat.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); combined.push(n); } });
    pages.flat().forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); combined.push(n); } });
    return combined.sort((a,b) => b.id - a.id);
  }, [flat, pages]);

  const unreadCount = React.useMemo(() => merged.filter(n => n.status === 'UNREAD').length, [merged]);
  const displayed = React.useMemo(() => viewFilter === 'unread' ? merged.filter(n => n.status === 'UNREAD') : merged, [merged, viewFilter]);

  const loadPage = useCallback(async () => {
    if (loading || end) return;
    setLoading(true);
    try {
  const token = authService.getToken();
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // X-User-Id no longer strictly required when JWT present, keep fallback if gateway bypassed locally
  if ((window as any).currentUserId) headers['X-User-Id'] = String((window as any).currentUserId);
  const res = await fetch(`/api/notifications/page?page=${page}&size=30`, { headers });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const list: NotificationItem[] = data.items || [];
      if (list.length === 0) {
        setEnd(true);
      } else {
        setPages(p => [...p, list]);
        setPage(p => p + 1);
      }
    } catch (e) {
      console.error('Load notifications page failed', e);
    } finally {
      setLoading(false);
    }
  }, [loading, end, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) loadPage(); });
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadPage]);

  useEffect(() => {
    if (!loading && pages.length === 0 && !end) {
      loadPage();
    }
  }, [loading, pages.length, end, loadPage]);

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <div className="glass-panel rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="glass-inline flex flex-wrap items-center gap-1 rounded-full p-1 text-xs text-white">
            {(['all', 'unread'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setViewFilter(option)}
                className={cn(
                  'rounded-full px-4 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  viewFilter === option
                    ? 'bg-blue-500/25 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-200/80 hover:bg-white/10 hover:text-white'
                )}
              >
                {option === 'all' ? 'Все' : 'Непрочитанные'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={unreadCount === 0}
              onClick={() => markAll()}
              className="h-9 rounded-full border border-white/20 bg-white/15 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Прочитать все
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteAll(authService.getToken(), (window as any).currentUserId);
                  await clearAll();
                  setPages([]);
                  setPage(0);
                  setEnd(false);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="h-9 rounded-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {displayed.map(n => (
          <Row
            key={n.id}
            n={n}
            onActivate={(target) => {
              markRead([n.id]);
              if (target) navigate(target);
            }}
          />
        ))}
      </div>

      {displayed.length === 0 && !loading && (
        <div className="glass-panel mt-10 rounded-3xl p-12 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10 text-4xl">📭</div>
          <h2 className="text-xl font-semibold text-white">Ничего нового пока нет</h2>
          <p className="mt-3 text-sm text-slate-300">
            {viewFilter === 'unread'
              ? 'Все уведомления уже прочитаны. Как только появится что-то важное, вы увидите это здесь.'
              : 'Когда появятся новые события, они мгновенно отобразятся в этом разделе.'}
          </p>
        </div>
      )}

      {!end && <div ref={sentinelRef} className="h-10" />}
      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl border border-white/5 bg-white/5 skeleton-shimmer" />
          ))}
        </div>
      )}
      {end && displayed.length > 0 && (
        <div className="py-6 text-center text-xs text-slate-400">Больше нет уведомлений</div>
      )}
    </div>
  );
};

const Row: React.FC<{ n: NotificationItem; onActivate: (target: string | null) => void }> = ({ n, onActivate }) => {
  const parsed = parsePayload(n.payload);
  const title = formatTitle(n.type, parsed);
  const desc = formatDescription(n.type, parsed);
  const icon = getIcon(n.type);
  const target = getNavigationTarget(n.type, parsed);
  const isUnread = n.status === 'UNREAD';
  return (
    <button
      type="button"
      onClick={() => onActivate(target)}
      className={cn(
        'glass-panel group relative w-full overflow-hidden rounded-3xl p-6 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 hover:border-white/30 hover:bg-white/10',
        isUnread && 'border-blue-400/60 shadow-lg shadow-blue-500/25'
      )}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-blue-400/70" aria-hidden="true" />
      <div className="flex items-start gap-4">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-white shadow-inner',
          isUnread && 'border-blue-300/50 bg-blue-500/20 text-white shadow-blue-500/40'
        )}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1 text-base font-semibold leading-tight text-white line-clamp-2">{title}</div>
            <div className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {formatDate(n.createdAtEpoch)}
            </div>
          </div>
          {desc && (
            <p className="text-sm leading-relaxed text-slate-300 line-clamp-3 group-hover:text-slate-200">
              {desc}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] uppercase tracking-[0.2em]">
            <Badge
              variant="outline"
              className={cn(
                'border-white/15 bg-white/5 text-white/80',
                isUnread && 'border-blue-300/50 bg-blue-500/15 text-white'
              )}
            >
              {isUnread ? 'Новое' : 'Прочитано'}
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300/90">
              {n.type.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </div>
      </div>
    </button>
  );
};
