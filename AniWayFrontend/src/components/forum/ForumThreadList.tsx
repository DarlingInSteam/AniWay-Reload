import { ForumThread } from '@/types/forum'
import { ForumThreadCard } from './ForumThreadCard'

interface Props { threads: ForumThread[]; users?: Record<number, any> }

export function ForumThreadList({ threads, users }: Props) {
  if (!threads.length) return <div className="text-sm text-muted-foreground">Тем пока нет</div>
  return (
    <div className="space-y-3">
      {threads.map(t => <ForumThreadCard key={t.id} thread={t} users={users} />)}
    </div>
  )
}
