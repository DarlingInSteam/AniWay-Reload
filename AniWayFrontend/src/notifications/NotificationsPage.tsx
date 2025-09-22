import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon } from './notificationUtils';

interface NotificationItem {
  id: number;
  type: string;
  status: string;
  payload: string | null;
  createdAtEpoch: number;
}

export const NotificationsPage: React.FC = () => {
  const { items: realtimeItems, markRead, markAll } = useNotifications();
  const [pages, setPages] = useState<NotificationItem[][]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [end, setEnd] = useState(false);
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

  const loadPage = useCallback(async () => {
    if (loading || end) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/page?page=${page}&size=30`, { headers: { 'X-User-Id': (window as any).currentUserId } });
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

  useEffect(() => { loadPage(); }, []); // initial

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) loadPage(); });
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadPage]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Уведомления</h1>
        <div className="flex gap-3">
          <button onClick={() => markAll()} className="text-xs text-blue-400 hover:underline">Прочитать все</button>
        </div>
      </div>
      <div className="space-y-2">
        {merged.map(n => <Row key={n.id} n={n} onClick={() => markRead([n.id])} />)}
      </div>
      {!end && <div ref={sentinelRef} className="h-10" />}
      {loading && <div className="text-center py-4 text-neutral-500 text-sm">Загрузка...</div>}
      {end && <div className="text-center py-4 text-neutral-600 text-xs">Больше нет уведомлений</div>}
    </div>
  );
};

const Row: React.FC<{ n: NotificationItem; onClick: () => void }> = ({ n, onClick }) => {
  const parsed = parsePayload(n.payload);
  const title = formatTitle(n.type, parsed);
  const desc = formatDescription(n.type, parsed);
  const icon = getIcon(n.type);
  return (
    <div onClick={onClick} className={`p-3 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer ${n.status==='UNREAD' ? 'shadow-inner' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="text-lg leading-none mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-4">
            <div className="font-medium truncate">{title}</div>
            <div className="text-[11px] text-neutral-500 whitespace-nowrap">{formatDate(n.createdAtEpoch)}</div>
          </div>
          {desc && <div className="text-neutral-400 text-xs mt-1 line-clamp-2">{desc}</div>}
        </div>
      </div>
    </div>
  );
};
