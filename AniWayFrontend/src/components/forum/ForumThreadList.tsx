import { ForumThread } from '@/types/forum'
import { ForumThreadCard } from './ForumThreadCard'

interface Props { threads: ForumThread[]; users?: Record<number, any>; density?: 'comfortable' | 'compact' }

export function ForumThreadList({ threads, users, density = 'comfortable' }: Props) {
  if (!threads.length) return <div className="text-sm text-muted-foreground">Тем пока нет</div>
  return (
    <div className={density === 'compact' ? 'space-y-1.5' : 'space-y-3'}>
      {threads.map(t => <ForumThreadCard key={t.id} thread={t} users={users} density={density} />)}
    </div>
  )
}
