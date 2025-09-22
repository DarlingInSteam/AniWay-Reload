// Forum domain types
export interface ForumCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  threadsCount?: number;
  postsCount?: number;
}

export interface ForumThread {
  id: number;
  title: string;
  content: string;
  categoryId: number;
  categoryName?: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  viewsCount: number;
  repliesCount: number;
  likesCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  mangaId?: number;
  mangaTitle?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  lastReplyAt?: string;
  lastReplyUserId?: number;
  lastReplyUserName?: string;
  isSubscribed?: boolean;
  userReaction?: 'LIKE' | 'DISLIKE' | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ForumPost {
  id: number;
  threadId: number;
  content: string;
  authorId: number;
  authorName?: string;
  authorAvatar?: string;
  parentPostId?: number;
  replies?: ForumPost[];
  isDeleted: boolean;
  isEdited: boolean;
  likesCount: number;
  dislikesCount: number;
  createdAt: string;
  updatedAt: string;
  userReaction?: 'LIKE' | 'DISLIKE' | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page index (0-based)
  first: boolean;
  last: boolean;
}

export interface CreateThreadRequest {
  title: string;
  content: string;
  categoryId: number;
  mangaId?: number;
}

export interface UpdateThreadRequest {
  title: string;
  content: string;
}

export interface CreatePostRequest {
  content: string;
  threadId: number;
  parentPostId?: number;
}

export interface UpdatePostRequest {
  content: string;
}
