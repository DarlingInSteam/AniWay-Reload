import { ForumPost } from '@/types/forum'
import { Heart } from 'lucide-react'

interface Props { post: ForumPost }

export function ForumPostItem({ post }: Props) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Автор: {post.authorName || '—'}</span>
        <span>{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
        {post.isDeleted ? <i className="text-muted-foreground">Удалено</i> : post.content}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likesCount}</span>
      </div>
    </div>
  )
}
