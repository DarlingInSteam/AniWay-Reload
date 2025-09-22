import { useParams, Link } from 'react-router-dom'
import { useForumThread, useThreadPosts, useCreatePost, usePostTree, useThreadReaction } from '@/hooks/useForum'
import { buildProfileSlug } from '@/utils/profileSlug'
import { PostTree } from '@/components/forum/PostTree'
import { ReactionButtons } from '@/components/forum/ReactionButtons'
import { ForumPostEditor } from '@/components/forum/ForumPostEditor'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUpdateThread, useDeleteThread, useUpdatePost, useDeletePost } from '@/hooks/useForum'

export function ForumThreadPage() {
  const { threadId } = useParams()
  const id = threadId ? parseInt(threadId) : undefined
  const { data: thread } = useForumThread(id)
  const { data: postsData, isLoading: isLoadingPosts } = useThreadPosts(id, 0, 30)
  const { data: tree } = usePostTree(id, { maxDepth: 5, maxTotal: 800, pageSize: 30 })
  const threadReaction = useThreadReaction(id || 0, thread?.userReaction)
  const createPost = useCreatePost()
  const updateThread = useUpdateThread(id || 0)
  const deleteThread = useDeleteThread()
  const [editingThread, setEditingThread] = useState(false)
  const [threadDraft, setThreadDraft] = useState<{title:string; content:string}>({ title: thread?.title || '', content: thread?.content || '' })

  useEffect(()=> { if(thread){ setThreadDraft({ title: thread.title, content: thread.content }) } }, [thread])

  useEffect(()=>{ if(thread) document.title = thread.title + ' | Форум'},[thread])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-manga-black px-4 pb-32 pt-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link to="/forum" className="hover:text-white transition-colors">Форум</Link>
          <span>/</span>
          {thread?.categoryId && <Link to={`/forum/category/${thread.categoryId}`} className="hover:text-white transition-colors">{thread?.categoryName || 'Категория'}</Link>}
          <span>/</span>
          <span className="text-white">{thread?.title || '...'}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {editingThread ? (
              <input className="w-full rounded bg-black/40 border border-white/10 px-3 py-2 text-sm text-white" value={threadDraft.title} onChange={e=> setThreadDraft(d=> ({...d,title:e.target.value}))} />
            ) : (
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">{thread?.title || '...'}</h1>
            )}
            {thread && (
              <ReactionButtons
                userReaction={thread.userReaction}
                likes={thread.likesCount}
                dislikes={0}
                busy={threadReaction.isPending}
                onChange={(n)=> threadReaction.mutate(n)}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Автор: {thread && <Link to={`/profile/${buildProfileSlug(thread.authorId, thread.authorName)}`} className="text-primary hover:underline">{thread.authorName || `Пользователь ${thread.authorId}`}</Link>}</span>
            {thread?.canEdit && !editingThread && <button onClick={()=> setEditingThread(true)} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 text-white/80 text-[11px]">Редактировать</button>}
            {thread?.canEdit && editingThread && <button onClick={()=> {
              updateThread.mutate(threadDraft, { onSuccess: ()=> setEditingThread(false) })
            }} disabled={updateThread.isPending} className="rounded bg-emerald-600/80 px-2 py-1 text-white text-[11px] disabled:opacity-50">Сохранить</button>}
            {editingThread && <button onClick={()=> { setEditingThread(false); setThreadDraft({ title: thread?.title||'', content: thread?.content||'' }) }} className="rounded bg-white/5 px-2 py-1 text-white/70 text-[11px] hover:bg-white/10">Отмена</button>}
            {thread?.canDelete && <button onClick={()=> { if(confirm('Удалить тему?')) deleteThread.mutate(thread.id) }} className="rounded bg-red-600/80 px-2 py-1 text-white text-[11px] hover:bg-red-600">Удалить</button>}
          </div>
          {editingThread ? (
            <textarea className="w-full min-h-40 rounded bg-black/40 border border-white/10 px-3 py-2 text-sm text-white" value={threadDraft.content} onChange={e=> setThreadDraft(d=> ({...d,content:e.target.value}))} />
          ) : (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed mt-2">{thread?.content}</div>
          )}
        </div>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Ответы</h2>
          {isLoadingPosts && <div className="text-sm text-muted-foreground">Загрузка...</div>}
          {tree && <PostTree posts={tree} threadId={id!} />}
        </section>
        {thread && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Новый ответ</h3>
            <ForumPostEditor onSubmit={(content)=> createPost.mutate({ content, threadId: thread.id })} submitting={createPost.isPending} />
          </div>
        )}
      </div>
    </div>
  )
}
