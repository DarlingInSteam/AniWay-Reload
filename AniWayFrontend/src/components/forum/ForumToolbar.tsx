import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, SlidersHorizontal, ChevronDown, Check } from 'lucide-react'

interface ForumToolbarProps {
  value: string
  onChange: (v:string)=>void
  sort: string
  onSortChange: (s:string)=>void
  density: 'comfortable'|'compact'
  onDensityChange: (d:'comfortable'|'compact')=>void
}

const SORTS = [
  {value:'latest', label:'Новые'},
  {value:'active', label:'Активные'},
  {value:'popular', label:'Популярные'},
  {value:'pinned', label:'Закреплённые'},
]

export function ForumToolbar({ value, onChange, sort, onSortChange, density, onDensityChange }: ForumToolbarProps){
  const [internal, setInternal] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(()=> SORTS.findIndex(s=> s.value===sort) || 0)
  const ddRef = useRef<HTMLDivElement|null>(null)
  const listRef = useRef<HTMLDivElement|null>(null)
  useEffect(()=> setInternal(value), [value])
  useEffect(()=> { const id = setTimeout(()=> { if(internal!==value) onChange(internal) }, 300); return ()=> clearTimeout(id) }, [internal])
  useEffect(()=> {
    if(!open) return
    const handler = (e: MouseEvent) => { if(ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false) }
    const keyHandler = (e: KeyboardEvent) => {
      if(!open) return
      if(e.key === 'Escape'){ setOpen(false); (ddRef.current?.querySelector('button[data-trigger="true"]') as HTMLButtonElement|undefined)?.focus(); }
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActiveIdx(i=> (i+1) % SORTS.length) }
      if(e.key === 'ArrowUp'){ e.preventDefault(); setActiveIdx(i=> (i-1+SORTS.length) % SORTS.length) }
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); const s = SORTS[activeIdx]; if(s){ onSortChange(s.value); setOpen(false) } }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return ()=> { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [open, activeIdx, onSortChange])
  useEffect(()=> { if(open){ setActiveIdx(SORTS.findIndex(s=> s.value===sort) || 0); requestAnimationFrame(()=> { const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement|null; el?.scrollIntoView({ block:'nearest' }) }) } }, [open, sort])
  const handleSelect = useCallback((value:string)=> { onSortChange(value); setOpen(false) }, [onSortChange])
  const current = SORTS.find(s=> s.value===sort)
  return (
  <div className="glass-panel rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between relative z-30">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input value={internal} onChange={e=> setInternal(e.target.value)} placeholder="Поиск тем..." className="w-full rounded-xl bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative z-30" ref={ddRef}>
            <button data-trigger="true" type="button" onClick={()=> setOpen(o=> !o)} aria-haspopup="listbox" aria-expanded={open} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40">
              <span>{current?.label || '—'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open?'rotate-180':''}`} />
            </button>
            {open && (
              <div ref={listRef} role="listbox" aria-activedescendant={`sort-opt-${activeIdx}`} className="absolute right-0 top-full mt-2 min-w-[8rem] rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-1 z-[999] animate-fade-in max-h-72 overflow-auto focus:outline-none">
                {SORTS.map((s, idx)=> {
                  const selected = s.value===sort
                  const active = idx===activeIdx
                  return (
                    <button id={`sort-opt-${idx}`} data-active={active||undefined} key={s.value} role="option" aria-selected={selected} onMouseEnter={()=> setActiveIdx(idx)} onClick={()=> handleSelect(s.value)} className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none ${selected? 'bg-primary/20 text-primary' : active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}> 
                      {selected && <Check className="h-3 w-3" />}
                      <span className="truncate">{s.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button onClick={()=> onDensityChange(density==='comfortable'?'compact':'comfortable')} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
