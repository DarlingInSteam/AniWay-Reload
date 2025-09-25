import React from 'react'
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
  return (
    <div className="space-y-5">
      <Link to="/forum/create-thread" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow hover:bg-primary/90 transition">
        <Plus className="h-4 w-4" /> Создать тему
      </Link>
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Категории</h3>
        {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin"/> Загрузка...</div>}
        {!loading && (!categories || !categories.length) && <div className="text-xs text-muted-foreground">Нет категорий</div>}
        <ul className="space-y-1.5">
          <li>
            <button onClick={()=> onSelectCategory?.(undefined)} className={"w-full text-left group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors " + (!selectedCategory ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white') }>
              <span className="truncate flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-white/60"/> Все категории</span>
            </button>
          </li>
          {categories?.map(c => (
            <li key={c.id}>
              <button onClick={()=> onSelectCategory?.(c.id)} className={"w-full text-left group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors " + (c.id===selectedCategory ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white') }>
                <span className="truncate flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{background:c.color||'var(--color-primary,#3b82f6)'}}/> {c.name}</span>
                <span className="text-[10px] rounded bg-white/5 px-1.5 py-0.5 text-white/60 group-hover:text-white/80">{c.threadsCount ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
