import type { TopsTabKey } from '../types'
import { TOPS_TAB_META, TOPS_TABS } from '../constants'
import { GlassPanel } from './primitives'
import { cn } from '@/lib/utils'

export type TopsTabNavProps = {
  activeTab: TopsTabKey
  onChange: (tab: TopsTabKey) => void
}

export function TopsTabNav({ activeTab, onChange }: TopsTabNavProps) {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {TOPS_TABS.map((tabKey) => {
        const meta = TOPS_TAB_META[tabKey]
        const Icon = meta.icon
        const isActive = tabKey === activeTab
        return (
          <GlassPanel
            key={tabKey}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onChange(tabKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onChange(tabKey)
              }
            }}
            className={cn(
              'group relative flex min-w-[180px] flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left transition',
              isActive
                ? 'border-primary/40 bg-primary/10 text-white shadow-lg shadow-primary/25'
                : 'bg-background/70 text-white/70 hover:border-primary/35 hover:bg-primary/10 hover:text-white'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{meta.label}</div>
              <div className="text-[11px] text-white/55 line-clamp-2">{meta.description}</div>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
