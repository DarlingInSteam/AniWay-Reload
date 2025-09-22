import React, { useState } from 'react';
import { useNotifications } from './NotificationContext';

export const NotificationBell: React.FC = () => {
  const { unread, items, markRead, markAll, loadMore, loading } = useNotifications();
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
            <div className="flex gap-2">
              {unread > 0 && <button className="text-xs text-blue-400 hover:underline" onClick={() => markAll()}>Прочитать все</button>}
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
  let parsed: any = null;
  try { parsed = JSON.parse(n.payload); } catch {}
  const isUnread = n.status === 'UNREAD';
  const title = mapTitle(n.type, parsed);
  const excerpt = parsed?.excerpt || parsed?.mangaTitle || '';
  return (
    <div onClick={onClick} className={`px-3 py-2 text-xs cursor-pointer hover:bg-neutral-800 ${isUnread ? 'bg-neutral-850 font-semibold' : ''}`}>
      <div className="flex justify-between">
        <span className="truncate pr-2">{title}</span>
        <span className="text-[10px] text-neutral-500">{timeAgo(n.createdAtEpoch)}</span>
      </div>
      {excerpt && <div className="text-neutral-400 mt-0.5 line-clamp-2">{excerpt}</div>}
    </div>
  );
}

function mapTitle(type: string, payload: any): string {
  switch (type) {
    case 'BOOKMARK_NEW_CHAPTER':
      return `Новая глава: ${payload?.mangaTitle || ''}`;
    case 'PROFILE_COMMENT':
      return 'Новый комментарий профиля / контента';
    case 'REPLY_IN_FORUM_THREAD':
      return 'Новое сообщение в теме';
    default:
      return type;
  }
}

function timeAgo(epoch: number): string {
  const diff = Date.now() - epoch;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'сейчас';
  const m = Math.floor(sec / 60); if (m < 60) return m + 'м';
  const h = Math.floor(m / 60); if (h < 24) return h + 'ч';
  const d = Math.floor(h / 24); return d + 'д';
}
