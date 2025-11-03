import type { ReactNode } from 'react'

import type { TopsTabMeta } from '../types'
import { GlassPanel } from './primitives'

export type TopsSidebarProps = {
  meta: TopsTabMeta
  filterCard?: ReactNode
}

export function TopsSidebar({ meta, filterCard }: TopsSidebarProps) {
  const Icon = meta.icon
  return (
    <div className="space-y-6">
      <GlassPanel className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/10 p-2 text-white/75">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-white/90">{meta.label}</div>
            <p className="text-[11px] leading-snug text-white/55">{meta.description}</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-white/50">{meta.hint}</p>
      </GlassPanel>
      {filterCard}
    </div>
  )
}
