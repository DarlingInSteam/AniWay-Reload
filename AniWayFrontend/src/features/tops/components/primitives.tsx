import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-panel border-white/12 bg-background/60', className)} {...props} />
}

export function InlineChip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('glass-inline px-2 py-1 text-xs text-white/80', className)}>{children}</span>
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-3 border-dashed border-white/15 bg-background/50 px-6 py-10 text-center">
      <span className="text-sm text-white/65">{message}</span>
      {action}
    </div>
  )
}

export type SegmentedOption = {
  label: string
  value: string
  hint?: string
}

type SegmentedControlProps = {
  value: string
  options: SegmentedOption[]
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ value, options, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('glass-panel flex flex-wrap gap-1 rounded-2xl border-white/15 bg-background/60 p-1', className)}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex-1 min-w-[90px] rounded-2xl px-3 py-1.5 text-xs font-medium transition-colors md:text-sm',
              isActive
                ? 'bg-primary/20 text-primary shadow-inner shadow-primary/30'
                : 'text-white/70 hover:bg-white/8 hover:text-white'
            )}
          >
            {option.label}
            {option.hint && <span className="sr-only">{option.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
