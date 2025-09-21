import { ForumCategory } from '@/types/forum'
import { Link } from 'react-router-dom'

interface Props { categories: ForumCategory[]; }

export function ForumCategoryList({ categories }: Props) {
  if (!categories.length) return <div className="text-sm text-muted-foreground">Категории отсутствуют</div>
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map(c => (
        <Link key={c.id} to={`/forum/category/${c.id}`} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/40 to-primary/20 text-sm font-semibold text-white shadow-inner">
              {(c.icon || c.name.charAt(0)).substring(0,2)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white tracking-tight">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{c.description}</p>}
              <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-white/5 px-2 py-1">{c.threadsCount ?? 0} тем</span>
                <span className="rounded-full bg-white/5 px-2 py-1">{c.postsCount ?? 0} сообщений</span>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/10/5 to-fuchsia-600/10 mix-blend-overlay" />
        </Link>
      ))}
    </div>
  )
}
