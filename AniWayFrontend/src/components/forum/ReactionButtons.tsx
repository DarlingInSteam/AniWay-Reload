import { cn } from '@/lib/utils'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'

interface Props {
  userReaction?: 'LIKE' | 'DISLIKE' | null
  likes: number
  dislikes: number
  onChange: (next: 'LIKE' | 'DISLIKE' | null) => void
  busy?: boolean
  size?: 'sm' | 'md'
}

export function ReactionButtons({ userReaction, likes, dislikes, onChange, busy, size='sm' }: Props) {
  const base = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition'
  const activeLike = userReaction === 'LIKE'
  const activeDislike = userReaction === 'DISLIKE'
  return (
    <div className="flex items-center gap-2">
      <button disabled={busy} onClick={()=> onChange(activeLike ? null : 'LIKE')} className={cn(base, activeLike ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 hover:border-white/20 text-muted-foreground')}> 
        {busy && activeLike ? <Loader2 className="h-3 w-3 animate-spin"/> : <ThumbsUp className="h-3 w-3"/>}
        <span>{likes}</span>
      </button>
      <button disabled={busy} onClick={()=> onChange(activeDislike ? null : 'DISLIKE')} className={cn(base, activeDislike ? 'border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-400' : 'border-white/10 hover:border-white/20 text-muted-foreground')}> 
        {busy && activeDislike ? <Loader2 className="h-3 w-3 animate-spin"/> : <ThumbsDown className="h-3 w-3"/>}
        <span>{dislikes}</span>
      </button>
    </div>
  )
}
