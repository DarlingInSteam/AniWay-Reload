import { useState, useEffect } from 'react'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-manga-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-manga-black">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 text-center">{pageTitle}</h1>
        </div>

        {/* Controls Bar - современный дизайн */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Кнопка сортировки строго по левому краю */}
          <div className="flex items-center order-1 lg:order-1 relative">
            <button
              className="flex items-center rounded-full px-4 h-9 min-w-9 text-sm font-medium bg-input hover:bg-accent hover:text-accent-foreground transition-all"
              type="button"
              aria-haspopup="listbox"
              onClick={() => setShowSortDropdown((prev) => !prev)}
              style={{ minWidth: 180 }}
            >
              <span className="line-clamp-1 pointer-events-none">{sortOrder}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.5" fill="none" stroke="currentColor" className="ml-2 size-4 transition duration-300" aria-hidden="true">
                <path d="M9.03985 5.59998L5.93982 2.5L2.83984 5.59998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M5.94141 15.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M11.625 14.4004L14.725 17.5004L17.825 14.4004" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M14.7227 4.5V16.5" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
            {showSortDropdown && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-card rounded-xl shadow-lg z-50 border border-border/30">
                <div className="px-4 pt-4 pb-2 text-xs text-muted-foreground">Сортировать по:</div>
                {['По популярности','По новизне','По кол-ву глав','По дате обновления','По оценке','По кол-ву оценок','По лайкам','По просмотрам','По отзывам'].map(option => (
                  <button
                    key={option}
                    onClick={() => { setSortOrder(option); setShowSortDropdown(true); }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm rounded-lg transition-colors',
                      sortOrder === option ? 'bg-primary text-white' : 'hover:bg-secondary text-muted-foreground'
                    )}
                  >
                    {option}
                  </button>
                ))}
                <div className="px-4 pt-2 pb-4 text-xs text-muted-foreground">Направление:</div>
                {[
                  { label: 'По убыванию', value: 'desc' },
                  { label: 'По возрастанию', value: 'asc' }
                ].map(dir => (
                  <button
                    key={dir.value}
                    onClick={() => { setSortDirection(dir.value); setShowSortDropdown(false); }}
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

          {/* Быстрые фильтры по типу по центру */}
          <div className="flex-1 flex justify-center gap-2 order-2 lg:order-2">
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

          {/* Кнопка фильтры справа */}
          <div className="flex items-center order-3 lg:order-3 pr-2 lg:pr-4">
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

        {/* Manga Grid */}
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-start'
            : 'flex flex-col gap-4', // Для режима списка
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
          <div className="text-center py-16">
            <div className="mb-4">
              <div className="mx-auto h-24 w-24 bg-secondary rounded-full flex items-center justify-center">
                <Grid className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h3>
            <p className="text-muted-foreground">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </div>
    </div>
  )
}
