import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  BookOpen, Play, Eye, Heart,
  Bookmark, Edit, AlertTriangle, Share, ChevronRight
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor, getStatusText, cn } from '@/lib/utils'

export function MangaPage() {
  const { id } = useParams<{ id: string }>()
  const mangaId = parseInt(id!)
  const [activeTab, setActiveTab] = useState<'chapters' | 'discussions' | 'moments' | 'cards' | 'characters' | 'description' >('chapters')

  const { data: manga, isLoading: mangaLoading } = useQuery({
    queryKey: ['manga', mangaId],
    queryFn: () => apiClient.getMangaById(mangaId),
  })

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => apiClient.getMangaChapters(mangaId),
    enabled: !!mangaId,
  })

  if (mangaLoading) {
    return (
      <div className="min-h-screen bg-manga-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-manga-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Манга не найдена</h1>
          <Link to="/catalog" className="text-primary hover:text-primary/80 transition-colors">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    )
  }

  // Фейковые данные для демонстрации
  const rating = (4 + Math.random()).toFixed(1)
  const views = Math.floor(Math.random() * 100000) + 10000
  const likes = Math.floor(Math.random() * 5000) + 500

  return (
    <div className="min-h-screen bg-manga-black">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Cover and Controls */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Cover Image */}
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-card">
                <img
                  src={manga.coverImageUrl}
                  alt={manga.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-manga.jpg'
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{manga.title}</h1>
              </div>

              {/* Metadata */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Жанр:</span>
                  <span className="text-white">{manga.genre.split(',')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Год:</span>
                  <span className="text-white">{new Date(manga.releaseDate).getFullYear()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Статус:</span>
                  <span className={cn('px-2 py-1 rounded text-xs', getStatusColor(manga.status))}>
                    {getStatusText(manga.status)}
                  </span>
                </div>

                {/* Stats */}
                <div className="border-t border-border/30 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Лайки:</span>
                    </div>
                    <span className="text-white">{likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Просмотры:</span>
                    </div>
                    <span className="text-white">{views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Закладки:</span>
                    </div>
                    <span className="text-white">{Math.floor(likes * 0.3).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  to={chapters?.[0] ? `/reader/${chapters[0].id}` : '#'}
                  className="w-full flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 transform hover:scale-105"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Продолжить
                </Link>

                <button className="w-full flex items-center justify-center px-6 py-3 bg-card text-white rounded-xl font-semibold hover:bg-card/80 transition-colors border border-border/30">
                  Читаю
                </button>

                <button className="w-full flex items-center justify-center px-6 py-3 bg-card text-white rounded-xl font-semibold hover:bg-card/80 transition-colors border border-border/30">
                  Подписаться на карты
                </button>

                {/* Small buttons */}
                <div className="flex space-x-2">
                  <button className="flex-1 flex items-center justify-center px-3 py-2 bg-secondary text-muted-foreground rounded-lg hover:text-white transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="flex-1 flex items-center justify-center px-3 py-2 bg-secondary text-muted-foreground rounded-lg hover:text-white transition-colors">
                    <Share className="h-4 w-4" />
                  </button>
                  <button className="flex-1 flex items-center justify-center px-3 py-2 bg-secondary text-muted-foreground rounded-lg hover:text-red-400 transition-colors">
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-card rounded-xl p-1">
              {[{key: 'description', label: 'Описание'},
                { key: 'chapters', label: 'Главы' },
                { key: 'discussions', label: 'Обсуждения' },
                { key: 'moments', label: 'Моменты' },
                { key: 'cards', label: 'Карты' },
                { key: 'characters', label: 'Персонажи' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    activeTab === tab.key
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:text-white hover:bg-secondary/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          {activeTab === 'description' && (
            <div className="bg-card rounded-xl p-6 text-white">
              <h2 className="text-xl font-bold mb-4">Описание</h2>
              <p className="text-muted-foreground">{manga.description || 'Описание отсутствует.'}</p>
            </div>
          )}

            {/* Chapters List */}
            {activeTab === 'chapters' && (
              <div className="space-y-3">
                {chaptersLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : chapters?.length ? (
                  // ИСПРАВЛЕНО - сортируем главы по номеру для правильного порядка
                  chapters
                    .sort((a, b) => a.chapterNumber - b.chapterNumber)
                    .map((chapter) => (
                    <Link
                      key={chapter.id}
                      to={`/reader/${chapter.id}`}
                      className="flex items-center p-4 bg-card rounded-xl hover:bg-card/80 transition-all duration-200 hover:shadow-lg group"
                    >
                      {/* Chapter Number */}
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/20 text-primary rounded-full mr-4 font-bold">
                        {chapter.chapterNumber}
                      </div>

                      {/* Chapter Info */}
                      <div className="flex-1">
                        <h3 className="text-white font-medium group-hover:text-primary transition-colors">
                          {chapter.title || `Глава ${chapter.chapterNumber}`}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {formatDate(chapter.publishedDate)}
                        </p>
                      </div>

                      {/* Likes */}
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Heart className="h-4 w-4" />
                        <span className="text-sm">{Math.floor(Math.random() * 100) + 10}</span>
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Главы пока не добавлены</p>
                  </div>
                )}
              </div>
            )}

            {/* Other tabs placeholder */}
            {activeTab !== 'chapters' && (
              <div className="text-center py-12">
              </div>
            )}
          </div>

          {/* Right Sidebar - Similar Manga */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-xl font-bold text-white mb-4">Похожие</h3>
              <div className="space-y-4">
                {/* Placeholder for similar manga */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex space-x-3 p-3 bg-card rounded-lg hover:bg-card/80 transition-colors">
                    <div className="w-16 h-20 bg-secondary rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm line-clamp-2">
                        Название похожей манги {i}
                      </h4>
                      <p className="text-muted-foreground text-xs mt-1">
                        Жанр • 2024
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
