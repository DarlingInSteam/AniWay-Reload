import type { SummaryCard, SummaryTone } from '../types'
import { GlassPanel } from './primitives'

const toneStyles: Record<SummaryTone, { card: string; icon: string }> = {
  primary: {
    card: 'hover:border-primary/35 hover:bg-primary/10',
    icon: 'bg-primary/20 text-primary'
  },
  rose: {
    card: 'hover:border-rose-400/35 hover:bg-rose-500/10',
    icon: 'bg-rose-500/20 text-rose-200'
  },
  sky: {
    card: 'hover:border-sky-400/35 hover:bg-sky-500/10',
    icon: 'bg-sky-500/20 text-sky-200'
  },
  emerald: {
    card: 'hover:border-emerald-400/35 hover:bg-emerald-500/10',
    icon: 'bg-emerald-500/20 text-emerald-200'
  },
  amber: {
    card: 'hover:border-amber-400/35 hover:bg-amber-500/10',
    icon: 'bg-amber-500/20 text-amber-200'
  }
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
