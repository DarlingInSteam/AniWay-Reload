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
    <div
      className={cn(
        'glass-panel grid grid-cols-2 gap-1 rounded-2xl border-white/15 bg-background/60 p-1 sm:flex sm:flex-wrap',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative w-full min-h-[40px] rounded-2xl border border-transparent px-3 py-1.5 text-xs font-medium leading-tight text-center transition-colors break-words whitespace-normal md:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/15 sm:flex-1 sm:min-w-[110px]',
              isActive
                ? 'border-white/25 bg-white/12 text-white shadow-inner shadow-black/20'
                : 'text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white active:bg-white/12'
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
