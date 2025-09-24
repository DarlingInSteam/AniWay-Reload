import { useEffect, useMemo, useState } from 'react'
import { useForumCategories, useInfiniteForumThreads } from '@/hooks/useForum'
import { usePinThread, useDeleteThread as useDeleteThreadMutation } from '@/hooks/useForum'
import { useAuth } from '@/contexts/AuthContext'
import { ForumLayout } from '@/components/forum/ForumLayout'
import { CategorySidebar } from '@/components/forum/CategorySidebar'
import { ForumToolbar } from '@/components/forum/ForumToolbar'
import { PinnedThreads } from '@/components/forum/PinnedThreads'
import { ForumThreadList } from '@/components/forum/ForumThreadList'
import { useThreadAuthors } from '@/hooks/useThreadAuthors'
// removed ForumStatsPanel per redesign

export function ForumPage(){
  useEffect(()=> { document.title = 'Форум | AniWay' },[])
  const { data: categories, isLoading: catLoading } = useForumCategories()
  const { isAdmin } = useAuth()
  const pinMutation = usePinThread()
  const deleteMutation = useDeleteThreadMutation()
  // threads infinite for "all" (no category) page 0..n
  const { data: pages, fetchNextPage, hasNextPage, isLoading: threadsLoading, isFetchingNextPage } = useInfiniteForumThreads({})
  const allThreads = useMemo(()=> pages?.pages.flatMap(p=> p.content) || [], [pages])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('latest')
  const [density, setDensity] = useState<'comfortable'|'compact'>('comfortable')
  const [selectedCategory, setSelectedCategory] = useState<number|undefined>(undefined)
  const filtered = useMemo(()=> {
    let arr = allThreads
    if(selectedCategory){
      arr = arr.filter(t=> t.categoryId === selectedCategory)
    }
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
  }, [allThreads, query, sort, selectedCategory])
  const pinned = useMemo(()=> filtered.filter(t=> t.isPinned && (!selectedCategory || t.categoryId === selectedCategory)).slice(0,6), [filtered, selectedCategory])
  const visible = useMemo(()=> filtered.filter(t=> !t.isPinned), [filtered, selectedCategory])
  const authorUsers = useThreadAuthors(filtered)
  const handlePinToggle = (id:number, next:boolean) => { pinMutation.mutate({ id, pinned: next }) }
  const handleDelete = (id:number) => { if(confirm('Удалить тему?')) deleteMutation.mutate(id) }

  return (
    <ForumLayout
      sidebar={<CategorySidebar categories={categories} loading={catLoading} onSelectCategory={id=> setSelectedCategory(id)} selectedCategory={selectedCategory} />}
    >
      <div className="space-y-6">
        <ForumToolbar value={query} onChange={setQuery} sort={sort} onSortChange={setSort} density={density} onDensityChange={setDensity} />
        <PinnedThreads threads={pinned} />
        <div className="space-y-4">
          {threadsLoading && !allThreads.length && <div className="text-sm text-muted-foreground">Загрузка тем...</div>}
          <ForumThreadList threads={visible} users={authorUsers} density={density} isAdmin={isAdmin} onPinToggle={handlePinToggle} onDelete={handleDelete} />
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

