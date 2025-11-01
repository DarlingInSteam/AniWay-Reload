import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { commentService } from '@/services/commentService'
import { getDisplayChapterNumber } from '@/lib/chapterUtils'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { CommentResponseDTO } from '@/types/comments'

interface ChapterTransitionPreviewProps {
  chapterId: number
  chapterNumber: number
  isNextReady?: boolean
  onShowAll?: (chapterId: number) => void
}

export const ChapterTransitionPreview = ({ chapterId, chapterNumber, isNextReady, onShowAll }: ChapterTransitionPreviewProps) => {
  const { data, isLoading, isError } = useQuery<CommentResponseDTO[]>({
    queryKey: ['chapter-comments-preview', chapterId],
    queryFn: () => commentService.getComments(chapterId, 'CHAPTER', 0, 3, 'createdAt', 'desc'),
    staleTime: 30_000,
    enabled: chapterId > 0
  })

  const comments = useMemo(() => {
    if (!data) return []
    if (Array.isArray(data)) return data.slice(0, 3)
    const payload = data as unknown as { content?: CommentResponseDTO[] }
    if (Array.isArray(payload?.content)) return payload.content.slice(0, 3)
    return []
  }, [data])

  const statusLabel = isNextReady
    ? 'Следующая глава загружена — листай, когда будешь готов.'
    : 'Подгружаем следующую главу, почитай, что думают другие.'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-white/12 bg-black/70 p-4 backdrop-blur-md sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white sm:text-base">
            Комментарии к главе {getDisplayChapterNumber(chapterNumber)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white"
            onClick={() => onShowAll?.(chapterId)}
          >
            Показать все
          </Button>
        </div>

        <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          {statusLabel}
        </p>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-6 text-white/70">
              <LoadingSpinner size="sm" />
            </div>
          ) : isError ? (
            <p className="text-sm text-white/60">Не удалось загрузить комментарии.</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-white/60">Пока нет комментариев. Будь первым!</p>
          ) : (
            comments.map(comment => (
              <div
                key={comment.id}
                className="rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">
                    {comment.username}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/50">
                    {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-white/80">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
