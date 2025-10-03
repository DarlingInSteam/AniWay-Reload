import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { authService } from '@/services/authService';

import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon, getNavigationTarget } from './notificationUtils';

interface NotificationDropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

// Internal constant to control how many items we attempt to progressively render (smooth mount for very large backlog)
const INITIAL_RENDER_COUNT = 40;

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ open, onClose, anchorRef }) => {
  const navigate = useNavigate();
  const { items, unread, markRead, markAll, loadMore, loading, clearAll } = useNotifications();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);

  // Gradually increase render count if many notifications (avoid long first paint)
  useEffect(() => {
    if (!open) return;
    if (items.length > renderCount) {
      const id = window.setTimeout(() => setRenderCount(c => Math.min(items.length, c + 40)), 120);
      return () => window.clearTimeout(id);
    }
  }, [items.length, renderCount, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleActivate = useCallback((id: number, payload: string | null, type: string) => {
    try {
      const parsed = parsePayload(payload);
      const target = getNavigationTarget(type, parsed);
      markRead([id]);
      if (target) {
        onClose();
        setTimeout(() => navigate(target), 0);
      }
    } catch {
      markRead([id]);
    }
  }, [markRead, navigate, onClose]);

  if (!open) return null;

  const visible = items.slice(0, renderCount);

  return (
    <div
      ref={containerRef}
      className="glass-panel animate-scale-in origin-top-right absolute right-0 z-[70] mt-2 flex w-[420px] max-h-[560px] flex-col overflow-hidden rounded-3xl bg-slate-950/85 backdrop-blur-2xl shadow-2xl shadow-black/60"
    >
      <Header unread={unread} busy={busy} onMarkAll={markAll} onClose={onClose} onDeleteAll={async () => {
        setBusy(true);
        try { await deleteAll(authService.getToken(), (window as any).currentUserId); await clearAll(); }
        catch { /* silent */ }
        finally { setBusy(false); }
      }} />
      <div className="relative flex-1 overflow-auto scrollbar-custom scroll-fade-mask" data-testid="notifications-scroll">
        {visible.length === 0 && !loading && (
          <div className="p-8 text-center text-xs text-neutral-500 select-none">
            <div className="mb-2 text-3xl">🔕</div>
            Нет уведомлений
          </div>
        )}
        {loading && visible.length === 0 && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md skeleton-block skeleton-shimmer" />
            ))}
          </div>
        )}
        <ul className="divide-y divide-white/5 text-xs">
          {visible.map(n => (
            <NotificationRow key={n.id} n={n} onActivate={handleActivate} />
          ))}
        </ul>
        {/* Could add a sentinel or infinite loader indicator here */}
      </div>
      <Footer loading={loading} onLoadMore={loadMore} onOpenFull={() => { onClose(); navigate('/notifications'); }} />
    </div>
  );
};

const Header: React.FC<{ unread: number; busy: boolean; onMarkAll: () => void; onDeleteAll: () => Promise<void>; onClose: () => void; }> = ({ unread, busy, onMarkAll, onDeleteAll, onClose }) => {
  return (
  <div className="flex items-center gap-3 border-b border-white/10 bg-white/8 px-5 py-3">
      <div className="flex flex-1 items-center gap-2">
        <span className="text-sm font-semibold tracking-wide text-white">Уведомления</span>
        {unread > 0 && (
          <Badge variant="outline" className="border-blue-300/50 bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
            {unread}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        {unread > 0 && (
          <button disabled={busy} onClick={onMarkAll} className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40">Прочитать все</button>
        )}
        <button disabled={busy} onClick={onDeleteAll} className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-40">Удалить</button>
        <button onClick={onClose} className="text-[11px] text-neutral-400 hover:text-neutral-200">Закрыть</button>
      </div>
    </div>
  );
};

const Footer: React.FC<{ loading: boolean; onLoadMore: () => void; onOpenFull: () => void; }> = ({ loading, onLoadMore, onOpenFull }) => (
  <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/6 px-3 py-2 backdrop-blur-sm">
    <button onClick={onLoadMore} disabled={loading} className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-40">{loading ? 'Загрузка…' : 'Загрузить ещё'}</button>
    <button onClick={onOpenFull} className="text-[11px] text-neutral-400 hover:text-neutral-200">Все уведомления</button>
  </div>
);

interface RowProps { n: any; onActivate: (id: number, payload: string, type: string) => void; }
const NotificationRow: React.FC<RowProps> = ({ n, onActivate }) => {
  const parsed = parsePayload(n.payload);
  const title = formatTitle(n.type, parsed);
  const desc = formatDescription(n.type, parsed);
  const icon = getIcon(n.type);
  const isUnread = n.status === 'UNREAD';
  return (
    <li>
      <button
        onClick={() => onActivate(n.id, n.payload, n.type)}
        className={cn(
          'glass-panel group relative flex w-full gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:border-white/25 hover:bg-white/18',
          isUnread && 'border-blue-400/60 bg-blue-500/22 shadow-lg shadow-blue-500/25'
        )}
      >
        <div className="flex flex-col items-center pt-0.5">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-base text-white shadow-inner', isUnread && 'border-blue-300/50 bg-blue-500/25 text-white')}>{icon}</div>
          {isUnread && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary shadow shadow-primary/40" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <span className={cn('flex-1 text-[13px] font-semibold leading-snug text-white line-clamp-2', !isUnread && 'text-neutral-200 group-hover:text-white')}>{title}</span>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-neutral-500 tabular-nums">{formatDate(n.createdAtEpoch)}</span>
          </div>
          {desc && <div className="mt-1 text-[11px] leading-relaxed text-neutral-300 line-clamp-3 group-hover:text-neutral-100/90">{desc}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            <Badge
              variant="outline"
              className={cn('border-white/10 bg-white/5 px-2 py-0.5', isUnread && 'border-blue-300/50 bg-blue-500/20 text-white')}
            >
              {isUnread ? 'Новое' : 'Прочитано'}
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 px-2 py-0.5 text-neutral-300">
              {n.type.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </div>
      </button>
    </li>
  );
};

export default NotificationDropdown;
