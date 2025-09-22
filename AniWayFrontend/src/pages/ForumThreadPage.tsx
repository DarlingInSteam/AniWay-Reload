import { useParams, Link } from 'react-router-dom'
import { useForumThread, useThreadPosts, useCreatePost, usePostTree, useThreadReaction } from '@/hooks/useForum'
import { PostTree } from '@/components/forum/PostTree'
import { ReactionButtons } from '@/components/forum/ReactionButtons'
import { ForumPostEditor } from '@/components/forum/ForumPostEditor'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

export function ForumThreadPage() {
  const { threadId } = useParams()
  const id = threadId ? parseInt(threadId) : undefined
  const { data: thread } = useForumThread(id)
  const { data: postsData, isLoading: isLoadingPosts } = useThreadPosts(id, 0, 30)
  const { data: tree } = usePostTree(id, { maxDepth: 5, maxTotal: 800, pageSize: 30 })
  const threadReaction = useThreadReaction(id || 0, thread?.userReaction)
  const createPost = useCreatePost()

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">{thread?.title || '...'}</h1>
            {thread && (
              <ReactionButtons
                userReaction={thread.userReaction}
                likes={thread.likesCount}
                dislikes={0 /* нет отдельного счётчика дизлайков у thread */}
                busy={threadReaction.isPending}
                onChange={(n)=> threadReaction.mutate(n)}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Автор: {thread && <Link to={`/user/${thread.authorId}`} className="text-primary hover:underline">{thread.authorName || `Пользователь ${thread.authorId}`}</Link>}
          </div>
          <div className="prose prose-invert max-w-none text-sm leading-relaxed mt-2">{thread?.content}</div>
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
