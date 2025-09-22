import { ForumPost } from '@/types/forum'
import { useCreatePost, usePostReaction, useUpdatePost, useDeletePost } from '@/hooks/useForum'
import { AvatarMini } from './AvatarMini'
import { ReactionButtons } from './ReactionButtons'
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buildProfileSlug } from '@/utils/profileSlug'
import { ForumPostEditor } from './ForumPostEditor'

interface PostNodeProps { post: ForumPost; depth: number; threadId: number; users?: Record<number, any>; onQuote: (content: string, author?: string) => void }

function PostNode({ post, depth, threadId, users, onQuote }: PostNodeProps) {
  const [replying, setReplying] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const reaction = usePostReaction(post.id, threadId, post.userReaction)
  const create = useCreatePost()
  const update = useUpdatePost(post.id)
  const del = useDeletePost()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.content)
  const handleQuote = useCallback(()=> {
    const snippet = post.content.length > 400 ? post.content.slice(0,400) + '…' : post.content
    const author = users?.[post.authorId]?.displayName || post.authorName || `User ${post.authorId}`
    const formatted = `> ${snippet.replace(/\n/g, '\n> ')}\n\n`
    onQuote(formatted, author)
    setReplying(true)
  }, [post.content, post.authorId, users, onQuote])

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted-foreground flex items-center gap-2">Автор:
              {(()=> { const u = users?.[post.authorId]; const name = u?.displayName || post.authorName || `Пользователь ${post.authorId}`; const avatar = u?.avatar || post.authorAvatar; return (
                <Link to={`/profile/${buildProfileSlug(post.authorId, name)}`} className="flex items-center gap-2 text-primary hover:underline">
                  <AvatarMini avatar={avatar} name={name} size={20} />
                  <span>{name}</span>
                </Link>
              ) })()}
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea className="w-full rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-white" value={draft} onChange={e=> setDraft(e.target.value)} />
                <div className="flex gap-2">
                  <button disabled={update.isPending} onClick={()=> update.mutate({ content: draft }, { onSuccess: ()=> setEditing(false) })} className="rounded bg-emerald-600/80 px-2 py-1 text-[11px] text-white disabled:opacity-50">Сохранить</button>
                  <button onClick={()=> { setEditing(false); setDraft(post.content) }} className="rounded bg-white/10 px-2 py-1 text-[11px] text-white/80 hover:bg-white/20">Отмена</button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{post.content}</div>
            )}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <ReactionButtons userReaction={post.userReaction} likes={post.likesCount} dislikes={post.dislikesCount} busy={reaction.isPending} onChange={(n)=> reaction.mutate(n)} />
              {depth < 5 && <button onClick={()=> setReplying(v=> !v)} className="text-xs text-primary hover:underline">{replying? 'Отмена' : 'Ответить'}</button>}
              <button onClick={handleQuote} className="text-xs text-primary hover:underline">Цитировать</button>
              {post.replies?.length ? <button onClick={()=> setCollapsed(c=> !c)} className="text-xs text-white/60 hover:text-white/90">{collapsed? `Показать ответы (${post.replies.length})` : `Свернуть ответы (${post.replies.length})`}</button> : null}
              {post.canEdit && !editing && <button onClick={()=> setEditing(true)} className="text-xs text-primary hover:underline">Редактировать</button>}
              {post.canDelete && <button onClick={()=> { if(confirm('Удалить сообщение?')) del.mutate(post.id, { onSuccess: ()=> { /* rely on refetch */ } }) }} className="text-xs text-red-400 hover:underline">Удалить</button>}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        {replying && (
          <div className="mt-3">
            <ForumPostEditor draftKey={`${threadId}-${post.id}`} submitting={create.isPending} onSubmit={(content)=> create.mutate({ content, threadId, parentPostId: post.id }, { onSuccess: ()=> { setReplying(false) } })} placeholder="Ваш ответ..." />
          </div>
        )}
      </div>
      {post.replies && post.replies.length > 0 && !collapsed && (
        <div className="ml-4 border-l border-white/10 pl-4 space-y-3">
          {post.replies.map(r => <PostNode key={r.id} post={r} depth={depth+1} threadId={threadId} users={users} onQuote={onQuote} />)}
        </div>
      )}
    </div>
  )
}

interface TreeProps { posts: ForumPost[]; threadId: number; users?: Record<number, any>; onQuote?: (text: string)=> void }
export function PostTree({ posts, threadId, users, onQuote }: TreeProps) {
  if (!posts.length) return <div className="text-sm text-muted-foreground">Нет сообщений</div>
  const handleQuote = (content: string) => { onQuote?.(content) }
  return (
    <div className="space-y-4">
      {posts.map(p => <PostNode key={p.id} post={p} depth={0} threadId={threadId} users={users} onQuote={(c)=> handleQuote(c)} />)}
    </div>
  )
}
