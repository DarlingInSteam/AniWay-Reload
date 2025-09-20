import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  ZoomOut,
  MessageCircle,
  Heart,
  X
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { formatChapterTitle, getDisplayChapterNumber } from '@/lib/chapterUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useReadingProgress } from '@/hooks/useProgress'
import { CommentSection } from '@/components/comments/CommentSection'

export function ReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const [showUI, setShowUI] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [imageWidth, setImageWidth] = useState<'fit' | 'full' | 'wide'>('fit')
  const [readingMode, setReadingMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [isAutoCompleted, setIsAutoCompleted] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const [showSideComments, setShowSideComments] = useState(false)

  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Hydrate reading settings from localStorage once
  useEffect(() => {
    try {
      const storedMode = localStorage.getItem('reader.mode')
      if (storedMode === 'vertical' || storedMode === 'horizontal') {
        setReadingMode(storedMode)
      }
      const storedWidth = localStorage.getItem('reader.imageWidth')
      if (storedWidth === 'fit' || storedWidth === 'full' || storedWidth === 'wide') {
        setImageWidth(storedWidth)
      }
    } catch (e) {
      // ignore storage errors (e.g., privacy mode)
    }
  }, [])

  // Persist when settings change
  useEffect(() => {
    try {
      localStorage.setItem('reader.mode', readingMode)
      localStorage.setItem('reader.imageWidth', imageWidth)
    } catch (e) {
      // ignore
    }
  }, [readingMode, imageWidth])

  // Reading progress tracking
  const { trackChapterViewed, markChapterCompleted, isChapterCompleted, clearTrackedChapters } = useReadingProgress()

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

  // Lazy visibility state for images (virtual-ish)
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(() => new Set([0,1,2]))
  const observerRef = useRef<IntersectionObserver | null>(null)
  const wrappersRef = useRef<(HTMLDivElement | null)[]>([])

  // Reset visibility when chapter changes
  useEffect(() => {
    setVisibleIndexes(new Set([0,1,2]))
  }, [chapterId])

  useEffect(() => {
    if (!images || images.length === 0) return
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    observerRef.current = new IntersectionObserver((entries) => {
      let changed = false
      const next = new Set(visibleIndexes)
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idxAttr = entry.target.getAttribute('data-index')
            
          if (idxAttr) {
            const idx = parseInt(idxAttr)
            if (!next.has(idx)) {
              next.add(idx)
              // Prefetch next immediate page for smoother scroll
              if (idx + 1 < images.length) next.add(idx + 1)
              changed = true
            }
          }
        }
      }
      if (changed) setVisibleIndexes(next)
    }, { root: null, rootMargin: '800px 0px 800px 0px', threshold: 0.01 })

    wrappersRef.current.forEach((el, idx) => {
      if (el && !visibleIndexes.has(idx)) {
        observerRef.current?.observe(el)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [images, visibleIndexes])

  const { data: manga } = useQuery({
    queryKey: ['manga', chapter?.mangaId, user?.id],
    queryFn: () => apiClient.getMangaById(chapter!.mangaId, user?.id),
    enabled: !!chapter?.mangaId,
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters', chapter?.mangaId],
    queryFn: () => apiClient.getChaptersByManga(chapter!.mangaId),
    enabled: !!chapter?.mangaId,
  })

  // Handle chapter like/unlike
  const handleChapterLike = async () => {
    if (!chapter || liking) return

    setLiking(true)
    try {
      const response = await apiClient.toggleChapterLike(chapter.id)
      setIsLiked(response.liked)

      // Invalidate chapter query to refresh like count from server
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })

      // Optimistically update the local chapter data to show immediate count changes
      queryClient.setQueryData(['chapter', chapterId], (oldData: any) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          likeCount: response.likeCount
        }
      })
    } catch (error) {
      console.error('Failed to toggle chapter like:', error)
    } finally {
      setLiking(false)
    }
  }

  // Handle double tap for like
  const handleImageDoubleClick = () => {
    const currentTime = Date.now()
    const timeDiff = currentTime - lastTap

    if (timeDiff < 300 && timeDiff > 0) { // Double tap within 300ms
      handleChapterLike()
    }

    setLastTap(currentTime)
  }

  // Load chapter like status
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!chapter) return

      try {
        const response = await apiClient.isChapterLiked(chapter.id)
        setIsLiked(response.liked)
      } catch (error) {
        console.error('Failed to load chapter like status:', error)
      }
    }

    loadLikeStatus()
  }, [chapter])

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

  // Track chapter view progress - выполняется только один раз при смене главы
  useEffect(() => {
    if (chapter && manga && sortedChapters) {
      // Очищаем кэш отслеженных глав при смене главы
      clearTrackedChapters()
      
      // Находим предыдущую главу для автоматического завершения
      const currentIndex = sortedChapters.findIndex(ch => ch.id === chapter.id)
      const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : undefined
      
      console.log('Tracking chapter view with auto-completion:', {
        current: { id: chapter.id, chapterNumber: chapter.chapterNumber },
        previous: prevChapter ? { id: prevChapter.id, chapterNumber: prevChapter.chapterNumber } : null
      })
      
      // Отслеживаем просмотр главы при загрузке с автоматическим завершением предыдущей
      trackChapterViewed(
        manga.id, 
        chapter.id, 
        chapter.chapterNumber,
        prevChapter ? { id: prevChapter.id, chapterNumber: prevChapter.chapterNumber } : undefined
      ).catch(console.error)
      
      // Временное решение: если это последняя глава, автоматически помечаем как прочитанную
      const isLastChapter = !nextChapter
      if (isLastChapter) {
        console.log('Auto-completing last chapter on view:', {
          mangaId: manga.id,
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber
        })
        
        // Даем небольшую задержку, чтобы trackChapterViewed успел выполниться
        setTimeout(() => {
          markChapterCompleted(manga.id, chapter.id, chapter.chapterNumber)
            .then(() => {
              console.log('Last chapter auto-completed on view')
            })
            .catch(console.error)
        }, 1000)
      }
    }
  }, [chapter?.id, manga?.id]) // Только при смене главы или манги

  // Navigation functions with progress tracking
  const navigateToNextChapter = useCallback(async () => {
    console.log('navigateToNextChapter called', { nextChapter, chapter, manga })
    if (nextChapter && chapter && manga) {
      try {
        // Отмечаем текущую главу как прочитанную
        console.log('Marking chapter as completed:', {
          mangaId: manga.id,
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber
        })
        await markChapterCompleted(manga.id, chapter.id, chapter.chapterNumber)
        console.log('Chapter marked as completed successfully')
        navigate(`/reader/${nextChapter.id}`)
      } catch (error) {
        console.error('Failed to mark chapter as completed:', error)
        // Все равно переходим к следующей главе
        navigate(`/reader/${nextChapter.id}`)
      }
    } else {
      console.log('Cannot navigate to next chapter - missing data:', { nextChapter, chapter, manga })
    }
  }, [nextChapter, chapter, manga, markChapterCompleted, navigate])

  const navigateToPreviousChapter = useCallback(() => {
    if (previousChapter) {
      navigate(`/reader/${previousChapter.id}`)
    }
  }, [previousChapter, navigate])

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
        navigateToNextChapter()
        e.preventDefault()
      }
      if (e.key === 'ArrowLeft' && previousChapter) {
        navigateToPreviousChapter()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, navigateToNextChapter, navigateToPreviousChapter, nextChapter, previousChapter])

  // Auto-complete chapter when scrolled to bottom
  useEffect(() => {
    if (!chapter || !manga || !images || images.length === 0) return

    // Reset auto-completion state when chapter changes
    setIsAutoCompleted(false)

    const handleScroll = () => {
      // Skip if already auto-completed or manually completed
      if (isAutoCompleted || isChapterCompleted(chapter.id)) return

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollPercentage = (scrollTop + windowHeight) / documentHeight

      // If user has scrolled to 90% of the page, mark chapter as completed
      if (scrollPercentage >= 0.9) {
        console.log('Auto-completing chapter due to scroll:', {
          scrollPercentage,
          mangaId: manga.id,
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber
        })
        
        setIsAutoCompleted(true) // Prevent multiple calls
        
        markChapterCompleted(manga.id, chapter.id, chapter.chapterNumber)
          .then(() => {
            console.log('Chapter auto-completed due to scroll')
          })
          .catch((error) => {
            console.error('Failed to auto-complete chapter:', error)
            setIsAutoCompleted(false) // Reset on error
          })
      }
    }

    // Throttle scroll events
    let scrollTimeout: ReturnType<typeof setTimeout>
    const throttledScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(handleScroll, 500) // Check every 0.5 seconds max
    }

    window.addEventListener('scroll', throttledScroll)
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      clearTimeout(scrollTimeout)
    }
  }, [chapter, manga, images, markChapterCompleted, isAutoCompleted, isChapterCompleted])

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
                onClick={handleChapterLike}
                disabled={liking}
                className={cn(
                  "p-2 rounded-full hover:bg-white/10 text-white transition-colors flex items-center space-x-1",
                  isLiked && "text-red-400"
                )}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                <span className="text-sm">{chapter?.likeCount || 0}</span>
              </button>
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
            {chapter && manga && (
              <button
                onClick={async () => {
                  try {
                    await markChapterCompleted(manga.id, chapter.id, chapter.chapterNumber)
                    console.log('Chapter manually marked as completed')
                  } catch (error) {
                    console.error('Failed to mark chapter as completed:', error)
                  }
                }}
                className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
              >
                <div className="flex items-center justify-between">
                  <span>Завершить главу</span>
                  <BookOpen className="h-5 w-5 text-green-500" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Vertical Scroll */}
      <div className="pt-16">
        {/* Reading Area */}
        <div className={cn(
          "mx-auto px-2 sm:px-4 overflow-x-hidden",
          getImageWidthClass()
        )}>
          {images.map((image, index) => {
            const isVisible = visibleIndexes.has(index)
            return (
              <div
                key={image.id}
                data-index={index}
                ref={el => { wrappersRef.current[index] = el }}
                className="relative mb-0 flex justify-center min-h-[40vh]"
              >
                {isVisible ? (
                  <img
                    src={image.imageUrl || apiClient.getImageUrl(image.imageKey)}
                    alt={`Страница ${image.pageNumber}`}
                    className={cn(
                      "block w-full h-auto transition-all duration-200 will-change-transform",
                      imageWidth === 'fit' && "max-w-4xl",
                      imageWidth === 'full' && "max-w-none w-full sm:w-screen px-0",
                      imageWidth === 'wide' && "max-w-6xl"
                    )}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : index < 3 ? 'auto' : 'low'}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-page.jpg'
                    }}
                    onLoad={() => {
                      // Progressive reveal next image if not yet visible
                      if (!visibleIndexes.has(index + 1) && index + 1 < images.length) {
                        setVisibleIndexes(prev => new Set(prev).add(index + 1))
                      }
                    }}
                    onClick={() => setShowUI(!showUI)}
                    onDoubleClick={handleImageDoubleClick}
                  />
                ) : (
                  <div className={cn(
                    "w-full animate-pulse bg-white/5 rounded-lg",
                    imageWidth === 'fit' && "max-w-4xl h-[60vh]",
                    imageWidth === 'full' && "max-w-none w-full sm:w-screen h-[65vh]",
                    imageWidth === 'wide' && "max-w-6xl h-[60vh]"
                  )} />
                )}

              {/* Page Number Indicator */}
              <div className={cn(
                'absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 border border-white/20',
                showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              )}>
                {image.pageNumber} / {images.length}
              </div>

              {/* Navigation hints on first page */}
              {index === 0 && showUI && isVisible && (
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
            )
          })}
        </div>

        {/* Chapter Navigation - улучшенный дизайн */}
        <div className="bg-gradient-to-r from-card/30 via-card/50 to-card/30 backdrop-blur-sm border-t border-white/10 py-6 sm:py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 gap-4">
              {/* Previous Chapter */}
              {previousChapter ? (
                <button
                  onClick={navigateToPreviousChapter}
                  className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 group w-full sm:w-auto border border-white/10 hover:border-white/20"
                >
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs sm:text-sm">Предыдущая глава</p>
                    <p className="text-white font-medium text-sm sm:text-base line-clamp-1">
                      {formatChapterTitle(previousChapter)}
                    </p>
                  </div>
                </button>
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

              {/* Comments Toggle Button */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center justify-center px-4 sm:px-6 py-3 bg-blue-600/90 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 border border-blue-500/20 shadow-lg shadow-blue-500/20"
              >
                <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">
                  {showComments ? 'Скрыть комментарии' : 'Комментарии'}
                </span>
              </button>

              {/* Next Chapter */}
              {nextChapter ? (
                <button
                  onClick={navigateToNextChapter}
                  className="flex items-center space-x-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 group w-full sm:w-auto border border-white/10 hover:border-white/20"
                >
                  <div className="text-right min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs sm:text-sm">Следующая глава</p>
                    <p className="text-white font-medium text-sm sm:text-base line-clamp-1">
                      {formatChapterTitle(nextChapter)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ) : (
                <div className="w-full sm:w-auto opacity-50 p-4">
                  <p className="text-muted-foreground text-center text-sm">Это последняя глава</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && chapter && (
          <div className="bg-gradient-to-r from-card/30 via-card/50 to-card/30 backdrop-blur-sm border-t border-white/10 py-6 sm:py-8">
            <div className="container mx-auto px-4">
              <CommentSection
                targetId={chapter.id}
                type="CHAPTER"
                title={`Комментарии к главе ${getDisplayChapterNumber(chapter.chapterNumber)}`}
                maxLevel={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={cn(
        'fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        <div className="space-y-1">
          <div>ESC - Назад</div>
          <div>H - Показать/скрыть UI</div>
          <div>← → - Смена глав</div>
          <div>Двойной тап - Лайк</div>
        </div>
      </div>

      {/* Floating comments button (side panel) */}
      {chapter && (
        <button
          onClick={() => setShowSideComments(true)}
          className={cn(
            'fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-40 bg-blue-600/80 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg border border-blue-500/30 backdrop-blur-md transition-all',
            showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          aria-label="Открыть комментарии"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {/* Side comments panel */}
      {showSideComments && chapter && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSideComments(false)}
          />
          {/* Panel */}
            <div className="relative ml-auto h-full w-full sm:w-[480px] md:w-[520px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold text-sm sm:text-base">Комментарии к главе {getDisplayChapterNumber(chapter.chapterNumber)}</h3>
                <button
                  onClick={() => setShowSideComments(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">
                <CommentSection
                  targetId={chapter.id}
                  type="CHAPTER"
                  title=""
                  maxLevel={3}
                />
              </div>
            </div>
        </div>
      )}

      {/* Mobile navigation hints */}
      <div className={cn(
        'fixed bottom-4 right-4 sm:hidden bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        Тапните по изображению чтобы скрыть UI<br/>
        Двойной тап для лайка
      </div>
    </div>
  )
}
