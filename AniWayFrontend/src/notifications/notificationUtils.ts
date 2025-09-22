export type NotificationPayload = Record<string, any> | null;

export function parsePayload(raw: string | null): NotificationPayload {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const typeIcons: Record<string,string> = {
  PROFILE_COMMENT: '👤',
  REPLY_TO_COMMENT: '💬',
  COMMENT_ON_REVIEW: '📝',
  NEW_COMMENT_ON_USER_FORUM_THREAD: '🧵',
  REPLY_IN_FORUM_THREAD: '➡️',
  BOOKMARK_NEW_CHAPTER: '📖'
};

export function getIcon(type: string): string {
  return typeIcons[type] || '🔔';
}

function short(val?: string | null, max = 60) {
  if (!val) return '';
  return val.length <= max ? val : val.slice(0, max - 3) + '...';
}

export function formatTitle(type: string, payload: NotificationPayload): string {
  switch (type) {
    case 'PROFILE_COMMENT':
      return 'Новый комментарий на вашей странице';
    case 'REPLY_TO_COMMENT':
      return 'Ответ на ваш комментарий';
    case 'COMMENT_ON_REVIEW':
      return 'Комментарий к вашему отзыву';
    case 'NEW_COMMENT_ON_USER_FORUM_THREAD':
      return payload?.title ? `Новый пост в вашей теме: ${short(payload.title, 40)}` : 'Новый пост в вашей теме';
    case 'REPLY_IN_FORUM_THREAD':
      return 'Ответ в отслеживаемой теме';
    case 'BOOKMARK_NEW_CHAPTER': {
      const t = payload?.mangaTitle || 'манга';
      const ch = payload?.chapterNumber ? ` глава ${payload.chapterNumber}` : ' новая глава';
      return `Новая глава в закладке: ${t}${ch}`;
    }
    default:
      return 'Новое уведомление';
  }
}

export function formatDescription(type: string, payload: NotificationPayload): string {
  switch (type) {
    case 'PROFILE_COMMENT':
    case 'REPLY_TO_COMMENT':
    case 'COMMENT_ON_REVIEW':
      return short(payload?.excerpt, 100);
    case 'NEW_COMMENT_ON_USER_FORUM_THREAD':
    case 'REPLY_IN_FORUM_THREAD':
      return short(payload?.excerpt, 100);
    case 'BOOKMARK_NEW_CHAPTER':
      return payload?.mangaTitle ? `${payload.mangaTitle}` : '';
    default:
      return '';
  }
}

export function formatDate(epochMs?: number | null): string {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  return d.toLocaleString('ru-RU', {hour12:false});
}
