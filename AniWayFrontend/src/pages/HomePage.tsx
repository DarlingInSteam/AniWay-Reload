import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { TrendingUp, Star, Clock, BookOpen, ArrowRight, Eye, Heart } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MangaCardWithTooltip } from '@/components/manga'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { useBookmarks } from '@/hooks/useBookmarks'

export function HomePage() {
  const { data: popularManga, isLoading: popularLoading } = useQuery({
    queryKey: ['popular-manga'],
    queryFn: () => apiClient.getAllManga(),
    staleTime: 0, // Данные всегда считаются устаревшими
    refetchOnWindowFocus: true,
  })

  const { data: recentManga, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-manga'],
    queryFn: () => apiClient.getAllManga(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const { hydrateMangaBookmarks } = useBookmarks()

  if (popularLoading) {
    return (
      <div className="min-h-screen bg-manga-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Берем первые элементы для разных секций
  const featuredManga = popularManga?.slice(0, 1)?.[0]
  const trending = popularManga?.slice(0, 12) || []
  const recent = recentManga?.slice(0, 12) || []

  useEffect(() => {
    const ids = [...trending, ...recent]
      .map(item => item?.id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))

    if (ids.length > 0) {
      hydrateMangaBookmarks(ids).catch(err => console.error('Failed to hydrate home page bookmarks', err))
    }
  }, [trending, recent, hydrateMangaBookmarks])

  return (
    <div className="min-h-screen bg-manga-black">
      {/* Hero Section */}
      {featuredManga && (
        <section className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={featuredManga.coverImageUrl}
              alt={featuredManga.title}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/placeholder-manga.jpg'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-manga-black via-manga-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-manga-black/80 via-transparent to-transparent" />
          </div>

          <div className="relative h-full flex items-center">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="max-w-2xl">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-primary font-medium text-sm">Рекомендуем</span>
                </div>

                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                  {featuredManga.title}
                </h1>

                <div className="prose prose-invert max-w-none text-muted-foreground text-sm md:text-base lg:text-lg mb-6 line-clamp-3 markdown-body">
                  <MarkdownRenderer value={featuredManga.description || 'Захватывающая манга, которая не оставит вас равнодушными. Присоединяйтесь к тысячам читателей и окунитесь в удивительный мир приключений.'} />
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-manga-rating fill-current" />
                    <span className="text-foreground font-medium">{(4 + Math.random()).toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{Math.floor(Math.random() * 100000 + 10000).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{featuredManga.totalChapters} глав</span>
                  </div>
                  <div className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                    {featuredManga.genre ? featuredManga.genre.split(',')[0] : 'Без жанра'}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/manga/${featuredManga.id}`}
                    className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 transform hover:scale-105"
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    Читать сейчас
                  </Link>
                  <Link
                    to={`/manga/${featuredManga.id}`}
                    className="inline-flex items-center px-6 py-3 bg-card text-white font-semibold rounded-xl hover:bg-card/80 transition-colors border border-border/30"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    В закладки
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-8 md:py-12">
        {/* Trending Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Популярное</h2>
            </div>
            <Link
              to="/catalog"
              className="flex items-center text-primary hover:text-primary/80 transition-colors text-sm font-medium"
            >
              Смотреть все
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
            {trending.map((manga) => (
              <MangaCardWithTooltip key={manga.id} manga={manga} />
            ))}
          </div>
        </section>

        {/* Recent Updates Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Недавние обновления</h2>
            </div>
            <Link
              to="/catalog"
              className="flex items-center text-primary hover:text-primary/80 transition-colors text-sm font-medium"
            >
              Смотреть все
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
            {recent.map((manga) => (
              <MangaCardWithTooltip key={manga.id} manga={manga} />
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-card rounded-xl p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {popularManga?.length || 0}
              </div>
              <div className="text-muted-foreground text-sm">Манги</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {Math.floor(Math.random() * 10000 + 5000).toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm">Глав</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {Math.floor(Math.random() * 50000 + 10000).toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm">Читателей</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                {Math.floor(Math.random() * 1000000 + 100000).toLocaleString()}
              </div>
              <div className="text-muted-foreground text-sm">Просмотров</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
