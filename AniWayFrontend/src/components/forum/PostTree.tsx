import { ForumPost } from '@/types/forum'
import { useCreatePost, usePostReaction } from '@/hooks/useForum'
import { ReactionButtons } from './ReactionButtons'
import { useState } from 'react'
import { ForumPostEditor } from './ForumPostEditor'

interface PostNodeProps { post: ForumPost; depth: number; threadId: number }

function PostNode({ post, depth, threadId }: PostNodeProps) {
  const [replying, setReplying] = useState(false)
  const reaction = usePostReaction(post.id, threadId, post.userReaction)
  const create = useCreatePost()

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted-foreground">Автор: Пользователь {post.authorId}</div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{post.content}</div>
            <div className="mt-2 flex items-center gap-3">
              <ReactionButtons userReaction={post.userReaction} likes={post.likesCount} dislikes={post.dislikesCount} busy={reaction.isPending} onChange={(n)=> reaction.mutate(n)} />
              {depth < 5 && <button onClick={()=> setReplying(v=> !v)} className="text-xs text-primary hover:underline">{replying? 'Отмена' : 'Ответить'}</button>}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        {replying && (
          <div className="mt-3">
            <ForumPostEditor submitting={create.isPending} onSubmit={(content)=> create.mutate({ content, threadId, parentPostId: post.id })} placeholder="Ваш ответ..." />
          </div>
        )}
      </div>
      {post.replies && post.replies.length > 0 && (
        <div className="ml-4 border-l border-white/10 pl-4 space-y-3">
          {post.replies.map(r => <PostNode key={r.id} post={r} depth={depth+1} threadId={threadId} />)}
        </div>
      )}
    </div>
  )
}

interface TreeProps { posts: ForumPost[]; threadId: number }
export function PostTree({ posts, threadId }: TreeProps) {
  if (!posts.length) return <div className="text-sm text-muted-foreground">Нет сообщений</div>
  return (
    <div className="space-y-4">
      {posts.map(p => <PostNode key={p.id} post={p} depth={0} threadId={threadId} />)}
    </div>
  )
}
