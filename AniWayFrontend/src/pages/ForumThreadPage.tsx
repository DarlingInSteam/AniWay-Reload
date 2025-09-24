import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForumThread, useThreadPosts, useCreatePost, usePostTree, useThreadReaction } from '@/hooks/useForum'
import { buildProfileSlug } from '@/utils/profileSlug'
import { useForumUsers } from '@/hooks/useForumUsers'
import { AvatarMini } from '@/components/forum/AvatarMini'
import { PostTree } from '@/components/forum/PostTree'
import { ReactionButtons } from '@/components/forum/ReactionButtons'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { ForumPostEditor } from '@/components/forum/ForumPostEditor'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUpdateThread, useDeleteThread, useUpdatePost, useDeletePost, usePinThread, useLockThread, useSubscribeThread, useUnsubscribeThread } from '@/hooks/useForum'
import { useAuth } from '@/contexts/AuthContext'

export function ForumThreadPage() {
  const { threadId } = useParams()
  const id = threadId ? parseInt(threadId) : undefined
  const { data: thread } = useForumThread(id)
  const { data: postsData, isLoading: isLoadingPosts } = useThreadPosts(id, 0, 30)
  const { data: tree } = usePostTree(id, { maxDepth: 5, maxTotal: 800, pageSize: 30 })
  const { users } = useForumUsers(thread, tree)
  const threadReaction = useThreadReaction(id || 0, thread?.userReaction)
  const createPost = useCreatePost()
  const updateThread = useUpdateThread(id || 0)
  const deleteThread = useDeleteThread()
  const pinThread = usePinThread()
  const lockThread = useLockThread()
  const subscribeThread = useSubscribeThread()
  const unsubscribeThread = useUnsubscribeThread()
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const [editingThread, setEditingThread] = useState(false)
  const [threadDraft, setThreadDraft] = useState<{title:string; content:string}>({ title: thread?.title || '', content: thread?.content || '' })
  const editSaveTimer = useRef<any>(null)
  // Load saved edit draft if present when entering edit mode
  useEffect(()=> {
    if(editingThread && thread?.id){
      try {
        const key = `forum.threadEditDraft.${thread.id}`
        const raw = localStorage.getItem(key)
        if(raw){
          const parsed = JSON.parse(raw)
          if(parsed?.title || parsed?.content){
            setThreadDraft({ title: parsed.title ?? thread.title, content: parsed.content ?? thread.content })
          }
        }
      } catch {}
    }
  }, [editingThread, thread?.id])
  // Autosave edit draft
  useEffect(()=> {
    if(!editingThread || !thread?.id) return
    if(editSaveTimer.current) clearTimeout(editSaveTimer.current)
    editSaveTimer.current = setTimeout(()=> {
      try { localStorage.setItem(`forum.threadEditDraft.${thread.id}`, JSON.stringify(threadDraft)) } catch {}
    }, 500)
    return () => { if(editSaveTimer.current) clearTimeout(editSaveTimer.current) }
  }, [threadDraft, editingThread, thread?.id])

  useEffect(()=> { if(thread){ setThreadDraft({ title: thread.title, content: thread.content }) } }, [thread])

  useEffect(()=>{ if(thread) document.title = thread.title + ' | Форум'},[thread])
  // Record visit timestamp for highlight logic
  useEffect(()=> {
    if(thread && thread.id){
      try {
        const key = 'forum.threadVisits'
        const raw = localStorage.getItem(key)
        const map = raw ? JSON.parse(raw) : {}
        map[thread.id] = Date.now()
        localStorage.setItem(key, JSON.stringify(map))
      } catch(e) { /* ignore */ }
    }
  }, [thread?.id])

  const [rootReplySeed, setRootReplySeed] = useState('')
  const handleQuoteToRoot = (quoted: string) => {
    // merge with existing draft if present
    try {
      const raw = localStorage.getItem('forum.replyDrafts')
      let map: any = raw ? JSON.parse(raw) : {}
      const key = thread ? `${thread.id}-root` : undefined
      if(key){
        const existing = map[key] || ''
        const merged = existing ? existing + (existing.endsWith('\n')? '' : '\n') + quoted : quoted
        map[key] = merged
        localStorage.setItem('forum.replyDrafts', JSON.stringify(map))
        setRootReplySeed(merged + (merged.endsWith('\n')? '' : '\n'))
      }
    } catch {}
  }
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
            <span>Автор: {thread && (()=> { const u = users[thread.authorId]; const name = u?.displayName || thread.authorName || `Пользователь ${thread.authorId}`; const avatar = u?.avatar || thread.authorAvatar; return <Link to={`/profile/${buildProfileSlug(thread.authorId, name)}`} className="flex items-center gap-2 text-primary hover:underline"><AvatarMini avatar={avatar} name={name} />{name}</Link> })()}</span>
            {thread?.canEdit && !editingThread && <button onClick={()=> setEditingThread(true)} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 text-white/80 text-[11px]">Редактировать</button>}
            {thread?.canEdit && editingThread && <button onClick={()=> {
              updateThread.mutate(threadDraft, { onSuccess: ()=> { setEditingThread(false); try { localStorage.removeItem(`forum.threadEditDraft.${thread.id}`) } catch {} } })
            }} disabled={updateThread.isPending} className="rounded bg-emerald-600/80 px-2 py-1 text-white text-[11px] disabled:opacity-50">Сохранить</button>}
            {editingThread && <button onClick={()=> { setEditingThread(false); setThreadDraft({ title: thread?.title||'', content: thread?.content||'' }); if(thread?.id) try { localStorage.removeItem(`forum.threadEditDraft.${thread.id}`) } catch {} }} className="rounded bg-white/5 px-2 py-1 text-white/70 text-[11px] hover:bg-white/10">Отмена</button>}
            {(thread?.canDelete || isAdmin) && (
              <button
                onClick={() => {
                  if (deleteThread.isPending) return
                  if (confirm('Удалить тему?')) {
                    if(!thread) return;
                    deleteThread.mutate(thread.id, {
                      onSuccess: () => {
                        // После оптимистичного удаления перейти на категорию или общий форум
                        if (thread?.categoryId) navigate(`/forum/category/${thread.categoryId}`)
                        else navigate('/forum')
                      }
                    })
                  }
                }}
                disabled={deleteThread.isPending}
                className="rounded bg-red-600/80 px-2 py-1 text-white text-[11px] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteThread.isPending ? 'Удаление...' : 'Удалить'}
              </button>
            )}
            {isAdmin && thread && (
              <>
                <button onClick={()=> pinThread.mutate({ id: thread.id, pinned: !thread.isPinned })} className="rounded bg-white/10 px-2 py-1 text-white/80 text-[11px] hover:bg-white/20">{pinThread.isPending ? '...' : (thread.isPinned? 'Открепить' : 'Закрепить')}</button>
                <button onClick={()=> lockThread.mutate({ id: thread.id, locked: !thread.isLocked })} className="rounded bg-white/10 px-2 py-1 text-white/80 text-[11px] hover:bg-white/20">{lockThread.isPending ? '...' : (thread.isLocked? 'Разблок.' : 'Заблок.')}</button>
              </>
            )}
            {thread && user && user.id !== thread.authorId && (
              thread.isSubscribed ? (
                <button onClick={()=> unsubscribeThread.mutate(thread.id)} disabled={unsubscribeThread.isPending} className="rounded bg-white/10 px-2 py-1 text-white/70 text-[11px] hover:bg-white/20 disabled:opacity-50">{unsubscribeThread.isPending? '...' : 'Отписаться'}</button>
              ) : (
                <button onClick={()=> subscribeThread.mutate(thread.id)} disabled={subscribeThread.isPending} className="rounded bg-primary/80 px-2 py-1 text-white text-[11px] hover:bg-primary disabled:opacity-50">{subscribeThread.isPending? '...' : 'Подписаться'}</button>
              )
            )}
          </div>
          {editingThread ? (
            <div className="mt-2">
              <MarkdownEditor value={threadDraft.content} onChange={val=> setThreadDraft(d=> ({...d, content: val}))} placeholder="Редактируйте содержание темы в Markdown..." />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed mt-2 markdown-body"><MarkdownRenderer value={thread?.content || ''} /></div>
          )}
        </div>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Ответы</h2>
          {isLoadingPosts && <div className="text-sm text-muted-foreground">Загрузка...</div>}
          {tree && <PostTree posts={tree} threadId={id!} users={users} onQuote={handleQuoteToRoot} />}
        </section>
        {thread && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Новый ответ</h3>
            <ForumPostEditor draftKey={`${thread.id}-root`} value={rootReplySeed} onSubmit={(content)=> createPost.mutate({ content, threadId: thread.id })} submitting={createPost.isPending} />
          </div>
        )}
      </div>
    </div>
  )
}
