import { useMemo } from 'react'
import { Flame, MessageSquare, Eye, ThumbsUp, ArrowUpRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { ForumThread } from '@/types/forum'

export interface ForumActivityStats {
  totalThreads: number
  totalReplies: number
  totalViews: number
  totalLikes: number
  activeToday: number
  createdToday: number
  participants: number
  trending: ForumThread[]
  recentlyUpdated: ForumThread[]
}

const numberFormatter = new Intl.NumberFormat('ru-RU')

export function ForumActivityPanel({ stats }: { stats: ForumActivityStats }) {
  const hasContent = stats.totalThreads > 0
  const trending = useMemo(() => stats.trending.slice(0, 4), [stats.trending])
  const recent = useMemo(() => stats.recentlyUpdated.slice(0, 4), [stats.recentlyUpdated])

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
        <div className="text-sm font-semibold text-white">Форум пока пустует</div>
        <p className="mt-2 text-xs text-white/60">Когда появятся темы, здесь появится краткая сводка активности.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.035] p-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Flame className="h-4 w-4 text-white/70" />
          Пульс форума
        </div>
        <p className="mt-1 text-xs text-white/60">Сводка по активным обсуждениям за выбранный период.</p>
      </div>

      <div className="mt-4 grid gap-3 text-white/80">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2">
          <MessageSquare className="h-4 w-4 text-white/60" />
          <div className="flex-1">
            <div className="text-xs text-white/60">Тем всего</div>
            <div className="text-sm font-semibold text-white">{numberFormatter.format(stats.totalThreads)}</div>
          </div>
          <span className="text-[11px] text-white/55">+{numberFormatter.format(stats.createdToday)} сегодня</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2">
          <Eye className="h-4 w-4 text-white/60" />
          <div className="flex-1">
            <div className="text-xs text-white/60">Просмотров всего</div>
            <div className="text-sm font-semibold text-white">{numberFormatter.format(stats.totalViews)}</div>
          </div>
          <span className="text-[11px] text-white/55">{numberFormatter.format(stats.activeToday)} активных 24ч</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2">
          <ThumbsUp className="h-4 w-4 text-white/60" />
          <div className="flex-1">
            <div className="text-xs text-white/60">Реакций всего</div>
            <div className="text-sm font-semibold text-white">{numberFormatter.format(stats.totalLikes)}</div>
          </div>
          <span className="text-[11px] text-white/55">{numberFormatter.format(stats.totalReplies)} ответов</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2">
          <Users className="h-4 w-4 text-white/60" />
          <div className="flex-1">
            <div className="text-xs text-white/60">Участников в обсуждениях</div>
            <div className="text-sm font-semibold text-white">{numberFormatter.format(stats.participants)}</div>
          </div>
          <span className="text-[11px] text-white/55">за 7 дней</span>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/55">Самые обсуждаемые</div>
          <div className="mt-3 space-y-2">
            {trending.map((thread) => {
              const title = thread.title || `Тема #${thread.id}`
              const replies = numberFormatter.format(thread.repliesCount ?? 0)
              return (
                <Link
                  key={`trending-${thread.id}`}
                  to={`/forum/thread/${thread.id}`}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-white/50" />
                  <span className="flex-1 truncate">{title}</span>
                  <span className="text-[11px] font-semibold text-white/70">{replies}</span>
                </Link>
              )
            })}
            {!trending.length && <div className="text-[11px] text-white/55">Нет данных для отображения.</div>}
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/55">Недавние обновления</div>
          <div className="mt-3 space-y-2">
            {recent.map((thread) => {
              const title = thread.title || `Тема #${thread.id}`
              const when = formatRelativeTime(thread.lastActivityAt ?? thread.updatedAt ?? thread.createdAt)
              return (
                <Link
                  key={`recent-${thread.id}`}
                  to={`/forum/thread/${thread.id}`}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/50" />
                  <span className="flex-1 truncate">{title}</span>
                  <span className="text-[10px] text-white/55">{when}</span>
                </Link>
              )
            })}
            {!recent.length && <div className="text-[11px] text-white/55">Обновления пока не появились.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return '—'
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return '—'
  const diff = parsed.getTime() - Date.now()
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60]
  ]
  const formatter = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
  for (const [unit, amount] of units) {
    if (Math.abs(diff) >= amount || unit === 'minute') {
      const value = Math.round(diff / amount)
      if (value === 0 && unit === 'minute') {
        return 'только что'
      }
      return formatter.format(value, unit)
    }
  }
  return 'только что'
}
