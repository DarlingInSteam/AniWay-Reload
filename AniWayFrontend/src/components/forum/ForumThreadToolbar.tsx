import { useEffect, useState } from 'react'
import { ListFilter, LayoutGrid, Rows3 } from 'lucide-react'

export type ThreadSortMode = 'latest' | 'active' | 'popular'
export type ThreadDensity = 'comfortable' | 'compact'

interface Props {
  onChange: (state: { sort: ThreadSortMode; density: ThreadDensity }) => void
  initial?: Partial<{ sort: ThreadSortMode; density: ThreadDensity }>
}

const STORAGE_KEY = 'forum.threadList.settings'

export function ForumThreadToolbar({ onChange, initial }: Props) {
  const [sort, setSort] = useState<ThreadSortMode>(initial?.sort || 'active')
  const [density, setDensity] = useState<ThreadDensity>(initial?.density || 'comfortable')

  // Persist & emit
  useEffect(()=> {
    onChange({ sort, density })
    const stored = { sort, density }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)) } catch {}
  }, [sort, density])

  // Hydrate from storage once
  useEffect(()=> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.sort) setSort(parsed.sort)
        if (parsed.density) setDensity(parsed.density)
      }
    } catch {}
  }, [])

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <ListFilter className="h-3.5 w-3.5 text-white/60" />
        <span className="text-white/70">Сортировка:</span>
        <div className="flex overflow-hidden rounded border border-white/10">
          {([
            { k: 'latest', label: 'Новые' },
            { k: 'active', label: 'Активные' },
            { k: 'popular', label: 'Популярные' }
          ] as const).map(opt => (
            <button
              key={opt.k}
              onClick={()=> setSort(opt.k)}
              className={`px-3 py-1 transition-colors ${sort===opt.k ? 'bg-primary text-white' : 'bg-transparent text-white/60 hover:bg-white/10'}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/70">Плотность:</span>
        <div className="flex overflow-hidden rounded border border-white/10">
          <button onClick={()=> setDensity('comfortable')} className={`px-2 py-1 flex items-center gap-1 ${density==='comfortable' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/10'}`}>
            <LayoutGrid className="h-3 w-3" /> <span>Обычная</span>
          </button>
          <button onClick={()=> setDensity('compact')} className={`px-2 py-1 flex items-center gap-1 ${density==='compact' ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/10'}`}>
            <Rows3 className="h-3 w-3" /> <span>Компакт</span>
          </button>
        </div>
      </div>
    </div>
  )
}
