import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

import { useForumCategories, useInfiniteForumThreads } from '@/hooks/useForum'
import { usePinThread, useDeleteThread as useDeleteThreadMutation } from '@/hooks/useForum'
import { useAuth } from '@/contexts/AuthContext'
import { ForumLayout } from '@/components/forum/ForumLayout'
import { CategorySidebar } from '@/components/forum/CategorySidebar'
import { ForumToolbar } from '@/components/forum/ForumToolbar'
import { PinnedThreads } from '@/components/forum/PinnedThreads'
import { ForumThreadList } from '@/components/forum/ForumThreadList'
import { ForumActivityPanel } from '@/components/forum/ForumActivityPanel'
import { useThreadAuthors } from '@/hooks/useThreadAuthors'
// removed ForumStatsPanel per redesign

export function ForumPage(){
  useEffect(()=> { document.title = 'Форум | AniWay' },[])
  const { data: categories, isLoading: catLoading } = useForumCategories()
  const { isAdmin } = useAuth()
  const pinMutation = usePinThread()
  const deleteMutation = useDeleteThreadMutation()
  const [selectedCategory, setSelectedCategory] = useState<number|undefined>(undefined)
  // серверная пагинация зависит от выбранной категории (react-query сбрасывает pages при смене key)
  const { data: pages, fetchNextPage, hasNextPage, isLoading: threadsLoading, isFetchingNextPage } = useInfiniteForumThreads({ categoryId: selectedCategory })
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
  const authorUsers = useThreadAuthors(filtered)
  const handlePinToggle = (id:number, next:boolean) => { pinMutation.mutate({ id, pinned: next }) }
  const handleDelete = (id:number) => { if(confirm('Удалить тему?')) deleteMutation.mutate(id) }

  const quickCategories = useMemo(() => (categories ?? []).slice(0, 6), [categories])
  const hasFilters = selectedCategory !== undefined || query.trim().length > 0
  const resetFilters = useCallback(() => {
    setSelectedCategory(undefined)
    setQuery('')
  }, [setQuery, setSelectedCategory])

  const activityStats = useMemo(() => {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const weekMs = dayMs * 7
    let totalReplies = 0
    let totalViews = 0
    let totalLikes = 0
    let activeToday = 0
    let createdToday = 0
    const participants = new Set<number>()

    const parse = (value?: string) => {
      if (!value) return NaN
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? NaN : parsed
    }

    filtered.forEach((thread) => {
      const replies = thread.repliesCount ?? 0
      const likes = thread.likesCount ?? 0
      const views = thread.viewsCount ?? 0
      totalReplies += replies
      totalLikes += likes
      totalViews += views

      const createdAt = parse(thread.createdAt)
      const lastActivity = parse(thread.lastActivityAt) || parse(thread.updatedAt) || createdAt
      if (!Number.isNaN(lastActivity) && lastActivity > now - dayMs) {
        activeToday += 1
      }
      if (!Number.isNaN(createdAt) && createdAt > now - dayMs) {
        createdToday += 1
      }
      if (!Number.isNaN(lastActivity) && lastActivity > now - weekMs) {
        participants.add(thread.authorId)
      }
    })

    const score = (thread: typeof filtered[number]) => {
      const replies = thread.repliesCount ?? 0
      const likes = thread.likesCount ?? 0
      const views = thread.viewsCount ?? 0
      return replies * 3 + likes * 2 + views * 0.02
    }

    const trending = [...filtered].sort((a, b) => score(b) - score(a)).slice(0, 6)
    const recentlyUpdated = [...filtered]
      .sort((a, b) => {
        const aTime = parse(a.lastActivityAt) || parse(a.updatedAt) || parse(a.createdAt)
        const bTime = parse(b.lastActivityAt) || parse(b.updatedAt) || parse(b.createdAt)
        return (bTime || 0) - (aTime || 0)
      })
      .slice(0, 6)

    return {
      totalThreads: filtered.length,
      totalReplies,
      totalViews,
      totalLikes,
      activeToday,
      createdToday,
      participants: participants.size,
      trending,
      recentlyUpdated
    }
  }, [filtered])

  const highlightThreads = useMemo(() => activityStats.recentlyUpdated.slice(0, 3), [activityStats.recentlyUpdated])

  return (
    <ForumLayout
      sidebar={<CategorySidebar categories={categories} loading={catLoading} onSelectCategory={id=> setSelectedCategory(id)} selectedCategory={selectedCategory} />}
    >
      <div className="space-y-6">
        <ForumToolbar value={query} onChange={setQuery} sort={sort} onSortChange={setSort} density={density} onDensityChange={setDensity} />

        {(quickCategories.length > 0 || hasFilters) && (
          <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Быстрый доступ</div>
              {hasFilters && (
                <button onClick={resetFilters} className="text-[11px] font-medium text-white/60 underline decoration-dotted decoration-white/40 transition hover:text-white">
                  Сбросить фильтры
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(undefined)}
                className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${selectedCategory === undefined ? 'bg-white/15 text-white shadow-inner shadow-black/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                Все темы
              </button>
              {quickCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${selectedCategory === category.id ? 'bg-white/15 text-white shadow-inner shadow-black/20' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                  {category.name}
                  <span className="ml-2 text-[10px] text-white/55">{category.threadsCount ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr),minmax(260px,1fr)]">
          <div className="space-y-4">
            <PinnedThreads threads={pinned} />
            {highlightThreads.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Flame className="h-3.5 w-3.5 text-white/65" />
                  Сейчас обсуждают
                </div>
                <div className="mt-3 space-y-2">
                  {highlightThreads.map((thread) => (
                    <Link
                      key={`highlight-${thread.id}`}
                      to={`/forum/thread/${thread.id}`}
                      className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <span className="flex-1 truncate">{thread.title || `Тема #${thread.id}`}</span>
                      <span className="text-[11px] text-white/55">{formatRelativeTimestamp(thread.lastActivityAt ?? thread.updatedAt ?? thread.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ForumActivityPanel stats={activityStats} />
        </div>

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

function formatRelativeTimestamp(date?: string) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  const diff = parsed.getTime() - Date.now()
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60]
  ]
  const formatter = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
  for (const [unit, amount] of units) {
    if (Math.abs(diff) >= amount || unit === 'minute') {
      const value = Math.round(diff / amount)
      if (value === 0 && unit === 'minute') {
        return 'только что'
      }
      return formatter.format(value, unit)
    }
  }
  return 'только что'
}

