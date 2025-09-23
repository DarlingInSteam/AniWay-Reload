import React, { useRef, useState } from 'react';
import { useNotifications } from './NotificationContext';
import NotificationDropdown from './NotificationDropdown';

export const NotificationBell: React.FC = () => {
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);

  const toggle = () => setOpen(o => !o);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-lg hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" aria-label="Уведомления">
        <BellIcon className="w-5 h-5 text-neutral-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full shadow ring-1 ring-black/40 min-w-[20px] text-center">{unread}</span>
        )}
      </button>
      <NotificationDropdown open={open} onClose={() => setOpen(false)} anchorRef={ref} />
    </div>
  );
};

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
