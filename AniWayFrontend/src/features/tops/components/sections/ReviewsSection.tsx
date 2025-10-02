import type { UseQueryResult } from '@tanstack/react-query'

import type { TopReviewDTO } from '@/types'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

import type { FormatterBundle } from './types.ts'
import { EmptyState, GlassPanel } from '../primitives'
import type { UserMini } from '@/hooks/useUserMiniBatch'
import type { MangaMini } from '@/hooks/useMangaMiniBatch'

export type ReviewsSectionProps = {
  query: UseQueryResult<TopReviewDTO[]>
  formatter: FormatterBundle
  reviewUserMap: Record<number, UserMini>
  reviewMangaMap: Record<number, MangaMini>
  onNavigate: (path: string) => void
}

export function ReviewsSection({ query, formatter, reviewUserMap, reviewMangaMap, onNavigate }: ReviewsSectionProps) {
  if (query.isLoading) return <LeaderboardSkeleton rows={10} />
  if (query.isError) return <LeaderboardError onRetry={() => query.refetch()} />

  const reviews = (query.data ?? []) as TopReviewDTO[]
  if (!reviews.length) {
    return <EmptyState message="За выбранный период обзоры ещё не успели набрать реакции." />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {reviews.map((review, index) => {
        const likeVal = review.likeCount ?? review.likesCount ?? 0
        const dislikeVal = review.dislikeCount ?? review.dislikesCount ?? 0
        const trust = likeVal - dislikeVal
        const author = reviewUserMap[review.userId]
        const manga = review.mangaId ? reviewMangaMap[review.mangaId] : undefined

        return (
          <GlassPanel
            key={review.id || index}
            className="relative overflow-hidden border-white/10 bg-background/75 p-5 transition hover:border-rose-400/35 hover:bg-rose-500/10"
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white/70">
                    {author?.avatar ? (
                      <img src={author.avatar} className="h-full w-full object-cover" alt={author.username} />
                    ) : (
                      (author?.username || review.username || '?')[0]
                    )}
                  </div>
                  <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white shadow">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                    <span className="text-sm font-semibold text-white">
                      {author?.displayName || author?.username || review.username || 'Пользователь'}
                    </span>
                    {review.rating != null && (
                      <span className="glass-inline rounded-full px-2 py-0.5 text-xs font-semibold text-rose-100">
                        {review.rating}/10
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        trust > 0
                          ? 'bg-emerald-500/25 text-emerald-100'
                          : trust < 0
                            ? 'bg-rose-600/35 text-rose-100'
                            : 'bg-primary/20 text-primary'
                      }`}
                    >
                      Trust {formatter.integer.format(trust)}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">👍 {formatter.integer.format(likeVal)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">👎 {formatter.integer.format(dislikeVal)}</span>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                    <MarkdownRenderer value={review.comment || ''} />
                  </div>
                </div>
              </div>
              {review.mangaId && manga && (
                <button
                  type="button"
                  onClick={() => onNavigate(`/manga/${review.mangaId}#review-${review.id}`)}
                  className="glass-panel group flex items-center gap-3 rounded-2xl border-white/15 bg-background/70 p-3 text-left transition hover:border-primary/35 hover:bg-primary/10"
                >
                  <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-[10px] text-white/40">
                    {manga.cover ? <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover" /> : '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white group-hover:text-primary">
                      {manga.title || review.mangaTitle || `Манга #${review.mangaId}`}
                    </div>
                    <div className="text-[11px] text-white/55">Перейти к манге</div>
                  </div>
                </button>
              )}
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
