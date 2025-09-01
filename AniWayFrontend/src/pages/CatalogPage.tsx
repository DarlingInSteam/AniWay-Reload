import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Grid, List, Filter } from 'lucide-react'
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
      <div className="min-h-screen bg-manga-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-manga-black">
      <div className="container mx-auto px-4 lg:px-8 py-4 md:py-8">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 text-center">{pageTitle}</h1>
        </div>

        {/* Controls Bar - адаптивный дизайн */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          {/* Мобильная версия: компактные кнопки в одну строку */}
          <div className="lg:hidden">
            {/* Компактная панель управления на мобильном */}
            <div className="flex items-center gap-2 mb-3">
              {/* Сортировка - только иконка */}
              <div className="relative">
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border/30 hover:bg-card/80 transition-all"
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  title="Сортировка"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" strokeWidth="1.5" fill="none" stroke="currentColor" className="transition duration-300" aria-hidden="true">
                    <path d="M9.03985 5.59998L5.93982 2.5L2.83984 5.59998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M5.94141 15.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M11.625 14.4004L14.725 17.5004L17.825 14.4004" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M14.7227 4.5V16.5" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </button>
                {showSortDropdown && (
                  <div ref={sortDropdownRef} className="absolute left-0 top-full mt-2 w-64 bg-card rounded-xl shadow-lg z-50 border border-border/30">
                    <div className="px-4 pt-4 pb-2 text-xs text-muted-foreground">Сортировать по:</div>
                    {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам'].map(option => (
                      <button
                        key={option}
                        onClick={() => { setSortOrder(option); setShowSortDropdown(false); }}
                        className={cn(
                          'w-full text-left px-4 py-2 text-sm rounded-lg transition-colors',
                          sortOrder === option ? 'bg-primary text-white' : 'hover:bg-secondary text-muted-foreground'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                    <div className="px-4 pt-2 pb-2 text-xs text-muted-foreground">Направление:</div>
                    {[
                      { label: 'По убыванию', value: 'desc' },
                      { label: 'По возрастанию', value: 'asc' }
                    ].map(dir => (
                      <button
                        key={dir.value}
                        onClick={() => { setSortDirection(dir.value as 'desc' | 'asc'); setShowSortDropdown(false); }}
                        className={cn(
                          'w-full text-left px-4 py-2 text-sm rounded-lg transition-colors',
                          sortDirection === dir.value ? 'bg-primary text-white' : 'hover:bg-secondary text-muted-foreground'
                        )}
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Индикатор текущей сортировки - маленький текст */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  {sortOrder} ({sortDirection === 'asc' ? '↑' : '↓'})
                </div>
              </div>

              {/* Фильтры - только иконка справа */}
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border/30 hover:bg-card/80 transition-all"
                title="Фильтры"
              >
                <Filter className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Быстрые фильтры на мобильном - горизонтальная прокрутка */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={cn(
                      'flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors duration-200',
                      activeType === type
                        ? 'bg-primary text-white shadow'
                        : 'bg-card text-muted-foreground hover:bg-secondary hover:text-white border border-border/30'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Десктопная версия: горизонтальная компоновка */}
          <div className="hidden lg:flex lg:items-center lg:justify-between w-full gap-4">
            {/* Сортировка слева - зафиксированная ширина */}
            <div className="relative w-48 flex-shrink-0">
              <button
                className="flex items-center justify-between w-full rounded-full px-4 h-9 text-sm font-medium bg-input hover:bg-accent hover:text-accent-foreground transition-all"
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                <span className="flex-1 text-left truncate pr-2">{sortOrder}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" strokeWidth="1.5" fill="none" stroke="currentColor" className="flex-shrink-0 transition duration-300" aria-hidden="true">
                  <path d="M9.03985 5.59998L5.93982 2.5L2.83984 5.59998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M5.94141 15.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M11.625 14.4004L14.725 17.5004L17.825 14.4004" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  <path d="M14.7227 4.5V16.5" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>
              {showSortDropdown && (
                <div ref={sortDropdownRef} className="absolute left-0 top-full mt-2 w-64 bg-card rounded-xl shadow-lg z-50 border border-border/30">
                  <div className="px-4 pt-4 pb-2 text-xs text-muted-foreground">Сортировать по:</div>
                  {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам'].map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortOrder(option); setShowSortDropdown(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm rounded-lg transition-colors',
                        sortOrder === option ? 'bg-primary text-white' : 'hover:bg-secondary text-muted-foreground'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                  <div className="px-4 pt-2 pb-2 text-xs text-muted-foreground">Направление:</div>
                  {[
                    { label: 'По убыванию', value: 'desc' },
                    { label: 'По возрастанию', value: 'asc' }
                  ].map(dir => (
                    <button
                      key={dir.value}
                      onClick={() => { setSortDirection(dir.value as 'desc' | 'asc'); setShowSortDropdown(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm rounded-lg transition-colors',
                        sortDirection === dir.value ? 'bg-primary text-white' : 'hover:bg-secondary text-muted-foreground'
                      )}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Быстрые фильтры по центру */}
            <div className="flex-1 flex justify-center gap-2">
              {['все', 'манга', 'манхва', 'маньхуа', 'западный комикс', 'рукомикс', 'другое'].map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200',
                    activeType === type
                      ? 'bg-primary text-white shadow'
                      : 'bg-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Кнопка фильтров справа */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center px-4 py-2 h-9 rounded-full bg-input text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              style={{ minWidth: 120 }}
            >
              <Filter className="h-5 w-5 mr-2" />
              <span>Фильтры</span>
            </button>
          </div>
        </div>

        {/* Offcanvas фильтров справа */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-50 transition-transform duration-300',
            showFilters ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{ boxShadow: showFilters ? '0 0 40px 0 rgba(0,0,0,0.5)' : undefined }}
        >
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <span className="font-bold text-lg text-white">Фильтры</span>
            <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="p-6 text-muted-foreground">
            {/* Контент фильтров будет позже */}
            <div className="text-center">Панель фильтров (заглушка)</div>
          </div>
        </div>

        {/* Overlay для offcanvas */}
        {showFilters && (
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Manga Grid - адаптивная сетка */}
        <div className={cn(
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

        {/* Empty State */}
        {manga?.length === 0 && (
          <div className="text-center py-12 md:py-16">
            <div className="mb-4">
              <div className="mx-auto h-16 w-16 md:h-24 md:w-24 bg-secondary rounded-full flex items-center justify-center">
                <Grid className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Ничего не найдено</h3>
            <p className="text-muted-foreground text-sm md:text-base">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </div>
    </div>
  )
}
