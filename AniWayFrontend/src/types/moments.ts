export type MomentReactionType = 'LIKE' | 'DISLIKE'

export type MomentSortOption = 'new' | 'popular' | 'active'

export interface MomentImagePayload {
  url: string
  key: string
  width: number
  height: number
  sizeBytes: number
}

export interface MomentCreateRequest {
  mangaId: number
  chapterId?: number | null
  pageNumber?: number | null
  caption: string
  spoiler: boolean
  nsfw: boolean
  image: MomentImagePayload
}

export interface MomentResponse {
  id: number
  mangaId: number
  chapterId?: number | null
  pageNumber?: number | null
  uploaderId: number
  caption: string
  spoiler: boolean
  nsfw: boolean
  hidden: boolean
  reported: boolean
  likesCount: number
  likesCount7d: number
  dislikesCount: number
  commentsCount: number
  commentsCount7d: number
  lastActivityAt: string
  createdAt: string
  updatedAt: string
  image: MomentImagePayload
  userReaction?: MomentReactionType | null
}

export interface MomentPageResponse {
  items: MomentResponse[]
  page: number
  size: number
  total: number
  hasNext: boolean
}
