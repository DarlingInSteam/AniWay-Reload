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

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-card rounded-xl border border-border/30">
          {/* Left side - Filters */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200',
                showFilters
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-white'
              )}
            >
              <Filter className="h-4 w-4" />
              <span>Фильтры</span>
            </button>

            {/* Quick filter buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              <button className="px-3 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 hover:text-white transition-colors">
                Все
              </button>
              <button className="px-3 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 hover:text-white transition-colors">
                Популярные
              </button>
              <button className="px-3 py-1 text-xs bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 hover:text-white transition-colors">
                Новинки
              </button>
            </div>
          </div>

          {/* Right side - View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  viewMode === 'grid'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 p-6 bg-card rounded-xl border border-border/30 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Жанр</label>
                <select className="w-full p-2 bg-secondary border border-border/30 rounded-lg text-white">
                  <option>Все жанры</option>
                  <option>Экшен</option>
                  <option>Романтика</option>
                  <option>Фантастика</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Статус</label>
                <select className="w-full p-2 bg-secondary border border-border/30 rounded-lg text-white">
                  <option>Все статусы</option>
                  <option>Продолжается</option>
                  <option>Завершен</option>
                  <option>Заморожен</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Сортировка</label>
                <select className="w-full p-2 bg-secondary border border-border/30 rounded-lg text-white">
                  <option>По популярности</option>
                  <option>По дате обновления</option>
                  <option>По рейтингу</option>
                  <option>По алфавиту</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Manga Grid */}
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center'
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
