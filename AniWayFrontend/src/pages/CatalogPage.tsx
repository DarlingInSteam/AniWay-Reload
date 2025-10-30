import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Check, RotateCcw } from 'lucide-react'
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

const TYPE_LABELS: Record<string, string> = {
  MANGA: 'Манга',
  MANHWA: 'Манхва',
  MANHUA: 'Маньхуа',
  WESTERN_COMIC: 'Западный комикс',
  RUSSIAN_COMIC: 'Русский комикс',
  OEL: 'OEL',
  OTHER: 'Другое'
}

const STATUS_LABELS: Record<string, string> = {
  ONGOING: 'Выходит',
  COMPLETED: 'Завершена',
  HIATUS: 'Пауза',
  CANCELLED: 'Отменена'
}

const ACTIVE_TYPE_LABELS: Record<string, string> = {
  манга: 'Манга',
  манхва: 'Манхва',
  маньхуа: 'Маньхуа',
  'западный комикс': 'Западный комикс',
  рукомикс: 'Русский комикс',
  другое: 'Другое'
}

const DEFAULT_AGE_RATING: [number, number] = [0, 21]
const DEFAULT_RATING_RANGE: [number, number] = [0, 10]
const DEFAULT_CHAPTER_RANGE: [number, number] = [0, 1000]
const DEFAULT_RELEASE_YEAR_RANGE: [number, number] = [1990, new Date().getFullYear()]

const CHIP_TONE_CLASSES: Record<'default' | 'primary' | 'warm', string> = {
  default: 'bg-[#1c2331] text-white/80 hover:text-white hover:bg-[#232d3e]',
  primary: 'bg-primary/18 text-primary hover:bg-primary/28 hover:text-white',
  warm: 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
}

const rangesEqual = (a?: [number, number], b?: [number, number]) => {
  if (!a || !b) return false
  return a[0] === b[0] && a[1] === b[1]
}

type ChipTone = 'default' | 'primary' | 'warm'
type ChipCategory = 'search' | 'genre' | 'tag' | 'type' | 'status' | 'ageRating' | 'rating' | 'releaseYear' | 'chapterRange' | 'strict' | 'activeType'

interface ActiveChip {
  key: string
  label: string
  tone?: ChipTone
  onRemove: () => void
}

const normalizeRange = (value: unknown): [number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const first = Number(value[0])
  const second = Number(value[1])
  if (!Number.isFinite(first) || !Number.isFinite(second)) return undefined
  return [first, second]
}

type RangeTuple = [number, number]

interface NormalizedFilterState {
  selectedGenres: string[]
  selectedTags: string[]
  mangaType: string
  status: string
  ageRating: RangeTuple
  rating: RangeTuple
  releaseYear: RangeTuple
  chapterRange: RangeTuple
  strictMatch: boolean
}

const arrayShallowEqual = <T,>(a: readonly T[], b: readonly T[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const ensureRange = (value: unknown, fallback: RangeTuple): RangeTuple => {
  const normalized = normalizeRange(value)
  return normalized ? [...normalized] as RangeTuple : [...fallback] as RangeTuple
}

const coerceStringArray = (value?: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return (value as unknown[]).filter((item): item is string => typeof item === 'string' && item.length > 0)
}

const normalizeFilterState = (filters?: Partial<NormalizedFilterState>): NormalizedFilterState => ({
  selectedGenres: coerceStringArray(filters?.selectedGenres),
  selectedTags: coerceStringArray(filters?.selectedTags),
  mangaType: filters?.mangaType ?? '',
  status: filters?.status ?? '',
  ageRating: ensureRange(filters?.ageRating, DEFAULT_AGE_RATING),
  rating: ensureRange(filters?.rating, DEFAULT_RATING_RANGE),
  releaseYear: ensureRange(filters?.releaseYear, DEFAULT_RELEASE_YEAR_RANGE),
  chapterRange: ensureRange(filters?.chapterRange, DEFAULT_CHAPTER_RANGE),
  strictMatch: Boolean(filters?.strictMatch)
})

const areDraftFilterStatesEqual = (a: NormalizedFilterState, b: NormalizedFilterState) => (
  arrayShallowEqual(a.selectedGenres, b.selectedGenres) &&
  arrayShallowEqual(a.selectedTags, b.selectedTags) &&
  a.mangaType === b.mangaType &&
  a.status === b.status &&
  rangesEqual(a.ageRating, b.ageRating) &&
  rangesEqual(a.rating, b.rating) &&
  rangesEqual(a.releaseYear, b.releaseYear) &&
  rangesEqual(a.chapterRange, b.chapterRange) &&
  a.strictMatch === b.strictMatch
)

const buildActiveFilterParams = (filters: NormalizedFilterState) => {
  const params: Record<string, any> = {}
  if (filters.selectedGenres.length) params.genres = [...filters.selectedGenres]
  if (filters.selectedTags.length) params.tags = [...filters.selectedTags]
  if (filters.mangaType) params.type = filters.mangaType
  if (filters.status) params.status = filters.status
  if (!rangesEqual(filters.ageRating, DEFAULT_AGE_RATING)) params.ageRating = [...filters.ageRating]
  if (!rangesEqual(filters.rating, DEFAULT_RATING_RANGE)) params.rating = [...filters.rating]
  if (!rangesEqual(filters.releaseYear, DEFAULT_RELEASE_YEAR_RANGE)) params.releaseYear = [...filters.releaseYear]
  if (!rangesEqual(filters.chapterRange, DEFAULT_CHAPTER_RANGE)) params.chapterRange = [...filters.chapterRange]
  if (filters.strictMatch) params.strictMatch = true
  return params
}

const areActiveFilterParamsEqual = (a: Record<string, any>, b: Record<string, any>) => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    const valA = a[key]
    const valB = b[key]
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (!arrayShallowEqual(valA, valB)) return false
    } else if (valA !== valB) {
      return false
    }
  }
  return true
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [activeType, setActiveType] = useState(searchParams.get('activeType') || 'все')
  // Поиск
  const initialQuery = searchParams.get('query') || ''
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const resetScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  // Debounce фактического применения поиска (отдельно от ввода)
  useEffect(() => {
    const h = setTimeout(() => {
      const trimmed = searchInput.trim()
      setSearchQuery(trimmed)
      if (trimmed !== searchQuery) {
        resetScrollToTop()
      }
    }, 450)
    return () => clearTimeout(h)
  }, [resetScrollToTop, searchInput, searchQuery])

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
  const PAGE_SIZE = 60
  const [sortNonce, setSortNonce] = useState(0)
  // Динамический отступ для sticky панели фильтров (чтобы не пряталась под глобальным хедером)
  const [filterOffset, setFilterOffset] = useState<number>(80) // fallback 80px
  useEffect(() => {
    const measure = () => {
      const headerEl = document.querySelector('header') as HTMLElement | null
      const h = headerEl ? headerEl.getBoundingClientRect().height : 0
      // Добавляем небольшой зазор (8px), чтобы панель не пряталась под хедером
      setFilterOffset(h + 8)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Разбор значений из URL
  const parseArray = (value: string | null) => !value ? [] : value.split(',').filter(Boolean)
  const parseRange = (value: string | null): [number, number] | undefined => {
    if (!value) return undefined
    const parts = value.split('-').map(v => parseInt(v, 10)).filter(v => !isNaN(v))
    if (parts.length === 2) return [parts[0], parts[1]] as [number, number]
    return undefined
  }
  // Build initial filters once from URL (single capture to avoid race with writer effect)
  const collectInitialFilters = () => {
    // Support legacy single 'genre' param by merging into genres if present
    const legacySingleGenre = searchParams.get('genre')
    // Allow both comma list (?genres=a,b) and repeated params (?genres=a&genres=b)
    const repeatedGenres = searchParams.getAll('genres')
    const combinedGenres = repeatedGenres.length > 0
      ? repeatedGenres.flatMap(g => g.split(',')).map(g => g.trim()).filter(Boolean)
      : parseArray(searchParams.get('genres'))
    if (legacySingleGenre && !combinedGenres.includes(legacySingleGenre)) {
      combinedGenres.push(legacySingleGenre)
    }
    const repeatedTags = searchParams.getAll('tags')
    const combinedTags = repeatedTags.length > 0
      ? repeatedTags.flatMap(t => t.split(',')).map(t => t.trim()).filter(Boolean)
      : parseArray(searchParams.get('tags'))
    const f: any = {
      genres: combinedGenres,
      tags: combinedTags,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      ageRating: parseRange(searchParams.get('ageRating')),
      rating: parseRange(searchParams.get('rating')),
      releaseYear: parseRange(searchParams.get('releaseYear')),
      chapterRange: parseRange(searchParams.get('chapterRange')),
      strictMatch: searchParams.get('strict') === '1' || searchParams.get('strictMatch') === 'true'
    }
    Object.keys(f).forEach(k => {
      const v = f[k]
      if (Array.isArray(v) && v.length === 0) delete f[k]
      if (v === undefined) delete f[k]
    })
    return f
  }
  const initialActiveFilters: any = collectInitialFilters()
  Object.keys(initialActiveFilters).forEach(k => {
    const v = (initialActiveFilters as any)[k]
    if (Array.isArray(v) && v.length === 0) delete (initialActiveFilters as any)[k]
    if (v === undefined) delete (initialActiveFilters as any)[k]
  })
  if (initialActiveFilters.ageRating && rangesEqual(initialActiveFilters.ageRating, DEFAULT_AGE_RATING)) {
    delete initialActiveFilters.ageRating
  }
  if (initialActiveFilters.rating && rangesEqual(initialActiveFilters.rating, DEFAULT_RATING_RANGE)) {
    delete initialActiveFilters.rating
  }
  if (initialActiveFilters.releaseYear && rangesEqual(initialActiveFilters.releaseYear, DEFAULT_RELEASE_YEAR_RANGE)) {
    delete initialActiveFilters.releaseYear
  }
  if (initialActiveFilters.chapterRange && rangesEqual(initialActiveFilters.chapterRange, DEFAULT_CHAPTER_RANGE)) {
    delete initialActiveFilters.chapterRange
  }
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(initialActiveFilters)
  const [draftFilters, setDraftFilters] = useState<NormalizedFilterState>(() => normalizeFilterState({
    selectedGenres: initialActiveFilters.genres,
    selectedTags: initialActiveFilters.tags,
    mangaType: initialActiveFilters.type,
    status: initialActiveFilters.status,
    ageRating: initialActiveFilters.ageRating,
    rating: initialActiveFilters.rating,
    releaseYear: initialActiveFilters.releaseYear,
    chapterRange: initialActiveFilters.chapterRange,
    strictMatch: initialActiveFilters.strictMatch
  }))
  // Refs & QueryClient
  const desktopSortRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const genre = searchParams.get('genre') // legacy single genre (still supported)

  const queryKeyParams = useMemo(() => ({
    genre: genre || null,
    sortField,
    sortDirection,
    activeType,
    sortNonce,
    activeFilters: JSON.stringify(activeFilters),
    searchQuery
  }), [genre, sortField, sortDirection, activeType, activeFilters, sortNonce, searchQuery])

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

  const buildFilterParams = useCallback(() => {
    const filterParams: Record<string, any> = { ...activeFilters }
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
    return filterParams
  }, [activeFilters, activeType])

  const fetchPage = useCallback((pageParam: number) => {
    const sortBy = normalizeSortField(sortField)
    const filterParams = buildFilterParams()

    if (genre) {
      return apiClient.searchMangaPaged({
        genre,
        page: pageParam,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder: sortDirection,
        ...filterParams
      })
    }

    if (searchQuery) {
      return apiClient.searchMangaPaged({
        query: searchQuery,
        page: pageParam,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder: sortDirection,
        ...filterParams
      })
    }

    return apiClient.getAllMangaPaged(pageParam, PAGE_SIZE, sortBy, sortDirection, filterParams)
  }, [PAGE_SIZE, buildFilterParams, genre, searchQuery, sortDirection, sortField])

  const {
    data: mangaPages,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<PageResponse<MangaResponseDTO>>({
    queryKey: ['manga-catalog', queryKeyParams],
  queryFn: ({ pageParam = 0 }) => fetchPage(pageParam as number),
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.last) {
        return undefined
      }
      const nextPage = typeof lastPage.page === 'number' ? lastPage.page + 1 : undefined
      if (nextPage !== undefined && nextPage < (lastPage.totalPages ?? Number.MAX_SAFE_INTEGER)) {
        return nextPage
      }
      return undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })

  const allPages = mangaPages?.pages ?? []
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

  const combinedManga = useMemo(() => {
    if (!allPages.length) {
      return [] as MangaResponseDTO[]
    }
    const items = allPages.flatMap(page => page?.content ?? []) as MangaResponseDTO[]
    if (items.length <= 1 || !sortField) {
      return items
    }
    try {
      const primaryField = sortField
      const direction = sortDirection === 'desc' ? -1 : 1
      const needTieBreak = items.some((m: MangaResponseDTO, index: number, arr: MangaResponseDTO[]) =>
        index > 0 && getComparable(arr[index - 1], primaryField) === getComparable(m, primaryField)
      )
      if (!needTieBreak) {
        return items
      }
      return [...items].sort((a, b) => {
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
    } catch (error) {
      console.warn('Frontend tie-break sort failed:', error)
      return items
    }
  }, [allPages, sortField, sortDirection])

  const manga = combinedManga
  const totalElements = allPages.length > 0
    ? allPages[0]?.totalElements ?? manga.length
    : manga.length
  const isInitialLoading = isLoading && allPages.length === 0

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }, { rootMargin: '300px 0px' })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  // getSortByField не требуется — используем непосредственный sortField

  // --- EARLY URL -> STATE SYNC EFFECT ---
  // Ensures that when user navigates via tooltip using repeated ?genres=<g> or ?tags=<t>,
  // we immediately reflect those into draft & active filters BEFORE we write back to URL.
  useEffect(() => {
    // Read repeated params again (fresh each navigation)
    const rawRepeatedGenres = searchParams.getAll('genres')
    const rawRepeatedTags = searchParams.getAll('tags')
    const singleGenre = searchParams.get('genre')
    const expandedGenres = rawRepeatedGenres.length > 0
      ? rawRepeatedGenres.flatMap(g => g.split(',')).map(g => g.trim()).filter(Boolean)
      : []
    if (singleGenre && !expandedGenres.includes(singleGenre)) expandedGenres.push(singleGenre)
    const expandedTags = rawRepeatedTags.length > 0
      ? rawRepeatedTags.flatMap(t => t.split(',')).map(t => t.trim()).filter(Boolean)
      : []

    const needGenresUpdate = expandedGenres.length > 0 && (
      JSON.stringify([...new Set(expandedGenres)].sort()) !== JSON.stringify([...(draftFilters.selectedGenres||[])].sort())
    )
    const needTagsUpdate = expandedTags.length > 0 && (
      JSON.stringify([...new Set(expandedTags)].sort()) !== JSON.stringify([...(draftFilters.selectedTags||[])].sort())
    )
    if (needGenresUpdate || needTagsUpdate) {
      const nextDraft = { ...draftFilters }
      const nextActive = { ...activeFilters }
      if (needGenresUpdate) {
        const uniq = [...new Set(expandedGenres)]
        nextDraft.selectedGenres = uniq
        nextActive.genres = uniq
      }
      if (needTagsUpdate) {
        const uniqT = [...new Set(expandedTags)]
        nextDraft.selectedTags = uniqT
        nextActive.tags = uniqT
      }
      setDraftFilters(nextDraft)
      setActiveFilters(nextActive)
      resetScrollToTop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetScrollToTop, searchParams])

  // Синхронизация состояния с URL (без циклических обновлений) – WRITER effect (runs after state changes)
  useEffect(() => {
    const params: Record<string,string> = {}
    if (genre) params.genre = genre
  params.sortField = sortField
    if (sortDirection !== 'desc') params.dir = sortDirection
    if (activeType && activeType !== 'все') params.activeType = activeType
    if (searchQuery) params.query = searchQuery

    // Сериализация фильтров
    if (activeFilters.genres?.length) params.genres = activeFilters.genres.join(',')
    if (activeFilters.tags?.length) params.tags = activeFilters.tags.join(',')
    if (activeFilters.type) params.type = activeFilters.type
    if (activeFilters.status) params.status = activeFilters.status
    if (activeFilters.ageRating && !rangesEqual(activeFilters.ageRating, DEFAULT_AGE_RATING)) params.ageRating = activeFilters.ageRating.join('-')
    if (activeFilters.rating && !rangesEqual(activeFilters.rating, DEFAULT_RATING_RANGE)) params.rating = activeFilters.rating.join('-')
    if (activeFilters.releaseYear && !rangesEqual(activeFilters.releaseYear, DEFAULT_RELEASE_YEAR_RANGE)) params.releaseYear = activeFilters.releaseYear.join('-')
    if (activeFilters.chapterRange && !rangesEqual(activeFilters.chapterRange, DEFAULT_CHAPTER_RANGE)) params.chapterRange = activeFilters.chapterRange.join('-')
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
  }, [sortField, sortDirection, activeType, activeFilters, genre, sortNonce, searchQuery, setSearchParams])

  // Обработчики фильтров
  const memoizedFilterState = useMemo(() => ({
    selectedGenres: [...draftFilters.selectedGenres],
    selectedTags: [...draftFilters.selectedTags],
    mangaType: draftFilters.mangaType,
    status: draftFilters.status,
    ageRating: [...draftFilters.ageRating] as RangeTuple,
    rating: [...draftFilters.rating] as RangeTuple,
    releaseYear: [...draftFilters.releaseYear] as RangeTuple,
    chapterRange: [...draftFilters.chapterRange] as RangeTuple,
    strictMatch: draftFilters.strictMatch
  }), [draftFilters])

  const applyFilterState = useCallback((nextFilters: Partial<NormalizedFilterState>) => {
    const normalized = normalizeFilterState(nextFilters)
    const draftChanged = !areDraftFilterStatesEqual(draftFilters, normalized)
    const nextActive = buildActiveFilterParams(normalized)
    const activeChanged = !areActiveFilterParamsEqual(activeFilters, nextActive)

    if (draftChanged) {
      setDraftFilters(normalized)
    }

    if (activeChanged) {
      setActiveFilters(nextActive)
    }

    if (draftChanged || activeChanged) {
      resetScrollToTop()
    }
  }, [activeFilters, draftFilters, resetScrollToTop, setActiveFilters, setDraftFilters])

  const handleFiltersChange = useCallback((filters: Partial<NormalizedFilterState>) => {
    applyFilterState(filters)
  }, [applyFilterState])

  // Обработчик быстрых фильтров
  const handleActiveTypeChange = (type: string) => {
  // Debug removed
    setActiveType(type)
    resetScrollToTop()
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
    resetScrollToTop()
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
    resetScrollToTop()
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  }

  // Сброс сортировки к дефолтной (поле + направление)
  const resetSort = () => {
    setSortField(defaultSortField)
    setSortDirection('desc')
    setSortNonce(n=>n+1)
    resetScrollToTop()
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  }

  // Функции навигации по страницам
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
    applyFilterState({})
    setActiveType('все')
    setSearchInput('')
    setSearchQuery('')
    resetScrollToTop()
  }

  const removeFilterChip = useCallback((category: ChipCategory, value?: string) => {
    if (category === 'search') {
      setSearchInput('')
      setSearchQuery('')
      resetScrollToTop()
      return
    }

    if (category === 'activeType') {
      setActiveType('все')
      resetScrollToTop()
      return
    }

    const nextDraft: NormalizedFilterState = {
      ...draftFilters,
      selectedGenres: [...draftFilters.selectedGenres],
      selectedTags: [...draftFilters.selectedTags],
      ageRating: [...draftFilters.ageRating] as RangeTuple,
      rating: [...draftFilters.rating] as RangeTuple,
      releaseYear: [...draftFilters.releaseYear] as RangeTuple,
      chapterRange: [...draftFilters.chapterRange] as RangeTuple
    }

    switch (category) {
      case 'genre':
        if (value) {
          nextDraft.selectedGenres = nextDraft.selectedGenres.filter(item => item !== value)
        }
        break
      case 'tag':
        if (value) {
          nextDraft.selectedTags = nextDraft.selectedTags.filter(item => item !== value)
        }
        break
      case 'type':
        nextDraft.mangaType = ''
        break
      case 'status':
        nextDraft.status = ''
        break
      case 'ageRating':
        nextDraft.ageRating = [...DEFAULT_AGE_RATING] as RangeTuple
        break
      case 'rating':
        nextDraft.rating = [...DEFAULT_RATING_RANGE] as RangeTuple
        break
      case 'releaseYear':
        nextDraft.releaseYear = [...DEFAULT_RELEASE_YEAR_RANGE] as RangeTuple
        break
      case 'chapterRange':
        nextDraft.chapterRange = [...DEFAULT_CHAPTER_RANGE] as RangeTuple
        break
      case 'strict':
        nextDraft.strictMatch = false
        break
    }

    applyFilterState(nextDraft)
    resetScrollToTop()
  }, [applyFilterState, draftFilters, resetScrollToTop, setActiveType, setSearchInput, setSearchQuery])

  const activeChips = useMemo<ActiveChip[]>(() => {
    const chips: ActiveChip[] = []

    if (searchQuery) {
      chips.push({
        key: 'search',
        label: `Поиск: “${searchQuery}”`,
        onRemove: () => removeFilterChip('search')
      })
    }

    if (activeType !== 'все') {
      const label = ACTIVE_TYPE_LABELS[activeType] || activeType
      chips.push({
        key: 'active-type',
        label,
        tone: 'primary',
        onRemove: () => removeFilterChip('activeType')
      })
    }

    const genres = Array.isArray((activeFilters as any).genres) ? (activeFilters as any).genres as string[] : []
    genres.forEach(genre => {
      chips.push({
        key: `genre-${genre}`,
        label: genre,
        onRemove: () => removeFilterChip('genre', genre)
      })
    })

    const tags = Array.isArray((activeFilters as any).tags) ? (activeFilters as any).tags as string[] : []
    tags.forEach(tag => {
      chips.push({
        key: `tag-${tag}`,
        label: `#${tag}`,
        onRemove: () => removeFilterChip('tag', tag)
      })
    })

    const appliedType = (activeFilters as any).type as string | undefined
    if (appliedType) {
      chips.push({
        key: `type-${appliedType}`,
        label: TYPE_LABELS[appliedType] || appliedType,
        tone: 'primary',
        onRemove: () => removeFilterChip('type')
      })
    }

    const appliedStatus = (activeFilters as any).status as string | undefined
    if (appliedStatus) {
      chips.push({
        key: `status-${appliedStatus}`,
        label: STATUS_LABELS[appliedStatus] || appliedStatus,
        onRemove: () => removeFilterChip('status')
      })
    }

    const ageRange = normalizeRange((activeFilters as any).ageRating)
    if (ageRange && !rangesEqual(ageRange, DEFAULT_AGE_RATING)) {
      chips.push({
        key: 'age-rating',
        label: `Возраст: ${ageRange[0]}+–${ageRange[1]}+`,
        onRemove: () => removeFilterChip('ageRating')
      })
    }

    const ratingRange = normalizeRange((activeFilters as any).rating)
    if (ratingRange && !rangesEqual(ratingRange, DEFAULT_RATING_RANGE)) {
      chips.push({
        key: 'rating-range',
        label: `Рейтинг: ${ratingRange[0]}–${ratingRange[1]}`,
        onRemove: () => removeFilterChip('rating')
      })
    }

    const releaseRange = normalizeRange((activeFilters as any).releaseYear)
    if (releaseRange && !rangesEqual(releaseRange, DEFAULT_RELEASE_YEAR_RANGE)) {
      chips.push({
        key: 'release-range',
        label: `Годы: ${releaseRange[0]}–${releaseRange[1]}`,
        onRemove: () => removeFilterChip('releaseYear')
      })
    }

    const chapterRange = normalizeRange((activeFilters as any).chapterRange)
    if (chapterRange && !rangesEqual(chapterRange, DEFAULT_CHAPTER_RANGE)) {
      chips.push({
        key: 'chapter-range',
        label: `Главы: ${chapterRange[0]}–${chapterRange[1]}`,
        onRemove: () => removeFilterChip('chapterRange')
      })
    }

    const strict = Boolean((activeFilters as any).strictMatch)
    if (strict) {
      chips.push({
        key: 'strict',
        label: 'Строгое совпадение',
        tone: 'warm',
        onRemove: () => removeFilterChip('strict')
      })
    }

    return chips
  }, [activeFilters, activeType, searchQuery, removeFilterChip])

  // (Removed old external sync effect – replaced by early sync above)


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
            <span className="font-bold text-lg text-foreground antialiased">Фильтры</span>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <div className="space-y-4 px-0 md:pl-8">
                {/* Заголовок + поиск + сортировка */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground antialiased">{pageTitle}</h1>
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Поиск по названию" className="w-full h-10 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 focus:border-primary/40 focus:ring-2 focus:ring-primary/30 outline-none text-sm text-foreground placeholder:text-muted-foreground/60 transition antialiased" />
                        {searchInput && (
                          <button onClick={()=>{setSearchInput('');setSearchQuery('');resetScrollToTop()}} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10" aria-label="Очистить поиск">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div ref={desktopSortRef} className="relative">
                        <button onClick={()=>setShowSortDropdown(v=>!v)} className="h-10 px-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium antialiased">
                          <ArrowUpDown className="h-4 w-4" />
                          <span className="hidden sm:inline-block max-w-[140px] truncate">{sortOrder}</span>
                          {sortDirection==='desc'?<ArrowDown className="h-3 w-3"/>:<ArrowUp className="h-3 w-3"/>}
                        </button>
                        {showSortDropdown && (
                          <div className="absolute z-50 mt-2 w-72 sm:w-80 right-0 origin-top-right rounded-xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl p-4 animate-fade-in">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-1 max-h-[260px] sm:max-h-[300px] overflow-y-auto pr-1 scrollbar-custom">
                                {Object.values(SORT_LABEL_BY_FIELD).map(option=>{const selected=option===sortOrder;return(<button key={option} onClick={()=>{handleSortChange(option);setShowSortDropdown(false)}} className={cn('w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors antialiased',selected?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}>{selected&&<Check className="h-4 w-4"/>}<span className="truncate">{option}</span></button>)})}
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0 w-28">
                                <button onClick={()=>{handleSortDirectionChange('desc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors antialiased',sortDirection==='desc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}><ArrowDown className="h-4 w-4"/> Убыв.</button>
                                <button onClick={()=>{handleSortDirectionChange('asc');setShowSortDropdown(false)}} className={cn('flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors antialiased',sortDirection==='asc'?'bg-primary/20 text-primary':'text-muted-foreground hover:bg-white/10 hover:text-foreground')}><ArrowUp className="h-4 w-4"/> Возраст.</button>
                                <button onClick={()=>{resetSort();setShowSortDropdown(false)}} className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 antialiased"><RotateCcw className="h-3.5 w-3.5"/> Сброс</button>
                                <button onClick={()=>setShowSortDropdown(false)} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded antialiased">Закрыть</button>
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

                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 px-1 py-2">
                    {activeChips.map(chip => (
                      <button
                        key={chip.key}
                        onClick={chip.onRemove}
                        className={cn(
                          'group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 antialiased',
                          CHIP_TONE_CLASSES[chip.tone ?? 'default']
                        )}
                      >
                        <span className="leading-none">{chip.label}</span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
                          <X className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 antialiased"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Сбросить все
                    </button>
                  </div>
                )}

                {/* Сетка карточек */}
                <ErrorBoundary fallback={
                  <div className="text-center py-16">
                    <h3 className="text-xl font-medium text-foreground mb-2 antialiased">Ошибка при загрузке каталога</h3>
                    <p className="text-muted-foreground mb-4 antialiased">Проверьте консоль браузера для деталей</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors antialiased"
                    >
                      Перезагрузить страницу
                    </button>
                  </div>
                }>
                  {isError ? (
                    <ErrorState onRetry={() => refetch()} />
                  ) : (
                    <div className="relative grid
                      grid-cols-3
                      [grid-auto-rows:auto]
                      gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5 xl:gap-4
                      md:grid-cols-4
                      lg:grid-cols-5
                      xl:grid-cols-6
                      2xl:grid-cols-6
                      items-start place-content-start justify-items-stretch animate-fade-in max-w-[1400px] w-full">
                      {isInitialLoading && manga.length === 0 && Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <MangaCardSkeleton key={i} />
                      ))}
                      {!isInitialLoading && manga.length === 0 && (
                        <div className="col-span-full">
                          <EmptyState onReset={clearAllFilters} />
                        </div>
                      )}
                      {manga.length > 0 && manga.map((item: MangaResponseDTO) => (
                        <MangaCardWithTooltip key={item.id} manga={item} />
                      ))}
                      {isFetchingNextPage && hasNextPage && Array.from({ length: Math.min(12, PAGE_SIZE) }).map((_, index) => (
                        <MangaCardSkeleton key={`next-skeleton-${index}`} />
                      ))}
                    </div>
                  )}
                </ErrorBoundary>

                <div className="flex flex-col items-center gap-4 mt-8 mb-6">
                  <div className="text-sm text-muted-foreground">
                    Показано {manga.length} из {totalElements} произведений
                  </div>
                  <div className="w-full flex justify-center">
                    <div
                      ref={loadMoreRef}
                      className="flex h-16 items-center justify-center px-4 text-sm text-muted-foreground"
                    >
                      {isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-foreground">
                          <LoadingSpinner className="h-4 w-4" />
                          <span>Загрузка ещё...</span>
                        </div>
                      ) : hasNextPage ? (
                        <span>Прокрутите ниже, чтобы загрузить больше</span>
                      ) : (
                        <span>Вы увидели все результаты</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/* Правая колонка: фильтры */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky" style={{ top: filterOffset }}>
              <MangaFilterPanel
                initialFilters={memoizedFilterState}
                onFiltersChange={handleFiltersChange}
                appearance="desktop"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
