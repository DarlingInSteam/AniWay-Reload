import { ForumThread } from '@/types/forum'
import { ForumThreadCard } from './ForumThreadCard'

interface Props { threads: ForumThread[]; users?: Record<number, any>; density?: 'comfortable' | 'compact'; isAdmin?: boolean; onPinToggle?: (id:number,next:boolean)=>void; onDelete?: (id:number)=>void }

function loadVisits(){
  if(typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem('forum.threadVisits')||'{}') } catch { return {} }
}

export function ForumThreadList({ threads, users, density = 'comfortable', isAdmin, onPinToggle, onDelete }: Props) {
  if (!threads.length) return <div className="text-sm text-muted-foreground">Тем пока нет</div>
  const visits = loadVisits()
  const isCompact = density === 'compact'
  const gridCols = isCompact ? 'md:grid-cols-2 2xl:grid-cols-3' : 'lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
  const gap = isCompact ? 'gap-2 sm:gap-3' : 'gap-3 lg:gap-4'
  return (
    <div className={`grid grid-cols-1 ${gridCols} ${gap}`}>
      {threads.map(t => {
        const lastVisit = visits[t.id]
        const lastActivity = new Date(t.lastActivityAt).getTime()
        const isNew = !lastVisit
        const isUpdated = !!lastVisit && lastActivity > lastVisit
        return (
          <div key={t.id} className="h-full">
            <ForumThreadCard
              thread={t}
              users={users}
              density={density}
              isNew={isNew}
              isUpdated={isUpdated}
              isAdmin={isAdmin}
              onPinToggle={onPinToggle}
              onDelete={onDelete}
            />
          </div>
        )
      })}
    </div>
  )
}
