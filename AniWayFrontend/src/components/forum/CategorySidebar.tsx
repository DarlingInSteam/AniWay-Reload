import React, { useMemo, useState } from 'react'
import { ForumCategory } from '@/types/forum'
import { Link } from 'react-router-dom'
import { Plus, Loader2 } from 'lucide-react'

interface CategorySidebarProps {
  categories?: ForumCategory[]
  loading?: boolean
  onSelectCategory?: (id: number | undefined) => void
  selectedCategory?: number | undefined
}

export function CategorySidebar({ categories, loading, onSelectCategory, selectedCategory }: CategorySidebarProps){
  const [search, setSearch] = useState('')
  const filtered = useMemo(()=> {
    if(!categories) return []
    const q = search.trim().toLowerCase()
    if(!q) return categories
    return categories.filter(c => c.name.toLowerCase().includes(q))
  }, [categories, search])
  const showReset = search.trim().length > 0
  return (
    <div className="space-y-5">
      <Link to="/forum/create-thread" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow hover:bg-primary/90 transition">
        <Plus className="h-4 w-4" /> Создать тему
      </Link>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Категории</h3>
          {showReset && (
            <button onClick={()=> setSearch('')} className="text-[10px] text-white/50 hover:text-white/80 transition">Сброс</button>
          )}
        </div>
        <div className="relative">
          <input
            value={search}
            onChange={e=> setSearch(e.target.value)}
            placeholder="Поиск категории"
            aria-label="Поиск по категориям форума"
            className="w-full h-8 rounded-lg bg-white/5 border border-white/10 px-2.5 pr-8 text-[11px] text-white/80 placeholder:text-white/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/30 outline-none"
          />
          {search && (
            <button onClick={()=> setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" aria-label="Очистить">×</button>
          )}
        </div>
        {loading && <div className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="h-3 w-3 animate-spin"/> Загрузка...</div>}
        {!loading && filtered.length === 0 && <div className="text-xs text-white/50">Ничего не найдено</div>}
        <div className="max-h-[420px] overflow-y-auto thin-scroll pr-1">
          <ul className="space-y-1.5">
            <li>
              <button onClick={()=> onSelectCategory?.(undefined)} className={"w-full text-left group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] transition-colors " + (!selectedCategory ? 'bg-primary/20 text-white shadow-inner shadow-black/20' : 'text-white/60 hover:bg-white/5 hover:text-white') }>
                <span className="truncate flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-primary/60"/> Все категории</span>
              </button>
            </li>
            {filtered.map(c => {
              const active = c.id === selectedCategory
              const name = c.name
              const q = search.trim().toLowerCase()
              let label: React.ReactNode = name
              if(q){
                const idx = name.toLowerCase().indexOf(q)
                if(idx>=0){
                  label = (
                    <span className="truncate">
                      {name.slice(0, idx)}<span className="text-primary/70">{name.slice(idx, idx+q.length)}</span>{name.slice(idx+q.length)}
                    </span>
                  )
                }
              }
              return (
                <li key={c.id}>
                  <button onClick={()=> onSelectCategory?.(c.id)} className={"w-full text-left group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] transition-colors " + (active ? 'bg-primary/25 text-white shadow-inner shadow-black/20' : 'text-white/60 hover:bg-white/5 hover:text-white') }>
                    <span className="truncate flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{background:c.color||'var(--color-primary,#3b82f6)'}}/> {label}</span>
                    <span className="text-[10px] rounded bg-white/5 px-1.5 py-0.5 text-white/50 group-hover:text-white/75">{c.threadsCount ?? 0}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
