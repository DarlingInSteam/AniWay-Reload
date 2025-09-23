// Basic Notification API client
export interface NotificationItem {
  id: number;
  type: string;
  status: string;
  payload: string; // JSON string; parse lazily
  createdAtEpoch: number;
  readAtEpoch?: number | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  nextCursor?: number | null;
  unreadCount: number;
}

const base = '/api/notifications';

export async function fetchNotifications(token: string | null, userId: number, status: string = 'UNREAD', page = 0, size = 30): Promise<NotificationListResponse> {
  const res = await fetch(`${base}?status=${encodeURIComponent(status)}&page=${page}&size=${size}`, {
    headers: buildHeaders(token, userId)
  });
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function fetchUnreadCount(token: string | null, userId: number): Promise<number> {
  const res = await fetch(`${base}/unread-count`, { headers: buildHeaders(token, userId) });
  if (!res.ok) throw new Error('Failed to load unread count');
  return res.json();
}

export async function markRead(token: string | null, userId: number, ids: number[]): Promise<number> {
  const res = await fetch(`${base}/mark-read`, {
    method: 'POST',
    headers: { ...buildHeaders(token, userId), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!res.ok) throw new Error('Failed to mark read');
  return res.json();
}

export async function markAllRead(token: string | null, userId: number): Promise<number> {
  const res = await fetch(`${base}/mark-all-read`, {
    method: 'POST',
    headers: buildHeaders(token, userId)
  });
  if (!res.ok) throw new Error('Failed to mark all read');
  return res.json();
}

export async function deleteAll(token: string | null, userId: number): Promise<number> {
  const res = await fetch(`${base}/all`, {
    method: 'DELETE',
    headers: buildHeaders(token, userId)
  });
  if (!res.ok) throw new Error('Failed to delete all notifications');
  return res.json();
}

function buildHeaders(token: string | null, userId: number) {
  const h: Record<string,string> = { 'X-User-Id': String(userId) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export type NotificationEvent = NotificationItem;

export function openSse(userId: number, onMessage: (n: NotificationEvent) => void, onError?: (e: any) => void) {
  const url = `${base}/stream?userId=${userId}`;
  let es: EventSource | null = new EventSource(url, { withCredentials: false });
  es.addEventListener('notification', (evt: MessageEvent) => {
    try {
      const data = JSON.parse(evt.data);
      onMessage(data);
    } catch (e) {
      console.warn('Bad notification event', e);
    }
  });
  es.onerror = (e) => {
    if (onError) onError(e);
  };
  return () => { es && es.close(); es = null; };
}
