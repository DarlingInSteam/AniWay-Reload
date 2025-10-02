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
    <div className="space-y-5">
      <GlassPanel className="space-y-4 border-white/12 bg-background/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/10 p-2 text-white/80">
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-white">{meta.label}</div>
            <p className="text-xs text-white/60">{meta.description}</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-white/55">{meta.hint}</p>
      </GlassPanel>
      {filterCard}
    </div>
  )
}
