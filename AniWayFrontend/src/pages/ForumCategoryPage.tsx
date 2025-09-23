import { useParams, Link } from 'react-router-dom'
import { useForumCategory, useInfiniteForumThreads } from '@/hooks/useForum'
import { ForumThreadList } from '@/components/forum/ForumThreadList'
import { Plus, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useThreadAuthors } from '@/hooks/useThreadAuthors'
import { useState } from 'react'
import { ForumThreadToolbar, ThreadSortMode, ThreadDensity } from '@/components/forum/ForumThreadToolbar'

export function ForumCategoryPage() {
  const { categoryId } = useParams()
  const id = categoryId ? parseInt(categoryId) : undefined
  const { data: category } = useForumCategory(id)
  const infinite = useInfiniteForumThreads({ categoryId: id, size: 30 })
  const [toolbarState, setToolbarState] = useState<{ sort: ThreadSortMode; density: ThreadDensity }>({ sort: 'active', density: 'comfortable' })
  const allThreadsRaw = infinite.data?.pages.flatMap(p=> p.content) || []
  // Sorting client side
  const allThreads = [...allThreadsRaw].sort((a,b)=> {
    switch (toolbarState.sort) {
      case 'latest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'popular':
        // simple weight: likes + replies*2
        const wa = (a.likesCount||0) + (a.repliesCount||0)*2
        const wb = (b.likesCount||0) + (b.repliesCount||0)*2
        return wb - wa
      case 'active':
      default: return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    }
  })
  const authorUsers = useThreadAuthors(allThreads)
  const loadingMore = infinite.isFetchingNextPage
  const canLoadMore = !!infinite.hasNextPage
  // IntersectionObserver sentinel
  // We'll add a ref callback
  const sentinelRef = (el: HTMLDivElement | null) => {
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      const first = entries[0]
      if (first.isIntersecting && canLoadMore && !loadingMore) {
        infinite.fetchNextPage()
      }
    }, { rootMargin: '200px 0px 0px 0px' })
    observer.observe(el)
  }

  useEffect(()=>{ if(category) document.title = `${category.name} | Форум`},[category])

  return (
  <div className="min-h-[calc(100vh-4rem)] bg-manga-black px-3 sm:px-4 pb-24 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link to="/forum" className="hover:text-white transition-colors">Форум</Link>
          <span>/</span>
          <span className="text-white">{category?.name || '...'}</span>
        </div>
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{category?.name || '...'}</h2>
            {category?.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{category.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/forum" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition">
              <ArrowLeft className="h-3 w-3" /> Назад
            </Link>
            <Link to={`/forum/category/${id}/create-thread`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90">
              <Plus className="h-3 w-3" /> Новая тема
            </Link>
          </div>
        </div>
  <ForumThreadToolbar onChange={setToolbarState} />
  {infinite.isLoading && <div className="text-sm text-muted-foreground">Загрузка тем...</div>}
        {infinite.isError && <div className="text-sm text-red-400">Ошибка загрузки тем</div>}
  <ForumThreadList threads={allThreads} users={authorUsers} density={toolbarState.density} />
        <div ref={sentinelRef} className="h-10 flex items-center justify-center text-xs text-muted-foreground">
          {loadingMore ? 'Загружается...' : (canLoadMore ? 'Прокрутите ниже, чтобы загрузить ещё' : (allThreads.length ? 'Все темы загружены' : ''))}
        </div>
      </div>
    </div>
  )
}
