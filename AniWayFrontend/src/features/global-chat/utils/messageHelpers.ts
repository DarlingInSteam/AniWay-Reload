import type { UserMini } from '@/hooks/useUserMiniBatch';

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'U';
}

export function getUserDisplay(users: Record<number, UserMini>, userId: number, currentUserId?: number | null): string {
  if (currentUserId && userId === currentUserId) return 'Вы';
  const user = users[userId];
  return user?.displayName || user?.username || `ID ${userId}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}
