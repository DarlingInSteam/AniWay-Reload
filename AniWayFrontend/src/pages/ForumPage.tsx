import { useEffect, useMemo, useState } from 'react'
import { useForumCategories, useInfiniteForumThreads } from '@/hooks/useForum'
import { ForumLayout } from '@/components/forum/ForumLayout'
import { CategorySidebar } from '@/components/forum/CategorySidebar'
import { ForumToolbar } from '@/components/forum/ForumToolbar'
import { PinnedThreads } from '@/components/forum/PinnedThreads'
import { ForumThreadList } from '@/components/forum/ForumThreadList'
import { ForumStatsPanel } from '@/components/forum/ForumStatsPanel'

export function ForumPage(){
  useEffect(()=> { document.title = 'Форум | AniWay' },[])
  const { data: categories, isLoading: catLoading } = useForumCategories()
  // threads infinite for "all" (no category) page 0..n
  const { data: pages, fetchNextPage, hasNextPage, isLoading: threadsLoading, isFetchingNextPage } = useInfiniteForumThreads({})
  const allThreads = useMemo(()=> pages?.pages.flatMap(p=> p.content) || [], [pages])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('latest')
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable')
  const filtered = useMemo(()=> {
    let arr = allThreads
    if(query.trim()){
      const q = query.trim().toLowerCase()
      arr = arr.filter(t=> t.title.toLowerCase().includes(q) || (t.content||'').toLowerCase().includes(q))
    }
    switch(sort){
      case 'pinned': arr = [...arr].sort((a,b)=> Number(b.isPinned)-Number(a.isPinned) || Date.parse(b.createdAt)-Date.parse(a.createdAt)); break
      case 'popular': arr = [...arr].sort((a,b)=> (b.likesCount + b.viewsCount*0.01) - (a.likesCount + a.viewsCount*0.01)); break
      case 'active': arr = [...arr].sort((a,b)=> Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt)); break
      case 'latest': default: arr = [...arr].sort((a,b)=> Date.parse(b.createdAt) - Date.parse(a.createdAt)); break
    }
    return arr
  }, [allThreads, query, sort])
  const pinned = useMemo(()=> filtered.filter(t=> t.isPinned).slice(0,6), [filtered])
  const visible = useMemo(()=> filtered.filter(t=> !t.isPinned), [filtered])

  return (
    <ForumLayout
      sidebar={<>
        <CategorySidebar categories={categories} loading={catLoading} />
        <ForumStatsPanel threads={allThreads} />
      </>}
    >
      <div className="space-y-6">
        <ForumToolbar value={query} onChange={setQuery} sort={sort} onSortChange={setSort} density={density} onDensityChange={setDensity} />
        <PinnedThreads threads={pinned} />
        <div className="space-y-4">
          {threadsLoading && !allThreads.length && <div className="text-sm text-muted-foreground">Загрузка тем...</div>}
          <ForumThreadList threads={visible} density={density} />
          {hasNextPage && (
            <div className="pt-2">
              <button disabled={isFetchingNextPage} onClick={()=> fetchNextPage()} className="w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-50">{isFetchingNextPage? 'Загрузка...' : 'Загрузить ещё'}</button>
            </div>
          )}
          {!threadsLoading && !filtered.length && <div className="text-sm text-muted-foreground">Ничего не найдено</div>}
        </div>
      </div>
    </ForumLayout>
  )
}

