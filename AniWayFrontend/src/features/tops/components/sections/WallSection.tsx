import type { UseQueryResult } from '@tanstack/react-query'

import type { TopWallPostDTO } from '@/types'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

import type { FormatterBundle } from './types.ts'
import type { UserMini } from '@/hooks/useUserMiniBatch'
import type { MangaMini } from '@/hooks/useMangaMiniBatch'
import { EmptyState, GlassPanel } from '../primitives'

export type WallSectionProps = {
  query: UseQueryResult<TopWallPostDTO[]>
  formatter: FormatterBundle
  wallAuthorMap: Record<number, UserMini>
  wallMangaMap: Record<number, MangaMini>
  onNavigate: (path: string) => void
}

export function WallSection({ query, formatter, wallAuthorMap, wallMangaMap, onNavigate }: WallSectionProps) {
  if (query.isLoading) return <LeaderboardSkeleton rows={10} />
  if (query.isError) return <LeaderboardError onRetry={() => query.refetch()} />

  const posts = (query.data ?? []) as TopWallPostDTO[]
  if (!posts.length) {
    return <EmptyState message="Пока нет ярких постов на стене." />
  }

  return (
    <div className="grid gap-4">
      {posts.map((post, index) => {
        const stats = post.stats
        const author = wallAuthorMap[post.userId]
        const references = (post.references || []).filter((ref) => (ref.type || '').toUpperCase() === 'MANGA')
        const score = typeof stats?.score === 'number' ? stats.score : (stats?.up ?? 0) - (stats?.down ?? 0)
        const attachments = post.attachments ?? []

        return (
          <GlassPanel
            key={post.id || index}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06] active:bg-white/[0.08]"
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {author && (
                    <div className="flex items-center gap-2 text-[11px] text-white/60">
                      {author.avatar && (
                        <img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
                      )}
                      <span>{author.displayName || author.username}</span>
                    </div>
                  )}
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                    <MarkdownRenderer value={post.content || ''} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
                <span className="rounded-full bg-white/10 px-2 py-0.5">Score {formatter.integer.format(score)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">👍 {formatter.integer.format(stats?.up ?? 0)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">👎 {formatter.integer.format(stats?.down ?? 0)}</span>
              </div>
              {references.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {references.map((ref) => {
                    const mangaId = typeof ref.refId === 'number' ? ref.refId : undefined
                    const manga = mangaId ? wallMangaMap[mangaId] : undefined
                    if (!manga) return null
                    return (
                      <button
                          type="button"
                          key={`${post.id}-${mangaId}`}
                          onClick={() => onNavigate(`/manga/${manga.id}#wall-post-${post.id}`)}
                          className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06] active:bg-white/[0.08]"
                        >
                        <div className="flex h-14 w-12 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-[10px] text-white/40">
                          {manga.cover ? <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover" /> : '—'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-white group-hover:text-white">{manga.title}</div>
                          <div className="text-[11px] text-white/55">Манга</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {attachments.slice(0, 6).map((attachment) => (
                    <div key={attachment.id} className="relative overflow-hidden rounded-xl border border-white/10">
                      <img src={attachment.url} alt={attachment.filename} className="h-24 w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <button
                  type="button"
                  onClick={() => post.userId && onNavigate(`/profile/${post.userId}#wall-post-${post.id}`)}
                  className="glass-inline inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold text-white/80 underline decoration-dotted decoration-white/45 transition hover:text-white"
                >
                  Перейти к посту
                </button>
              </div>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
