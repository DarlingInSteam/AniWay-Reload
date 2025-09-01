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
  BookOpen,
  Eye,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { formatChapterTitle } from '@/lib/chapterUtils'

export function ReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const [showUI, setShowUI] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [imageWidth, setImageWidth] = useState<'fit' | 'full' | 'wide'>('fit')
  const [readingMode, setReadingMode] = useState<'vertical' | 'horizontal'>('vertical')

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

  // Click outside to close settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isSettingsOpen && !target.closest('.settings-panel')) {
        setIsSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowUI(prev => !prev)
        e.preventDefault()
      }
      if (e.key === 'Escape') {
        navigate(-1)
        e.preventDefault()
      }
      if (e.key === 'ArrowRight' && nextChapter) {
        navigate(`/reader/${nextChapter.id}`)
        e.preventDefault()
      }
      if (e.key === 'ArrowLeft' && previousChapter) {
        navigate(`/reader/${previousChapter.id}`)
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, nextChapter, previousChapter])

  // Get image width class
  const getImageWidthClass = () => {
    switch (imageWidth) {
      case 'fit':
        return 'max-w-4xl'
      case 'full':
        return 'max-w-full'
      case 'wide':
        return 'max-w-6xl'
      default:
        return 'max-w-4xl'
    }
  }

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
                {formatChapterTitle(chapter)}
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
        <div className="fixed top-16 right-4 z-40 bg-card border border-border/30 rounded-xl p-4 min-w-[200px] animate-fade-in settings-panel">
          <h3 className="text-white font-semibold mb-3">Настройки чтения</h3>
          <div className="space-y-2">
            <button
              onClick={() => setReadingMode(mode => mode === 'vertical' ? 'horizontal' : 'vertical')}
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
            >
              <div className="flex items-center justify-between">
                <span>Режим чтения</span>
                {readingMode === 'vertical' ? (
                  <Eye className="h-5 w-5 text-primary" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            <button
              onClick={() => setImageWidth(width => width === 'fit' ? 'full' : 'fit')}
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
            >
              <div className="flex items-center justify-between">
                <span>Размер изображений</span>
                {imageWidth === 'fit' ? (
                  <ZoomIn className="h-5 w-5 text-primary" />
                ) : (
                  <ZoomOut className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
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
        <div className={cn(
          "mx-auto px-2 sm:px-4",
          getImageWidthClass()
        )}>
          {images.map((image, index) => (
            <div key={image.id} className="relative mb-0 flex justify-center">
              <img
                src={image.imageUrl || apiClient.getImageUrl(image.imageKey)}
                alt={`Страница ${image.pageNumber}`}
                className={cn(
                  "block w-full h-auto transition-all duration-200",
                  imageWidth === 'fit' && "max-w-4xl",
                  imageWidth === 'full' && "max-w-none w-screen px-0",
                  imageWidth === 'wide' && "max-w-6xl"
                )}
                loading={index < 3 ? 'eager' : 'lazy'}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-page.jpg'
                }}
                onClick={() => setShowUI(!showUI)}
              />

              {/* Page Number Indicator */}
              <div className={cn(
                'absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 border border-white/20',
                showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              )}>
                {image.pageNumber} / {images.length}
              </div>

              {/* Navigation hints on first page */}
              {index === 0 && showUI && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Previous chapter hint */}
                  {previousChapter && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 p-2">
                      <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-r-lg text-sm border border-white/20 animate-pulse">
                        ← Листать главы стрелками
                      </div>
                    </div>
                  )}

                  {/* Settings hint */}
                  <div className="absolute top-20 right-2 sm:right-4">
                    <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm border border-white/20 animate-pulse">
                      Настройки в правом углу
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chapter Navigation - улучшенный дизайн */}
        <div className="bg-gradient-to-r from-card/30 via-card/50 to-card/30 backdrop-blur-sm border-t border-white/10 py-6 sm:py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 gap-4">
              {/* Previous Chapter */}
              {previousChapter ? (
                <Link
                  to={`/reader/${previousChapter.id}`}
                  className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 group w-full sm:w-auto border border-white/10 hover:border-white/20"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs sm:text-sm">Предыдущая глава</p>
                    <p className="text-white font-medium text-sm sm:text-base line-clamp-1">
                      {formatChapterTitle(previousChapter)}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="w-full sm:w-auto opacity-50 p-4">
                  <p className="text-muted-foreground text-center text-sm">Это первая глава</p>
                </div>
              )}

              {/* Back to Manga - центральная кнопка */}
              {manga && (
                <Link
                  to={`/manga/${manga.id}`}
                  className="flex items-center justify-center px-4 sm:px-6 py-3 bg-primary/90 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-primary transition-all duration-200 transform hover:scale-105 border border-primary/20 shadow-lg shadow-primary/20"
                >
                  <BookOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">К главам</span>
                </Link>
              )}

              {/* Next Chapter */}
              {nextChapter ? (
                <Link
                  to={`/reader/${nextChapter.id}`}
                  className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 group w-full sm:w-auto border border-white/10 hover:border-white/20"
                >
                  <div className="text-right min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs sm:text-sm">Следующая глава</p>
                    <p className="text-white font-medium text-sm sm:text-base line-clamp-1">
                      {formatChapterTitle(nextChapter)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ) : (
                <div className="w-full sm:w-auto opacity-50 p-4">
                  <p className="text-muted-foreground text-center text-sm">Это последняя глава</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Improved Keyboard Shortcuts Help */}
      <div className={cn(
        'fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        <div className="space-y-1">
          <div>ESC - Назад</div>
          <div>H - Показать/скрыть UI</div>
          <div>← → - Смена глав</div>
        </div>
      </div>

      {/* Mobile navigation hints */}
      <div className={cn(
        'fixed bottom-4 right-4 sm:hidden bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        Тапните по изображению чтобы скрыть UI
      </div>
    </div>
  )
}
