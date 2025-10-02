import type { SummaryCard, SummaryTone } from '../types'
import { GlassPanel } from './primitives'

const neutralCardHover = 'hover:border-white/20 hover:bg-white/10'
const neutralIcon = 'bg-white/10 text-white/80'

const toneStyles: Record<SummaryTone, { card: string; icon: string }> = {
  primary: { card: neutralCardHover, icon: neutralIcon },
  rose: { card: neutralCardHover, icon: neutralIcon },
  sky: { card: neutralCardHover, icon: neutralIcon },
  emerald: { card: neutralCardHover, icon: neutralIcon },
  amber: { card: neutralCardHover, icon: neutralIcon }
}

export function TopsHero({ summaryCards }: { summaryCards: SummaryCard[] }) {
  return (
    <GlassPanel className="relative overflow-hidden border-white/10 bg-background/70 p-6 md:p-8">
      <div className="relative z-10">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => {
            const CardIcon = card.icon
            const tone = toneStyles[card.tone]
            return (
              <GlassPanel
                key={card.key}
                className={`relative overflow-hidden border-white/10 bg-background/70 p-4 transition duration-200 ${tone.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-white/60">{card.label}</div>
                    <div className="mt-2 text-xl font-semibold text-white md:text-2xl">{card.value}</div>
                  </div>
                  <div className={`rounded-full p-2 text-xs ${tone.icon}`}>
                    <CardIcon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-white/55">{card.hint}</div>
              </GlassPanel>
            )
          })}
        </div>
      </div>
    </GlassPanel>
  )
}
