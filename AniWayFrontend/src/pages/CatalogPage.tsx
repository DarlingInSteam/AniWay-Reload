import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Grid, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react'
import { SortPopover } from '@/components/catalog/SortPopover'
import { apiClient } from '@/lib/api'
import { MangaCardWithTooltip } from '@/components/manga'
import { MangaCardSkeleton } from '@/components/manga/MangaCardSkeleton'
import { EmptyState } from '@/components/catalog/EmptyState'
import { ErrorState } from '@/components/catalog/ErrorState'
import { SelectedFiltersBar } from '@/components/filters/SelectedFiltersBar'
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

  // Нормализация значений (однократно после монтирования)
  useEffect(() => {
    setDraftFilters((df: any) => {
      const norm = { ...df }
      const clampRange = (range: [number,number], min:number, max:number, def:[number,number]) => {
        if(!Array.isArray(range) || range.length !==2) return def
        const a = Math.max(min, Math.min(max, range[0]))
        const b = Math.max(min, Math.min(max, range[1]))
        return a<=b ? [a,b] as [number,number] : [b,a] as [number,number]
      }
      norm.ageRating = clampRange(norm.ageRating,0,21,[0,21])
      norm.rating = clampRange(norm.rating,0,10,[0,10])
      norm.releaseYear = clampRange(norm.releaseYear,1990,new Date().getFullYear(),[1990,new Date().getFullYear()])
      norm.chapterRange = clampRange(norm.chapterRange,0,100000,[0,1000])
      return norm
    })
  }, [])

  // Refs для обработки кликов вне области
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const desktopSortRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()
  const genre = searchParams.get('genre')

  // Убираем ненужную инвалидацию кэша при монтировании
  // Кэш должен инвалидироваться только при реальных изменениях данных
  // useEffect(() => {
  //   console.log('CatalogPage: Invalidating manga cache on mount')
  //   queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  // }, [queryClient])

  // Создаем стабильный объект для queryKey
  const queryKeyParams = useMemo(() => ({
    genre: genre || null,
    sortField,
    sortDirection,
    currentPage,
    activeType,
    sortNonce,
    activeFilters: JSON.stringify(activeFilters)
  }), [genre, sortField, sortDirection, currentPage, activeType, activeFilters, sortNonce])

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
      
      // Создаем объект только с фильтрами (без пагинации и сортировки)
      const filterParams: any = { ...activeFilters }
      
      // Добавляем тип манги, если он отличается от "все"
      // activeType имеет приоритет над mangaType из боковых фильтров
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
        // Если выбрано "все", удаляем тип из фильтров
        delete filterParams.type
      }
      
      // Debug logs removed
      
      if (genre) {
        // Для поиска по жанру создаем полный объект параметров
        const searchParams = {
          genre,
          page: currentPage,
          limit: pageSize,
          sortBy,
          sortOrder: sortDirection,
          ...filterParams
        }
        return apiClient.searchMangaPaged(searchParams)
      }
      
      // Для обычного просмотра передаем параметры раздельно
      return apiClient.getAllMangaPaged(currentPage, pageSize, sortBy, sortDirection, filterParams)
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Prefetch соседних страниц после получения текущей
  useEffect(() => {
    if (!mangaPage) return
    if (mangaPage.totalPages <= 1) return
  const sortBy = normalizeSortField(sortField)
    const filterParams: any = { ...activeFilters }
    if (activeType !== 'все') {
      const typeMapping: Record<string, string> = {
        'манга': 'MANGA', 'манхва': 'MANHWA', 'маньхуа': 'MANHUA', 'западный комикс': 'WESTERN_COMIC', 'рукомикс': 'RUSSIAN_COMIC', 'другое': 'OTHER'
      }
      filterParams.type = typeMapping[activeType] || 'MANGA'
    } else {
      delete filterParams.type
    }
    const next = currentPage + 1
    const prev = currentPage - 1
    if (next < mangaPage.totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['manga-catalog', { ...queryKeyParams, currentPage: next, activeFilters: JSON.stringify(activeFilters) }],
        queryFn: () => apiClient.getAllMangaPaged(next, pageSize, sortBy, sortDirection, filterParams)
      })
    }
    if (prev >= 0) {
      queryClient.prefetchQuery({
        queryKey: ['manga-catalog', { ...queryKeyParams, currentPage: prev, activeFilters: JSON.stringify(activeFilters) }],
        queryFn: () => apiClient.getAllMangaPaged(prev, pageSize, sortBy, sortDirection, filterParams)
      })
    }
  }, [mangaPage, currentPage, sortField, sortDirection, activeType, activeFilters, pageSize, queryClient, queryKeyParams])

  // Извлекаем данные из ответа API
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
        return obj.rating?.averageRating ?? obj.averageRating ?? 0
      case 'ratingCount':
        return obj.rating?.ratingCount ?? obj.ratingCount ?? 0
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
        return (typeof obj[field] === 'number') ? obj[field] : 0
    }
  }
  // Frontend tie-break fallback: если бэкенд вернул множество одинаковых primary значений,
  // отсортируем стабильно по createdAt DESC затем id DESC локально (не мутируя исходный массив в кэше)
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
          // tie -> secondary createdAt desc
            const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0
            if (ac !== bc) return bc - ac
            // final tie -> id desc
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

    // Сериализация фильтров
    if (activeFilters.genres?.length) params.genres = activeFilters.genres.join(',')
    if (activeFilters.tags?.length) params.tags = activeFilters.tags.join(',')
    if (activeFilters.type) params.type = activeFilters.type
    if (activeFilters.status) params.status = activeFilters.status
    if (activeFilters.ageRating) params.ageRating = activeFilters.ageRating.join('-')
    if (activeFilters.rating) params.rating = activeFilters.rating.join('-')
    if (activeFilters.releaseYear) params.releaseYear = activeFilters.releaseYear.join('-')
    if (activeFilters.chapterRange) params.chapterRange = activeFilters.chapterRange.join('-')

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
  }, [currentPage, sortField, sortDirection, activeType, activeFilters, genre, sortNonce, setSearchParams])

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
      chapterRange: draftFilters.chapterRange || [0, 1000]
    }
    console.log('CatalogPage: Memoized FilterState updated:', 
      'draftFilters:', draftFilters, 
      'filterState:', filterState
    )
    return filterState
  }, [
    JSON.stringify(draftFilters.selectedGenres || []),
    JSON.stringify(draftFilters.selectedTags || []),
    draftFilters.mangaType,
    draftFilters.status,
    JSON.stringify(draftFilters.ageRating || [0, 21]),
    JSON.stringify(draftFilters.rating || [0, 10]),
    JSON.stringify(draftFilters.releaseYear || [1990, new Date().getFullYear()]),
    JSON.stringify(draftFilters.chapterRange || [0, 1000])
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
      chapterRange: activeFilters.chapterRange || [0, 1000]
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
        console.log('[CatalogPage] outside desktop sort -> close')
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortDropdown])

  // Функции работы с чипсами выбранных фильтров
  const removeFilterChip = (category: string, value?: string) => {
    // Копируем текущие состояния
    const newActive = { ...activeFilters }
    const newDraft = { ...draftFilters }

    switch (category) {
      case 'activeType':
        setActiveType('все')
        break
      case 'genre':
        if (value) {
          newActive.genres = (newActive.genres || []).filter((g: string) => g !== value)
          newDraft.selectedGenres = (newDraft.selectedGenres || []).filter((g: string) => g !== value)
          if (newActive.genres.length === 0) delete newActive.genres
        }
        break
      case 'tag':
        if (value) {
          newActive.tags = (newActive.tags || []).filter((t: string) => t !== value)
          newDraft.selectedTags = (newDraft.selectedTags || []).filter((t: string) => t !== value)
          if (newActive.tags.length === 0) delete newActive.tags
        }
        break
      case 'type':
        delete newActive.type
        newDraft.mangaType = ''
        break
      case 'status':
        delete newActive.status
        newDraft.status = ''
        break
      case 'ageRating':
        delete newActive.ageRating
        newDraft.ageRating = [0, 21]
        break
      case 'rating':
        delete newActive.rating
        newDraft.rating = [0, 10]
        break
      case 'releaseYear':
        delete newActive.releaseYear
        newDraft.releaseYear = [1990, new Date().getFullYear()]
        break
      case 'chapterRange':
        delete newActive.chapterRange
        newDraft.chapterRange = [0, 1000]
        break
    }
    setActiveFilters(newActive)
    setDraftFilters(newDraft)
    setCurrentPage(0)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setDraftFilters({})
    setActiveType('все')
    setCurrentPage(0)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-4 md:py-8">
        {/* Header Section - улучшенный дизайн */}
        <div className="mb-6 md:mb-8">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-muted-foreground bg-clip-text text-transparent">
              {pageTitle}
            </h1>
          </div>
        </div>

  {/* Controls Bar - полностью переработанный дизайн */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Мобильная версия: улучшенные компактные кнопки */}
          <div className="lg:hidden">
            {/* Компактная панель управления на м��бильном */}
            <div className="flex items-center gap-3 mb-4">
              {/* Сортировка - ул��чшенная кнопка */}
              <div className="relative">
                <button
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  title="Сортировка"
                >
                  <ArrowUpDown className="h-5 w-5 text-white" />
                </button>
                {showSortDropdown && (
                  <div ref={sortDropdownRef} className="absolute left-0 top-full mt-2 w-72 bg-card rounded-xl shadow-xl z-50 border border-border animate-fade-in">
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground mb-3 font-medium">Сортировать по:</div>
                      <div className="space-y-1 mb-4">
                        {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам','По комментариям'].map(option => (
                          <button
                            key={option}
                            onClick={() => { handleSortChange(option); }}
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm transition-all duration-200 border-b-2',
                              sortOrder === option
                                ? 'text-blue-500 border-blue-500'
                                : 'text-muted-foreground hover:text-white border-transparent hover:border-muted'
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      <div className="text-xs text-muted-foreground mb-3 font-medium">Направление:</div>
                      <div className="flex gap-2">
                        {[
                          { label: 'По убыванию', value: 'desc', icon: ArrowDown },
                          { label: 'По возрастанию', value: 'asc', icon: ArrowUp }
                        ].map(dir => (
                          <button
                            key={dir.value}
                            onClick={() => { handleSortDirectionChange(dir.value as 'desc' | 'asc'); }}
                            className={cn(
                              'flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-all duration-200 border-b-2',
                              sortDirection === dir.value
                                ? 'text-blue-500 border-blue-500'
                                : 'text-muted-foreground hover:text-white border-transparent hover:border-muted'
                            )}
                          >
                            <dir.icon className="h-4 w-4" />
                            {dir.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Индикатор ��екущей сортировки - улучшенный стиль */}
              <div className="flex-1 min-w-0 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <div className="text-xs text-muted-foreground truncate">
                  <span className="text-white font-medium">{sortOrder}</span>
                  <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                </div>
              </div>

              {/* Фильтры - улучшенная кнопка */}
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title="Фильтры"
              >
                <Filter className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Быстрые фильтры для мобильной версии */}
            <div className="mt-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-2 px-1">
                {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleActiveTypeChange(type)}
                    className={cn(
                      'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      activeType === type
                        ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/20'
                        : 'bg-white/5 backdrop-blur-sm text-muted-foreground hover:bg-white/10 hover:text-white border-white/10'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Десктопная версия: улучшенная горизонтальная компоновка */}
          <div className="hidden lg:flex lg:items-center lg:justify-between w-full gap-6">
            {/* Левая группа: Сортировка + Быстрые фильтры */}
            <div className="flex items-center gap-3">
              {/* Сортировка */}
              <div ref={desktopSortRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setShowSortDropdown(v=>!v) }}
                  className="catalog-sort-button group flex items-center gap-2 bg-white/5 backdrop-blur-sm hover:bg-white/10 border border-white/10 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground group-hover:text-white" />
                  <span className="truncate max-w-[140px]">{sortOrder}</span>
                  {sortDirection==='desc'
                    ? <ArrowDown className="h-3 w-3 text-primary" />
                    : <ArrowUp className="h-3 w-3 text-primary" />}
                </button>
                {showSortDropdown && (
                  <div className="absolute z-50 mt-2 w-80 md:w-96 left-0 origin-top-left rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in">
                    <div className="flex items-start gap-6">
                      <div className="flex-1 space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-custom" role="listbox" aria-label="Поля сортировки">
                        {Object.values(SORT_LABEL_BY_FIELD).map(option => {
                          const selected = option === sortOrder
                          return (
                            <button
                              key={option}
                              onClick={() => { console.log('[CatalogPage] select sort field label=', option); handleSortChange(option); setShowSortDropdown(false) }}
                              className={cn('w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                                selected ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
                            >
                              {selected && <Check className="h-4 w-4" />}
                              <span className="truncate">{option}</span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0 w-32" aria-label="Направление">
                        <button
                          onClick={() => { console.log('[CatalogPage] select dir desc'); handleSortDirectionChange('desc'); setShowSortDropdown(false) }}
                          className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                            sortDirection==='desc' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
                        >
                          <ArrowDown className="h-4 w-4" />
                          Убыв.
                        </button>
                        <button
                          onClick={() => { console.log('[CatalogPage] select dir asc'); handleSortDirectionChange('asc'); setShowSortDropdown(false) }}
                          className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40',
                            sortDirection==='asc' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-white')}
                        >
                          <ArrowUp className="h-4 w-4" />
                          Возраст.
                        </button>
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            onClick={() => { resetSort(); setShowSortDropdown(false) }}
                            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Сброс
                          </button>
                          <button onClick={()=>setShowSortDropdown(false)} className="text-xs text-muted-foreground hover:text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary/40">Закрыть</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Быстрые фильтры рядом с сортировкой */}
              <div className="flex gap-2">
                {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleActiveTypeChange(type)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      activeType === type
                        ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/20'
                        : 'bg-white/5 backdrop-blur-sm text-muted-foreground hover:bg-white/10 hover:text-white border-white/10'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Styled Wrapper */}
        <section className="relative -mx-2 sm:mx-0 mb-10 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] via-white/[0.025] to-transparent backdrop-blur-sm shadow-inner shadow-black/40 p-4 sm:p-6 lg:p-8">
          {/* Desktop controls already rendered above, just adjust sort button size via global class override */}
          <style>{`.catalog-sort-button{height:2.5rem;padding-top:0.25rem;padding-bottom:0.25rem;padding-left:0.9rem;padding-right:0.9rem;border-radius:0.75rem;font-size:0.8rem}`}</style>
          {/* Reposition Selected Filters inside wrapper */}
          <SelectedFiltersBar
            activeFilters={activeFilters}
            activeType={activeType}
            onRemove={removeFilterChip}
            onClearAll={clearAllFilters}
            className="mb-4"
          />
          {/* Separator line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />
          {/* Grid stays below (grid code remains unchanged further down) */}
        </section>

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
          {/* Основной контент */}
          <div className="flex-1 min-w-0">
            {/* Manga Grid - улучшенная сетка с анимацией */}
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
                <div className="relative grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 auto-rows-auto sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] items-start animate-fade-in">
                  {isLoading && manga.length === 0 && Array.from({ length: pageSize }).map((_, i) => (
                    <MangaCardSkeleton key={i} />
                  ))}
                  {!isLoading && manga.length === 0 && (
                    <div className="col-span-full">
                      <EmptyState onReset={clearAllFilters} />
                    </div>
                  )}
                  {manga.length > 0 && manga.map((item: MangaResponseDTO) => (
                    <MangaCardWithTooltip key={item.id} manga={item} />
                  ))}
                  {isLoading && manga.length > 0 && (
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] pointer-events-none" aria-hidden />
                  )}
                </div>
              )}
            </ErrorBoundary>

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8 mb-8">
                {/* Info */}
                <div className="text-sm text-muted-foreground">
                  Показано {manga?.length || 0} из {totalElements} произведений
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* First Page */}
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 0}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      currentPage === 0
                        ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 0}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      currentPage === 0
                        ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Предыдущая
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i
                      if (pageNum >= totalPages) return null

                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border min-w-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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

                  {/* Next Page */}
                  <button
                    onClick={goToNextPage}
                    disabled={!totalPages || currentPage >= totalPages - 1}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      !totalPages || currentPage >= totalPages - 1
                        ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                    )}
                  >
                    Следующая
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={goToLastPage}
                    disabled={!totalPages || currentPage >= totalPages - 1}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      !totalPages || currentPage >= totalPages - 1
                        ? 'bg-white/5 text-muted-foreground border-white/10 cursor-not-allowed'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30'
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </button>
                </div>

                {/* Current Page Info */}
                <div className="text-sm text-muted-foreground">
                  Страница {currentPage + 1} из {totalPages}
                </div>
              </div>
            )}

          </div>

          {/* Боковые фильтры для десктопа */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <MangaFilterPanel
              initialFilters={memoizedFilterState}
              onFiltersChange={handleFiltersChange}
              onReset={resetFilters}
              onApply={applyFilters}
              className="sticky top-4"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
