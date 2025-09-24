import React, { useState, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

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
  useEffect(()=> setInternal(value), [value])
  useEffect(()=> { const id = setTimeout(()=> { if(internal!==value) onChange(internal) }, 300); return ()=> clearTimeout(id) }, [internal])
  return (
    <div className="glass-panel rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input value={internal} onChange={e=> setInternal(e.target.value)} placeholder="Поиск тем..." className="w-full rounded-xl bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={e=> onSortChange(e.target.value)} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/40">
            {SORTS.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={()=> onDensityChange(density==='comfortable'?'compact':'comfortable')} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
