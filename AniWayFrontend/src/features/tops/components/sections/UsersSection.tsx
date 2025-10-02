import type { UseQueryResult } from '@tanstack/react-query'

import type { TopUserDTO } from '@/types'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { LeaderboardRow } from '@/components/tops/LeaderboardRow'

import type { UserLevelData } from '@/hooks/useUserLevelsBatch'

import type { UserMetric } from '../../types'
import type { FormatterBundle } from './types.ts'
import { EmptyState, GlassPanel, InlineChip } from '../primitives'

export type UsersSectionProps = {
  query: UseQueryResult<TopUserDTO[]>
  userMetric: UserMetric
  userLevelMap: Record<number, UserLevelData>
  formatter: FormatterBundle
  onNavigateToProfile: (id: number) => void
}

export function UsersSection({ query, userMetric, userLevelMap, formatter, onNavigateToProfile }: UsersSectionProps) {
  if (query.isLoading) return <LeaderboardSkeleton rows={10} />
  if (query.isError) return <LeaderboardError onRetry={() => query.refetch()} />

  const users = (query.data ?? []) as TopUserDTO[]
  if (!users.length) {
    return <EmptyState message="Ещё не набралось активности по выбранной метрике." />
  }

  const highlights = users.slice(0, 3)
  const others = users.slice(3)

  const getMetricValue = (user: TopUserDTO) => {
    const level = userLevelMap[user.id]?.level ?? user.level ?? 0
    switch (userMetric) {
      case 'likes':
        return formatter.integer.format(user.likesGivenCount ?? 0)
      case 'comments':
        return formatter.integer.format(user.commentsCount ?? 0)
      case 'level':
        return `LVL ${level}`
      case 'readers':
      default:
        return formatter.integer.format(user.chaptersReadCount ?? 0)
    }
  }

  const getMetricLabel = (user: TopUserDTO) => {
    const base = getMetricValue(user)
    if (userMetric === 'level') {
      return base
    }
    const suffix = userMetric === 'comments' ? 'комм.' : userMetric === 'likes' ? 'лайков' : 'глав'
    return `${base} ${suffix}`
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {highlights.map((user, index) => {
          const level = userLevelMap[user.id]?.level ?? user.level ?? undefined
          const xpTotal = userLevelMap[user.id]?.totalXp ?? user.xp ?? undefined
          return (
            <GlassPanel
              key={user.id || index}
              className="group relative overflow-hidden border-white/10 bg-background/75 p-5 text-left transition hover:border-primary/35 hover:bg-primary/10"
              onClick={() => user.id && onNavigateToProfile(user.id)}
            >
              <div className="absolute inset-0 bg-primary/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
              <div className="relative z-10 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white/80">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                      ) : (
                        (user.username || '?')[0]
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-background shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-white">{user.username || 'Без имени'}</div>
                    <div className="mt-1 text-xs text-white/60">ID {user.id}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
                      {level != null && <InlineChip>LVL {level}</InlineChip>}
                      {xpTotal != null && <InlineChip>XP {xpTotal}</InlineChip>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>Метрика</span>
                  <span className="font-semibold text-white">{getMetricValue(user)}</span>
                </div>
              </div>
            </GlassPanel>
          )
        })}
      </div>

      {others.length > 0 && (
        <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-background/65">
          {others.map((user, index) => {
            const rank = index + highlights.length + 1
            const level = userLevelMap[user.id]?.level ?? user.level ?? undefined
            const avatar = user.avatar ? (
              <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold uppercase">{(user.username || '?').slice(0, 2)}</span>
            )
            const details = [getMetricLabel(user)]
            if (level) details.push(`LVL ${level}`)

            return (
              <LeaderboardRow
                key={user.id || rank}
                rank={rank}
                avatar={avatar}
                primary={
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-white">{user.username || 'Без имени'}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60">ID {user.id}</span>
                  </div>
                }
                secondary={<span className="text-[11px] text-white/60">{details.join(' · ')}</span>}
                metricValue={<span className="text-xs font-semibold text-white/85">{getMetricValue(user)}</span>}
                onClick={() => user.id && onNavigateToProfile(user.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
