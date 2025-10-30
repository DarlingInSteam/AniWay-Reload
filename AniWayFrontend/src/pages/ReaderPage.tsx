import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from 'react'
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
import { formatChapterTitle, getDisplayChapterNumber, getAdaptiveChapterTitle, buildChapterTitleVariants } from '@/lib/chapterUtils'
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
  handleImageClick,
  handleTapOrClick,
  handleDoubleClickDesktop,
  handleTouchStartSwipe,
  handleTouchMoveSwipe,
  handleTouchEndSwipe,
  onFocusChapter
}: any) {
  const [intrinsicSizes, setIntrinsicSizes] = useState<Record<number, { width: number; height: number }>>({})
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(() => new Set([0, 1, 2]))
  const visibleIndexesRef = useRef<Set<number>>(new Set([0, 1, 2]))
  const observerRef = useRef<IntersectionObserver | null>(null)
  const wrappersRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setIntrinsicSizes({})
    const initial = new Set<number>([0, 1, 2])
    setVisibleIndexes(initial)
    visibleIndexesRef.current = initial
  }, [images])

  useEffect(() => {
    visibleIndexesRef.current = visibleIndexes
  }, [visibleIndexes])

  useEffect(() => {
    if (!images || images.length === 0) return
    observerRef.current?.disconnect()
    const observer = new IntersectionObserver((entries) => {
      let changed = false
      const next = new Set(visibleIndexesRef.current)
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const idxAttr = entry.target.getAttribute('data-index')
        if (!idxAttr) continue
        const idx = Number(idxAttr)
        if (!Number.isFinite(idx)) continue
        if (!next.has(idx)) {
          next.add(idx)
          if (idx + 1 < images.length) next.add(idx + 1)
          changed = true
        }
      }
      if (changed) {
        visibleIndexesRef.current = next
        setVisibleIndexes(next)
      }
    }, { root: null, rootMargin: '800px 0px 800px 0px', threshold: 0.01 })
    observerRef.current = observer

    wrappersRef.current.forEach((el, idx) => {
      if (!el) return
      if (!visibleIndexesRef.current.has(idx)) {
        observer.observe(el)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [images])

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
        const recordedSize = intrinsicSizes[index]
        const naturalWidth = (image?.width ?? 0) > 0 ? image.width : recordedSize?.width
        const naturalHeight = (image?.height ?? 0) > 0 ? image.height : recordedSize?.height
        const imageStyle: CSSProperties = naturalWidth
          ? { width: '100%', maxWidth: `${naturalWidth}px` }
          : { width: '100%' }
        if (naturalWidth && naturalHeight && !imageStyle.aspectRatio) {
          imageStyle.aspectRatio = `${naturalWidth} / ${naturalHeight}`
        }
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
                  "block h-auto transition-all duration-200 will-change-transform",
                  imageWidth === 'fit' && "max-w-4xl",
                  imageWidth === 'full' && "max-w-none w-full sm:w-screen px-0",
                  imageWidth === 'wide' && "max-w-6xl"
                )}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : index < 3 ? 'auto' : 'low'}
                style={imageStyle}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-page.jpg'
                }}
                onLoad={(event) => {
                  const target = event.currentTarget
                  if (target?.naturalWidth && target?.naturalHeight) {
                    setIntrinsicSizes(prev => {
                      const existing = prev[index]
                      if (existing && existing.width === target.naturalWidth && existing.height === target.naturalHeight) {
                        return prev
                      }
                      return {
                        ...prev,
                        [index]: { width: target.naturalWidth, height: target.naturalHeight }
                      }
                    })
                  }
                }}
                onClick={(event) => { onFocusChapter?.(); handleImageClick(event) }}
                onDoubleClick={handleDoubleClickDesktop}
                onTouchStart={(e) => { onFocusChapter?.(); handleTouchStartSwipe(e); handleTapOrClick(e) }}
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

type ChapterEntry = {
  index: number
  chapter: any
  images: any[]
}

interface ChapterBlockProps {
  entry: ChapterEntry
  imageWidth: 'fit' | 'full' | 'wide'
  showUI: boolean
  previousChapter?: any
  handleImageClick: any
  handleTapOrClick: any
  handleDoubleClickDesktop: any
  handleTouchStartSwipe: any
  handleTouchMoveSwipe: any
  handleTouchEndSwipe: any
  onActivate: () => void
  onNearBottom: () => void
  onNearTop: () => void
  onCompleted: () => void
  onFocusChapter: () => void
  isActive: boolean
}

const ChapterBlock = ({
  entry,
  imageWidth,
  showUI,
  previousChapter,
  handleImageClick,
  handleTapOrClick,
  handleDoubleClickDesktop,
  handleTouchStartSwipe,
  handleTouchMoveSwipe,
  handleTouchEndSwipe,
  onActivate,
  onNearBottom,
  onNearTop,
  onCompleted,
  onFocusChapter,
  isActive
}: ChapterBlockProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const completionSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onActivate()
        }
      })
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0.1 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onActivate])

  useEffect(() => {
    const node = topSentinelRef.current
    if (!node) return
    if (!onNearTop) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onNearTop()
      })
    }, { rootMargin: '300px 0px 0px 0px', threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onNearTop])

  useEffect(() => {
    const node = bottomSentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onNearBottom()
      })
    }, { rootMargin: '0px 0px 600px 0px', threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onNearBottom])

  useEffect(() => {
    const node = completionSentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) onCompleted()
      })
    }, { rootMargin: '0px 0px -120px 0px', threshold: 0.75 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onCompleted])

  return (
    <section
      ref={containerRef}
      data-chapter-id={entry.chapter?.id}
      className={cn('relative transition-opacity duration-300', isActive ? 'opacity-100' : 'opacity-100')}
    >
      <div ref={topSentinelRef} aria-hidden className="h-1 w-full" />
      {entry.chapter && (
        <div className="relative py-10">
          {entry.index !== 0 && (
            <div className="text-center mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
              Следующая глава
            </div>
          )}
          <div className="flex items-center gap-4">
            <span className="flex-1 h-px bg-white/10" />
            <div className="max-w-[80vw] sm:max-w-3xl px-4 py-2 rounded-full border border-white/15 bg-black/70 backdrop-blur text-xs sm:text-sm font-medium text-white/80 truncate">
              {formatChapterTitle(entry.chapter)}
            </div>
            <span className="flex-1 h-px bg-white/10" />
          </div>
        </div>
      )}
      <ChapterImageList
        images={entry.images}
        imageWidth={imageWidth}
        showUI={showUI}
        previousChapter={previousChapter}
        handleImageClick={handleImageClick}
        handleTapOrClick={handleTapOrClick}
        handleDoubleClickDesktop={handleDoubleClickDesktop}
        handleTouchStartSwipe={handleTouchStartSwipe}
        handleTouchMoveSwipe={handleTouchMoveSwipe}
        handleTouchEndSwipe={handleTouchEndSwipe}
        onFocusChapter={onFocusChapter}
      />
      <div ref={completionSentinelRef} aria-hidden className="h-1 w-full" />
      <div ref={bottomSentinelRef} aria-hidden className="h-64 w-full" />
    </section>
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
  const [showChapterList, setShowChapterList] = useState(false)
  const [showSideComments, setShowSideComments] = useState(false)
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const titleContainerRef = useRef<HTMLButtonElement | null>(null)
  const [titleVariantIndex, setTitleVariantIndex] = useState(0)
  const [finalTitle, setFinalTitle] = useState<string>('')
  const variantsRef = useRef<string[]>([])

  const [lastTap, setLastTap] = useState(0)
  const likeGestureCooldownRef = useRef<number>(0)
  const [gestureBursts, setGestureBursts] = useState<Array<{ id: number; x: number; y: number }>>([])
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchMovedRef = useRef<boolean>(false)
  const skipClickToggleRef = useRef(false)
  const skipClickResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialShowUIRef = useRef<boolean>(showUI)
  const pendingUiToggleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [chapterEntries, setChapterEntries] = useState<ChapterEntry[]>([])
  const chapterEntriesRef = useRef<ChapterEntry[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const prefetchNextRef = useRef<Set<number>>(new Set())
  const prefetchPrevRef = useRef<Set<number>>(new Set())
  const loadingIndicesRef = useRef<Set<number>>(new Set())
  const viewedChaptersRef = useRef<Set<number>>(new Set())
  const completedChaptersRef = useRef<Set<number>>(new Set())
  const [autoCompletedMap, setAutoCompletedMap] = useState<Record<number, boolean>>({})
  const [loadingForward, setLoadingForward] = useState(false)
  const [loadingBackward, setLoadingBackward] = useState(false)
  const [likedChapters, setLikedChapters] = useState<Record<number, boolean>>({})
  const [likingChapters, setLikingChapters] = useState<Record<number, boolean>>({})

  useEffect(() => {
    chapterEntriesRef.current = chapterEntries
  }, [chapterEntries])

  useEffect(() => {
    initialShowUIRef.current = showUI
  }, [showUI])

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

  // (moved) adaptive title effects placed after chapter query

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

  useEffect(() => {
    return () => {
      if (skipClickResetRef.current) {
        clearTimeout(skipClickResetRef.current)
        skipClickResetRef.current = null
      }
      if (pendingUiToggleRef.current) {
        clearTimeout(pendingUiToggleRef.current)
        pendingUiToggleRef.current = null
      }
    }
  }, [])

  // Reading progress tracking
  const { trackChapterViewed, markChapterCompleted, isChapterCompleted, clearTrackedChapters } = useReadingProgress()

  const numericChapterId = chapterId ? Number.parseInt(chapterId, 10) : Number.NaN

  const { data: initialChapter, isLoading: isInitialChapterLoading } = useQuery({
    queryKey: ['chapter', numericChapterId],
    queryFn: () => apiClient.getChapterById(numericChapterId),
    enabled: Number.isFinite(numericChapterId),
  })

  const { data: initialImages, isLoading: isInitialImagesLoading } = useQuery({
    queryKey: ['chapter-images', numericChapterId],
    queryFn: () => apiClient.getChapterImages(numericChapterId),
    enabled: Number.isFinite(numericChapterId),
  })

  const activeChapterForQueries = useMemo(() => {
    if (activeIndex != null) {
      const entry = chapterEntries.find(item => item.index === activeIndex)
      if (entry) return entry.chapter
    }
    if (chapterEntries.length > 0) {
      return chapterEntries[0].chapter
    }
    return initialChapter ?? null
  }, [activeIndex, chapterEntries, initialChapter])

  const mangaId = activeChapterForQueries?.mangaId

  const { data: manga } = useQuery({
    queryKey: ['manga', mangaId, user?.id],
    queryFn: () => apiClient.getMangaById(mangaId!, user?.id),
    enabled: !!mangaId,
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => apiClient.getChaptersByManga(mangaId!),
    enabled: !!mangaId,
  })

  const sortedChapters = useMemo(() => {
    if (!allChapters) return undefined
    return [...allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
  }, [allChapters])

  useEffect(() => {
    setChapterEntries([])
    setActiveIndex(null)
    prefetchNextRef.current.clear()
    prefetchPrevRef.current.clear()
    loadingIndicesRef.current.clear()
    viewedChaptersRef.current.clear()
    completedChaptersRef.current.clear()
    setAutoCompletedMap({})
  }, [mangaId])

  useEffect(() => {
    if (!initialChapter || !initialImages || !sortedChapters) return
    const index = sortedChapters.findIndex(ch => ch.id === initialChapter.id)
    if (index === -1) return
    setChapterEntries(prev => {
      const existingIndex = prev.findIndex(entry => entry.chapter.id === initialChapter.id)
      const nextEntry: ChapterEntry = { index, chapter: initialChapter, images: initialImages }
      if (existingIndex !== -1) {
        const copy = [...prev]
        copy[existingIndex] = nextEntry
        copy.sort((a, b) => a.index - b.index)
        return copy
      }
      return [...prev, nextEntry].sort((a, b) => a.index - b.index)
    })
    setActiveIndex(prev => prev ?? index)
  }, [initialChapter, initialImages, sortedChapters])

  useEffect(() => {
    if (!chapterEntries.length) return
    if (activeIndex == null || !chapterEntries.some(entry => entry.index === activeIndex)) {
      setActiveIndex(chapterEntries[0].index)
    }
  }, [chapterEntries, activeIndex])

  const activeEntry = useMemo(() => {
    if (activeIndex != null) {
      const match = chapterEntries.find(entry => entry.index === activeIndex)
      if (match) return match
    }
    return chapterEntries[0]
  }, [activeIndex, chapterEntries])

  const activeChapter = activeEntry?.chapter
  const activeImages = activeEntry?.images ?? []
  const activeChapterId = activeChapter?.id
  const activeChapterIndex = activeEntry?.index ?? (sortedChapters ? sortedChapters.findIndex(ch => ch.id === activeChapterId) : -1)
  const previousChapter = activeChapterIndex != null && activeChapterIndex > 0 ? sortedChapters?.[activeChapterIndex - 1] : undefined
  const nextChapter = activeChapterIndex != null && sortedChapters ? sortedChapters[activeChapterIndex + 1] : undefined
  const totalChapters = sortedChapters?.length ?? 0
  const currentChapterOrdinal = activeChapterIndex != null && activeChapterIndex >= 0 ? activeChapterIndex + 1 : 0

  const isActiveChapterLiked = activeChapterId ? likedChapters[activeChapterId] ?? false : false
  const isActiveChapterLiking = activeChapterId ? likingChapters[activeChapterId] ?? false : false
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!activeChapter) return
    const variants = buildChapterTitleVariants(activeChapter)
    const adaptive = getAdaptiveChapterTitle(activeChapter, viewportWidth)
    variantsRef.current = [variants.full, variants.medium, variants.short, variants.minimal]
    let startIndex = variantsRef.current.findIndex(x => x === adaptive)
    if (startIndex === -1) startIndex = 0
    setTitleVariantIndex(startIndex)
    setFinalTitle(adaptive)
  }, [activeChapter, viewportWidth])

  useEffect(() => {
    if (!titleContainerRef.current || !activeChapter) return
    const el = titleContainerRef.current
    const adjust = () => {
      let idx = titleVariantIndex
      while (idx < variantsRef.current.length) {
        el.textContent = variantsRef.current[idx]
        if (el.scrollWidth <= el.clientWidth) {
          setFinalTitle(variantsRef.current[idx])
          if (idx !== titleVariantIndex) setTitleVariantIndex(idx)
          return
        }
        idx += 1
      }
      const fallback = variantsRef.current[variantsRef.current.length - 1]
      setFinalTitle(fallback)
      setTitleVariantIndex(variantsRef.current.length - 1)
    }
    const ro = new ResizeObserver(() => adjust())
    ro.observe(el)
    adjust()
    return () => ro.disconnect()
  }, [titleVariantIndex, activeChapter])

  useEffect(() => {
    if (sortedChapters && sortedChapters.length) {
      clearTrackedChapters()
    }
  }, [sortedChapters, clearTrackedChapters])

  useEffect(() => {
    if (!activeChapterId) return
    if (likedChapters[activeChapterId] !== undefined) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await apiClient.isChapterLiked(activeChapterId)
        if (!cancelled) {
          setLikedChapters(prev => ({ ...prev, [activeChapterId]: response.liked }))
        }
      } catch (error) {
        console.error('Failed to load chapter like status:', error)
        if (!cancelled) {
          setLikedChapters(prev => ({ ...prev, [activeChapterId]: false }))
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeChapterId, likedChapters])

  const ensureChapterLoaded = useCallback(async (index: number, direction: 'append' | 'prepend' = 'append') => {
    if (!sortedChapters) return
    if (index < 0 || index >= sortedChapters.length) return
    if (chapterEntriesRef.current.some(entry => entry.index === index)) return
    if (loadingIndicesRef.current.has(index)) return

    loadingIndicesRef.current.add(index)
    if (direction === 'append') {
      setLoadingForward(true)
    } else {
      setLoadingBackward(true)
    }

    let anchorElement: HTMLElement | null = null
    let anchorTop = 0
    if (direction === 'prepend') {
      const firstEntry = chapterEntriesRef.current[0]
      if (firstEntry) {
        anchorElement = document.querySelector<HTMLElement>(`[data-chapter-id="${firstEntry.chapter.id}"]`)
        anchorTop = anchorElement?.getBoundingClientRect().top ?? 0
      }
    }

    try {
      const meta = sortedChapters[index]
      const [chapterData, imagesData] = await Promise.all([
        apiClient.getChapterById(meta.id),
        apiClient.getChapterImages(meta.id)
      ])
      setChapterEntries(prev => {
        if (prev.some(item => item.index === index)) return prev
        const next = [...prev, { index, chapter: chapterData, images: imagesData }].sort((a, b) => a.index - b.index)
        return next
      })
    } catch (error) {
      console.error('Failed to load chapter data', error)
    } finally {
      loadingIndicesRef.current.delete(index)
      if (direction === 'append') {
        setLoadingForward(false)
      } else {
        setLoadingBackward(false)
        if (anchorElement) {
          requestAnimationFrame(() => {
            const newTop = anchorElement!.getBoundingClientRect().top
            window.scrollBy({ top: newTop - anchorTop })
          })
        }
      }
    }
  }, [sortedChapters])

  const scrollToChapterIndex = useCallback((index: number) => {
    if (!sortedChapters) return
    const chapter = sortedChapters[index]
    if (!chapter) return
    const element = document.querySelector<HTMLElement>(`[data-chapter-id="${chapter.id}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
    }
  }, [sortedChapters])

  const handleChapterActivated = useCallback((index: number) => {
    if (!sortedChapters) return
    const entry = chapterEntriesRef.current.find(item => item.index === index)
    if (!entry) return
    setActiveIndex(prev => prev === index ? prev : index)

    const chapterDetail = entry.chapter
    const chapterIdNumeric = chapterDetail?.id
    if (chapterIdNumeric) {
      if (!viewedChaptersRef.current.has(chapterIdNumeric)) {
        const previousMeta = index > 0 ? sortedChapters[index - 1] : undefined
        viewedChaptersRef.current.add(chapterIdNumeric)
        trackChapterViewed(
          chapterDetail.mangaId,
          chapterIdNumeric,
          chapterDetail.chapterNumber,
          previousMeta ? { id: previousMeta.id, chapterNumber: previousMeta.chapterNumber } : undefined
        ).catch(error => {
          console.error('Failed to track chapter view', error)
          viewedChaptersRef.current.delete(chapterIdNumeric)
        })
      }

      if (String(chapterIdNumeric) !== chapterId) {
        navigate(`/reader/${chapterIdNumeric}`, { replace: true })
      }
    }
  }, [chapterId, navigate, sortedChapters, trackChapterViewed])

  const handleChapterCompleted = useCallback((index: number) => {
    const entry = chapterEntriesRef.current.find(item => item.index === index)
    if (!entry) return
    const chapterDetail = entry.chapter
    const chapterIdNumeric = chapterDetail?.id
    if (!chapterIdNumeric) return
    if (completedChaptersRef.current.has(chapterIdNumeric) || isChapterCompleted(chapterIdNumeric)) return
    completedChaptersRef.current.add(chapterIdNumeric)
    setAutoCompletedMap(prev => ({ ...prev, [chapterIdNumeric]: true }))
    markChapterCompleted(chapterDetail.mangaId, chapterIdNumeric, chapterDetail.chapterNumber)
      .catch(error => {
        console.error('Failed to mark chapter completed', error)
        completedChaptersRef.current.delete(chapterIdNumeric)
        setAutoCompletedMap(prev => {
          const copy = { ...prev }
          delete copy[chapterIdNumeric]
          return copy
        })
      })
  }, [markChapterCompleted, isChapterCompleted])

  const handleNearBottom = useCallback((index: number) => {
    if (!sortedChapters) return
    const target = index + 1
    if (target >= sortedChapters.length) return
    if (prefetchNextRef.current.has(target)) return
    prefetchNextRef.current.add(target)
    ensureChapterLoaded(target, 'append').finally(() => {
      prefetchNextRef.current.delete(target)
    })
  }, [ensureChapterLoaded, sortedChapters])

  const handleNearTop = useCallback((index: number) => {
    if (!sortedChapters) return
    const target = index - 1
    if (target < 0) return
    if (prefetchPrevRef.current.has(target)) return
    prefetchPrevRef.current.add(target)
    ensureChapterLoaded(target, 'prepend').finally(() => {
      prefetchPrevRef.current.delete(target)
    })
  }, [ensureChapterLoaded, sortedChapters])

  const navigateToNextChapter = useCallback(async () => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    const target = activeChapterIndex + 1
    if (target >= sortedChapters.length) return
    await ensureChapterLoaded(target, 'append')
    scrollToChapterIndex(target)
  }, [activeChapterIndex, ensureChapterLoaded, scrollToChapterIndex, sortedChapters])

  const navigateToPreviousChapter = useCallback(async () => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    const target = activeChapterIndex - 1
    if (target < 0) return
    await ensureChapterLoaded(target, 'prepend')
    scrollToChapterIndex(target)
  }, [activeChapterIndex, ensureChapterLoaded, scrollToChapterIndex, sortedChapters])

  useEffect(() => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    ensureChapterLoaded(activeChapterIndex + 1, 'append')
    ensureChapterLoaded(activeChapterIndex - 1, 'prepend')
  }, [activeChapterIndex, ensureChapterLoaded, sortedChapters])

  const handleJumpToChapter = useCallback(async (targetId: number) => {
    if (!sortedChapters) return
    const targetIndex = sortedChapters.findIndex(ch => ch.id === targetId)
    if (targetIndex === -1) return
    const direction: 'append' | 'prepend' = activeChapterIndex != null && targetIndex < activeChapterIndex ? 'prepend' : 'append'
    await ensureChapterLoaded(targetIndex, direction)
    scrollToChapterIndex(targetIndex)
    setShowChapterList(false)
  }, [activeChapterIndex, ensureChapterLoaded, scrollToChapterIndex, setShowChapterList, sortedChapters])


  // Handle chapter like/unlike
  const handleChapterLike = useCallback(async () => {
    if (!activeChapter || !activeChapterId || isActiveChapterLiked || isActiveChapterLiking) return
    setLikingChapters(prev => ({ ...prev, [activeChapterId]: true }))
    try {
      const response = await apiClient.toggleChapterLike(activeChapterId)
      const liked = response?.liked ?? true
      setLikedChapters(prev => ({ ...prev, [activeChapterId]: liked }))
      setChapterEntries(prev => prev.map(entry => entry.chapter.id === activeChapterId
        ? {
            ...entry,
            chapter: {
              ...entry.chapter,
              likeCount: response?.likeCount ?? ((entry.chapter.likeCount ?? 0) + 1)
            }
          }
        : entry
      ))
      queryClient.invalidateQueries({ queryKey: ['chapter', activeChapterId] })
    } catch (error) {
      console.error('Failed to toggle chapter like:', error)
    } finally {
      setLikingChapters(prev => ({ ...prev, [activeChapterId]: false }))
    }
  }, [activeChapter, activeChapterId, isActiveChapterLiked, isActiveChapterLiking, queryClient])

  const handleImageClick = useCallback(() => {
    if (skipClickToggleRef.current) {
      skipClickToggleRef.current = false
      if (skipClickResetRef.current) {
        clearTimeout(skipClickResetRef.current)
        skipClickResetRef.current = null
      }
      return
    }
    if (pendingUiToggleRef.current) {
      // Touch path will handle toggle via scheduled timer
      return
    }
    setShowUI((v) => !v)
  }, [setShowUI])

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
    if (skipClickResetRef.current) {
      clearTimeout(skipClickResetRef.current)
    }
    skipClickToggleRef.current = true
    skipClickResetRef.current = setTimeout(() => {
      skipClickToggleRef.current = false
      skipClickResetRef.current = null
    }, 400)
    handleChapterLike()
  }

  const handleTapOrClick = (e: React.MouseEvent | React.TouchEvent) => {
    let clientX: number | null = null
    let clientY: number | null = null

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('changedTouches' in (e as any) && (e as any).changedTouches.length > 0) {
      clientX = (e as any).changedTouches[0].clientX
      clientY = (e as any).changedTouches[0].clientY
    } else if ('clientX' in e && 'clientY' in e) {
      // Desktop click path
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    const now = Date.now()

    if (clientX != null && clientY != null) {
      const delta = now - lastTap
      const isDoubleTap = delta > 0 && delta < 280 && !touchMovedRef.current

      if (isDoubleTap) {
        if (pendingUiToggleRef.current) {
          clearTimeout(pendingUiToggleRef.current)
          pendingUiToggleRef.current = null
        }
        setShowUI((prev) => (prev === initialShowUIRef.current ? prev : initialShowUIRef.current))
        attemptLikeFromGesture(clientX, clientY)
        setLastTap(0)
        return
      }
    }

    initialShowUIRef.current = showUI
    if (pendingUiToggleRef.current) {
      clearTimeout(pendingUiToggleRef.current)
    }
    pendingUiToggleRef.current = setTimeout(() => {
      setShowUI((prev) => !prev)
      pendingUiToggleRef.current = null
    }, 260)
    setLastTap(now)
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
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      touchMovedRef.current = true
      if (pendingUiToggleRef.current) {
        clearTimeout(pendingUiToggleRef.current)
        pendingUiToggleRef.current = null
      }
    }
  }
  const handleTouchEndSwipe = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const start = touchStartRef.current
    const endTime = Date.now()
    const dt = endTime - start.time
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    const hadMovement = touchMovedRef.current
    touchStartRef.current = null
    touchMovedRef.current = false
    if (hadMovement) {
      setLastTap(0)
    }

    if (viewportWidth < 768) {
      return
    }

    if (!hadMovement) return
    const horizontalDistance = Math.abs(dx)
    const verticalDistance = Math.abs(dy)
    if (horizontalDistance < 120 || horizontalDistance < verticalDistance * 1.5) return // stronger intent required
    if (dt > 700) return // too slow
    if (verticalDistance > 140) return // largely vertical gesture
    if (dx < 0) {
      // swipe left -> next chapter
      navigateToNextChapter()
    } else {
      navigateToPreviousChapter()
    }
  }

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

  // Get image width class
  const isInitialLoading = isInitialChapterLoading || isInitialImagesLoading || !sortedChapters || !activeEntry

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

  if (isInitialLoading) {
    return (
      <div className="manga-reader flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!activeChapter || activeImages.length === 0) {
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
            <div className="flex items-center space-x-3 sm:space-x-4 justify-start min-w-0">
              {/* Back button (always) */}
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {/* Mobile home->manga button (shows only on < md) when manga exists */}
              {manga && (
                <Link
                  to={`/manga/${manga.id}`}
                  className="md:hidden p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  aria-label="Страница манги"
                  title={manga.title}
                >
                  <Home className="h-5 w-5" />
                </Link>
              )}
              {/* Desktop section with site home + manga title */}
              <div className="hidden md:flex items-center space-x-2 min-w-0">
                <Link
                  to="/"
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  aria-label="Главная"
                >
                  <Home className="h-5 w-5" />
                </Link>
                {manga && (
                  <Link
                    to={`/manga/${manga.id}`}
                    className="text-white hover:text-primary transition-colors truncate max-w-[150px]"
                    title={manga.title}
                  >
                    {manga.title}
                  </Link>
                )}
              </div>
            </div>

            {/* Center - chapter navigation + clickable index (fixed layout) */}
            <div className="flex items-center justify-center text-white space-x-2 sm:space-x-3 min-w-0">
              <button
                disabled={!previousChapter}
                onClick={navigateToPreviousChapter}
                className={cn('p-1.5 sm:p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
                title="Предыдущая глава"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center min-w-0 max-w-full">
                <button
                  ref={titleContainerRef}
                  onClick={() => setShowChapterList(true)}
                  className="font-semibold text-base hover:text-primary transition-colors w-full max-w-[64vw] sm:max-w-[460px] text-center truncate whitespace-nowrap"
                  style={{ minWidth: '40px' }}
                  title={activeChapter ? formatChapterTitle(activeChapter) : ''}
                >
                  {finalTitle || (activeChapter ? formatChapterTitle(activeChapter) : '')}
                </button>
                <button
                  onClick={() => setShowChapterList(true)}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-wide text-gray-300/80 hover:text-primary/80 transition px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
                  title="Открыть список глав"
                >
                  <span className="font-medium">{currentChapterOrdinal}</span>
                  <span className="opacity-60">/</span>
                  <span>{totalChapters}</span>
                </button>
              </div>
              <button
                disabled={!nextChapter}
                onClick={navigateToNextChapter}
                className={cn('p-1.5 sm:p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
                title="Следующая глава"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right side now only holds mobile menu toggle (settings moved to side action bar) */}
            <div className="flex items-center space-x-2 justify-end">
              <button
                onClick={() => setShowUI(!showUI)}
                className="md:hidden p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label="Переключить UI"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

  {/* Settings Panel */}
      {isSettingsOpen && (
        <div
          className={cn(
            'settings-panel z-40 animate-fade-in fixed',
            // Desktop: align roughly with vertical action bar (center right)
            'hidden md:block md:top-1/2 md:-translate-y-1/2 md:right-[84px] md:rounded-2xl md:min-w-[250px] md:max-w-[280px]',
            'md:border md:border-white/15 md:bg-gradient-to-br md:from-white/10 md:via-white/5 md:to-white/5 md:shadow-xl',
            // Mobile bottom sheet retains previous style
            'md:translate-x-0',
            'bg-black/85 md:bg-black/60 backdrop-blur-2xl',
            'bottom-0 left-0 right-0 md:bottom-auto md:left-auto',
            'p-5 pt-4 md:p-5'
          )}
        >
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-white font-semibold text-base md:text-sm tracking-wide">Настройки чтения</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="md:hidden p-2 -m-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                aria-label="Закрыть настройки"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
            {/* Manual finish chapter button removed per request */}
            </div>
            {/* Drag handle for mobile */}
            <div className="md:hidden mt-5 pt-2">
              <div className="h-1 w-10 mx-auto rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      )}

  {/* Main Content - Vertical Scroll */}
      <div className="pt-16">
        {/* Reading Area */}
        <div className={cn("flex flex-col gap-12", readingMode === 'horizontal' ? 'md:px-8' : '')}>
          {chapterEntries.map(entry => {
            const prevMeta = sortedChapters?.[entry.index - 1]
            return (
              <ChapterBlock
                key={entry.chapter?.id ?? entry.index}
                entry={entry}
                imageWidth={imageWidth}
                showUI={showUI}
                previousChapter={prevMeta}
                handleImageClick={handleImageClick}
                handleTapOrClick={handleTapOrClick}
                handleDoubleClickDesktop={handleDoubleClickDesktop}
                handleTouchStartSwipe={handleTouchStartSwipe}
                handleTouchMoveSwipe={handleTouchMoveSwipe}
                handleTouchEndSwipe={handleTouchEndSwipe}
                onActivate={() => handleChapterActivated(entry.index)}
                onNearBottom={() => handleNearBottom(entry.index)}
                onNearTop={() => handleNearTop(entry.index)}
                onCompleted={() => handleChapterCompleted(entry.index)}
                onFocusChapter={() => handleChapterActivated(entry.index)}
                isActive={entry.index === activeChapterIndex}
              />
            )
          })}
          {loadingForward && (
            <div className="flex justify-center py-8 text-sm text-white/70">Загружаем следующую главу…</div>
          )}
          {loadingBackward && (
            <div className="flex justify-center py-8 text-sm text-white/70">Загружаем предыдущую главу…</div>
          )}
        </div>

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
      {activeChapter && (
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
            disabled={isActiveChapterLiking || isActiveChapterLiked}
            className={cn('reader-fab', isActiveChapterLiked && 'text-red-400 opacity-80 cursor-default')}
            title={isActiveChapterLiked ? 'Лайк уже поставлен' : 'Поставить лайк'}
            aria-pressed={isActiveChapterLiked}
          >
            <Heart className={cn('h-5 w-5', isActiveChapterLiked && 'fill-current')} />
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
                const active = ch.id === activeChapterId
                return (
                  <button
                    key={ch.id}
                    onClick={() => handleJumpToChapter(ch.id)}
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
      {showSideComments && activeChapter && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSideComments(false)}
          />
          {/* Panel */}
            <div className="relative ml-auto h-full w-full sm:w-[480px] md:w-[520px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-semibold text-sm sm:text-base">Комментарии к главе {getDisplayChapterNumber(activeChapter.chapterNumber)}</h3>
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
                  targetId={activeChapter.id}
                  type="CHAPTER"
                  title=""
                  maxLevel={3}
                  hideHeader
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
