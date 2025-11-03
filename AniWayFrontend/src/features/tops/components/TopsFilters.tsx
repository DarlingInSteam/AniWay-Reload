import type { UserMetric, RangeOptionValue, WallRangeOptionValue } from '../types'
import { USER_METRIC_OPTIONS, RANGE_OPTIONS, REVIEW_RANGE_OPTIONS, WALL_RANGE_OPTIONS } from '../constants'
import { SegmentedControl } from './primitives'
import { Users, BookOpen, Hash, MessageSquare, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type UsersMetricFilterProps = {
  value: UserMetric
  onChange: (metric: UserMetric) => void
}

export function UsersMetricFilter({ value, onChange }: UsersMetricFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/65">
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Метрика пользователей</div>
          <p className="text-[11px] text-white/55">Выберите способ оценки активности.</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(metric) => onChange(metric as UserMetric)}
        options={USER_METRIC_OPTIONS}
        className="mt-1"
      />
    </div>
  )
}

export type ReviewsFilterProps = {
  value: number
  onChange: (days: number) => void
}

export function ReviewsFilter({ value, onChange }: ReviewsFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/65">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Период обзоров</div>
          <p className="text-[11px] text-white/55">Дней для расчёта реакции.</p>
        </div>
      </div>
      <SegmentedControl
        value={String(value)}
        onChange={(days) => onChange(Number(days))}
        options={REVIEW_RANGE_OPTIONS}
        className="mt-1"
      />
    </div>
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
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/65">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
          <p className="text-[11px] text-white/55">{description}</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(next) => onChange(next as RangeOptionValue)}
        options={RANGE_OPTIONS}
        className="mt-1"
      />
    </div>
  )
}

export type WallRangeFilterProps = {
  value: WallRangeOptionValue
  onChange: (value: WallRangeOptionValue) => void
}

export function WallRangeFilter({ value, onChange }: WallRangeFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/65">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Период постов</div>
          <p className="text-[11px] text-white/55">Отбор активности стены.</p>
        </div>
      </div>
      <SegmentedControl
        value={value}
        onChange={(next) => onChange(next as WallRangeOptionValue)}
        options={WALL_RANGE_OPTIONS}
        className="mt-1"
      />
    </div>
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
