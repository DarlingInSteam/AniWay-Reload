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
              'group relative flex min-w-[180px] flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-white/12 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/15',
              isActive
                ? 'border-white/25 bg-white/12 text-white shadow-lg shadow-black/25'
                : 'bg-background/70 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white active:bg-white/12'
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/75 transition-colors group-hover:bg-white/12 group-hover:text-white">
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
