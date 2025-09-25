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
  return (
    <div className={(density === 'compact' ? 'space-y-1.5' : 'space-y-3') + ' sm:space-y-3'}>
      {threads.map(t => {
        const lastVisit = visits[t.id]
        const lastActivity = new Date(t.lastActivityAt).getTime()
        const isNew = !lastVisit
        const isUpdated = !!lastVisit && lastActivity > lastVisit
        return <ForumThreadCard key={t.id} thread={t} users={users} density={density} isNew={isNew} isUpdated={isUpdated} isAdmin={isAdmin} onPinToggle={onPinToggle} onDelete={onDelete} />
      })}
    </div>
  )
}
