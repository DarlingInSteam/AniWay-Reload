export interface CommentType {
  MANGA: 'MANGA'
  CHAPTER: 'CHAPTER'
  PROFILE: 'PROFILE'
  REVIEW: 'REVIEW'
}

export interface ReactionType {
  LIKE: 'LIKE'
  DISLIKE: 'DISLIKE'
}

export interface CommentCreateDTO {
  content: string
  targetId: number
  commentType: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW'
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
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW'
  parentCommentId?: number
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean
  likesCount: number
  dislikesCount: number
  replies?: CommentResponseDTO[]
  repliesCount?: number
}

export interface CommentReactionDTO {
  commentId: number
  likesCount: number
  dislikesCount: number
}

export interface UserInfoDTO {
  id: number
  username: string
  email: string
  avatar?: string
  role: string
}

export interface ErrorResponseDTO {
  message: string
  status: number
  timestamp: number
}
