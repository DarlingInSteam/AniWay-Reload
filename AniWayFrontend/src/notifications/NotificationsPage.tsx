import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, ChevronDown, MoreVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import {
  parsePayload,
  formatTitle,
  formatDescription,
  formatDate,
  getIcon,
  getNavigationTarget,
} from './notificationUtils';
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
  const [viewFilter, setViewFilter] = useState<'all' | 'unread'>('unread');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all');
  const [sortOrder, setSortOrder] = useState<'new' | 'old'>('new');
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

  const countsByCategory = React.useMemo(() => {
    const result: Record<CategoryKey, { total: number; unread: number }> = {
      all: { total: merged.length, unread: unreadCount },
      updates: { total: 0, unread: 0 },
      social: { total: 0, unread: 0 },
      important: { total: 0, unread: 0 },
    };
    merged.forEach(item => {
      const key = resolveCategory(item.type);
      if (key !== 'all') {
        result[key].total += 1;
        if (item.status === 'UNREAD') {
          result[key].unread += 1;
        }
      }
    });
    return result;
  }, [merged, unreadCount]);

  const displayed = React.useMemo(() => {
    const filtered = merged.filter(item => {
      if (viewFilter === 'unread' && item.status !== 'UNREAD') return false;
      if (categoryFilter !== 'all') {
        return resolveCategory(item.type) === categoryFilter;
      }
      return true;
    });
    return filtered.sort((a, b) => (sortOrder === 'new' ? b.createdAtEpoch - a.createdAtEpoch : a.createdAtEpoch - b.createdAtEpoch));
  }, [merged, viewFilter, categoryFilter, sortOrder]);

  const loadPage = useCallback(async () => {
    if (loading || end) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      const headers: Record<string, string> = {};
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

  useEffect(() => {
    if (viewFilter === 'unread' && unreadCount === 0 && merged.length > 0) {
      setViewFilter('all');
    }
  }, [viewFilter, unreadCount, merged.length]);

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <section className="rounded-[28px] border border-white/10 bg-manga-black/75 p-6">
        <header className="flex flex-col gap-4 text-white md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Уведомления</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              type="button"
              size="sm"
              onClick={() => setViewFilter(viewFilter === 'unread' ? 'all' : 'unread')}
              className={cn(
                'h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20',
                viewFilter === 'unread' && 'border-primary/40 bg-primary/10 text-primary'
              )}
            >
              {viewFilter === 'unread' ? 'Все' : 'Новое'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'new' ? 'old' : 'new')}
              className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20"
            >
              <span className="mr-1 text-sm font-medium text-white/80">{sortOrder === 'new' ? 'Сначала новые' : 'Сначала старые'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => markAll()}
              className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
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
              className="h-9 rounded-full px-4"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить
            </Button>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_DEFINITIONS.map(def => (
            <button
              key={def.key}
              type="button"
              onClick={() => setCategoryFilter(def.key)}
              className={cn(
                'flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                categoryFilter === def.key && 'border-primary/50 bg-primary/15 text-white'
              )}
            >
              <span>{def.label}</span>
              <span className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-xs text-white/60">
                {countsByCategory[def.key]?.total ?? 0}
                {(countsByCategory[def.key]?.unread ?? 0) > 0 && (
                  <span className="text-primary">+{countsByCategory[def.key]?.unread}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-4">
        {displayed.map(n => (
          <NotificationCard
            key={n.id}
            item={n}
            onActivate={target => {
              markRead([n.id]);
              if (target) navigate(target);
            }}
            onMarkRead={() => markRead([n.id])}
          />
        ))}
      </div>

      {displayed.length === 0 && !loading && (
        <div className="mt-10 rounded-[32px] border border-dashed border-white/10 bg-white/5 p-20 text-center text-white/70">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/10 text-4xl">📭</div>
          <h2 className="text-2xl font-semibold text-white">Ничего нового пока нет</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
            {viewFilter === 'unread'
              ? 'Вы просмотрели все свежие уведомления. Мы сообщим, как только произойдет что-то важное.'
              : 'Сейчас уведомлений нет, но как только появятся новые события, вы сразу увидите их здесь.'}
          </p>
        </div>
      )}

      {!end && <div ref={sentinelRef} className="h-10" />}
      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-[28px] border border-white/5 bg-white/5 skeleton-shimmer" />
          ))}
        </div>
      )}
      {end && displayed.length > 0 && (
        <div className="py-8 text-center text-xs uppercase tracking-[0.24em] text-white/40">Больше уведомлений нет</div>
      )}
    </div>
  );
};

const NotificationCard: React.FC<{
  item: NotificationItem;
  onActivate: (target: string | null) => void;
  onMarkRead: () => void;
}> = ({ item, onActivate, onMarkRead }) => {
  const parsed = parsePayload(item.payload);
  const title = formatTitle(item.type, parsed);
  const desc = formatDescription(item.type, parsed);
  const icon = getIcon(item.type);
  const target = getNavigationTarget(item.type, parsed);
  const isUnread = item.status === 'UNREAD';
  const coverImage = parsed?.coverImageUrl || parsed?.coverUrl || parsed?.image || parsed?.poster || null;
  const categoryLabel = CATEGORY_DEFINITIONS.find(def => def.key === resolveCategory(item.type))?.label ?? 'Уведомление';

  return (
    <article className={cn('group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 text-white transition hover:border-white/20 hover:bg-white/10', isUnread && 'border-primary/40 bg-primary/10 shadow-lg shadow-primary/20')}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <button
          type="button"
          onClick={() => onActivate(target)}
          className="relative flex h-20 w-full max-w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-3xl transition hover:border-primary/50 md:h-24"
        >
          {coverImage ? (
            <img src={coverImage} alt="cover" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-2xl">{icon}</span>
          )}
          {isUnread && <span className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-primary shadow-lg shadow-primary/40" />}
        </button>

        <div className="flex-1 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
            <button
              type="button"
              onClick={() => onActivate(target)}
              className="min-w-0 flex-1 text-left focus-visible:outline-none"
            >
              <h3 className="text-lg font-semibold leading-tight text-white md:text-xl">{title}</h3>
              {desc && <p className="mt-2 text-sm text-white/70 line-clamp-3 md:text-base">{desc}</p>}
            </button>
            <div className="flex flex-col items-start gap-2 text-xs uppercase tracking-[0.2em] text-white/40 md:items-end">
              <span>Опубликовано</span>
              <span className="text-white/70">{formatDate(item.createdAtEpoch)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full border-white/20 bg-white/10 text-xs uppercase tracking-[0.18em] text-white/70',
                  isUnread && 'border-primary/60 bg-primary/15 text-primary'
                )}
              >
                {isUnread ? 'Новое' : 'Прочитано'}
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/10 text-xs uppercase tracking-[0.18em] text-white/60">
                {categoryLabel}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isUnread && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onMarkRead}
                  className="h-9 rounded-full border border-primary/40 bg-primary/20 text-primary hover:bg-primary/30"
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Прочитано
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onActivate(target)}
                className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                title="Открыть уведомление"
                aria-label="Открыть уведомление"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

type CategoryKey = 'all' | 'updates' | 'social' | 'important';

const CATEGORY_DEFINITIONS: Array<{ key: CategoryKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'updates', label: 'Обновления' },
  { key: 'social', label: 'Социальные' },
  { key: 'important', label: 'Важное' },
];

const resolveCategory = (type: string): CategoryKey => {
  const normalized = type.toLowerCase();
  if (normalized.includes('comment') || normalized.includes('friend') || normalized.includes('message')) {
    return 'social';
  }
  if (normalized.includes('ban') || normalized.includes('admin') || normalized.includes('system') || normalized.includes('security')) {
    return 'important';
  }
  if (normalized.includes('chapter') || normalized.includes('manga') || normalized.includes('series') || normalized.includes('update') || normalized.includes('release')) {
    return 'updates';
  }
  return 'updates';
};
