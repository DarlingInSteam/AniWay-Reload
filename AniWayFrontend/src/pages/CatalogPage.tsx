import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MangaCardWithTooltip } from '@/components/manga'
import { MangaCardSkeleton } from '@/components/manga/MangaCardSkeleton'
import { EmptyState } from '@/components/catalog/EmptyState'
import { ErrorState } from '@/components/catalog/ErrorState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
// import { MangaFilterSidebar } from '@/components/filters/MangaFilterSidebar'
import { MangaFilterPanel } from '@/components/filters/MangaFilterPanel'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { PageResponse, MangaResponseDTO } from '@/types'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [activeType, setActiveType] = useState(searchParams.get('activeType') || 'все')
  // Поиск
  const initialQuery = searchParams.get('query') || ''
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  // Debounce фактического применения поиска (отдельно от ввода)
  useEffect(() => {
    const h = setTimeout(() => {
      const trimmed = searchInput.trim()
      setSearchQuery(trimmed)
      setCurrentPage(0)
    }, 450)
    return () => clearTimeout(h)
  }, [searchInput])

  // Mapping сортировок поле<->лейбл
  const SORT_LABEL_BY_FIELD: Record<string,string> = {
    popularity: 'По популярности',
    createdAt: 'По новизне',
    chapterCount: 'По кол-ву глав',
    updatedAt: 'По дате обновления',
    rating: 'По оценке',
    ratingCount: 'По кол-ву оценок',
    likes: 'По лайкам',
    views: 'По просмотрам',
    reviews: 'По отзывам',
    comments: 'По комментариям'
  }
  const SORT_FIELD_BY_LABEL: Record<string,string> = Object.fromEntries(Object.entries(SORT_LABEL_BY_FIELD).map(([field,label]) => [label, field]))
  const defaultSortField = 'popularity'
  const initialSortField = searchParams.get('sortField') || defaultSortField
  const [sortField, setSortField] = useState(initialSortField)
  const sortOrder = SORT_LABEL_BY_FIELD[sortField] || SORT_LABEL_BY_FIELD[defaultSortField]
  const setSortOrder = (label: string) => {
    const mapped = SORT_FIELD_BY_LABEL[label] || defaultSortField
    setSortField(mapped)
  }
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>(searchParams.get('dir') === 'asc' ? 'asc' : 'desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) || initialPage < 1 ? 0 : initialPage - 1)
  const [pageSize] = useState(20) // Фиксированный размер страницы - 20 тайтлов на страницу
  const [sortNonce, setSortNonce] = useState(0)
  // Динамический отступ для sticky панели фильтров (чтобы не пряталась под глобальным хедером)
  const [filterOffset, setFilterOffset] = useState<number>(80) // fallback 80px
  useEffect(() => {
    const measure = () => {
      const headerEl = document.querySelector('header') as HTMLElement | null
      const h = headerEl ? headerEl.getBoundingClientRect().height : 0
      // Добавляем небольшой зазор (16px)
      setFilterOffset(h + 16)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Разбор значений из URL
  const parseArray = (value: string | null) => !value ? [] : value.split(',').filter(Boolean)
  const parseRange = (value: string | null, fallback: [number, number]) => {
    if (!value) return fallback
    const parts = value.split('-').map(v => parseInt(v, 10)).filter(v => !isNaN(v))
    if (parts.length === 2) return [parts[0], parts[1]] as [number, number]
    return fallback
  }
  const initialActiveFilters: any = {
    genres: parseArray(searchParams.get('genres')),
    tags: parseArray(searchParams.get('tags')),
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    ageRating: parseRange(searchParams.get('ageRating'), [0, 21]),
    rating: parseRange(searchParams.get('rating'), [0, 10]),
    releaseYear: parseRange(searchParams.get('releaseYear'), [1990, new Date().getFullYear()]),
    chapterRange: parseRange(searchParams.get('chapterRange'), [0, 1000])
  }
  Object.keys(initialActiveFilters).forEach(k => {
    const v = (initialActiveFilters as any)[k]
    if (Array.isArray(v) && v.length === 0) delete (initialActiveFilters as any)[k]
    if (v === undefined) delete (initialActiveFilters as any)[k]
  })
  const [activeFilters, setActiveFilters] = useState<any>(initialActiveFilters) // Применённые фильтры (для API)
  const [draftFilters, setDraftFilters] = useState<any>(() => ({
    selectedGenres: initialActiveFilters.genres || [],
    selectedTags: initialActiveFilters.tags || [],
    mangaType: initialActiveFilters.type || '',
    status: initialActiveFilters.status || '',
    ageRating: initialActiveFilters.ageRating || [0, 21],
    rating: initialActiveFilters.rating || [0, 10],
    releaseYear: initialActiveFilters.releaseYear || [1990, new Date().getFullYear()],
    chapterRange: initialActiveFilters.chapterRange || [0, 1000]
  })) // Предварительные фильтры (для UI)
  // Refs & QueryClient
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const desktopSortRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const genre = searchParams.get('genre')

  const queryKeyParams = useMemo(() => ({
    genre: genre || null,
    sortField,
    sortDirection,
    currentPage,
    activeType,
    sortNonce,
    activeFilters: JSON.stringify(activeFilters),
    searchQuery
  }), [genre, sortField, sortDirection, currentPage, activeType, activeFilters, sortNonce, searchQuery])

  const normalizeSortField = (field: string) => {
    if (!field) return 'createdat'
    const map: Record<string,string> = {
      createdAt: 'createdat',
      updatedAt: 'updatedat',
      chapterCount: 'chaptercount',
      ratingCount: 'ratingcount'
    }
    return map[field] || field.toLowerCase()
  }

  const { data: mangaPage, isLoading, isError, refetch } = useQuery<PageResponse<MangaResponseDTO>>({
    queryKey: ['manga-catalog', queryKeyParams],
    queryFn: () => {
      const sortBy = normalizeSortField(sortField)
      const filterParams: any = { ...activeFilters }
      if (activeType !== 'все') {
        const typeMapping: Record<string, string> = {
          'манга': 'MANGA',
          'манхва': 'MANHWA',
          'маньхуа': 'MANHUA',
          'западный комикс': 'WESTERN_COMIC',
          'рукомикс': 'RUSSIAN_COMIC',
          'другое': 'OTHER'
        }
        filterParams.type = typeMapping[activeType] || 'MANGA'
      } else {
        delete filterParams.type
      }
      if (genre) {
        return apiClient.searchMangaPaged({
          genre,
          page: currentPage,
          limit: pageSize,
            sortBy,
            sortOrder: sortDirection,
          ...filterParams
        })
      }
      if (searchQuery) {
        return apiClient.searchMangaPaged({
          query: searchQuery,
          page: currentPage,
          limit: pageSize,
          sortBy,
          sortOrder: sortDirection,
          ...filterParams
        })
      }
      return apiClient.getAllMangaPaged(currentPage, pageSize, sortBy, sortDirection, filterParams)
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })

  // Данные
  let manga = mangaPage?.content ?? []
  const getComparable = (obj: any, field: string) => {
    if (!obj) return 0
    switch(field) {
      case 'createdAt':
      case 'updatedAt':
        return obj[field] ? new Date(obj[field]).getTime() : 0
      case 'chapterCount':
        return obj.totalChapters ?? obj.chapterCount ?? 0
      case 'rating':
        return (obj as any).rating?.averageRating ?? (obj as any).averageRating ?? 0
      case 'ratingCount':
        return (obj as any).rating?.ratingCount ?? (obj as any).ratingCount ?? 0
      case 'likes':
        return obj.likes ?? 0
      case 'views':
        return obj.views ?? 0
      case 'popularity':
        return obj.popularity ?? obj.views ?? 0
      case 'reviews':
        return obj.reviews ?? 0
      case 'comments':
        return obj.comments ?? 0
      default:
        return typeof obj[field] === 'number' ? obj[field] : 0
    }
  }
  try {
    if (manga.length > 1 && sortField) {
      const primaryField = sortField
      const direction = sortDirection === 'desc' ? -1 : 1
      const needTieBreak = manga.some((m,i,arr) => i>0 && getComparable(arr[i-1], primaryField) === getComparable(m, primaryField))
      if (needTieBreak) {
        manga = [...manga].sort((a,b) => {
          const av = getComparable(a, primaryField)
          const bv = getComparable(b, primaryField)
          if (av < bv) return -1 * direction
          if (av > bv) return 1 * direction
          const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0
          if (ac !== bc) return bc - ac
          if (a.id < b.id) return 1
          if (a.id > b.id) return -1
          return 0
        })
      }
    }
  } catch (e) {
    console.warn('Frontend tie-break sort failed:', e)
  }
  const totalElements = mangaPage?.totalElements ?? 0
  const totalPages = mangaPage?.totalPages ?? 1
  const isFirst = mangaPage?.first ?? true
  const isLast = mangaPage?.last ?? true

  // getSortByField не требуется — используем непосредственный sortField

  // Синхронизация состояния с URL (без циклических обновлений)
  useEffect(() => {
    const params: Record<string,string> = {}
    if (genre) params.genre = genre
    params.page = String(currentPage + 1)
  params.sortField = sortField
    if (sortDirection !== 'desc') params.dir = sortDirection
    if (activeType && activeType !== 'все') params.activeType = activeType
    if (searchQuery) params.query = searchQuery

    // Сериализация фильтров
    if (activeFilters.genres?.length) params.genres = activeFilters.genres.join(',')
    if (activeFilters.tags?.length) params.tags = activeFilters.tags.join(',')
    if (activeFilters.type) params.type = activeFilters.type
    if (activeFilters.status) params.status = activeFilters.status
    if (activeFilters.ageRating) params.ageRating = activeFilters.ageRating.join('-')
    if (activeFilters.rating) params.rating = activeFilters.rating.join('-')
    if (activeFilters.releaseYear) params.releaseYear = activeFilters.releaseYear.join('-')
    if (activeFilters.chapterRange) params.chapterRange = activeFilters.chapterRange.join('-')
  if (activeFilters.strictMatch) params.strict = '1'

    // Сравнение текущих и новых search params чтобы избежать лишних обновлений
    const current = new URLSearchParams(searchParams)
    let changed = false
    // Удалим ключи, которых больше нет
    current.forEach((_, key) => {
      if (!(key in params)) {
        current.delete(key)
        changed = true
      }
    })
    // Применим или обновим значения
    Object.entries(params).forEach(([k,v]) => {
      if (current.get(k) !== v) {
        current.set(k,v)
        changed = true
      }
    })
    if (changed) setSearchParams(current, { replace: true })
  }, [currentPage, sortField, sortDirection, activeType, activeFilters, genre, sortNonce, searchQuery, setSearchParams])

  // Обработчики фильтров
  const memoizedFilterState = useMemo(() => {
    const filterState = {
      selectedGenres: draftFilters.selectedGenres || [],
      selectedTags: draftFilters.selectedTags || [],
      mangaType: draftFilters.mangaType || '',
      status: draftFilters.status || '',
      ageRating: draftFilters.ageRating || [0, 21],
      rating: draftFilters.rating || [0, 10],
      releaseYear: draftFilters.releaseYear || [1990, new Date().getFullYear()],
      chapterRange: draftFilters.chapterRange || [0, 1000],
      strictMatch: draftFilters.strictMatch || false
    }
    return filterState
  }, [
    JSON.stringify(draftFilters.selectedGenres || []),
    JSON.stringify(draftFilters.selectedTags || []),
    draftFilters.mangaType,
    draftFilters.status,
    JSON.stringify(draftFilters.ageRating || [0, 21]),
    JSON.stringify(draftFilters.rating || [0, 10]),
    JSON.stringify(draftFilters.releaseYear || [1990, new Date().getFullYear()]),
    JSON.stringify(draftFilters.chapterRange || [0, 1000]),
    draftFilters.strictMatch
  ])

  const convertActiveFiltersToFilterState = (activeFilters: any) => {
    const filterState = {
      selectedGenres: activeFilters.genres || [],
      selectedTags: activeFilters.tags || [],
      mangaType: activeFilters.type || '',
      status: activeFilters.status || '',
      ageRating: activeFilters.ageRating || [0, 21],
      rating: activeFilters.rating || [0, 10],
      releaseYear: activeFilters.releaseYear || [1990, new Date().getFullYear()],
      chapterRange: activeFilters.chapterRange || [0, 1000],
      strictMatch: activeFilters.strictMatch || false
    }
    // Debug removed
    return filterState
  }

  // Обработка изменений в предварительных фильтрах (не применяем сразу)
  const handleFiltersChange = (filters: any) => {
  // Debug removed
    setDraftFilters(filters)
  }

  // Функция применения фильтров (вызывается кнопкой "Применить")
  const applyFilters = () => {
  // Debug removed
    
    // Преобразуем FilterState в SearchParams формат
    const searchParams: any = {}
    
    if (draftFilters.selectedGenres?.length > 0) {
  // Debug removed
      searchParams.genres = draftFilters.selectedGenres
    }
    
    if (draftFilters.selectedTags?.length > 0) {
  // Debug removed
      searchParams.tags = draftFilters.selectedTags
    }
    
    if (draftFilters.mangaType && draftFilters.mangaType !== '') {
      searchParams.type = draftFilters.mangaType
    }
    
    if (draftFilters.status && draftFilters.status !== '') {
      searchParams.status = draftFilters.status
    }
    
    if (draftFilters.ageRating) {
      searchParams.ageRating = draftFilters.ageRating
    }
    
    if (draftFilters.rating) {
      searchParams.rating = draftFilters.rating
    }
    
    if (draftFilters.releaseYear) {
      searchParams.releaseYear = draftFilters.releaseYear
    }
    
    if (draftFilters.chapterRange) {
      searchParams.chapterRange = draftFilters.chapterRange
    }
    if (draftFilters.strictMatch) {
      searchParams.strictMatch = true
    }

  // Debug removed
    setActiveFilters(searchParams)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении фильтров
  }

  // Функция сброса фильтров
  const resetFilters = () => {
  // Debug removed
    setDraftFilters({})
    setActiveFilters({})
    setCurrentPage(0)
  }

  // Обработчик быстрых фильтров
  const handleActiveTypeChange = (type: string) => {
  // Debug removed
    setActiveType(type)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении типа
  }

  // Функция для отладки изменений activeFilters
  useEffect(() => {
  // Debug removed
  }, [activeFilters])

  // Обработчик сортировки
  const handleSortChange = (newSortLabel: string) => {
    const newField = SORT_FIELD_BY_LABEL[newSortLabel] || defaultSortField
  // Debug removed
    if (newField === sortField) {
      setSortNonce(n => n + 1)
  // Debug removed
    } else {
      setSortField(newField)
    }
    setShowSortDropdown(false)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении сортировки
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  }

  // Обработчик направления сортировки
  const handleSortDirectionChange = (direction: 'desc' | 'asc') => {
  // Debug removed
    if (direction === sortDirection) {
      setSortNonce(n => n + 1)
  // Debug removed
    } else {
      setSortDirection(direction)
    }
    setShowSortDropdown(false)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении направления
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  }

  // Сброс сортировки к дефолтной (поле + направление)
  const resetSort = () => {
    setSortField(defaultSortField)
    setSortDirection('desc')
    setSortNonce(n=>n+1)
    setCurrentPage(0)
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  }

  // Функции навигации по страницам
  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToNextPage = () => {
    if (!isLast) {
      goToPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (!isFirst) {
      goToPage(currentPage - 1)
    }
  }

  const goToFirstPage = () => {
    goToPage(0)
  }

  const goToLastPage = () => {
    if (totalPages > 0) {
      goToPage(totalPages - 1)
    }
  }

  const pageTitle = genre ? `Жанр: ${genre}` : 'Каталог'

  // Removed active sorting diagnostic effect

  // Диагностика: вывод первых 10 значений текущего сортируемого поля после получения данных
  // Removed TOP10 snapshot diagnostic effect

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  // Закрываем dropdown сортировки при клике вне его области
  useEffect(() => {
    if (!showSortDropdown) return
    const handler = (e: MouseEvent) => {
      if (!desktopSortRef.current) return
      if (!desktopSortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortDropdown])

  const clearAllFilters = () => {
    setActiveFilters({})
    setDraftFilters({})
    setActiveType('все')
    setCurrentPage(0)
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-6">

        {/* Улучшенный Offcanvas фильтров для мобильных */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-full max-w-md bg-background/95 backdrop-blur-xl shadow-2xl z-50 transition-transform duration-300 border-l border-white/15 lg:hidden focus:outline-none',
            showFilters ? 'translate-x-0' : 'translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Фильтры каталога"
        >
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <span className="font-bold text-lg text-white">Фильтры</span>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Закрыть фильтры"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-full overflow-y-auto pb-6">
            <span tabIndex={0} aria-hidden className="block outline-none" />
            <MangaFilterPanel
              initialFilters={memoizedFilterState}
              onFiltersChange={handleFiltersChange}
              onReset={resetFilters}
              onApply={() => { applyFilters(); setShowFilters(false) }}
              className="h-full"
              appearance="mobile"
            />
            <span tabIndex={0} aria-hidden className="block outline-none" />
          </div>
        </div>

        {/* Улучшенный Overlay для offcanvas - только для мобильных */}
        {showFilters && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Основной контейнер с боковыми фильтрами для десктопа */}
        <div className="flex gap-8">
          {/* Левая колонка: каталог */}
            <div className="flex-1 min-w-0">
              <div className="glass-panel p-4 lg:p-5">
                {/* Заголовок + поиск + сортировка */}
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-xl md:text-2xl font-bold text-white">{pageTitle}</h1>
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Поиск по названию" className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/30 outline-none text-sm text-white placeholder:text-muted-foreground/60 transition" />
                        {searchInput && (
                          <button onClick={()=>{setSearchInput('');setSearchQuery('');setCurrentPage(0)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/10" aria-label="Очистить поиск">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div ref={desktopSortRef} className="relative">
                        <button onClick={()=>setShowSortDropdown(v=>!v)} className="h-10 px-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium">
                          <ArrowUpDown className="h-4 w-4" />
                          <span className="hidden sm:inline-block max-w-[140px] truncate">{sortOrder}</span>
                          {sortDirection==='desc'?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>}
                        </button>
                        {showSortDropdown && (
                          <div className="absolute z-50 mt-2 w-72 sm:w-80 right-0 origin-top-right rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-1 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 scrollbar-custom">
                                {Object.values(SORT_LABEL_BY_FIELD).map(option=>{const selected=option===sortOrder;return(<button key={option} onClick={()=>{handleSortChange(option);setShowSortDropdown(false)}} className={cn('w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors',selected?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-white')}>{selected&&<Check className="h-4 w-4"/>}<span className="truncate">{option}</span></button>)})}
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0 w-28">
                                <button onClick={()=>{handleSortDirectionChange('desc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',sortDirection==='desc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-white')}><ArrowDown className="h-4 w-4"/> Убыв.</button>
                                <button onClick={()=>{handleSortDirectionChange('asc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',sortDirection==='asc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-white')}><ArrowUp className="h-4 w-4"/> Возраст.</button>
                                <button onClick={()=>{resetSort();setShowSortDropdown(false)}} className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"><RotateCcw className="h-3.5 w-3.5"/> Сброс</button>
                                <button onClick={()=>setShowSortDropdown(false)} className="text-[11px] text-muted-foreground hover:text-white px-2 py-1 rounded">Закрыть</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={()=>setShowFilters(true)} className="h-11 w-11 min-w-[44px] min-h-[44px] flex sm:hidden items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.97] transition" aria-label="Фильтры">
                        <Filter className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Сетка карточек */}
                <ErrorBoundary fallback={
                  <div className="text-center py-16">
                    <h3 className="text-xl font-medium text-white mb-2">Ошибка при загрузке каталога</h3>
                    <p className="text-muted-foreground mb-4">Проверьте консоль браузера для деталей</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Перезагрузить страницу
                    </button>
                  </div>
                }>
                  {isError ? (
                    <ErrorState onRetry={() => refetch()} />
                  ) : (
                    <div className="relative grid
                      grid-cols-2
                      [grid-auto-rows:auto]
                      gap-2.5 xs:gap-3 sm:gap-4 lg:gap-5 xl:gap-6
                      sm:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]
                      md:[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]
                      lg:[grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]
                      xl:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]
                      2xl:[grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]
                      items-start animate-fade-in">
                      {isLoading && manga.length === 0 && Array.from({ length: pageSize }).map((_, i) => (
                        <MangaCardSkeleton key={i} />
                      ))}
                      {!isLoading && manga.length === 0 && (
                        <div className="col-span-full">
                          <EmptyState onReset={clearAllFilters} />
                        </div>
                      )}
                      {manga.length > 0 && manga.map((item: MangaResponseDTO) => (
                        <div key={item.id} className="w-full max-w-[200px] mx-auto">
                          <MangaCardWithTooltip manga={item} />
                        </div>
                      ))}
                      {isLoading && manga.length > 0 && (
                        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] pointer-events-none" aria-hidden />
                      )}
                    </div>
                  )}
                </ErrorBoundary>

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4 mt-8 mb-2">
                    <div className="text-sm text-muted-foreground">
                      Показано {manga?.length || 0} из {totalElements} произведений
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 0}
                        className={cn(
                          'hidden sm:flex items-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          currentPage === 0
                            ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4 -ml-2" />
                      </button>
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 0}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          currentPage === 0
                            ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Предыдущая
                      </button>
                      <div className="flex items-center gap-1">
                        {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                          if (pageNum >= totalPages) return null
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={cn(
                                  'px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                currentPage === pageNum
                                  ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/20'
                                  : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                              )}
                            >
                              {pageNum + 1}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={goToNextPage}
                        disabled={!totalPages || currentPage >= totalPages - 1}
                        className={cn(
                          'flex items-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          !totalPages || currentPage >= totalPages - 1
                            ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                        )}
                      >
                        Следующая
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={goToLastPage}
                        disabled={!totalPages || currentPage >= totalPages - 1}
                        className={cn(
                          'hidden sm:flex items-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          !totalPages || currentPage >= totalPages - 1
                            ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4 -ml-2" />
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Страница {currentPage + 1} из {totalPages}
                    </div>
                  </div>
                )}
              </div>
            </div>
          {/* Правая колонка: фильтры */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky" style={{ top: filterOffset }}>
              <MangaFilterPanel
                initialFilters={memoizedFilterState}
                onFiltersChange={handleFiltersChange}
                onReset={resetFilters}
                onApply={applyFilters}
                appearance="desktop"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
