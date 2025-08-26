import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Grid, List, Search, Flame } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MangaCard } from '@/components/manga/MangaCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

export function HomePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: allManga, isLoading } = useQuery({
    queryKey: ['manga'],
    queryFn: () => apiClient.getAllManga(),
  })

  // Фильтрация по поисковому запросу
  const filteredManga = allManga?.filter(manga =>
    manga.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    manga.author?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

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
          <div className="flex items-center space-x-3 mb-4">
            <Flame className="h-8 w-8 text-manga-rating-orange" />
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Каталог манги</h1>
          </div>
          <p className="text-muted-foreground">
            Найдено <span className="text-primary font-semibold">{filteredManga.length}</span> произведений
          </p>
        </div>

        {/* Search and Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 p-4 bg-card rounded-xl border border-border/30">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по названию или автору..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border/30 rounded-lg text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* View Mode Toggle */}
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

        {/* Empty State */}
        {filteredManga.length === 0 && searchQuery && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Ничего не найдено</h3>
            <p className="text-muted-foreground">
              Попробуйте изменить поисковый запрос или очистить фильтры
            </p>
          </div>
        )}

        {/* Manga Grid/List */}
        {filteredManga.length > 0 && (
          <div className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center'
              : 'flex flex-col gap-4'
          )}>
            {filteredManga.map((manga) => (
              <MangaCard
                key={manga.id}
                manga={manga}
                size={viewMode === 'grid' ? 'default' : 'compact'}
              />
            ))}
          </div>
        )}

        {/* Welcome message when no search */}
        {filteredManga.length > 0 && !searchQuery && (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              🔥 Добро пожаловать в каталог! Здесь вы найдете лучшие манги для чтения.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
