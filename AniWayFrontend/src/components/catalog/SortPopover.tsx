import React, { useEffect, useRef } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortPopoverProps {
  open: boolean
  onClose: () => void
  onToggle?: () => void
  sortOrder: string
  sortDirection: 'asc' | 'desc'
  onChangeOrder: (order: string) => void
  onChangeDirection: (dir: 'asc' | 'desc') => void
  anchorClassName?: string
  buttonLabel?: string
  closeOnSelect?: boolean
}

const SORT_OPTIONS = ['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам','По комментариям']

export const SortPopover: React.FC<SortPopoverProps> = ({
  open,
  onClose,
  onToggle,
  sortOrder,
  sortDirection,
  onChangeOrder,
  onChangeDirection,
  anchorClassName,
  buttonLabel = 'Сортировка'
  ,closeOnSelect = true
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const firstItemRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && firstItemRef.current) {
      firstItemRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        console.log('[SortPopover] outside click detected -> close')
        onClose()
      }
    }
    // Используем click вместо mousedown чтобы дать шанс внутреннему onClick выполнить state update
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [open, onClose])

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="sort-popover-panel"
        onClick={() => {
          if (onToggle) {
            onToggle()
          } else {
            open ? onClose() : firstItemRef.current?.focus()
          }
        }}
        className={cn('flex items-center gap-2 rounded-xl px-4 h-11 text-sm font-medium bg-white/5 backdrop-blur-sm hover:bg-white/10 border border-white/10 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50', anchorClassName)}
      >
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span className="truncate max-w-[120px] md:max-w-[160px]">{sortOrder}</span>
      </button>
      {open && (
        <div
          id="sort-popover-panel"
          role="dialog"
          aria-label="Выбор сортировки"
          ref={panelRef}
          className="absolute z-50 mt-2 w-80 md:w-96 right-0 md:left-0 origin-top-right md:origin-top-left rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in"
        >
          <div className="flex items-start gap-6">
            {/* Options */}
            <div className="flex-1 space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-custom" role="listbox" aria-label="Поля сортировки">
              {SORT_OPTIONS.map((option, idx) => {
                const selected = option === sortOrder
                return (
                  <button
                    key={option}
                    ref={idx===0?firstItemRef:undefined}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => { console.log('[SortPopover] mousedown option', option, 'selected?', selected, 'time=', Date.now()); }}
                    onClick={(e) => { 
                      e.stopPropagation();
                      console.log('[SortPopover] click option', option, 'selected?', selected, 'time=', Date.now()); 
                      onChangeOrder(option); 
                      if (closeOnSelect) {
                        // Даем тик на отработку состояния сортировки до закрытия
                        requestAnimationFrame(() => { console.log('[SortPopover] closing after selection option=', option); onClose(); })
                      }
                    }}
                    className={cn('w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                      selected ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
                  >
                    {selected && <Check className="h-4 w-4" />}
                    <span className="truncate">{option}</span>
                  </button>
                )
              })}
            </div>
            {/* Direction */}
            <div className="flex flex-col gap-2 flex-shrink-0 w-32" aria-label="Направление">
              <button
                onMouseDown={(e) => { console.log('[SortPopover] mousedown direction desc time=', Date.now()); }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  console.log('[SortPopover] click direction desc time=', Date.now()); 
                  onChangeDirection('desc'); 
                  if (closeOnSelect) requestAnimationFrame(() => { console.log('[SortPopover] closing after direction desc'); onClose(); }) 
                }}
                className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                  sortDirection==='desc' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
              >
                <ArrowDown className="h-4 w-4" />
                Убыв.
              </button>
              <button
                onMouseDown={(e) => { console.log('[SortPopover] mousedown direction asc time=', Date.now()); }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  console.log('[SortPopover] click direction asc time=', Date.now()); 
                  onChangeDirection('asc'); 
                  if (closeOnSelect) requestAnimationFrame(() => { console.log('[SortPopover] closing after direction asc'); onClose(); }) 
                }}
                className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                  sortDirection==='asc' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
              >
                <ArrowUp className="h-4 w-4" />
                Возраст.
              </button>
              <button
                onClick={onClose}
                className="mt-2 text-xs text-muted-foreground hover:text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary/40"
              >Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SortPopover
