export type ReactionValue = 'LIKE' | 'DISLIKE' | null;

export interface CommentDTO {
  id: number;
  content: string;
  commentType: string; // 'POST'
  targetId: number;
  userId: number;
  username?: string;
  userAvatarUrl?: string;
  parentCommentId?: number | null;
  parentCommentAuthor?: string | null;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: ReactionValue;
  isEdited?: boolean;
  isDeleted?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  depthLevel?: number;
  createdAt: string;
  updatedAt: string;
  replies?: CommentDTO[]; // backend может прислать дерево
  repliesCount?: number;
}

export interface CreateCommentRequest {
  content: string;
  targetId: number;
  parentCommentId?: number;
}
// Legacy broad DTOs kept minimal; extended interfaces trimmed for first integration

export interface CommentCreateDTO {
  content: string
  targetId: number
  commentType: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST' | 'MOMENT'
  parentCommentId?: number
}

export interface CommentUpdateDTO {
  content: string
}

export interface CommentResponseDTO {
  id: number
  content: string
  userId: number
  username: string
  userAvatar?: string
  targetId: number
  type?: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST' | 'MOMENT' // Опциональное для обратной совместимости
  commentType?: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST' | 'MOMENT' // Реальное поле с бэкенда
  parentCommentId?: number
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean
  canEdit?: boolean
  canDelete?: boolean
  likesCount: number
  dislikesCount: number
  userReaction?: 'LIKE' | 'DISLIKE'
  replies?: CommentResponseDTO[]
  repliesCount?: number
}

// Расширенная версия комментария с дополнительной информацией
// Additional DTOs (reactions, error, user info) omitted for initial comment UI scope

// Minimal enhanced comment interface kept for backwards compatibility with legacy hooks/components
// that expected an EnhancedCommentResponseDTO export. We intentionally make all extra fields optional
// so existing simplified CommentResponseDTO objects remain assignable.
export interface EnhancedCommentResponseDTO extends CommentResponseDTO {
  // Parent comment quick info (legacy fields)
  parentCommentAuthor?: string;
  parentCommentContent?: string;
  // Alternative parent info grouping used in some hooks
  parentCommentInfo?: {
    username?: string;
    content?: string;
  };
  // Target info enrichment (different hooks use either title/subtitle or text/icon/color)
  targetInfo?: {
    // Basic descriptive fields
    title?: string;
    subtitle?: string;
    // Legacy visual descriptor variant
    text?: string;
    icon?: string;
    color?: string;
  };
}
