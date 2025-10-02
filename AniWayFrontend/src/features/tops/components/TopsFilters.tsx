import type { UserMetric, RangeOptionValue, WallRangeOptionValue } from '../types'
import { USER_METRIC_OPTIONS, RANGE_OPTIONS, REVIEW_RANGE_OPTIONS, WALL_RANGE_OPTIONS } from '../constants'
import { GlassPanel, SegmentedControl } from './primitives'
import { Users, BookOpen, Hash, MessageSquare, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type UsersMetricFilterProps = {
  value: UserMetric
  onChange: (metric: UserMetric) => void
}

export function UsersMetricFilter({ value, onChange }: UsersMetricFilterProps) {
  return (
    <GlassPanel className="space-y-4 border-white/12 bg-background/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white/10 p-2 text-white/70">
          <Users className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">Настроить метрику</div>
          <p className="text-xs text-white/60">Выберите способ оценки пользователей.</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(metric) => onChange(metric as UserMetric)}
        options={USER_METRIC_OPTIONS}
      />
    </GlassPanel>
  )
}

export type ReviewsFilterProps = {
  value: number
  onChange: (days: number) => void
}

export function ReviewsFilter({ value, onChange }: ReviewsFilterProps) {
  return (
    <GlassPanel className="space-y-4 border-white/12 bg-background/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white/10 p-2 text-white/70">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">Период обзоров</div>
          <p className="text-xs text-white/60">Сколько дней попадает в выборку рейтинга.</p>
        </div>
      </div>
      <SegmentedControl
        value={String(value)}
        onChange={(days) => onChange(Number(days))}
        options={REVIEW_RANGE_OPTIONS}
      />
    </GlassPanel>
  )
}

export type RangeFilterProps = {
  value: RangeOptionValue
  onChange: (value: RangeOptionValue) => void
  icon: LucideIcon
  title: string
  description: string
}

export function RangeFilter({ value, onChange, icon: Icon, title, description }: RangeFilterProps) {
  return (
    <GlassPanel className="space-y-4 border-white/12 bg-background/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white/10 p-2 text-white/70">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="text-xs text-white/60">{description}</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(next) => onChange(next as RangeOptionValue)}
        options={RANGE_OPTIONS}
      />
    </GlassPanel>
  )
}

export type WallRangeFilterProps = {
  value: WallRangeOptionValue
  onChange: (value: WallRangeOptionValue) => void
}

export function WallRangeFilter({ value, onChange }: WallRangeFilterProps) {
  return (
    <GlassPanel className="space-y-4 border-white/12 bg-background/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-white/10 p-2 text-white/70">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">Период постов</div>
          <p className="text-xs text-white/60">Подборка рекомендаций и постов за выбранное время.</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(next) => onChange(next as WallRangeOptionValue)}
        options={WALL_RANGE_OPTIONS}
      />
    </GlassPanel>
  )
}

export const rangeTitles = {
  threads: {
    title: 'Диапазон обсуждений',
    description: 'Фильтруем темы форума по периоду активности.',
    icon: Hash
  },
  comments: {
    title: 'Диапазон комментариев',
    description: 'Сужайте выборку, чтобы видеть свежие обсуждения.',
    icon: MessageSquare
  }
} as const
