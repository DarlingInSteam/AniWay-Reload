import type { UseQueryResult } from '@tanstack/react-query'

import type { TopForumThreadDTO } from '@/types'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

import { EmptyState, GlassPanel } from '../primitives'
import type { FormatterBundle } from './types.ts'
import type { UserMini } from '@/hooks/useUserMiniBatch'

export type ThreadsSectionProps = {
  query: UseQueryResult<TopForumThreadDTO[]>
  formatter: FormatterBundle
  threadAuthorMap: Record<number, UserMini>
  onNavigate: (path: string) => void
}

export function ThreadsSection({ query, formatter, threadAuthorMap, onNavigate }: ThreadsSectionProps) {
  if (query.isLoading) return <LeaderboardSkeleton rows={10} />
  if (query.isError) return <LeaderboardError onRetry={() => query.refetch()} />

  const threads = (query.data ?? []) as TopForumThreadDTO[]
  if (!threads.length) {
    return <EmptyState message="Пока нет активных тем с выбранным диапазоном." />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {threads.map((thread, index) => {
        const author = threadAuthorMap[thread.authorId]
        return (
          <GlassPanel
            key={thread.id || index}
            className="relative overflow-hidden border-white/10 bg-background/75 p-5 transition-colors hover:border-white/20 hover:bg-white/10 active:bg-white/12"
          >
            <div className="relative z-10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white">{thread.title || `Тема #${thread.id}`}</h3>
                  {author && (
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
                      {author.avatar && (
                        <img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
                      )}
                      <span>{author.displayName || author.username}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                <MarkdownRenderer value={thread.contentExcerpt || ''} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/65">
                <span className="rounded-full bg-white/10 px-2 py-0.5">Ответы: {formatter.integer.format(thread.repliesCount ?? 0)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">Лайки: {formatter.integer.format(thread.likesCount ?? thread.likeCount ?? 0)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">Просмотры: {formatter.integer.format(thread.viewsCount ?? 0)}</span>
                <button
                  type="button"
                  onClick={() => thread.id && onNavigate(`/forum/thread/${thread.id}#from-tops`)}
                  className="ml-auto text-[11px] font-semibold text-white/80 underline decoration-dotted decoration-white/50 transition-colors hover:text-white"
                >
                  Читать тему
                </button>
              </div>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
