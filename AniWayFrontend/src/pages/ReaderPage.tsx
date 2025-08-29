import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  BookOpen
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

export function ReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const [showUI, setShowUI] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { data: chapter } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => apiClient.getChapterById(parseInt(chapterId!)),
    enabled: !!chapterId,
  })

  const { data: images, isLoading } = useQuery({
    queryKey: ['chapter-images', chapterId],
    queryFn: () => apiClient.getChapterImages(parseInt(chapterId!)),
    enabled: !!chapterId,
  })

  const { data: manga } = useQuery({
    queryKey: ['manga', chapter?.mangaId],
    queryFn: () => apiClient.getMangaById(chapter!.mangaId),
    enabled: !!chapter?.mangaId,
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters', chapter?.mangaId],
    queryFn: () => apiClient.getChaptersByManga(chapter!.mangaId),
    enabled: !!chapter?.mangaId,
  })

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chapterId])

  // UI visibility control - only on H key or scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY
    let hasUserInteracted = false

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingUp = currentScrollY < lastScrollY

      // Mark that user has started scrolling
      if (!hasUserInteracted && Math.abs(currentScrollY - lastScrollY) > 10) {
        hasUserInteracted = true
      }

      if (scrollingUp) {
        setShowUI(true)
      } else if (hasUserInteracted) {
        // Only hide UI when scrolling down if user has already interacted
        setShowUI(false)
      }

      lastScrollY = currentScrollY
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowUI(prev => !prev)
        hasUserInteracted = true // Mark as interacted when using keyboard
      }
    }

    window.addEventListener('scroll', handleScroll)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Find current chapter index and navigation - ИСПРАВЛЕНО
  // Сортируем главы по номеру для правильного порядка
  const sortedChapters = allChapters?.sort((a, b) => a.chapterNumber - b.chapterNumber)
  const currentChapterIndex = sortedChapters?.findIndex(ch => ch.id === parseInt(chapterId!)) ?? -1
  // Предыдущая глава имеет МЕНЬШИЙ номер (индекс -1)
  const previousChapter = sortedChapters?.[currentChapterIndex - 1]
  // Следующая глава имеет БОЛЬШИЙ номер (индекс +1)
  const nextChapter = sortedChapters?.[currentChapterIndex + 1]

  if (isLoading) {
    return (
      <div className="manga-reader flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!chapter || !images?.length) {
    return (
      <div className="manga-reader flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <BookOpen className="mx-auto h-16 w-16 mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-4">Глава не найдена</h1>
          <Link to="/catalog" className="text-primary hover:text-primary/80 transition-colors">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="manga-reader min-h-screen bg-black relative">
      {/* Top Navigation Bar - ИСПРАВЛЕНО центрирование */}
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10 transition-all duration-300',
        showUI ? 'translate-y-0' : '-translate-y-full'
      )}>
        <div className="container mx-auto px-4 h-16">
          <div className="grid grid-cols-3 items-center h-full">
            {/* Left side - фиксированная ширина */}
            <div className="flex items-center space-x-4 justify-start">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="hidden md:flex items-center space-x-2">
                <Link
                  to="/"
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                >
                  <Home className="h-5 w-5" />
                </Link>
                {manga && (
                  <Link
                    to={`/manga/${manga.id}`}
                    className="text-white hover:text-primary transition-colors truncate max-w-[150px]"
                  >
                    {manga.title}
                  </Link>
                )}
              </div>
            </div>

            {/* Center - идеально центрированная информация о главе */}
            <div className="flex flex-col items-center justify-center text-center text-white">
              <h1 className="font-semibold text-base">
                {chapter.title || `Глава ${chapter.chapterNumber}`}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {currentChapterIndex + 1} из {sortedChapters?.length || 0}
              </p>
            </div>

            {/* Right side - фиксированная ширина */}
            <div className="flex items-center space-x-2 justify-end">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowUI(!showUI)}
                className="md:hidden p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed top-16 right-4 z-40 bg-card border border-border/30 rounded-xl p-4 min-w-[200px] animate-fade-in">
          <h3 className="text-white font-semibold mb-3">Настройки чтения</h3>
          <div className="space-y-2">
            <button
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
            >
              Режим чтения
            </button>
            <button
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
            >
              Размер изображений
            </button>
            <button
              onClick={() => setShowUI(!showUI)}
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
            >
              {showUI ? 'Скрыть UI' : 'Показать UI'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Vertical Scroll */}
      <div className="pt-16">
        {/* Reading Area */}
        <div className="max-w-6xl mx-auto px-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative mb-1 flex justify-center">
              <img
                src={apiClient.getImageUrl(image.imageKey)}
                alt={`Страница ${image.pageNumber}`}
                className="block cursor-pointer"
                style={{
                  width: '100%',
                  maxWidth: '800px', // Увеличиваем максимальную ширину для манхвы
                  height: 'auto',
                  minWidth: '600px', // Минимальная ширина для удобного чтения
                  '@media (max-width: 768px)': {
                    minWidth: '100%',
                    maxWidth: '100%'
                  }
                }}
                loading={index < 3 ? 'eager' : 'lazy'}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-page.jpg'
                }}
              />

              {/* Page Number Indicator */}
              <div className={cn(
                'absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium transition-opacity duration-300',
                showUI ? 'opacity-100' : 'opacity-0'
              )}>
                {image.pageNumber} / {images.length}
              </div>
            </div>
          ))}
        </div>

        {/* Chapter Navigation */}
        <div className="bg-card/50 border-t border-border/30 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              {/* Previous Chapter */}
              {previousChapter ? (
                <Link
                  to={`/reader/${previousChapter.id}`}
                  className="flex items-center space-x-3 p-4 bg-card rounded-xl hover:bg-card/80 transition-colors group w-full md:w-auto"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                  <div className="text-left">
                    <p className="text-muted-foreground text-sm">Предыдущая глава</p>
                    <p className="text-white font-medium">
                      {previousChapter.title || `Глава ${previousChapter.chapterNumber}`}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="w-full md:w-auto opacity-50">
                  <p className="text-muted-foreground text-center">Это первая глава</p>
                </div>
              )}

              {/* Back to Manga */}
              {manga && (
                <Link
                  to={`/manga/${manga.id}`}
                  className="flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 transform hover:scale-105"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  К главам
                </Link>
              )}

              {/* Next Chapter */}
              {nextChapter ? (
                <Link
                  to={`/reader/${nextChapter.id}`}
                  className="flex items-center space-x-3 p-4 bg-card rounded-xl hover:bg-card/80 transition-colors group w-full md:w-auto"
                >
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">Следующая глава</p>
                    <p className="text-white font-medium">
                      {nextChapter.title || `Глава ${nextChapter.chapterNumber}`}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                </Link>
              ) : (
                <div className="w-full md:w-auto opacity-50">
                  <p className="text-muted-foreground text-center">Это последняя глава</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={cn(
        'fixed bottom-4 left-4 bg-black/70 text-white text-xs p-2 rounded transition-opacity duration-300',
        showUI ? 'opacity-100' : 'opacity-0'
      )}>
        ESC - Назад | H - Скрыть/показать UI
      </div>
    </div>
  )
}
