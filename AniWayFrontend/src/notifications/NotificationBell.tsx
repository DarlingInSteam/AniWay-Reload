import React, { useState } from 'react';
import { useNotifications } from './NotificationContext';
import { deleteAll } from './api';
import { parsePayload, formatTitle, formatDescription, formatDate, getIcon } from './notificationUtils';

export const NotificationBell: React.FC = () => {
  const { unread, items, markRead, markAll, loadMore, loading } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(o => !o);
  const unreadItems = items.filter(i => i.status === 'UNREAD');

  const handleItemClick = (id: number, payload: string) => {
    // Placeholder: open details / navigate; mark read
    markRead([id]);
  };

  return (
    <div className="relative inline-block text-left">
      <button onClick={toggle} className="relative p-2 rounded hover:bg-neutral-800 transition">
        <span className="material-icons">notifications</span>
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
              {items.length > 0 && <button disabled={busy} className="text-xs text-red-400 hover:underline disabled:opacity-40" onClick={async () => { setBusy(true); try { await deleteAll(null,  /* userId header set inside provider */ (window as any).currentUserId ); } catch(_){} finally { setBusy(false); } }}>Удалить все</button>}
              <button className="text-xs text-blue-400 hover:underline" onClick={() => setOpen(false)}>Закрыть</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-neutral-800">
            {items.length === 0 && <div className="p-4 text-xs text-neutral-400">Пусто</div>}
            {items.map(n => <NotificationRow key={n.id} n={n} onClick={() => handleItemClick(n.id, n.payload)} />)}
          </div>
          <div className="p-2 flex items-center justify-between gap-2 border-t border-neutral-700 bg-neutral-950">
            <button disabled={loading} onClick={loadMore} className="text-xs text-blue-400 disabled:opacity-40">Ещё</button>
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
