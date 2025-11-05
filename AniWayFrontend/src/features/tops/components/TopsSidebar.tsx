import type { ReactNode } from 'react'

import type { TopsTabMeta } from '../types'
import { GlassPanel } from './primitives'

export type TopsSidebarProps = {
  meta: TopsTabMeta
  filterCard?: ReactNode
}

export function TopsSidebar({ meta, filterCard }: TopsSidebarProps) {
  return (
    <div className="space-y-4">
      {filterCard && (
        <GlassPanel className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          {filterCard}
        </GlassPanel>
      )}
    </div>
  )
}
