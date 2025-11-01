import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { buildChapterTitleVariants, formatChapterTitle, getAdaptiveChapterTitle } from '@/lib/chapterUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useReadingProgress } from '@/hooks/useProgress'
import type { ChapterEntry } from '../types'

const MAX_PENDING_SCROLL_ATTEMPTS = 480
const SCROLL_DIRECTION_RESET_MS = 450

export function useReaderController() {
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
  const pendingScrollIndexRef = useRef<number | null>(null)
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>('smooth')
  const pendingActiveIndexRef = useRef<number | null>(null)
  const manualNavigationLockRef = useRef<number>(0)
  const activeChapterLoadsRef = useRef<number>(0)
  const pendingScrollAttemptsRef = useRef<number>(0)
  const chapterNodesRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const activeIndexRef = useRef<number | null>(null)
  const targetChapterIndexRef = useRef<number | null>(null)
  const naturalScrollNavigationRef = useRef<boolean>(false)
  const [contentVersion, setContentVersion] = useState(0)
  const [autoCompletedMap, setAutoCompletedMap] = useState<Record<number, boolean>>({})
  const [loadingForward, setLoadingForward] = useState(false)
  const [loadingBackward, setLoadingBackward] = useState(false)
  const [likedChapters, setLikedChapters] = useState<Record<number, boolean>>({})
  const [likingChapters, setLikingChapters] = useState<Record<number, boolean>>({})
  const visibleChapterIndexesRef = useRef<Set<number>>(new Set())
  const scrollRecalcFrameRef = useRef<number | null>(null)
  const lastScrollDirectionRef = useRef<-1 | 0 | 1>(0)
  const lastScrollDirectionAtRef = useRef<number>(0)
  const headerHeightCacheRef = useRef<number>(0)
  const replaceChapterEntriesRef = useRef<{ index: number } | null>(null)
  const loadEpochRef = useRef(0)
  const manualNavigationLowerBoundRef = useRef<number | null>(null)
  const [manualNavigationLowerBound, setManualNavigationLowerBound] = useState<number | null>(null)
  const [transitionBridge, setTransitionBridge] = useState<{ anchorIndex: number; targetIndex: number; targetReady: boolean } | null>(null)
  const sanitizeChapterEntries = useCallback((entries: ChapterEntry[]) => {
    const lowerBound = manualNavigationLowerBoundRef.current
    if (lowerBound == null || entries.length === 0) {
      return entries
    }
    const hasOutOfBounds = entries.some(entry => entry.index < lowerBound)
    if (!hasOutOfBounds) {
      return entries
    }
    return entries.filter(entry => entry.index >= lowerBound)
  }, [])

  const commitChapterEntries = useCallback((updater: (prev: ChapterEntry[]) => ChapterEntry[]) => {
    setChapterEntries(prev => {
      const next = sanitizeChapterEntries(updater(prev))
      chapterEntriesRef.current = next
      return next
    })
  }, [sanitizeChapterEntries])

  const pendingPruneIndexRef = useRef<number | null>(null)
  const manualNavigationInitRef = useRef<boolean>(false)
  const manualNavigationState = (location.state as { manualNavigation?: boolean } | null)?.manualNavigation ?? false

  const pruneBeforeIndex = useCallback((lowerBound: number) => {
    const shouldReapplyLater = !chapterEntriesRef.current.some(entry => entry.index >= lowerBound)
    pendingPruneIndexRef.current = shouldReapplyLater ? lowerBound : null
    chapterNodesRef.current.forEach((_, index) => {
      if (index < lowerBound) {
        chapterNodesRef.current.delete(index)
      }
    })
    visibleChapterIndexesRef.current.forEach(index => {
      if (index < lowerBound) {
        visibleChapterIndexesRef.current.delete(index)
      }
    })
    prefetchPrevRef.current.forEach(index => {
      if (index < lowerBound) {
        prefetchPrevRef.current.delete(index)
      }
    })
    loadingIndicesRef.current.forEach(index => {
      if (index < lowerBound) {
        loadingIndicesRef.current.delete(index)
      }
    })
    commitChapterEntries(prev => prev.filter(entry => entry.index >= lowerBound))
  }, [commitChapterEntries])

  const updateManualNavigationLowerBound = useCallback((value: number | null) => {
    const sanitized = value == null ? null : Math.max(0, value)
    const previous = manualNavigationLowerBoundRef.current
    if (previous === sanitized) {
      return
    }
    manualNavigationLowerBoundRef.current = sanitized
    setManualNavigationLowerBound(sanitized)
    if (sanitized != null) {
      pruneBeforeIndex(sanitized)
    }
  }, [pruneBeforeIndex])

  const resetChapterEnvironment = useCallback((lowerBound: number | null) => {
    chapterEntriesRef.current = []
    commitChapterEntries(() => [])
    naturalScrollNavigationRef.current = false
    setActiveIndex(null)
    activeIndexRef.current = null
    prefetchNextRef.current.clear()
    prefetchPrevRef.current.clear()
    loadingIndicesRef.current.clear()
    viewedChaptersRef.current.clear()
    completedChaptersRef.current.clear()
    pendingScrollIndexRef.current = null
    pendingActiveIndexRef.current = null
  pendingScrollBehaviorRef.current = 'auto'
    pendingScrollAttemptsRef.current = 0
    manualNavigationLockRef.current = 0
    activeChapterLoadsRef.current = 0
    chapterNodesRef.current.clear()
    visibleChapterIndexesRef.current.clear()
    if (scrollRecalcFrameRef.current != null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(scrollRecalcFrameRef.current)
    }
    scrollRecalcFrameRef.current = null
    lastScrollDirectionRef.current = 0
    replaceChapterEntriesRef.current = null
    pendingPruneIndexRef.current = null
    targetChapterIndexRef.current = null
    setAutoCompletedMap({})
    setTransitionBridge(null)
    loadEpochRef.current += 1
    updateManualNavigationLowerBound(lowerBound)
  }, [commitChapterEntries, setTransitionBridge, updateManualNavigationLowerBound])

  const getVisibleHeaderHeight = useCallback(() => {
    if (typeof window === 'undefined') return headerHeightCacheRef.current

    const topBar = document.querySelector<HTMLElement>('[data-reader-top-bar]')
    if (!topBar) return headerHeightCacheRef.current

    const rect = topBar.getBoundingClientRect()
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight
    const computed = window.getComputedStyle(topBar)
    const marginBottom = parseFloat(computed.marginBottom || '0')
    const safeMargin = Number.isFinite(marginBottom) ? marginBottom : 0
    const measured = Math.max(0, rect.height) + safeMargin

    if (measured > 0) {
      headerHeightCacheRef.current = measured
    }

    if (!isVisible) {
      return 0
    }

    return headerHeightCacheRef.current
  }, [])

  const updateActiveFromVisibility = useCallback(() => {
    if (pendingScrollIndexRef.current != null) return
    const lockUntil = manualNavigationLockRef.current
    const now = Date.now()
    const lockActive = lockUntil > now
    const currentIndex = activeIndexRef.current
    const targetIndex = targetChapterIndexRef.current
    naturalScrollNavigationRef.current = false
    const naturalTransition = targetIndex == null

    const candidateIndexes = visibleChapterIndexesRef.current.size > 0
      ? Array.from(visibleChapterIndexesRef.current)
      : Array.from(chapterNodesRef.current.keys())
    if (candidateIndexes.length === 0 && targetIndex == null) return

    const headerHeight = getVisibleHeaderHeight()
    const margin = headerHeight > 0 ? 16 : 12
    const baseline = headerHeight + margin
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
    const focusLine = viewportHeight > 0
      ? Math.min(Math.max(baseline + 120, viewportHeight * 0.45), Math.max(baseline + 160, viewportHeight - 140))
      : baseline + 160

    type CandidateInfo = {
      index: number
      rectTop: number
      rectBottom: number
      baselineCover: boolean
      focusCover: boolean
      baselineDistance: number
      focusDistance: number
    }

    const visited = new Set<number>()
    const infos: CandidateInfo[] = []

    const collectInfo = (idx: number | null | undefined) => {
      if (idx == null) return
      if (visited.has(idx)) return
      const node = chapterNodesRef.current.get(idx)
      if (!node) return
      visited.add(idx)
      const rect = node.getBoundingClientRect()
      const top = rect.top
      const bottom = rect.bottom
      const center = top + (rect.height / 2)
      infos.push({
        index: idx,
        rectTop: top,
        rectBottom: bottom,
        baselineCover: top <= baseline && bottom > baseline,
        focusCover: top <= focusLine && bottom >= focusLine,
        baselineDistance: Math.abs(top - baseline),
        focusDistance: Math.abs(center - focusLine)
      })
    }

    collectInfo(targetIndex)
    candidateIndexes.forEach(idx => collectInfo(idx))
    collectInfo(currentIndex)

    if (!infos.length) return

    const evaluationInfos = infos

    let forceTarget = false
    let bestIndex: number | null = null
    let targetInfo: CandidateInfo | undefined

    if (targetIndex != null) {
      targetInfo = infos.find(info => info.index === targetIndex)
      if (targetInfo) {
        const targetOffset = targetInfo.rectTop - baseline
        const targetDistance = Math.abs(targetOffset)
        bestIndex = targetIndex
        if (targetDistance > 36 && !targetInfo.focusCover) {
          forceTarget = true
        } else {
          targetChapterIndexRef.current = null
        }
      } else {
        // Target not yet measurable; wait until node is registered
        return
      }
    }

    const metricValue = (info: CandidateInfo, metric: 'focus' | 'baseline' | 'top') => {
      switch (metric) {
        case 'focus':
          return info.focusDistance
        case 'baseline':
          return info.baselineDistance
        default:
          return Math.abs(info.rectTop - baseline)
      }
    }

    const selectBest = (candidates: CandidateInfo[], metric: 'focus' | 'baseline' | 'top'): CandidateInfo | null => {
      if (!candidates.length) return null
      return candidates.reduce<CandidateInfo | null>((best, info) => {
        if (!best) return info
        const bestValue = metricValue(best, metric)
        const infoValue = metricValue(info, metric)
        if (infoValue < bestValue - 0.25) return info
        if (Math.abs(infoValue - bestValue) <= 0.25 && info.index > best.index) return info
        return best
      }, null)
    }

    if (forceTarget) {
      if (bestIndex != null && bestIndex !== currentIndex) {
        naturalScrollNavigationRef.current = naturalTransition
        setActiveIndex(bestIndex)
      }
      return
    }

    let chosen: CandidateInfo | null = null

    const focusMatches = evaluationInfos.filter(info => info.focusCover)
    if (targetInfo && !forceTarget) {
      const shouldPreferTarget = targetInfo.focusCover || targetInfo.baselineCover || targetInfo.focusDistance <= 80
      if (shouldPreferTarget) {
        chosen = targetInfo
      }
    }

    if (!chosen && focusMatches.length) {
      chosen = selectBest(focusMatches, 'focus')
    }

    if (!chosen) {
      const baselineMatches = evaluationInfos.filter(info => info.baselineCover)
      if (baselineMatches.length) {
        chosen = selectBest(baselineMatches, 'baseline')
      }
    }

    if (!chosen) {
      chosen = selectBest(evaluationInfos, 'focus') ?? selectBest(evaluationInfos, 'baseline') ?? selectBest(evaluationInfos, 'top')
    }

    if (!chosen) return

    const currentInfo = currentIndex != null ? evaluationInfos.find(info => info.index === currentIndex) : undefined

    if (!forceTarget && targetIndex == null && currentInfo && chosen.index !== currentIndex) {
      const currentCoversFocus = currentInfo.focusCover || currentInfo.baselineCover
      const chosenCoversFocus = chosen.focusCover || chosen.baselineCover

      if (currentCoversFocus && !chosenCoversFocus) {
        return
      }

      if (currentCoversFocus && chosenCoversFocus) {
        const hasMeaningfulImprovement = chosen.focusDistance + 12 < currentInfo.focusDistance
        if (!hasMeaningfulImprovement) {
          return
        }
      }

      if (!currentCoversFocus && !chosenCoversFocus) {
        const baselineImproved = chosen.baselineDistance + 20 < currentInfo.baselineDistance
        if (!baselineImproved) {
          return
        }
      }
    }

    if (targetIndex != null && chosen.index === targetIndex) {
      targetChapterIndexRef.current = null
    }

    if (targetIndex == null && currentIndex != null && chosen.index < currentIndex) {
      const lastDirection = lastScrollDirectionRef.current
      const lastDirectionAge = Date.now() - lastScrollDirectionAtRef.current
      if (lastDirection === 1 && lastDirectionAge <= SCROLL_DIRECTION_RESET_MS) {
        return
      }
    }

    if (lockActive && currentIndex != null && chosen.index !== currentIndex && targetIndex == null) {
      return
    }

    if (chosen.index !== currentIndex) {
      naturalScrollNavigationRef.current = naturalTransition
      setActiveIndex(chosen.index)
      return
    }

    if (!lockActive && currentIndex != null) {
      if (currentInfo && Math.abs(currentInfo.rectTop - baseline) > 32) {
        const fallback = selectBest(
          evaluationInfos.filter(info => info.index !== currentIndex),
          'focus'
        )
        if (fallback && fallback.index !== currentIndex) {
          naturalScrollNavigationRef.current = naturalTransition
          setActiveIndex(fallback.index)
        }
      }
    }
  }, [getVisibleHeaderHeight])

  const cancelPendingScroll = useCallback(() => {
    if (pendingScrollIndexRef.current == null && pendingActiveIndexRef.current == null) {
      return
    }
    pendingScrollIndexRef.current = null
    pendingScrollAttemptsRef.current = 0
    pendingActiveIndexRef.current = null
    pendingScrollBehaviorRef.current = 'smooth'
    manualNavigationLockRef.current = 0
    updateActiveFromVisibility()
  }, [updateActiveFromVisibility])

  useEffect(() => {
    chapterEntriesRef.current = chapterEntries
    const pending = pendingPruneIndexRef.current
    if (pending != null) {
      pruneBeforeIndex(pending)
    }
  }, [chapterEntries, pruneBeforeIndex])

  useEffect(() => {
    if (!manualNavigationState) return
    if (manualNavigationInitRef.current) return
    if (activeIndex == null) return
    manualNavigationInitRef.current = true
    updateManualNavigationLowerBound(activeIndex)
  }, [activeIndex, manualNavigationState, updateManualNavigationLowerBound])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    const pendingIndex = pendingActiveIndexRef.current
    if (pendingIndex == null) return
    if (pendingIndex === activeIndex) {
      pendingActiveIndexRef.current = null
    }
  }, [activeIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let lastY = window.scrollY
    const handle = () => {
      const currentY = window.scrollY
      const delta = currentY - lastY
      lastY = currentY
      if (Math.abs(delta) <= 1) return
      if (pendingScrollIndexRef.current != null && manualNavigationLockRef.current < Date.now()) {
        cancelPendingScroll()
      }
      const now = Date.now()
      naturalScrollNavigationRef.current = false
      if (manualNavigationLockRef.current < now) {
        if (targetChapterIndexRef.current != null) {
          targetChapterIndexRef.current = null
        }
      }
      lastScrollDirectionRef.current = delta > 0 ? 1 : -1
      lastScrollDirectionAtRef.current = Date.now()
    }
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [cancelPendingScroll])

  useEffect(() => {
    const pendingIndex = pendingActiveIndexRef.current
    if (pendingIndex == null) return
    const hasEntry = chapterEntriesRef.current.some(entry => entry.index === pendingIndex)
    if (!hasEntry) return
    if (activeIndexRef.current !== pendingIndex) {
      naturalScrollNavigationRef.current = false
      setActiveIndex(pendingIndex)
    }
  }, [chapterEntries])

  useEffect(() => {
    initialShowUIRef.current = showUI
  }, [showUI])

  const { user } = useAuth()
  const queryClient = useQueryClient()

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
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash.startsWith('#comment-')) {
      setShowSideComments(true)
    }
  }, [location?.hash])

  useEffect(() => {
    try {
      localStorage.setItem('reader.mode', readingMode)
      localStorage.setItem('reader.imageWidth', imageWidth)
    } catch {
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

  const { trackChapterViewed, markChapterCompleted, isChapterCompleted, clearTrackedChapters } = useReadingProgress()

  const numericChapterId = chapterId ? Number.parseInt(chapterId, 10) : Number.NaN

  const { data: initialChapter, isLoading: isInitialChapterLoading } = useQuery({
    queryKey: ['chapter', numericChapterId],
    queryFn: () => apiClient.getChapterById(numericChapterId),
    enabled: Number.isFinite(numericChapterId)
  })

  const { data: initialImages, isLoading: isInitialImagesLoading } = useQuery({
    queryKey: ['chapter-images', numericChapterId],
    queryFn: () => apiClient.getChapterImages(numericChapterId),
    enabled: Number.isFinite(numericChapterId)
  })

  useEffect(() => {
    if (initialChapter) {
      const variants = buildChapterTitleVariants(initialChapter)
      const adaptive = getAdaptiveChapterTitle(initialChapter, viewportWidth)
      variantsRef.current = [variants.full, variants.medium, variants.short, variants.minimal]
      let startIndex = variantsRef.current.findIndex(x => x === adaptive)
      if (startIndex === -1) startIndex = 0
      setTitleVariantIndex(startIndex)
      setFinalTitle(adaptive)
    }
  }, [initialChapter, viewportWidth])

  useEffect(() => {
    if (!titleContainerRef.current || !initialChapter) return
    const el = titleContainerRef.current
    const adjust = () => {
      if (!variantsRef.current.length) return
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
  }, [titleVariantIndex, initialChapter])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data: manga } = useQuery({
    queryKey: ['manga', initialChapter?.mangaId, user?.id],
    queryFn: () => apiClient.getMangaById(initialChapter!.mangaId, user?.id),
    enabled: !!initialChapter?.mangaId
  })

  const { data: allChapters } = useQuery({
    queryKey: ['chapters', initialChapter?.mangaId],
    queryFn: () => apiClient.getChaptersByManga(initialChapter!.mangaId),
    enabled: !!initialChapter?.mangaId
  })

  const sortedChapters = useMemo(() => {
    if (!allChapters) return undefined
    return [...allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
  }, [allChapters])

  useEffect(() => {
    if (sortedChapters && sortedChapters.length) {
      clearTrackedChapters()
    }
  }, [sortedChapters, clearTrackedChapters])

  const currentMangaIdRef = useRef<number | null>(null)

  useEffect(() => {
    const currentMangaId = initialChapter?.mangaId ?? null
    if (currentMangaId == null) {
      return
    }

    if (currentMangaIdRef.current === currentMangaId) {
      return
    }

    const hadPrevious = currentMangaIdRef.current != null
    currentMangaIdRef.current = currentMangaId
    resetChapterEnvironment(hadPrevious ? null : manualNavigationLowerBoundRef.current)
  }, [initialChapter?.mangaId, resetChapterEnvironment])

  useEffect(() => {
    if (!initialChapter || !initialImages || !sortedChapters) return
    const index = sortedChapters.findIndex(ch => ch.id === initialChapter.id)
    if (index === -1) return
    commitChapterEntries(prev => {
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
    naturalScrollNavigationRef.current = false
    setActiveIndex(prev => {
      if (prev == null) {
        targetChapterIndexRef.current = index
        return index
      }
      return prev
    })
  }, [commitChapterEntries, initialChapter, initialImages, sortedChapters])

  useEffect(() => {
    if (!chapterEntries.length) return
    if (activeIndex == null) {
      const lowerBound = manualNavigationLowerBoundRef.current
      const firstEntry = lowerBound == null
        ? chapterEntries[0]
        : chapterEntries.find(entry => entry.index >= lowerBound)
      if (!firstEntry) return
      targetChapterIndexRef.current = firstEntry.index
      naturalScrollNavigationRef.current = false
      setActiveIndex(firstEntry.index)
    }
  }, [chapterEntries, activeIndex])

  const activeEntry = useMemo(() => {
    if (activeIndex != null) {
      const match = chapterEntries.find(entry => entry.index === activeIndex)
      if (match) return match
      if (manualNavigationLowerBoundRef.current != null) {
        return undefined
      }
    }
    return chapterEntries.length > 0 ? chapterEntries[0] : undefined
  }, [activeIndex, chapterEntries])

  const renderedChapterEntries = useMemo(() => {
    if (manualNavigationLowerBound == null) return chapterEntries
    return chapterEntries.filter(entry => entry.index >= manualNavigationLowerBound)
  }, [chapterEntries, manualNavigationLowerBound])

  const activeChapter = activeEntry?.chapter
  const activeImages = activeEntry?.images ?? []
  const activeChapterId = activeChapter?.id
  const activeChapterIndex = activeEntry?.index ?? (sortedChapters ? sortedChapters.findIndex(ch => ch.id === activeChapterId) : -1)
  const previousChapter = activeChapterIndex != null && activeChapterIndex > 0 ? sortedChapters?.[activeChapterIndex - 1] : undefined
  const nextChapter = activeChapterIndex != null && sortedChapters ? sortedChapters[activeChapterIndex + 1] : undefined
  const totalChapters = sortedChapters?.length ?? 0
  const currentChapterOrdinal = activeChapterIndex != null && activeChapterIndex >= 0 ? activeChapterIndex + 1 : 0

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
    const lowerBound = manualNavigationLowerBoundRef.current
    if (lowerBound != null && index < lowerBound) {
      return
    }
    const replacement = replaceChapterEntriesRef.current
    if (!replacement && chapterEntriesRef.current.some(entry => entry.index === index)) return
    if (loadingIndicesRef.current.has(index)) return

    const epochAtStart = loadEpochRef.current

    loadingIndicesRef.current.add(index)
    activeChapterLoadsRef.current += 1

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
      if (epochAtStart !== loadEpochRef.current) {
        return
      }
      const lowerBoundAtResolve = manualNavigationLowerBoundRef.current
      if (lowerBoundAtResolve != null && index < lowerBoundAtResolve) {
        if (replacement && replaceChapterEntriesRef.current === replacement) {
          replaceChapterEntriesRef.current = null
        }
        return
      }
      commitChapterEntries(prev => {
        const entry: ChapterEntry = { index, chapter: chapterData, images: imagesData }
        if (replacement && replacement.index === index) {
          replaceChapterEntriesRef.current = null
          return [entry]
        }
        if (prev.some(item => item.index === index)) {
          return prev.map(item => item.index === index ? entry : item)
        }
        const next = [...prev, entry].sort((a, b) => a.index - b.index)
        return next
      })
      if (direction === 'append') {
        setTransitionBridge(prev => (prev && prev.targetIndex === index ? { ...prev, targetReady: true } : prev))
      }
    } catch (error) {
      console.error('Failed to load chapter data', error)
      if (direction === 'append') {
        setTransitionBridge(prev => (prev && prev.targetIndex === index ? null : prev))
      }
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
      setTimeout(() => {
        activeChapterLoadsRef.current = Math.max(0, activeChapterLoadsRef.current - 1)
      }, direction === 'prepend' ? 1200 : 500)
    }
  }, [commitChapterEntries, setTransitionBridge, sortedChapters])

  const handleChapterVisibility = useCallback((index: number, isVisible: boolean) => {
    const set = visibleChapterIndexesRef.current
    if (isVisible) {
      set.add(index)
    } else {
      set.delete(index)
    }
    updateActiveFromVisibility()
  }, [updateActiveFromVisibility])

  const scheduleActiveRecalculation = useCallback(() => {
    if (typeof window === 'undefined') {
      updateActiveFromVisibility()
      return
    }
    if (scrollRecalcFrameRef.current != null) return
    scrollRecalcFrameRef.current = window.requestAnimationFrame(() => {
      scrollRecalcFrameRef.current = null
      updateActiveFromVisibility()
    })
  }, [updateActiveFromVisibility])

  const scrollChapterIntoView = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    if (typeof window === 'undefined') return false
    const node = chapterNodesRef.current.get(index)
    if (!node) return false
    const headerHeight = getVisibleHeaderHeight()
    const margin = headerHeight > 0 ? 16 : 12
    const targetTop = window.scrollY + node.getBoundingClientRect().top - (headerHeight + margin)
    const clampedTop = Math.max(0, targetTop)
    window.scrollTo({ top: clampedTop, behavior })
    return true
  }, [getVisibleHeaderHeight])

  const registerChapterNode = useCallback((index: number, node: HTMLDivElement | null) => {
    const map = chapterNodesRef.current
    const existing = map.get(index) ?? null
    if (node) {
      if (existing !== node) {
        map.set(index, node)
        setContentVersion(v => v + 1)
      }
    } else if (existing) {
      map.delete(index)
      setContentVersion(v => v + 1)
    }
  }, [])

  const handleChapterContentResize = useCallback((index: number) => {
    setContentVersion(v => v + 1)
    if (pendingScrollIndexRef.current === index) {
      pendingScrollAttemptsRef.current = 0
    }
  }, [])

  const isChapterAligned = useCallback((index: number) => {
    if (typeof window === 'undefined') return true
    const node = chapterNodesRef.current.get(index)
    if (!node) return false
    const headerHeight = getVisibleHeaderHeight()
    const margin = headerHeight > 0 ? 16 : 12
    const expectedTop = headerHeight + margin
    const currentTop = node.getBoundingClientRect().top
    return Math.abs(currentTop - expectedTop) <= 6
  }, [getVisibleHeaderHeight])

  useEffect(() => {
    if (contentVersion === 0) return
    const timer = window.setTimeout(() => {
      updateActiveFromVisibility()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [contentVersion, updateActiveFromVisibility])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => scheduleActiveRecalculation()
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
      if (scrollRecalcFrameRef.current != null) {
        window.cancelAnimationFrame(scrollRecalcFrameRef.current)
        scrollRecalcFrameRef.current = null
      }
    }
  }, [scheduleActiveRecalculation])

  useEffect(() => {
    const index = pendingScrollIndexRef.current
    if (index == null) return
    let cancelled = false
    let frameId: number | null = null
    const attempt = () => {
      if (cancelled) return
      const targetIndex = pendingScrollIndexRef.current
      if (targetIndex == null) return
      const behavior = pendingScrollAttemptsRef.current === 0 ? (pendingScrollBehaviorRef.current ?? 'auto') : 'auto'
      const scrolled = scrollChapterIntoView(targetIndex, behavior)
      if (!scrolled) {
        pendingScrollAttemptsRef.current += 1
        if (pendingScrollAttemptsRef.current > MAX_PENDING_SCROLL_ATTEMPTS) {
          pendingScrollIndexRef.current = null
        } else {
          frameId = requestAnimationFrame(attempt)
        }
        return
      }
      if (!isChapterAligned(targetIndex)) {
        pendingScrollAttemptsRef.current += 1
        if (pendingScrollAttemptsRef.current > MAX_PENDING_SCROLL_ATTEMPTS) {
          pendingScrollIndexRef.current = null
          return
        }
        frameId = requestAnimationFrame(() => {
          pendingScrollBehaviorRef.current = 'auto'
          attempt()
        })
        return
      }
      pendingScrollIndexRef.current = null
      pendingScrollAttemptsRef.current = 0
      manualNavigationLockRef.current = 0
      if (pendingActiveIndexRef.current === targetIndex) {
        pendingActiveIndexRef.current = null
      }
      updateActiveFromVisibility()
    }
    frameId = requestAnimationFrame(attempt)
    return () => {
      cancelled = true
      if (frameId != null) cancelAnimationFrame(frameId)
    }
  }, [chapterEntries, contentVersion, isChapterAligned, scrollChapterIntoView, updateActiveFromVisibility])

  useEffect(() => {
    if (activeIndex == null) return
    const entry = chapterEntriesRef.current.find(item => item.index === activeIndex)
    if (!entry) return
    const chapterDetail = entry.chapter
    const chapterIdNumeric = chapterDetail?.id
    if (!chapterIdNumeric) return

    if (!viewedChaptersRef.current.has(chapterIdNumeric)) {
      const previousMeta = activeIndex > 0 ? sortedChapters?.[activeIndex - 1] : undefined
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

    const shouldRestoreScroll = naturalScrollNavigationRef.current

    if (String(chapterIdNumeric) !== chapterId) {
      navigate(`/reader/${chapterIdNumeric}`, {
        replace: true,
        preventScrollReset: shouldRestoreScroll
      })
    }

    naturalScrollNavigationRef.current = false
  }, [activeIndex, chapterId, navigate, sortedChapters, trackChapterViewed])

  useEffect(() => {
    if (!transitionBridge) return
    const anchorExists = chapterEntries.some(entry => entry.index === transitionBridge.anchorIndex)
    if (!anchorExists) {
      setTransitionBridge(null)
    }
  }, [chapterEntries, setTransitionBridge, transitionBridge])

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
    if (chapterEntriesRef.current.some(entry => entry.index === target)) return

    const targetChapterMeta = sortedChapters[target]
    if (!targetChapterMeta) return

    setTransitionBridge(prev => {
      if (prev && prev.targetIndex === target && prev.anchorIndex === index) {
        return prev
      }
      return { anchorIndex: index, targetIndex: target, targetReady: false }
    })

    if (prefetchNextRef.current.has(target)) return
    prefetchNextRef.current.add(target)
    ensureChapterLoaded(target, 'append').finally(() => {
      prefetchNextRef.current.delete(target)
    })
  }, [ensureChapterLoaded, setTransitionBridge, sortedChapters])

  const handleNearTop = useCallback((index: number) => {
    if (!sortedChapters) return
    const lastDirection = lastScrollDirectionRef.current
    const lastDirectionAge = Date.now() - lastScrollDirectionAtRef.current
    if (lastDirection !== -1 || lastDirectionAge > SCROLL_DIRECTION_RESET_MS * 3) return
    const target = index - 1
    if (target < 0) return
    const lowerBound = manualNavigationLowerBoundRef.current
    if (lowerBound != null && target < lowerBound) return
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

    setTransitionBridge(null)

  manualNavigationLockRef.current = 0
  targetChapterIndexRef.current = target
  pendingActiveIndexRef.current = target
  pendingScrollIndexRef.current = target

  pendingScrollBehaviorRef.current = 'auto'
    pendingScrollAttemptsRef.current = 0

    naturalScrollNavigationRef.current = false
    setActiveIndex(prev => (prev === target ? prev : target))

  loadEpochRef.current += 1
  replaceChapterEntriesRef.current = { index: target }
  updateManualNavigationLowerBound(target)
    lastScrollDirectionRef.current = 0
    lastScrollDirectionAtRef.current = Date.now()
    prefetchPrevRef.current.clear()
    prefetchNextRef.current.clear()
    visibleChapterIndexesRef.current.clear()

    await ensureChapterLoaded(target, 'append')

    if (chapterEntriesRef.current.some(entry => entry.index === target)) {
      naturalScrollNavigationRef.current = false
      setActiveIndex(prev => prev === target ? prev : target)
    }

    const immediateScroll = scrollChapterIntoView(target, pendingScrollBehaviorRef.current)
    if (immediateScroll && isChapterAligned(target)) {
      pendingScrollIndexRef.current = null
      pendingScrollAttemptsRef.current = 0
      manualNavigationLockRef.current = Date.now() + 400
      if (pendingActiveIndexRef.current === target) {
        pendingActiveIndexRef.current = null
      }
      updateActiveFromVisibility()
    }

    const targetChapter = sortedChapters[target]
    if (targetChapter && String(targetChapter.id) !== chapterId) {
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: false })
    }
  }, [activeChapterIndex, chapterId, ensureChapterLoaded, isChapterAligned, navigate, scrollChapterIntoView, setTransitionBridge, sortedChapters, updateActiveFromVisibility, updateManualNavigationLowerBound])

  const navigateToPreviousChapter = useCallback(async () => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    const target = activeChapterIndex - 1
    if (target < 0) return
    const lowerBound = manualNavigationLowerBoundRef.current
    if (lowerBound != null && target < lowerBound) {
      return
    }
    if (lowerBound != null && !chapterEntriesRef.current.some(entry => entry.index === target)) {
      return
    }

    setTransitionBridge(null)

    manualNavigationLockRef.current = Date.now() + 900
    targetChapterIndexRef.current = target
    pendingActiveIndexRef.current = null
    pendingScrollIndexRef.current = null

    pendingActiveIndexRef.current = target
    pendingScrollIndexRef.current = target
    pendingScrollBehaviorRef.current = 'smooth'
    pendingScrollAttemptsRef.current = 0

    naturalScrollNavigationRef.current = false
    setActiveIndex(prev => (prev === target ? prev : target))

  loadEpochRef.current += 1
  replaceChapterEntriesRef.current = { index: target }
  updateManualNavigationLowerBound(target)
    lastScrollDirectionRef.current = 0
    lastScrollDirectionAtRef.current = Date.now()
    prefetchPrevRef.current.clear()
    prefetchNextRef.current.clear()
    visibleChapterIndexesRef.current.clear()

    await ensureChapterLoaded(target, 'prepend')

    if (chapterEntriesRef.current.some(entry => entry.index === target)) {
      naturalScrollNavigationRef.current = false
      setActiveIndex(prev => prev === target ? prev : target)
    }

    const immediateScroll = scrollChapterIntoView(target, pendingScrollBehaviorRef.current)
    if (immediateScroll && isChapterAligned(target)) {
      pendingScrollIndexRef.current = null
      pendingScrollAttemptsRef.current = 0
      manualNavigationLockRef.current = Date.now() + 400
      if (pendingActiveIndexRef.current === target) {
        pendingActiveIndexRef.current = null
      }
      updateActiveFromVisibility()
    }

    const targetChapter = sortedChapters[target]
    if (targetChapter && String(targetChapter.id) !== chapterId) {
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: false })
    }
  }, [activeChapterIndex, chapterId, ensureChapterLoaded, isChapterAligned, navigate, scrollChapterIntoView, setTransitionBridge, sortedChapters, updateActiveFromVisibility, updateManualNavigationLowerBound])

  useEffect(() => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    ensureChapterLoaded(activeChapterIndex + 1, 'append')
  }, [activeChapterIndex, ensureChapterLoaded, sortedChapters])

  const handleJumpToChapter = useCallback(async (targetId: number) => {
    if (!sortedChapters) return
    const targetIndex = sortedChapters.findIndex(ch => ch.id === targetId)
    if (targetIndex === -1) return

  resetChapterEnvironment(targetIndex)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    manualNavigationLockRef.current = Date.now() + 900
    targetChapterIndexRef.current = targetIndex
    pendingActiveIndexRef.current = targetIndex
    pendingScrollIndexRef.current = targetIndex
    pendingScrollBehaviorRef.current = 'auto'
    pendingScrollAttemptsRef.current = 0
    lastScrollDirectionRef.current = 0
    lastScrollDirectionAtRef.current = Date.now()

    naturalScrollNavigationRef.current = false
    setActiveIndex(targetIndex)
    activeIndexRef.current = targetIndex

    replaceChapterEntriesRef.current = { index: targetIndex }

  await ensureChapterLoaded(targetIndex, 'append')

    if (chapterEntriesRef.current.some(entry => entry.index === targetIndex)) {
      naturalScrollNavigationRef.current = false
      setActiveIndex(targetIndex)
      activeIndexRef.current = targetIndex
    }

    const immediateScroll = scrollChapterIntoView(targetIndex, pendingScrollBehaviorRef.current)
    if (immediateScroll && isChapterAligned(targetIndex)) {
      pendingScrollIndexRef.current = null
      pendingScrollAttemptsRef.current = 0
      manualNavigationLockRef.current = Date.now() + 400
      if (pendingActiveIndexRef.current === targetIndex) {
        pendingActiveIndexRef.current = null
      }
      updateActiveFromVisibility()
    }

    const targetChapter = sortedChapters[targetIndex]
    if (targetChapter && String(targetChapter.id) !== chapterId) {
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: false })
    }
    setShowChapterList(false)
  }, [chapterId, ensureChapterLoaded, isChapterAligned, navigate, resetChapterEnvironment, scrollChapterIntoView, sortedChapters, updateActiveFromVisibility])

  const handleChapterLike = useCallback(async () => {
    if (!activeChapter || !activeChapterId || (likedChapters[activeChapterId] ?? false) || (likingChapters[activeChapterId] ?? false)) return
    setLikingChapters(prev => ({ ...prev, [activeChapterId]: true }))
    try {
      const response = await apiClient.toggleChapterLike(activeChapterId)
      const liked = response?.liked ?? true
      setLikedChapters(prev => ({ ...prev, [activeChapterId]: liked }))
      commitChapterEntries(prev => prev.map(entry => entry.chapter.id === activeChapterId
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
  }, [activeChapter, activeChapterId, commitChapterEntries, likedChapters, likingChapters, queryClient])

  const triggerHeartBurst = (clientX: number, clientY: number) => {
    setGestureBursts(prev => [...prev, { id: Date.now() + Math.random(), x: clientX, y: clientY }])
    setTimeout(() => {
      setGestureBursts(prev => prev.slice(1))
    }, 1200)
  }

  const attemptLikeFromGesture = (clientX: number, clientY: number) => {
    const now = Date.now()
    if (now - likeGestureCooldownRef.current < 600) return
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

  const handleTapOrClick = (event: ReactMouseEvent | ReactTouchEvent) => {
    let clientX: number | null = null
    let clientY: number | null = null

    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else if ('changedTouches' in (event as any) && (event as any).changedTouches.length > 0) {
      clientX = (event as any).changedTouches[0].clientX
      clientY = (event as any).changedTouches[0].clientY
    } else if ('clientX' in event && 'clientY' in event) {
      clientX = (event as ReactMouseEvent).clientX
      clientY = (event as ReactMouseEvent).clientY
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

      initialShowUIRef.current = showUI
      setLastTap(now)

      if (pendingUiToggleRef.current) {
        clearTimeout(pendingUiToggleRef.current)
      }
      pendingUiToggleRef.current = setTimeout(() => {
        setShowUI((prev) => !prev)
        pendingUiToggleRef.current = null
      }, 260)
    }
  }

  const handleDoubleClickDesktop = (event: ReactMouseEvent) => {
    attemptLikeFromGesture(event.clientX, event.clientY)
  }

  const handleImageClick = useCallback((event: ReactMouseEvent | ReactTouchEvent) => {
    if (skipClickToggleRef.current) {
      skipClickToggleRef.current = false
      if (skipClickResetRef.current) {
        clearTimeout(skipClickResetRef.current)
        skipClickResetRef.current = null
      }
      return
    }
    if (pendingUiToggleRef.current) {
      return
    }
    setShowUI(v => !v)
  }, [])

  const handleTouchStartSwipe = (event: ReactTouchEvent) => {
    if (event.touches.length !== 1) return
    const t = event.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
    touchMovedRef.current = false
  }

  const handleTouchMoveSwipe = (event: ReactTouchEvent) => {
    if (!touchStartRef.current) return
    const t = event.touches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      touchMovedRef.current = true
      if (pendingUiToggleRef.current) {
        clearTimeout(pendingUiToggleRef.current)
        pendingUiToggleRef.current = null
      }
      if (pendingScrollIndexRef.current != null) {
        cancelPendingScroll()
      }
    }
  }

  const handleTouchEndSwipe = (event: ReactTouchEvent) => {
    if (!touchStartRef.current) return
    const start = touchStartRef.current
    const endTime = Date.now()
    const dt = endTime - start.time
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    const hadMovement = touchMovedRef.current
    touchStartRef.current = null
    touchMovedRef.current = false
    if (hadMovement) {
      setLastTap(0)
      if (pendingScrollIndexRef.current != null) {
        cancelPendingScroll()
      }
    }

    if (viewportWidth < 768) {
      return
    }

    if (!hadMovement) return
    const horizontalDistance = Math.abs(dx)
    const verticalDistance = Math.abs(dy)
    if (horizontalDistance < 120 || horizontalDistance < verticalDistance * 1.5) return
    if (dt > 700) return
    if (verticalDistance > 140) return
    if (dx < 0) {
      navigateToNextChapter()
    } else {
      navigateToPreviousChapter()
    }
  }

  useEffect(() => {
    let lastScrollY = window.scrollY
    let accumulated = 0
    let raf: number | null = null
    let hasUserInteracted = false
    const THRESHOLD = 36
    const SMALL_MOVEMENT_RESET = 4

    const applyVisibility = (value: boolean) => {
      setShowUI(prev => (value === prev ? prev : value))
    }

    const onScroll = () => {
      const current = window.scrollY
      const delta = current - lastScrollY
      if (!hasUserInteracted && Math.abs(delta) > 2) hasUserInteracted = true
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'h' || event.key === 'H') {
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'h' || event.key === 'H') {
        setShowUI(prev => !prev)
        event.preventDefault()
      }
      if (event.key === 'Escape') {
        navigate(-1)
        event.preventDefault()
      }
      if (event.key === 'ArrowRight' && nextChapter) {
        navigateToNextChapter()
        event.preventDefault()
      }
      if (event.key === 'ArrowLeft' && previousChapter) {
        navigateToPreviousChapter()
        event.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, navigateToNextChapter, navigateToPreviousChapter, nextChapter, previousChapter])

  const hasActiveEntryData = activeIndex != null
    ? chapterEntries.some(entry => entry.index === activeIndex)
    : false
  const hasRenderableActiveEntry = hasActiveEntryData && !!activeEntry
  const isBootstrapping = !hasRenderableActiveEntry
    && (chapterEntries.length === 0 || isInitialChapterLoading || isInitialImagesLoading || !sortedChapters)
  const isInitialLoading = isBootstrapping
  const isActiveChapterLiked = activeChapterId ? likedChapters[activeChapterId] ?? false : false
  const isActiveChapterLiking = activeChapterId ? likingChapters[activeChapterId] ?? false : false

  return {
    isInitialLoading,
    showUI,
    setShowUI,
    toggleUI: () => setShowUI(prev => !prev),
    isSettingsOpen,
    setIsSettingsOpen,
    imageWidth,
    setImageWidth,
    readingMode,
    setReadingMode,
    showChapterList,
    setShowChapterList,
    showSideComments,
    setShowSideComments,
    gestureBursts,
    finalTitle,
    titleContainerRef,
    currentChapterOrdinal,
    totalChapters,
    previousChapter,
    nextChapter,
    manga,
    allChapters,
    chapterEntries: renderedChapterEntries,
    sortedChapters,
    transitionBridge,
    activeChapter,
    activeImages,
    activeChapterId,
    activeChapterIndex,
    loadingForward,
    loadingBackward,
    handleNearBottom,
    handleNearTop,
    handleChapterCompleted,
    registerChapterNode,
    handleChapterContentResize,
    handleChapterVisibility,
    handleImageClick,
    handleTapOrClick,
    handleDoubleClickDesktop,
    handleTouchStartSwipe,
    handleTouchMoveSwipe,
    handleTouchEndSwipe,
    navigateToPreviousChapter,
    navigateToNextChapter,
    handleJumpToChapter,
    handleChapterLike,
    isActiveChapterLiked,
    isActiveChapterLiking,
    setFinalTitle,
    navigateBack: () => navigate(-1)
  }
}
