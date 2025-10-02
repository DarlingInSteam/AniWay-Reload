import type { UseQueryResult } from '@tanstack/react-query'

import { ArrowUpRight, Eye, MessageSquare, ThumbsUp } from 'lucide-react'

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

  const featured = threads[0]
  const others = threads.slice(1)

  const aggregate = threads.reduce(
    (acc, thread) => {
      const replies = thread.repliesCount ?? 0
      const likes = thread.likesCount ?? thread.likeCount ?? 0
      const views = thread.viewsCount ?? 0
      return {
        replies: acc.replies + replies,
        likes: acc.likes + likes,
        views: acc.views + views
      }
    },
    { replies: 0, likes: 0, views: 0 }
  )

  const averages = {
    replies: aggregate.replies / threads.length,
    likes: aggregate.likes / threads.length,
    views: aggregate.views / threads.length
  }

  const trending = [...threads]
    .sort((a, b) => (b.repliesCount ?? 0) - (a.repliesCount ?? 0))
    .slice(0, Math.min(3, threads.length))

  const relativeFormatter = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '—'
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) return '—'
    const diffMs = parsed.getTime() - Date.now()
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 1000 * 60 * 60 * 24 * 365],
      ['month', 1000 * 60 * 60 * 24 * 30],
      ['week', 1000 * 60 * 60 * 24 * 7],
      ['day', 1000 * 60 * 60 * 24],
      ['hour', 1000 * 60 * 60],
      ['minute', 1000 * 60]
    ]

    for (const [unit, amount] of units) {
      if (Math.abs(diffMs) >= amount || unit === 'minute') {
        const value = Math.round(diffMs / amount)
        if (value === 0 && unit === 'minute') {
          return 'только что'
        }
        return relativeFormatter.format(value, unit)
      }
    }

    return 'только что'
  }

  const formatExcerpt = (excerpt?: string) => (excerpt || '').trim()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr),minmax(260px,1fr)]">
        {featured && (
          <GlassPanel className="relative overflow-hidden border-white/10 bg-background/80 p-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-base font-semibold text-white/85">
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="flex-1 text-lg font-semibold text-white">
                      {featured.title || `Тема #${featured.id}`}
                    </h3>
                    <span className="text-[11px] text-white/60">{formatRelativeTime(featured.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/65">
                    {threadAuthorMap[featured.authorId] && (
                      <span className="inline-flex items-center gap-2">
                        {threadAuthorMap[featured.authorId].avatar && (
                          <img
                            src={threadAuthorMap[featured.authorId].avatar}
                            className="h-4 w-4 rounded-full object-cover"
                            alt={threadAuthorMap[featured.authorId].username}
                          />
                        )}
                        <span>{threadAuthorMap[featured.authorId].displayName || threadAuthorMap[featured.authorId].username}</span>
                      </span>
                    )}
                    <span className="rounded-full bg-white/10 px-2 py-0.5">Ответы {formatter.integer.format(featured.repliesCount ?? 0)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5">Лайки {formatter.integer.format(featured.likesCount ?? featured.likeCount ?? 0)}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5">Просмотры {formatter.integer.format(featured.viewsCount ?? 0)}</span>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
                <MarkdownRenderer value={formatExcerpt(featured.contentExcerpt)} />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
                <button
                  type="button"
                  onClick={() => featured.id && onNavigate(`/forum/thread/${featured.id}#from-tops`)}
                  className="glass-inline inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-white/80 underline decoration-dotted decoration-white/45 transition hover:text-white"
                >
                  Читать тему
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </GlassPanel>
        )}

        <GlassPanel className="border-white/10 bg-background/75 p-5">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Пульс форума</div>
              <p className="mt-1 text-xs text-white/60">Краткая сводка активности за выбранный период.</p>
            </div>
            <div className="grid gap-3 text-sm text-white/80">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <MessageSquare className="h-4 w-4 text-white/60" />
                <div className="flex-1">
                  <div className="text-xs text-white/60">Тем в подборке</div>
                  <div className="text-sm font-semibold text-white">{formatter.integer.format(threads.length)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <MessageSquare className="h-4 w-4 text-white/60" />
                <div className="flex-1">
                  <div className="text-xs text-white/60">Всего ответов</div>
                  <div className="text-sm font-semibold text-white">{formatter.integer.format(aggregate.replies)}</div>
                </div>
                <span className="text-[11px] text-white/55">≈ {formatter.integer.format(Math.round(averages.replies))} на тему</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <ThumbsUp className="h-4 w-4 text-white/60" />
                <div className="flex-1">
                  <div className="text-xs text-white/60">Получено реакций</div>
                  <div className="text-sm font-semibold text-white">{formatter.integer.format(aggregate.likes)}</div>
                </div>
                <span className="text-[11px] text-white/55">≈ {formatter.integer.format(Math.round(averages.likes))} на тему</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                <Eye className="h-4 w-4 text-white/60" />
                <div className="flex-1">
                  <div className="text-xs text-white/60">Просмотров всего</div>
                  <div className="text-sm font-semibold text-white">{formatter.integer.format(aggregate.views)}</div>
                </div>
                <span className="text-[11px] text-white/55">≈ {formatter.integer.format(Math.round(averages.views))} на тему</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/55">Самые обсуждаемые</div>
              <div className="mt-3 space-y-2">
                {trending.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => thread.id && onNavigate(`/forum/thread/${thread.id}#from-tops`)}
                    className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-white/50" />
                    <span className="flex-1 truncate">{thread.title || `Тема #${thread.id}`}</span>
                    <span className="text-[11px] font-semibold text-white/70">{formatter.integer.format(thread.repliesCount ?? 0)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {others.length > 0 && (
        <GlassPanel className="border-white/10 bg-background/70 p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-white">Движение в темах</div>
              <p className="text-xs text-white/60">Собрали ещё обсуждения, которые стоит догнать.</p>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {others.map((thread, index) => {
              const rank = index + 2
              const author = threadAuthorMap[thread.authorId]
              return (
                <button
                  key={thread.id || rank}
                  type="button"
                  onClick={() => thread.id && onNavigate(`/forum/thread/${thread.id}#from-tops`)}
                  className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-white/80">
                      {rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h4 className="flex-1 truncate text-sm font-semibold text-white">
                          {thread.title || `Тема #${thread.id}`}
                        </h4>
                        <span className="text-[11px] text-white/55">{formatRelativeTime(thread.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/65">
                        {author && (
                          <span className="inline-flex items-center gap-2">
                            {author.avatar && (
                              <img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
                            )}
                            <span>{author.displayName || author.username}</span>
                          </span>
                        )}
                        <span className="rounded-full bg-white/10 px-2 py-0.5">Ответы {formatter.integer.format(thread.repliesCount ?? 0)}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5">Лайки {formatter.integer.format(thread.likesCount ?? thread.likeCount ?? 0)}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5">Просмотры {formatter.integer.format(thread.viewsCount ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                  {thread.contentExcerpt && (
                    <div className="max-h-20 overflow-hidden text-xs leading-relaxed text-white/65">
                      <MarkdownRenderer value={formatExcerpt(thread.contentExcerpt)} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}
