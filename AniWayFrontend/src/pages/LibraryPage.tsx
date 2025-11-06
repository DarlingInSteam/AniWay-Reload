import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useAuth } from '../contexts/AuthContext'
import { BookmarkStatus } from '../types'
import { BookmarkMangaCard } from '../components/manga/BookmarkMangaCard'
import { ArrowUpDown, ArrowUp, ArrowDown, Heart } from 'lucide-react'
import { cn } from '../lib/utils'

// Local types for sorting
type SortOption = 'bookmark_updated' | 'manga_updated' | 'chapters_count' | 'alphabetical'
type SortOrder = 'asc' | 'desc'

const statusLabels: Record<BookmarkStatus, string> = {
  READING: 'Читаю',
  PLAN_TO_READ: 'Буду читать',
  COMPLETED: 'Прочитано',
  ON_HOLD: 'Отложено',
  DROPPED: 'Брошено'
}

const sortOptions: Record<SortOption, string> = {
  bookmark_updated: 'По новизне',
  manga_updated: 'По дате обновления',
  chapters_count: 'По кол-ву глав',
  alphabetical: 'По алфавиту'
}

// Color styles for active status chips (glass / tinted backgrounds)
const statusColors: Record<BookmarkStatus, string> = {
  READING: 'bg-green-500/25 text-green-300',
  PLAN_TO_READ: 'bg-blue-500/25 text-blue-300',
  COMPLETED: 'bg-purple-500/25 text-purple-300',
  ON_HOLD: 'bg-yellow-500/25 text-yellow-300',
  DROPPED: 'bg-red-500/25 text-red-300'
}

export const LibraryPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { allBookmarks, loading, clientFilterAndSort, getBookmarksByStatus, getFavorites, refetch } = useBookmarks()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | 'FAVORITES' | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('bookmark_updated')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const chipsContainerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSortDropdown) return
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortDropdown])

  const debouncedQuery = useDebouncedValue(searchQuery, 250)
  const filteredBookmarks = useMemo(()=> clientFilterAndSort({
    query: debouncedQuery,
    status: selectedStatus,
    sortBy,
    sortOrder
  }), [debouncedQuery, selectedStatus, sortBy, sortOrder, allBookmarks])
  const getStatusCount = (status: BookmarkStatus | 'FAVORITES') => status==='FAVORITES'? getFavorites().length : getBookmarksByStatus(status as BookmarkStatus).length

  useEffect(() => {
    if (isAuthenticated) {
      refetch().catch(err => console.error('Failed to load bookmarks', err))
    }
  }, [isAuthenticated, refetch])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Требуется авторизация</h2>
          <a href="/login" className="text-primary hover:text-primary/80">Войти в систему</a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-6">
  <div className="rounded-3xl border border-white/10 bg-transparent p-4 lg:p-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Закладки</h1>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Поиск по названию, автору или жанру" className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/30 outline-none text-sm text-foreground placeholder:text-muted-foreground/60 transition" />
                  {searchQuery && (
                    <button onClick={()=>setSearchQuery('')} aria-label="Очистить поиск" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                </div>
                <div ref={sortDropdownRef} className="relative">
                  <button onClick={()=>setShowSortDropdown(v=>!v)} className="h-10 px-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium">
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="hidden sm:inline-block max-w-[140px] truncate">{sortOptions[sortBy]}</span>
                    {sortOrder==='desc'?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>}
                  </button>
                  {showSortDropdown && (
                    <div className="absolute z-50 mt-2 w-72 sm:w-80 right-0 origin-top-right rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-1 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 scrollbar-custom">
                          {Object.entries(sortOptions).map(([value,label])=>{const selected=value===sortBy;return (
                            <button key={value} onClick={()=>{setSortBy(value as SortOption);setShowSortDropdown(false)}} className={cn('w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors', selected?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}>
                              {selected && <span className="inline-block w-2 h-2 rounded-full bg-primary" />}
                              <span className="truncate">{label}</span>
                            </button>)})}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0 w-28">
                          <button onClick={()=>{setSortOrder('desc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors', sortOrder==='desc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}><ArrowDown className="h-4 w-4"/> Убыв.</button>
                          <button onClick={()=>{setSortOrder('asc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors', sortOrder==='asc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}><ArrowUp className="h-4 w-4"/> Возраст.</button>
                          <button onClick={()=>{setSortBy('bookmark_updated');setSortOrder('desc');setShowSortDropdown(false)}} className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10">Сброс</button>
                          <button onClick={()=>setShowSortDropdown(false)} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded">Закрыть</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={()=>setSelectedStatus(selectedStatus==='FAVORITES' ? 'ALL' : 'FAVORITES')} className={cn('h-10 px-4 flex items-center gap-2 rounded-xl text-sm font-medium transition border', selectedStatus==='FAVORITES' ? 'bg-red-500 text-white border-red-400' : 'bg-white/5 text-white/70 hover:text-foreground hover:bg-white/10 border-white/10')}>
                  <Heart className={cn('h-4 w-4', selectedStatus==='FAVORITES' && 'animate-pulse')} />
                  <span className="hidden sm:inline">Избранное</span>
                  <span className="text-xs sm:text-sm">({getStatusCount('FAVORITES')})</span>
                </button>
              </div>
            </div>
            <div ref={chipsContainerRef} className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -ml-1 pr-1">
              <button onClick={()=>setSelectedStatus('ALL')} className={cn('px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition border flex items-center gap-2', selectedStatus==='ALL' ? 'bg-primary/20 text-primary border-primary/30 shadow' : 'bg-white/5 text-white/70 hover:text-foreground hover:bg-white/10 border-white/10')}>Все <span className="opacity-80">{allBookmarks.length}</span></button>
              {Object.entries(statusLabels).map(([status,label])=> (
                <button key={status} onClick={()=>setSelectedStatus(status as BookmarkStatus)} className={cn('px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition border flex items-center gap-2', selectedStatus===status ? `${statusColors[status as BookmarkStatus]} text-white border-white/20 shadow` : 'bg-white/5 text-white/70 hover:text-foreground hover:bg-white/10 border-white/10')}>
                  {label} <span className="opacity-80">{getStatusCount(status as BookmarkStatus)}</span>
                </button>
              ))}
            </div>
          </div>
          {filteredBookmarks.length===0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-medium text-foreground mb-2">{searchQuery ? 'Ничего не найдено':'Пока нет закладок'}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{searchQuery ? 'Попробуйте изменить поисковый запрос':'Добавьте манги в закладки, чтобы отслеживать свой прогресс чтения'}</p>
              {!searchQuery && <a href="/catalog" className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors">Перейти к каталогу</a>}
            </div>
          ) : (
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 auto-rows-auto sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] items-start animate-fade-in">
              {filteredBookmarks.map(b=> <BookmarkMangaCard key={b.id} bookmark={b} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(()=>{
    const t = setTimeout(()=> setDebounced(value), delay)
    return ()=> clearTimeout(t)
  }, [value, delay])
  return debounced
}
