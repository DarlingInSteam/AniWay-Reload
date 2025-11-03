import type { UseQueryResult } from '@tanstack/react-query'

import type { TopCommentDTO } from '@/types'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

import type { FormatterBundle } from './types.ts'
import type { UserMini } from '@/hooks/useUserMiniBatch'
import { EmptyState, GlassPanel } from '../primitives'

const TARGET_PREFIX: Record<string, string> = {
  MANGA: '/manga/',
  CHAPTER: '/reader/',
  REVIEW: '/reviews/',
  POST: '/forum/post/',
  PROFILE: '/profile/',
  PROFILE_POST: '/profile/'
}

export type CommentsSectionProps = {
  query: UseQueryResult<TopCommentDTO[]>
  formatter: FormatterBundle
  commentAuthorMap: Record<number, UserMini>
  onNavigate: (path: string) => void
}

export function CommentsSection({ query, formatter, commentAuthorMap, onNavigate }: CommentsSectionProps) {
  if (query.isLoading) return <LeaderboardSkeleton rows={10} />
  if (query.isError) return <LeaderboardError onRetry={() => query.refetch()} />

  const comments = (query.data ?? []) as TopCommentDTO[]
  if (!comments.length) {
    return <EmptyState message="Комментарии для выбранного диапазона пока не выделяются." />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {comments.map((comment, index) => {
        const likeVal = typeof comment.likesCount === 'number' ? comment.likesCount : comment.likeCount ?? 0
        const dislikeVal = typeof comment.dislikesCount === 'number' ? comment.dislikesCount : comment.dislikeCount ?? 0
        const trust = typeof comment.trustFactor === 'number' ? comment.trustFactor : likeVal - dislikeVal
        const type = (comment.commentType || '').toUpperCase()
        const author = commentAuthorMap[comment.userId]
        const targetId = comment.targetId
        const prefix = TARGET_PREFIX[type] || '/comments/'
        const link = targetId ? `${prefix}${targetId}#comment-${comment.id}` : `/comments/${comment.id}`

        return (
          <GlassPanel
            key={comment.id || index}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06] active:bg-white/[0.08]"
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  {author && (
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-white/60">
                      {author.avatar && (
                        <img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
                      )}
                      <span>{author.displayName || author.username}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        trust > 0
                          ? 'bg-emerald-500/25 text-emerald-100'
                          : trust < 0
                            ? 'bg-rose-600/35 text-rose-100'
                            : 'bg-white/10 text-white/70'
                      }`}
                    >
                      Trust {formatter.integer.format(trust)}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">👍 {formatter.integer.format(likeVal)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">👎 {formatter.integer.format(dislikeVal)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">{type || 'Комментарий'}</span>
                  </div>
                  <div className="mt-3 prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                    <MarkdownRenderer value={comment.contentExcerpt || ''} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <button
                  type="button"
                  onClick={() => onNavigate(link)}
                  className="glass-inline inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold text-white/80 underline decoration-dotted decoration-white/45 transition hover:text-white"
                >
                  Перейти к источнику
                </button>
              </div>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
