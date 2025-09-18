import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Grid, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MangaCardWithTooltip } from '@/components/manga'
import { MangaCardSkeleton } from '@/components/manga/MangaCardSkeleton'
import { SelectedFiltersBar } from '@/components/filters/SelectedFiltersBar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
// import { MangaFilterSidebar } from '@/components/filters/MangaFilterSidebar'
import { MangaFilterPanel } from '@/components/filters/MangaFilterPanel'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'
import { PageResponse, MangaResponseDTO } from '@/types'

export function CatalogPage() {
  const [searchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [activeType, setActiveType] = useState('все')
  const [sortOrder, setSortOrder] = useState('По популярности')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20) // Фиксированный размер страницы - 20 тайтлов на страницу
  const [activeFilters, setActiveFilters] = useState<any>({}) // Применённые фильтры (для API)
  const [draftFilters, setDraftFilters] = useState<any>({}) // Предварительные фильтры (для UI)

  // Refs для обработки кликов вне области
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()
  const genre = searchParams.get('genre')
  const sort = searchParams.get('sort')

  // Убираем ненужную инвалидацию кэша при монтировании
  // Кэш должен инвалидироваться только при реальных изменениях данных
  // useEffect(() => {
  //   console.log('CatalogPage: Invalidating manga cache on mount')
  //   queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
  // }, [queryClient])

  // Создаем стабильный объект для queryKey
  const queryKeyParams = useMemo(() => ({
    genre: genre || null,
    sort: sort || null,
    currentPage,
    sortOrder,
    sortDirection,
    activeType,
    activeFilters: JSON.stringify(activeFilters) // Сериализуем для стабильности
  }), [genre, sort, currentPage, sortOrder, sortDirection, activeType, activeFilters])

  const { data: mangaPage, isLoading } = useQuery<PageResponse<MangaResponseDTO>>({
    queryKey: ['manga-catalog', queryKeyParams],
    queryFn: () => {
      const sortBy = getSortByField(sortOrder)
      
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
      
      console.log('Filter params only:', filterParams)
      console.log('Sort params:', { sortBy, sortDirection })
      console.log('Page params:', { currentPage, pageSize })
      console.log('ActiveFilters state:', activeFilters)
      console.log('QueryKey params:', queryKeyParams)
      
      // Детальный лог того, что отправляется в API
      console.log('=== API CALL DETAILS ===')
      console.log('Genre from URL:', genre)
      console.log('Final filterParams being sent:', JSON.stringify(filterParams, null, 2))
      console.log('getAllMangaPaged params:', {
        page: currentPage,
        size: pageSize,
        sortBy,
        sortOrder: sortDirection,
        filters: filterParams
      })
      console.log('========================')
      
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
    enabled: true, // Всегда включен
    staleTime: 1000 * 60 * 5, // 5 минут
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Извлекаем данные из ответа API
  const manga = mangaPage?.content ?? []
  const totalElements = mangaPage?.totalElements ?? 0
  const totalPages = mangaPage?.totalPages ?? 1
  const isFirst = mangaPage?.first ?? true
  const isLast = mangaPage?.last ?? true

  const getSortByField = (sortOrder: string): string => {
    switch (sortOrder) {
      case 'По популярности': return 'popularity' // Комплексная сортировка: views + comments + likes + reviews
      case 'По новизне': return 'createdAt'
      case 'По кол-ву глав': return 'chapterCount'
      case 'По дате обновления': return 'updatedAt'
      case 'По оценке': return 'rating'
      case 'По кол-ву оценок': return 'ratingCount'
      case 'По лайкам': return 'likes'
      case 'По просмотрам': return 'views'
      case 'По отзывам': return 'reviews'
      case 'По комментариям': return 'comments'
      default: return 'createdAt'
    }
  }

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
    console.log('CatalogPage: Converting activeFilters to FilterState:', 
      'activeFilters:', activeFilters, 
      'filterState:', filterState
    )
    return filterState
  }

  // Обработка изменений в предварительных фильтрах (не применяем сразу)
  const handleFiltersChange = (filters: any) => {
    console.log('CatalogPage: Updating draft filters:', JSON.stringify(filters, null, 2))
    setDraftFilters(filters)
  }

  // Функция применения фильтров (вызывается кнопкой "Применить")
  const applyFilters = () => {
    console.log('CatalogPage: Applying filters:', JSON.stringify(draftFilters, null, 2))
    
    // Преобразуем FilterState в SearchParams формат
    const searchParams: any = {}
    
    if (draftFilters.selectedGenres?.length > 0) {
      console.log('CatalogPage: Processing selectedGenres:', draftFilters.selectedGenres)
      searchParams.genres = draftFilters.selectedGenres
    }
    
    if (draftFilters.selectedTags?.length > 0) {
      console.log('CatalogPage: Processing selectedTags:', draftFilters.selectedTags)
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

    console.log('CatalogPage: Applied filters to activeFilters:', searchParams)
    console.log('CatalogPage: Previous activeFilters:', activeFilters)
    setActiveFilters(searchParams)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении фильтров
  }

  // Функция сброса фильтров
  const resetFilters = () => {
    console.log('CatalogPage: Resetting filters')
    setDraftFilters({})
    setActiveFilters({})
    setCurrentPage(0)
  }

  // Обработчик быстрых фильтров
  const handleActiveTypeChange = (type: string) => {
    console.log('CatalogPage: ActiveType changed from', activeType, 'to', type)
    setActiveType(type)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении типа
  }

  // Функция для отладки изменений activeFilters
  useEffect(() => {
    console.log('CatalogPage: activeFilters changed to:', activeFilters)
  }, [activeFilters])

  // Обработчик сортировки
  const handleSortChange = (newSortOrder: string) => {
    console.log('CatalogPage: Sort order changed from', sortOrder, 'to', newSortOrder)
    setSortOrder(newSortOrder)
    setShowSortDropdown(false)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении сортировки
  }

  // Обработчик направления сортировки
  const handleSortDirectionChange = (direction: 'desc' | 'asc') => {
    console.log('CatalogPage: Sort direction changed from', sortDirection, 'to', direction)
    setSortDirection(direction)
    setShowSortDropdown(false)
    setCurrentPage(0) // Сбрасываем на первую страницу при изменении направления
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  // Закрываем dropdown сортировки при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false)
      }
    }

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg"
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
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg"
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
                      'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap',
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
              <div className="relative w-56 flex-shrink-0">
                <button
                  className="flex items-center justify-between w-full rounded-xl px-4 h-11 text-sm font-medium bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 border border-white/10 shadow-lg"
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <span className="flex-1 text-left text-white truncate pr-2">{sortOrder}</span>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

              {/* Быстрые фильтры рядом с сортировкой */}
              <div className="flex gap-2">
                {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleActiveTypeChange(type)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap',
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

        {/* Selected Filters Chips */}
        <SelectedFiltersBar
          activeFilters={activeFilters}
          activeType={activeType}
            onRemove={removeFilterChip}
          onClearAll={clearAllFilters}
          className="mb-6"
        />

        {/* Улучшенный Offcanvas фильтров для мобильных */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-full max-w-md bg-white/12 backdrop-blur-xl shadow-2xl z-50 transition-transform duration-300 border-l border-white/30 lg:hidden',
            showFilters ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex justify-between items-center p-6 border-b border-white/30">
            <span className="font-bold text-lg text-white">Фильтры</span>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="h-full overflow-y-auto">
            <MangaFilterPanel
              initialFilters={memoizedFilterState}
              onFiltersChange={handleFiltersChange}
              onReset={resetFilters}
              onApply={applyFilters}
              className="h-full"
            />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 animate-fade-in">
                {isLoading && (!manga || manga.length === 0) && Array.from({ length: pageSize }).map((_, i) => (
                  <MangaCardSkeleton key={i} />
                ))}
                {!isLoading && manga?.map((item: MangaResponseDTO) => (
                  <MangaCardWithTooltip
                    key={item.id}
                    manga={item}
                  />
                ))}
                {isLoading && manga && manga.length > 0 && (
                  // Отображаем полупрозрачный оверлей при обновлении данных
                  <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    {/* Можно добавить linear progress сверху при желании */}
                  </div>
                )}
              </div>
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
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
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
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
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
                            'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border min-w-[40px]',
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
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
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
                      'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border',
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

            {/* Улучшенный Empty State */}
            {!isLoading && manga?.length === 0 && (
              <div className="text-center py-16 md:py-20">
                <div className="mb-6">
                  <div className="mx-auto h-20 w-20 md:h-24 md:w-24 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                    <Grid className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">Ничего не найдено</h3>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                  Попробуйте изменить параметры поиска или выберите другой жанр
                </p>
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
