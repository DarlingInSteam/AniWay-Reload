import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { Trophy, Quote, Hash, MessageSquare, Sparkles } from 'lucide-react'

import { apiClient } from '@/lib/api'
import { useUserLevelsBatch } from '@/hooks/useUserLevelsBatch'
import { useUserMiniBatch } from '@/hooks/useUserMiniBatch'
import { useMangaMiniBatch } from '@/hooks/useMangaMiniBatch'
import type {
  TopCommentDTO,
  TopForumThreadDTO,
  TopReviewDTO,
  TopUserDTO,
  TopWallPostDTO
} from '@/types'

import type { SummaryCard, UserMetric } from '../types'

export const integerFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
export const compactFormatter = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })

export type TopsDataInput = {
  userMetric: UserMetric
  reviewsDays: number
  threadsRange: 'all' | '30' | '7'
  commentsRange: 'all' | '30' | '7'
  wallRange: 'all' | '30' | '7' | 'today'
}

export type TopsDataResult = {
  usersQuery: UseQueryResult<TopUserDTO[]>
  reviewsQuery: UseQueryResult<TopReviewDTO[]>
  threadsQuery: UseQueryResult<TopForumThreadDTO[]>
  commentsQuery: UseQueryResult<TopCommentDTO[]>
  wallPostsQuery: UseQueryResult<TopWallPostDTO[]>
  userLevelMap: ReturnType<typeof useUserLevelsBatch>
  reviewUserMap: ReturnType<typeof useUserMiniBatch>
  reviewMangaMap: ReturnType<typeof useMangaMiniBatch>
  threadAuthorMap: ReturnType<typeof useUserMiniBatch>
  commentAuthorMap: ReturnType<typeof useUserMiniBatch>
  wallAuthorMap: ReturnType<typeof useUserMiniBatch>
  wallMangaMap: ReturnType<typeof useMangaMiniBatch>
  summaryCards: SummaryCard[]
}

export function useTopsData({ userMetric, reviewsDays, threadsRange, commentsRange, wallRange }: TopsDataInput): TopsDataResult {
  const usersQuery = useQuery<TopUserDTO[]>({
    queryKey: ['tops-users', userMetric],
    queryFn: () => apiClient.getTopUsers({ metric: userMetric, limit: 20 }),
    staleTime: 60_000
  })

  const reviewsQuery = useQuery<TopReviewDTO[]>({
    queryKey: ['tops-reviews', reviewsDays],
    queryFn: () => apiClient.getTopReviews({ days: reviewsDays, limit: 20 }),
    staleTime: 60_000
  })

  const threadsQuery = useQuery<TopForumThreadDTO[]>({
    queryKey: ['tops-threads', threadsRange],
    queryFn: () => apiClient.getTopThreads({ range: threadsRange, limit: 15 }),
    staleTime: 60_000
  })

  const commentsQuery = useQuery<TopCommentDTO[]>({
    queryKey: ['tops-comments', commentsRange],
    queryFn: () => apiClient.getTopComments({ range: commentsRange, limit: 15 }),
    staleTime: 60_000
  })

  const wallPostsQuery = useQuery<TopWallPostDTO[]>({
    queryKey: ['tops-wall-posts', wallRange],
    queryFn: () => apiClient.getTopWallPosts({ range: wallRange, limit: 15 }),
    staleTime: 60_000
  })

  const userIds = useMemo(() => (usersQuery.data ?? []).map((user: TopUserDTO) => user.id), [usersQuery.data])
  const reviewUserIds = useMemo(
    () => (reviewsQuery.data ?? []).map((review: TopReviewDTO) => review.userId),
    [reviewsQuery.data]
  )
  const reviewMangaIds = useMemo(
    () =>
      (reviewsQuery.data ?? [])
        .map((review: TopReviewDTO) => review.mangaId)
        .filter((id): id is number => typeof id === 'number'),
    [reviewsQuery.data]
  )
  const threadAuthorIds = useMemo(
    () => (threadsQuery.data ?? []).map((thread: TopForumThreadDTO) => thread.authorId),
    [threadsQuery.data]
  )
  const commentAuthorIds = useMemo(
    () => (commentsQuery.data ?? []).map((comment: TopCommentDTO) => comment.userId),
    [commentsQuery.data]
  )
  const wallAuthorIds = useMemo(
    () => (wallPostsQuery.data ?? []).map((post: TopWallPostDTO) => post.userId),
    [wallPostsQuery.data]
  )
  const wallMangaReferenceIds = useMemo(() => {
    const references = (wallPostsQuery.data ?? []).flatMap((post: TopWallPostDTO) => post.references ?? [])
    return Array.from(
      new Set(
        references
          .filter((ref) => (ref.type || '').toUpperCase() === 'MANGA' && typeof ref.refId === 'number')
          .map((ref) => ref.refId)
      )
    )
  }, [wallPostsQuery.data])

  const userLevelMap = useUserLevelsBatch(userIds)
  const reviewUserMap = useUserMiniBatch(reviewUserIds)
  const reviewMangaMap = useMangaMiniBatch(reviewMangaIds)
  const threadAuthorMap = useUserMiniBatch(threadAuthorIds)
  const commentAuthorMap = useUserMiniBatch(commentAuthorIds)
  const wallAuthorMap = useUserMiniBatch(wallAuthorIds)
  const wallMangaMap = useMangaMiniBatch(wallMangaReferenceIds)

  const summaryCards: SummaryCard[] = useMemo(() => {
    const topUser = (usersQuery.data ?? [])[0] as TopUserDTO | undefined
    const topReview = (reviewsQuery.data ?? [])[0] as TopReviewDTO | undefined
    const topThread = (threadsQuery.data ?? [])[0] as TopForumThreadDTO | undefined
    const topComment = (commentsQuery.data ?? [])[0] as TopCommentDTO | undefined
    const topWallPost = (wallPostsQuery.data ?? [])[0] as TopWallPostDTO | undefined

    const highlightMetric = (() => {
      if (!topUser) return '—'
      switch (userMetric) {
        case 'level':
          return `LVL ${(userLevelMap[topUser.id]?.level ?? topUser.level ?? 0) || 0}`
        case 'likes':
          return `${integerFormatter.format(topUser.likesGivenCount ?? 0)} лайков`
        case 'comments':
          return `${integerFormatter.format(topUser.commentsCount ?? 0)} комм.`
        case 'readers':
        default:
          return `${integerFormatter.format(topUser.chaptersReadCount ?? 0)} глав`
      }
    })()

    const reviewMetric = topReview
      ? typeof topReview.rating === 'number'
        ? `${topReview.rating.toFixed(1)} / 10`
        : `${integerFormatter.format(topReview.likesCount ?? topReview.likeCount ?? 0)} лайков`
      : '—'

    const threadMetric = topThread
      ? typeof topThread.repliesCount === 'number'
        ? `${integerFormatter.format(topThread.repliesCount)} ответов`
        : typeof topThread.viewsCount === 'number'
          ? `${compactFormatter.format(topThread.viewsCount)} просмотров`
          : '—'
      : '—'

    const commentTrust = topComment
      ? integerFormatter.format(
          (topComment.likesCount ?? topComment.likeCount ?? 0) - (topComment.dislikesCount ?? topComment.dislikeCount ?? 0)
        )
      : '—'

    const wallMetric = topWallPost
      ? `${compactFormatter.format(topWallPost.stats?.up ?? topWallPost.stats?.score ?? 0)} реакций`
      : '—'

    return [
      {
        key: 'users-top',
        label: topUser?.username ? 'Топ участник' : 'Активность',
        value: topUser?.username ?? 'Ещё собираем',
        hint: highlightMetric,
        icon: Trophy,
        tone: 'primary'
      },
      {
        key: 'reviews-top',
        label: 'Сильный обзор',
        value: reviewMetric,
        hint: topReview?.mangaTitle || topReview?.comment?.slice(0, 60) || 'Ожидаем свежие обзоры',
        icon: Quote,
        tone: 'rose'
      },
      {
        key: 'threads-top',
        label: 'Горячая тема',
        value: threadMetric,
        hint: topThread?.title || topThread?.contentExcerpt?.slice(0, 60) || 'Ждём обсуждений',
        icon: Hash,
        tone: 'sky'
      },
      {
        key: 'comments-top',
        label: 'Комментарий дня',
        value: `${commentTrust} trust`,
        hint: topComment?.contentExcerpt?.slice(0, 60) || 'Здесь появится лучший комментарий',
        icon: MessageSquare,
        tone: 'emerald'
      },
      {
        key: 'wall-top',
        label: 'Пост на стене',
        value: wallMetric,
        hint: 'Следите за рекомендациями сообщества',
        icon: Sparkles,
        tone: 'amber'
      }
    ] satisfies SummaryCard[]
  }, [
    commentsQuery.data,
    threadsQuery.data,
    reviewsQuery.data,
    usersQuery.data,
    wallPostsQuery.data,
    userMetric,
    userLevelMap
  ])

  return {
    usersQuery,
    reviewsQuery,
    threadsQuery,
    commentsQuery,
    wallPostsQuery,
    userLevelMap,
    reviewUserMap,
    reviewMangaMap,
    threadAuthorMap,
    commentAuthorMap,
    wallAuthorMap,
    wallMangaMap,
    summaryCards
  }
}
