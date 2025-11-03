import { buildReaderPath } from '@/lib/slugUtils'

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
  BOOKMARK_NEW_CHAPTER: '📖',
  FRIEND_REQUEST_RECEIVED: '🤝',
  FRIEND_REQUEST_ACCEPTED: '🎉'
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
      if (payload?.commentType === 'PROFILE') return 'Ответ в вашем профиле';
      if (payload?.commentType === 'MANGA') return 'Ответ на ваш комментарий к манге';
      if (payload?.commentType === 'CHAPTER') return 'Ответ на ваш комментарий к главе';
      if (payload?.commentType === 'REVIEW') return 'Ответ на ваш комментарий к отзыву';
      return 'Ответ на ваш комментарий';
    case 'COMMENT_ON_REVIEW':
      return 'Комментарий к вашему отзыву';
    case 'NEW_COMMENT_ON_USER_FORUM_THREAD':
      return payload?.title ? `Новый пост в вашей теме: ${short(payload.title, 40)}` : 'Новый пост в вашей теме';
    case 'REPLY_IN_FORUM_THREAD':
      return 'Ответ в отслеживаемой теме';
    case 'BOOKMARK_NEW_CHAPTER': {
      const t = payload?.mangaTitle || 'манга';
      const label = typeof payload?.chapterLabel === 'string' && payload.chapterLabel.trim().length > 0 ? payload.chapterLabel.trim() : null;
      const fallback = payload?.chapterNumber ? ` глава ${payload.chapterNumber}` : ' новая глава';
      const suffix = label ? ` ${label}` : fallback;
      return `Новая глава в закладке: ${t}${suffix}`;
    }
    case 'FRIEND_REQUEST_RECEIVED':
      return 'Новая заявка в друзья';
    case 'FRIEND_REQUEST_ACCEPTED':
      return 'Заявка в друзья принята';
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
    case 'FRIEND_REQUEST_RECEIVED': {
      const from = payload?.requesterDisplayName || payload?.requesterUsername;
      if (payload?.message) {
        return `${from ? `${from}: ` : ''}${short(payload.message, 120)}`;
      }
      return from ? `${from} хочет добавить вас в друзья` : 'Пользователь отправил вам заявку в друзья';
    }
    case 'FRIEND_REQUEST_ACCEPTED': {
      const accepter = payload?.accepterDisplayName || payload?.accepterUsername;
      return accepter ? `${accepter} принял(а) вашу заявку` : 'Ваш запрос в друзья принят';
    }
    default:
      return '';
  }
}

export function formatDate(epochMs?: number | null): string {
  if (!epochMs) return '';
  const d = new Date(epochMs);
  return d.toLocaleString('ru-RU', {hour12:false});
}

// Determine navigation target (path + optional anchor) based on type/payload
export function getNavigationTarget(type: string, payload: NotificationPayload): string | null {
  if (!payload) return null;
  switch (type) {
    case 'PROFILE_COMMENT': {
      // navigate to profile of current user (handled outside) -> return generic path
      return '/profile';
    }
    case 'REPLY_TO_COMMENT': {
      // For replies we need context: commentType and related ids
      const ctype = payload.commentType;
      const commentId = payload.commentId || payload.replyToCommentId || payload.comment_id; // fallback possibilities
      if (ctype === 'MANGA' && payload.mangaId) {
        return `/manga/${payload.mangaId}#comment-${commentId}`;
      }
      if (ctype === 'CHAPTER' && payload.chapterId) {
        return `/reader/${payload.chapterId}#comment-${commentId}`;
      }
      if (ctype === 'REVIEW' && payload.reviewId) {
        return `/manga/${payload.mangaId || ''}?review=${payload.reviewId}#comment-${commentId}`;
      }
      if (ctype === 'PROFILE') {
        return `/profile#comment-${commentId}`;
      }
      // fallback: maybe manga context present
      if (payload.chapterId) return `/reader/${payload.chapterId}#comment-${commentId}`;
      if (payload.mangaId) return `/manga/${payload.mangaId}#comment-${commentId}`;
      return '/profile';
    }
    case 'COMMENT_ON_REVIEW': {
      if (payload.reviewId) {
        return `/manga/${payload.mangaId || ''}?review=${payload.reviewId}#comment-${payload.commentId}`;
      }
      return payload.mangaId ? `/manga/${payload.mangaId}` : '/';
    }
    case 'NEW_COMMENT_ON_USER_FORUM_THREAD':
    case 'REPLY_IN_FORUM_THREAD': {
      if (payload.threadId) {
        const postAnchor = payload.postId ? `#post-${payload.postId}` : '';
        return `/forum/thread/${payload.threadId}${postAnchor}`;
      }
      return '/forum';
    }
    case 'BOOKMARK_NEW_CHAPTER': {
      if (payload.chapterId) return buildReaderPath(payload.chapterId, payload.mangaSlug);
      if (payload.mangaId) return `/manga/${payload.mangaId}`;
      return '/';
    }
    case 'FRIEND_REQUEST_RECEIVED':
    case 'FRIEND_REQUEST_ACCEPTED': {
      return '/profile?tab=friends';
    }
    default:
      return null;
  }
}
