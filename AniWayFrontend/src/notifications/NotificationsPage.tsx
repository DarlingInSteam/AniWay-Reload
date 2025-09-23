import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon, getNavigationTarget } from './notificationUtils';
import { useNavigate } from 'react-router-dom';
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
        <div className="flex gap-4">
          <button onClick={() => markAll()} className="text-xs text-blue-400 hover:underline">Прочитать все</button>
          <button onClick={async () => { try { await deleteAll(authService.getToken(), (window as any).currentUserId); await clearAll(); setPages([]); setPage(0); setEnd(true);} catch(e){ console.error(e);} }} className="text-xs text-red-400 hover:underline">Удалить все</button>
        </div>
      </div>
      <div className="space-y-2">
  {merged.map(n => <Row key={n.id} n={n} onActivate={(target) => { markRead([n.id]); if (target) navigate(target); }} />)}
      </div>
      {!end && <div ref={sentinelRef} className="h-10" />}
      {loading && <div className="text-center py-4 text-neutral-500 text-sm">Загрузка...</div>}
      {end && <div className="text-center py-4 text-neutral-600 text-xs">Больше нет уведомлений</div>}
    </div>
  );
};

const Row: React.FC<{ n: NotificationItem; onActivate: (target: string | null) => void }> = ({ n, onActivate }) => {
  const parsed = parsePayload(n.payload);
  const title = formatTitle(n.type, parsed);
  const desc = formatDescription(n.type, parsed);
  const icon = getIcon(n.type);
  const target = getNavigationTarget(n.type, parsed);
  return (
    <div onClick={() => onActivate(target)} className={`p-3 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer ${n.status==='UNREAD' ? 'shadow-inner' : ''}`}>
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
