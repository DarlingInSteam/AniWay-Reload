import { ForumThread } from '@/types/forum'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Heart, Pin, Lock } from 'lucide-react'

interface Props { thread: ForumThread }

export function ForumThreadCard({ thread }: Props) {
  return (
    <Link to={`/forum/thread/${thread.id}`} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-2 w-5 pt-1">
          {thread.isPinned && <Pin className="h-4 w-4 text-amber-400" />}
          {thread.isLocked && <Lock className="h-4 w-4 text-red-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 font-medium text-white tracking-tight">{thread.title}</h4>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.repliesCount}</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{thread.viewsCount}</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{thread.likesCount}</span>
            {thread.categoryName && <span className="rounded-full bg-white/5 px-2 py-1">{thread.categoryName}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
