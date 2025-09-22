import React, { useEffect, useRef, useState } from 'react';
import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon, getNavigationTarget } from './notificationUtils';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const NotificationBell: React.FC = () => {
  const { unread, items, markRead, markAll, loadMore, loading } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);
  const navigate = useNavigate();

  const toggle = () => setOpen(o => !o);
  const unreadItems = items.filter(i => i.status === 'UNREAD');

  const handleItemClick = (id: number, rawPayload: string, type: string) => {
    try {
      const parsed = parsePayload(rawPayload);
      const target = getNavigationTarget(type, parsed);
      markRead([id]);
      if (target) {
        setOpen(false);
        // Defer navigation slightly so state updates flush
        setTimeout(() => navigate(target), 0);
      }
    } catch {
      markRead([id]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded hover:bg-neutral-800 transition" aria-label="Уведомления">
        <BellIcon className="w-5 h-5 text-neutral-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] px-1 rounded-full">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[480px] flex flex-col bg-neutral-900 border border-neutral-700 rounded shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
            <span className="text-sm font-semibold">Уведомления</span>
            <div className="flex gap-2 items-center">
              {unread > 0 && <button disabled={busy} className="text-xs text-blue-400 hover:underline disabled:opacity-40" onClick={() => markAll()}>Прочитать все</button>}
              {items.length > 0 && <button disabled={busy} className="text-xs text-red-400 hover:underline disabled:opacity-40" onClick={async () => { setBusy(true); try { await deleteAll(authService.getToken(), (window as any).currentUserId ); } catch(_){} finally { setBusy(false); } }}>Удалить все</button>}
              <button className="text-xs text-blue-400 hover:underline" onClick={() => setOpen(false)}>Закрыть</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-neutral-800">
            {items.length === 0 && <div className="p-4 text-xs text-neutral-400">Пусто</div>}
            {items.map(n => <NotificationRow key={n.id} n={n} onClick={() => handleItemClick(n.id, n.payload, n.type)} />)}
          </div>
          <div className="p-2 flex items-center justify-between gap-2 border-t border-neutral-700 bg-neutral-950">
            <div className="flex gap-2">
              <button disabled={loading} onClick={loadMore} className="text-xs text-blue-400 disabled:opacity-40">Загрузить ещё</button>
            </div>
            <button onClick={() => { setOpen(false); navigate('/notifications'); }} className="text-xs text-neutral-300 hover:text-white">Все</button>
          </div>
        </div>
      )}
    </div>
  );
};

function NotificationRow({ n, onClick }: { n: any, onClick: () => void }) {
  const parsed = parsePayload(n.payload);
  const isUnread = n.status === 'UNREAD';
  const title = formatTitle(n.type, parsed);
  const desc = formatDescription(n.type, parsed);
  const icon = getIcon(n.type);
  return (
    <div onClick={onClick} className={`px-3 py-2 text-xs cursor-pointer hover:bg-neutral-800 ${isUnread ? 'bg-neutral-850 font-semibold' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2">
            <span className="truncate pr-2">{title}</span>
            <span className="text-[10px] text-neutral-500">{formatDate(n.createdAtEpoch)}</span>
          </div>
          {desc && <div className="text-neutral-400 mt-0.5 line-clamp-2">{desc}</div>}
        </div>
      </div>
    </div>
  );
}

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5l-1.5 2h15z" />
    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
  </svg>
);
