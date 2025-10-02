import type { LucideIcon } from 'lucide-react'

export type TopsTabKey = 'users' | 'reviews' | 'threads' | 'comments' | 'wall'

export type RangeOptionValue = 'all' | '30' | '7'
export type WallRangeOptionValue = RangeOptionValue | 'today'
export type UserMetric = 'readers' | 'likes' | 'comments' | 'level'

export type TopsTabMeta = {
  label: string
  description: string
  hint: string
  icon: LucideIcon
}

export type SegmentedOption = {
  label: string
  value: string
  hint?: string
}

export type SummaryTone = 'primary' | 'rose' | 'sky' | 'emerald' | 'amber'

export type SummaryCard = {
  key: string
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: SummaryTone
}
