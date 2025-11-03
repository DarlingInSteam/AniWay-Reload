import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Унифицированная плоская панель без старого glass эффекта.
// Базовые классы подобраны в стиле каталога/форума: легкий прозрачный фон, тонкий бордер.
export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-white/10 bg-white/[0.03] shadow-none backdrop-blur-none rounded-xl transition-colors',
        className
      )}
      {...props}
    />
  )
}

// Чип без glass: используем мягкий фон и hover подцветку.
export function InlineChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white',
        className
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-10 text-center">
      <span className="text-sm text-white/60">{message}</span>
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
        'grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:flex sm:flex-wrap',
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
              'relative w-full min-h-[40px] rounded-2xl px-3 py-1.5 text-xs font-medium leading-tight text-center transition-colors break-words whitespace-normal md:text-sm focus-visible:outline-none sm:flex-1 sm:min-w-[110px]',
              isActive
                ? 'border border-primary/50 bg-primary/20 text-white shadow-sm'
                : 'border border-transparent text-white/70 hover:border-primary/40 hover:bg-primary/10 hover:text-white'
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
