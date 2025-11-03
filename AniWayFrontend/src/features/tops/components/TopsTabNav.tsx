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
              'group relative flex min-w-[140px] flex-1 cursor-pointer items-center gap-3 rounded-full px-4 py-2 text-left text-xs md:text-sm transition-colors focus-visible:outline-none',
              isActive
                ? 'border border-primary/50 bg-primary/20 text-white shadow-sm'
                : 'border border-white/10 bg-white/5 text-white/70 hover:border-primary/40 hover:bg-primary/10 hover:text-white'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/75 transition-colors group-hover:bg-white/12 group-hover:text-white">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight">{meta.label}</div>
              <div className="mt-0.5 text-[10px] text-white/55 line-clamp-2">{meta.description}</div>
            </div>
          </GlassPanel>
        )
      })}
    </div>
  )
}
