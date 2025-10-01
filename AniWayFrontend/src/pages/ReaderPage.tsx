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
import { useLocation } from 'react-router-dom'

// Extracted component for chapter images list to keep main component compact
function ChapterImageList({
  images,
  imageWidth,
  showUI,
  previousChapter,
  setShowUI,
  handleTapOrClick,
  handleDoubleClickDesktop,
  handleTouchStartSwipe,
  handleTouchMoveSwipe,
  handleTouchEndSwipe,
  visibleIndexes,
  setVisibleIndexes,
  wrappersRef
}: any) {
  const getWidthClass = () => {
    switch (imageWidth) {
      case 'fit': return 'max-w-4xl'
      case 'full': return 'max-w-full'
      case 'wide': return 'max-w-6xl'
      default: return 'max-w-4xl'
    }
  }
  return (
    <div className={cn("mx-auto px-2 sm:px-4 overflow-x-hidden", getWidthClass())}>
      {images.map((image: any, index: number) => {
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
                  if (!visibleIndexes.has(index + 1) && index + 1 < images.length) {
                    setVisibleIndexes((prev: Set<number>) => new Set(prev).add(index + 1))
                  }
                }}
                onClick={() => setShowUI((v: boolean) => !v)}
                onDoubleClick={handleDoubleClickDesktop}
                onTouchStart={(e) => { handleTapOrClick(e); handleTouchStartSwipe(e) }}
                onTouchMove={handleTouchMoveSwipe}
                onTouchEnd={handleTouchEndSwipe}
              />
            ) : (
              <div className={cn(
                "w-full animate-pulse bg-white/5 rounded-lg",
                imageWidth === 'fit' && "max-w-4xl h-[60vh]",
                imageWidth === 'full' && "max-w-none w-full sm:w-screen h-[65vh]",
                imageWidth === 'wide' && "max-w-6xl h-[60vh]"
              )} />
            )}
            <div className={cn(
              'absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 border border-white/20',
              showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            )}>
              {image.pageNumber} / {images.length}
            </div>
            {index === 0 && showUI && isVisible && (
              <div className="absolute inset-0 pointer-events-none hidden md:block">
                {previousChapter && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 p-2">
                    <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-r-lg text-sm border border-white/20 animate-pulse">
                      ← Листать главы стрелками
                    </div>
                  </div>
                )}
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
  )
}

export function ReaderPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUI, setShowUI] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [imageWidth, setImageWidth] = useState<'fit' | 'full' | 'wide'>('fit')
  const [readingMode, setReadingMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [isAutoCompleted, setIsAutoCompleted] = useState(false)
  // showComments legacy removed; comments accessed via side panel
  const [showChapterList, setShowChapterList] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  const likeGestureCooldownRef = useRef<number>(0)
  const gesturePosRef = useRef<{x:number,y:number}|null>(null)
  const [gestureBursts, setGestureBursts] = useState<Array<{id:number,x:number,y:number}>>([])
  const touchStartRef = useRef<{x:number,y:number,time:number}|null>(null)
  const touchMovedRef = useRef<boolean>(false)
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

  // Auto-open side comments panel if navigating directly to a comment anchor (#comment-...)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash.startsWith('#comment-')) {
      setShowSideComments(true)
    }
  // react to hash changes (navigation to another comment within reader)
  }, [location?.hash])

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
    // One-way like: do nothing if already liked
    if (!chapter || liking || isLiked) return

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

  // Handle double tap / double click for like with cooldown & visual feedback
  const triggerHeartBurst = (clientX:number, clientY:number) => {
    // store relative to viewport; container is full width so OK
    setGestureBursts(prev => [...prev, { id: Date.now() + Math.random(), x: clientX, y: clientY }])
    // prune after 1.2s
    setTimeout(() => {
      setGestureBursts(prev => prev.slice(1))
    }, 1200)
  }

  const attemptLikeFromGesture = (clientX:number, clientY:number) => {
    const now = Date.now()
    if (now - likeGestureCooldownRef.current < 600) return // cooldown
    likeGestureCooldownRef.current = now
    triggerHeartBurst(clientX, clientY)
    handleChapterLike()
  }

  const handleTapOrClick = (e: React.MouseEvent | React.TouchEvent) => {
    // On mobile treat it as potential like only if almost no vertical movement and within 2 quick taps
    let clientX: number
    let clientY: number
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('changedTouches' in (e as any) && (e as any).changedTouches.length > 0) {
      clientX = (e as any).changedTouches[0].clientX
      clientY = (e as any).changedTouches[0].clientY
    } else {
      const mouseEvent = e as React.MouseEvent
      clientX = mouseEvent.clientX
      clientY = mouseEvent.clientY
    }
    const now = Date.now()
    const delta = now - lastTap
    // Require tighter window AND ensure the last gesture did not move notably
    if (delta > 0 && delta < 280 && !touchMovedRef.current) {
      attemptLikeFromGesture(clientX, clientY)
      setLastTap(0) // reset so triple taps don't like twice
    } else {
      setLastTap(now)
    }
  }

  const handleDoubleClickDesktop = (e: React.MouseEvent) => {
    attemptLikeFromGesture(e.clientX, e.clientY)
  }

  // Swipe handlers
  const handleTouchStartSwipe = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
    touchMovedRef.current = false
  }
  const handleTouchMoveSwipe = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) touchMovedRef.current = true
  }
  const handleTouchEndSwipe = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const start = touchStartRef.current
    const endTime = Date.now()
    const dt = endTime - start.time
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    touchStartRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return // horizontal intent
    if (dt > 800) return // too slow
    if (Math.abs(dy) > 120) return // large vertical movement
    if (dx < 0) {
      // swipe left -> next chapter
      navigateToNextChapter()
    } else {
      navigateToPreviousChapter()
    }
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
    let accumulated = 0
    let raf: number | null = null
    let hasUserInteracted = false
    const THRESHOLD = 36 // px before toggling
    const SMALL_MOVEMENT_RESET = 4

    const applyVisibility = (show: boolean) => {
      setShowUI(prev => show === prev ? prev : show)
    }

    const onScroll = () => {
      const current = window.scrollY
      const delta = current - lastScrollY
      if (!hasUserInteracted && Math.abs(delta) > 2) hasUserInteracted = true
      // Ignore micro scroll jitter
      if (Math.abs(delta) <= SMALL_MOVEMENT_RESET) return
      accumulated += delta
      lastScrollY = current
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (accumulated <= -THRESHOLD) {
          applyVisibility(true)
          accumulated = 0
        } else if (accumulated >= THRESHOLD && hasUserInteracted) {
          applyVisibility(false)
          accumulated = 0
        }
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowUI(prev => !prev)
        hasUserInteracted = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('keydown', handleKeyDown)
      if (raf) cancelAnimationFrame(raf)
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
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(0.3) translateY(0); opacity: 0; }
          10% { transform: scale(1) translateY(0); opacity: 1; }
          60% { transform: scale(1.05) translateY(-40px); opacity: 0.9; }
          100% { transform: scale(0.6) translateY(-80px); opacity: 0; }
        }
      `}</style>
      {/* Gesture Heart Bursts */}
      {gestureBursts.map(burst => (
        <div
          key={burst.id}
          style={{
            position: 'fixed',
            left: burst.x - 40,
            top: burst.y - 40,
            pointerEvents: 'none',
            zIndex: 60,
            animation: 'heart-pop 1.2s ease-out forwards'
          }}
          className="select-none"
        >
          <Heart className="w-20 h-20 text-red-500/80 fill-red-500/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        </div>
      ))}
      {/* Top Navigation Bar - updated with prev/next buttons */}
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

            {/* Center - chapter navigation + clickable index */}
            <div className="flex items-center justify-center text-white space-x-3 min-w-0">
              <button
                disabled={!previousChapter}
                onClick={navigateToPreviousChapter}
                className={cn('p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
                title="Предыдущая глава"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center min-w-0 max-w-full">
                <button
                  onClick={() => setShowChapterList(true)}
                  className="font-semibold text-base hover:text-primary transition-colors w-full max-w-[64vw] sm:max-w-[460px] text-center truncate"
                  title={formatChapterTitle(chapter)}
                >
                  {formatChapterTitle(chapter)}
                </button>
                <button
                  onClick={() => setShowChapterList(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-wide text-gray-300/80 hover:text-primary/80 transition px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
                  title="Открыть список глав"
                >
                  <span className="font-medium">{currentChapterIndex + 1}</span>
                  <span className="opacity-60">/</span>
                  <span>{sortedChapters?.length || 0}</span>
                </button>
              </div>
              <button
                disabled={!nextChapter}
                onClick={navigateToNextChapter}
                className={cn('p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
                title="Следующая глава"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right side - like button removed */}
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
              onClick={() => setImageWidth(width => width === 'fit' ? 'full' : width === 'full' ? 'wide' : 'fit')}
              className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary group"
            >
              <div className="flex items-center justify-between">
                <span className="flex flex-col">
                  <span>Размер изображений</span>
                  <span className="text-[10px] uppercase tracking-wide text-primary/70 mt-0.5">
                    {imageWidth === 'fit' && 'FIT'}
                    {imageWidth === 'full' && 'FULL'}
                    {imageWidth === 'wide' && 'WIDE'}
                  </span>
                </span>
                {imageWidth === 'fit' && <ZoomIn className="h-5 w-5 text-primary" />}
                {imageWidth === 'full' && <ZoomOut className="h-5 w-5 text-primary" />}
                {imageWidth === 'wide' && <ZoomOut className="h-5 w-5 text-red-400" />}
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
        <ChapterImageList
          images={images}
          imageWidth={imageWidth}
          showUI={showUI}
          previousChapter={previousChapter}
          setShowUI={setShowUI}
          handleTapOrClick={handleTapOrClick}
          handleDoubleClickDesktop={handleDoubleClickDesktop}
          handleTouchStartSwipe={handleTouchStartSwipe}
          handleTouchMoveSwipe={handleTouchMoveSwipe}
          handleTouchEndSwipe={handleTouchEndSwipe}
          visibleIndexes={visibleIndexes}
          setVisibleIndexes={setVisibleIndexes}
          wrappersRef={wrappersRef}
        />

        {/* End-of-chapter action panel */}
        <div className="mt-12 mb-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-white/[0.03] backdrop-blur-md shadow-xl shadow-black/30 p-6 space-y-6">
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={navigateToPreviousChapter}
                  disabled={!previousChapter}
                  className={cn('px-4 py-3 rounded-xl text-sm md:text-base font-medium border transition flex items-center gap-2 min-w-[140px] justify-center',
                    previousChapter ? 'bg-white/7 hover:bg-white/10 border-white/15 text-white' : 'bg-white/5 border-white/10 text-white/35 cursor-not-allowed')}
                >
                  <ChevronLeft className="h-5 w-5" /> Предыдущая
                </button>
                <button
                  onClick={() => setShowChapterList(true)}
                  className="px-5 py-3 rounded-xl text-sm md:text-base font-semibold border bg-primary/85 hover:bg-primary transition border-primary/40 text-white flex items-center gap-2 shadow-md shadow-primary/30"
                >
                  <BookOpen className="h-5 w-5" /> Список глав
                </button>
                <button
                  onClick={navigateToNextChapter}
                  disabled={!nextChapter}
                  className={cn('px-4 py-3 rounded-xl text-sm md:text-base font-medium border transition flex items-center gap-2 min-w-[140px] justify-center',
                    nextChapter ? 'bg-white/7 hover:bg-white/10 border-white/15 text-white' : 'bg-white/5 border-white/10 text-white/35 cursor-not-allowed')}
                >
                  Следующая <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {manga && (
                  <Link
                    to={`/manga/${manga.id}`}
                    className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-white/6 hover:bg-white/10 border-white/15 text-white transition flex items-center gap-2"
                  >
                    <Home className="h-5 w-5" /> Страница манги
                  </Link>
                )}
                <button
                  onClick={() => setShowSideComments(true)}
                  className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-blue-600/85 hover:bg-blue-600 border-blue-500/40 text-white transition flex items-center gap-2 shadow-md shadow-blue-600/30"
                >
                  <MessageCircle className="h-5 w-5" /> Комментарии
                </button>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-white/6 hover:bg-white/10 border-white/15 text-white/90 transition flex items-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5 rotate-90" /> Вверх
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={cn(
        'fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20 hidden md:block',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        <div className="space-y-1">
          <div>ESC - Назад</div>
          <div>H - Показать/скрыть UI</div>
          <div>← → - Смена глав</div>
          <div>Двойной клик - Лайк</div>
        </div>
      </div>

      {/* Right vertical action bar */}
      {chapter && (
        <div className={cn(
          'fixed top-1/2 -translate-y-1/2 right-1.5 xs:right-2 sm:right-4 z-40 flex flex-col space-y-2 sm:space-y-3',
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}>
          <button
            onClick={() => setShowChapterList(true)}
            className="reader-fab"
            title="Список глав" aria-label="Список глав"
          >
            <BookOpen className="h-5 w-5 group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={() => setShowSideComments(true)}
            className="reader-fab"
            title="Комментарии" aria-label="Комментарии"
          >
            <MessageCircle className="h-5 w-5 group-hover:text-blue-400 transition-colors" />
          </button>
          <button
            onClick={handleChapterLike}
            disabled={liking || isLiked}
            className={cn('reader-fab', isLiked && 'text-red-400 opacity-80 cursor-default')}
            title={isLiked ? 'Лайк уже поставлен' : 'Поставить лайк'}
            aria-pressed={isLiked}
          >
            <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(v=>!v)}
            className="reader-fab"
            title="Настройки" aria-label="Настройки"
          >
            <Settings className="h-5 w-5 group-hover:text-amber-300 transition-colors" />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="reader-fab"
            title="Назад" aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5 group-hover:text-gray-300" />
          </button>
        </div>
      )}

      {/* Chapter list side panel */}
      {showChapterList && manga && allChapters && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setShowChapterList(false)} />
          <div className="relative ml-auto h-full w-full sm:w-[420px] md:w-[460px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm sm:text-base">Главы • {manga.title}</h3>
              <button onClick={()=>setShowChapterList(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 space-y-2" id="chapter-list-scroll">
              {sortedChapters?.map(ch => {
                const active = ch.id === chapter.id
                return (
                  <button
                    key={ch.id}
                    onClick={() => { navigate(`/reader/${ch.id}`); setShowChapterList(false) }}
                    className={cn('w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition',
                      active ? 'bg-primary/20 border-primary/40 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300')}
                    data-active={active || undefined}
                  >
                    <span className="truncate">{formatChapterTitle(ch)}</span>
                    <span className="ml-3 text-xs opacity-70">#{getDisplayChapterNumber(ch.chapterNumber)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
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

      {/* Mobile navigation hints (updated: mention scroll threshold) */}
      <div className={cn(
        'fixed bottom-4 right-4 sm:hidden bg-black/85 backdrop-blur-md text-white text-[11px] leading-relaxed p-3 rounded-lg transition-all duration-300 border border-white/20 shadow-lg',
        showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        Тап по странице — скрыть/показать интерфейс<br/>
        Быстрый двойной тап (без скролла) — лайк
      </div>

      {/* Scoped styles for improved FAB contrast */}
      <style>{`
        .reader-fab { position: relative; padding: 0.85rem; border-radius: 1rem; background: linear-gradient(145deg, rgba(15,16,20,0.92), rgba(10,11,14,0.92)); border: 1px solid rgba(255,255,255,0.15); color: #fff; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06); transition: background .25s, transform .15s, box-shadow .25s; }
        .reader-fab:hover { background: linear-gradient(145deg, rgba(32,34,40,0.95), rgba(18,19,24,0.95)); box-shadow: 0 4px 14px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12); }
        .reader-fab:active { transform: scale(0.94); }
        .reader-fab:focus-visible { outline: 2px solid #3B82F6; outline-offset: 2px; }
        @media (max-width: 640px) { .reader-fab { padding: 0.7rem; } }
      `}</style>
    </div>
  )
}
