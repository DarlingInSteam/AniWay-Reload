import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Grid, List, Filter, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MangaCard } from '@/components/manga/MangaCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [activeType, setActiveType] = useState('манга')
  const [sortOrder, setSortOrder] = useState('По популярности')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // Refs для обработки кликов вне области
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const genre = searchParams.get('genre')
  const sort = searchParams.get('sort')

  const { data: manga, isLoading } = useQuery({
    queryKey: ['manga', { genre, sort }],
    queryFn: () => {
      if (genre) {
        return apiClient.searchManga({ genre })
      }
      return apiClient.getAllManga()
    },
  })

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
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
            <p className="text-muted-foreground text-sm md:text-base">
              Открывайте для себя новые истории
            </p>
          </div>
        </div>

        {/* Controls Bar - полностью переработанный дизайн */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Мобильная версия: улучшенные компактные кнопки */}
          <div className="lg:hidden">
            {/* Компактная панель управления на мобильном */}
            <div className="flex items-center gap-3 mb-4">
              {/* Сортировка - улучшенная кнопка */}
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
                        {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам'].map(option => (
                          <button
                            key={option}
                            onClick={() => { setSortOrder(option); setShowSortDropdown(false); }}
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
                            onClick={() => { setSortDirection(dir.value as 'desc' | 'asc'); setShowSortDropdown(false); }}
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

              {/* Индикатор текущей сортировки - улучшенный стиль */}
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

            {/* Быстрые фильтры на мобильном - улучшенная прокрутка */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 pb-2 px-1">
                {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={cn(
                      'flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 border',
                      activeType === type
                        ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/20'
                        : 'bg-white/8 backdrop-blur-sm text-muted-foreground hover:bg-white/12 hover:text-white border-white/15'
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
            {/* Сортировка слева - улучшенный дизайн */}
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
                      {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам'].map(option => (
                        <button
                          key={option}
                          onClick={() => { setSortOrder(option); setShowSortDropdown(false); }}
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
                          onClick={() => { setSortDirection(dir.value as 'desc' | 'asc'); setShowSortDropdown(false); }}
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

            {/* Быстрые фильтры по центру - улучшенный дизайн */}
            <div className="flex-1 flex justify-center gap-3">
              {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
                    activeType === type
                      ? 'bg-primary/20 text-primary border-primary/30 shadow-lg shadow-primary/20'
                      : 'bg-white/5 backdrop-blur-sm text-muted-foreground hover:bg-white/10 hover:text-white border-white/10'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Кнопка фильтров справа - улучшенный дизайн */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center px-4 py-2 h-11 rounded-xl bg-white/5 backdrop-blur-sm text-muted-foreground hover:bg-white/10 hover:text-white transition-all duration-200 border border-white/10 shadow-lg"
              style={{ minWidth: 130 }}
            >
              <Filter className="h-5 w-5 mr-2" />
              <span>Фильтры</span>
            </button>
          </div>
        </div>

        {/* Улучшенный Offcanvas фильтров */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-full max-w-md bg-white/12 backdrop-blur-xl shadow-2xl z-50 transition-transform duration-300 border-l border-white/30',
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
          <div className="p-6 text-muted-foreground">
            <div className="text-center py-8">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-white mb-2">Фильтры в разработке</h3>
              <p className="text-sm text-muted-foreground">Скоро здесь появятся дополнительные опции фильтрации</p>
            </div>
          </div>
        </div>

        {/* Улучшенный Overlay для offcanvas */}
        {showFilters && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Manga Grid - улучшенная сетка с анимацией */}
        <div className={cn(
          'animate-fade-in',
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6'
            : 'flex flex-col gap-4',
        )}>
          {manga?.map((item) => (
            <MangaCard
              key={item.id}
              manga={item}
              size={viewMode === 'grid' ? 'default' : 'large'}
            />
          ))}
        </div>

        {/* Улучшенный Empty State */}
        {manga?.length === 0 && (
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
    </div>
  )
}
