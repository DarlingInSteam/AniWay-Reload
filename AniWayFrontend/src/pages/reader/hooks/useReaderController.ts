import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { buildChapterTitleVariants, formatChapterTitle, getAdaptiveChapterTitle } from '@/lib/chapterUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useReadingProgress } from '@/hooks/useProgress'
import type { ChapterEntry } from '../types'

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
  const [contentVersion, setContentVersion] = useState(0)
  const [autoCompletedMap, setAutoCompletedMap] = useState<Record<number, boolean>>({})
  const [loadingForward, setLoadingForward] = useState(false)
  const [loadingBackward, setLoadingBackward] = useState(false)
  const [likedChapters, setLikedChapters] = useState<Record<number, boolean>>({})
  const [likingChapters, setLikingChapters] = useState<Record<number, boolean>>({})
  const visibleChapterIndexesRef = useRef<Set<number>>(new Set())
  const scrollRecalcFrameRef = useRef<number | null>(null)

  const getVisibleHeaderHeight = useCallback(() => {
    if (typeof window === 'undefined') return 0
    if (!showUI) return 0

    const topBar = document.querySelector<HTMLElement>('[data-reader-top-bar]')
    if (!topBar) return 0

    const rect = topBar.getBoundingClientRect()
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight
    if (!isVisible || rect.height <= 0) return 0

    const computed = window.getComputedStyle(topBar)
    const marginBottom = parseFloat(computed.marginBottom || '0')
    const safeMargin = Number.isFinite(marginBottom) ? marginBottom : 0

    return rect.height + safeMargin
  }, [showUI])

  const updateActiveFromVisibility = useCallback(() => {
    if (pendingScrollIndexRef.current != null) return
    const lockUntil = manualNavigationLockRef.current
    const now = Date.now()
    const lockActive = lockUntil > now
    const currentIndex = activeIndexRef.current
    const targetIndex = targetChapterIndexRef.current

    const candidates = visibleChapterIndexesRef.current.size > 0
      ? Array.from(visibleChapterIndexesRef.current)
      : Array.from(chapterNodesRef.current.keys())
    if (candidates.length === 0 && targetIndex == null) return

    const headerHeight = getVisibleHeaderHeight()
    const margin = headerHeight > 0 ? 16 : 12
    const baseline = headerHeight + margin

    let bestIndex: number | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    let forceTarget = false

    if (targetIndex != null) {
      const targetNode = chapterNodesRef.current.get(targetIndex)
      if (!targetNode) {
        return
      }
      const targetOffset = targetNode.getBoundingClientRect().top - baseline
      const targetDistance = Math.abs(targetOffset)
      bestIndex = targetIndex
      bestDistance = targetDistance
      if (targetDistance > 36) {
        forceTarget = true
      } else {
        targetChapterIndexRef.current = null
      }
    }

    const evaluateIndex = (idx: number) => {
      const node = chapterNodesRef.current.get(idx)
      if (!node) return
      const offset = node.getBoundingClientRect().top - baseline
      const distance = Math.abs(offset)
      if (distance + 0.25 < bestDistance || (Math.abs(distance - bestDistance) <= 0.25 && idx > (bestIndex ?? -Infinity))) {
        bestIndex = idx
        bestDistance = distance
      }
    }

    if (forceTarget) {
      if (bestIndex != null && bestIndex !== currentIndex) {
        setActiveIndex(bestIndex)
      }
      return
    }

    if (candidates.length) {
      const orderedCandidates = [...candidates].sort((a, b) => a - b)
      orderedCandidates.forEach(idx => evaluateIndex(idx))

      if (bestIndex == null && currentIndex != null) {
        evaluateIndex(currentIndex)
      }

      if (bestIndex != null && bestIndex !== currentIndex) {
        setActiveIndex(bestIndex)
        return
      }

      if (!lockActive && currentIndex != null) {
        const currentNode = chapterNodesRef.current.get(currentIndex)
        if (!currentNode) return
        const currentOffset = currentNode.getBoundingClientRect().top - baseline
        if (Math.abs(currentOffset) <= 32) return
        let fallbackIndex: number | null = null
        let fallbackDistance = Number.POSITIVE_INFINITY
        orderedCandidates.forEach(idx => {
          if (idx === currentIndex) return
          const node = chapterNodesRef.current.get(idx)
          if (!node) return
          const offset = node.getBoundingClientRect().top - baseline
          const distance = Math.abs(offset)
          if (distance < fallbackDistance - 0.25) {
            fallbackIndex = idx
            fallbackDistance = distance
          }
        })
        if (fallbackIndex != null) {
          setActiveIndex(fallbackIndex)
        }
      }
    } else if (bestIndex != null && bestIndex !== currentIndex) {
      setActiveIndex(bestIndex)
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
  }, [chapterEntries])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    const pendingIndex = pendingActiveIndexRef.current
    if (pendingIndex == null) return
    const hasEntry = chapterEntriesRef.current.some(entry => entry.index === pendingIndex)
    if (!hasEntry) return
    if (activeIndexRef.current !== pendingIndex) {
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

  useEffect(() => {
    setChapterEntries([])
    setActiveIndex(null)
    prefetchNextRef.current.clear()
    prefetchPrevRef.current.clear()
    loadingIndicesRef.current.clear()
    viewedChaptersRef.current.clear()
    completedChaptersRef.current.clear()
    pendingScrollIndexRef.current = null
    pendingActiveIndexRef.current = null
    pendingScrollBehaviorRef.current = 'smooth'
    setAutoCompletedMap({})
    visibleChapterIndexesRef.current.clear()
    targetChapterIndexRef.current = null
  }, [initialChapter?.mangaId])

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
    setActiveIndex(prev => {
      if (prev == null) {
        targetChapterIndexRef.current = index
        return index
      }
      return prev
    })
  }, [initialChapter, initialImages, sortedChapters])

  useEffect(() => {
    if (!chapterEntries.length) return
    if (activeIndex == null) {
      const firstIndex = chapterEntries[0].index
      targetChapterIndexRef.current = firstIndex
      setActiveIndex(firstIndex)
    }
  }, [chapterEntries, activeIndex])

  const activeEntry = useMemo(() => {
    if (activeIndex != null) {
      const match = chapterEntries.find(entry => entry.index === activeIndex)
      if (match) return match
    }
    return chapterEntries.length > 0 ? chapterEntries[0] : undefined
  }, [activeIndex, chapterEntries])

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
    if (chapterEntriesRef.current.some(entry => entry.index === index)) return
    if (loadingIndicesRef.current.has(index)) return

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
      setTimeout(() => {
        activeChapterLoadsRef.current = Math.max(0, activeChapterLoadsRef.current - 1)
      }, direction === 'prepend' ? 1200 : 500)
    }
  }, [sortedChapters])

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
        if (pendingScrollAttemptsRef.current > 120) {
          pendingScrollIndexRef.current = null
        } else {
          frameId = requestAnimationFrame(attempt)
        }
        return
      }
      if (!isChapterAligned(targetIndex)) {
        pendingScrollAttemptsRef.current += 1
        if (pendingScrollAttemptsRef.current > 120) {
          pendingScrollIndexRef.current = null
          return
        }
        frameId = requestAnimationFrame(attempt)
        return
      }
      pendingScrollIndexRef.current = null
      pendingScrollAttemptsRef.current = 0
      manualNavigationLockRef.current = Date.now() + 400
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
  }, [chapterEntries, contentVersion, isChapterAligned, scrollChapterIntoView, showUI, updateActiveFromVisibility])

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

    if (String(chapterIdNumeric) !== chapterId) {
      navigate(`/reader/${chapterIdNumeric}`, { replace: true, preventScrollReset: true })
    }
  }, [activeIndex, chapterId, navigate, sortedChapters, trackChapterViewed])

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

    manualNavigationLockRef.current = Date.now() + 900
    targetChapterIndexRef.current = target
    pendingActiveIndexRef.current = null
    pendingScrollIndexRef.current = null

    pendingActiveIndexRef.current = target
    pendingScrollIndexRef.current = target
    pendingScrollBehaviorRef.current = 'smooth'
    pendingScrollAttemptsRef.current = 0

    await ensureChapterLoaded(target, 'append')

    if (chapterEntriesRef.current.some(entry => entry.index === target)) {
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
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: true })
    }
  }, [activeChapterIndex, chapterId, ensureChapterLoaded, isChapterAligned, navigate, scrollChapterIntoView, sortedChapters, updateActiveFromVisibility])

  const navigateToPreviousChapter = useCallback(async () => {
    if (!sortedChapters) return
    if (activeChapterIndex == null || activeChapterIndex === -1) return
    const target = activeChapterIndex - 1
    if (target < 0) return

    manualNavigationLockRef.current = Date.now() + 900
    targetChapterIndexRef.current = target
    pendingActiveIndexRef.current = null
    pendingScrollIndexRef.current = null

    pendingActiveIndexRef.current = target
    pendingScrollIndexRef.current = target
    pendingScrollBehaviorRef.current = 'smooth'
    pendingScrollAttemptsRef.current = 0

    await ensureChapterLoaded(target, 'prepend')

    if (chapterEntriesRef.current.some(entry => entry.index === target)) {
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
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: true })
    }
  }, [activeChapterIndex, chapterId, ensureChapterLoaded, isChapterAligned, navigate, scrollChapterIntoView, sortedChapters, updateActiveFromVisibility])

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

    manualNavigationLockRef.current = Date.now() + 900
    targetChapterIndexRef.current = targetIndex
    pendingActiveIndexRef.current = targetIndex
    pendingScrollIndexRef.current = targetIndex
    pendingScrollBehaviorRef.current = 'auto'
    pendingScrollAttemptsRef.current = 0

    const direction: 'append' | 'prepend' = activeChapterIndex != null && targetIndex < activeChapterIndex ? 'prepend' : 'append'
    await ensureChapterLoaded(targetIndex, direction)

    if (chapterEntriesRef.current.some(entry => entry.index === targetIndex)) {
      setActiveIndex(targetIndex)
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
      navigate(`/reader/${targetChapter.id}`, { replace: true, preventScrollReset: true })
    }
    setShowChapterList(false)
  }, [activeChapterIndex, chapterId, ensureChapterLoaded, isChapterAligned, navigate, scrollChapterIntoView, sortedChapters, updateActiveFromVisibility])

  const handleChapterLike = useCallback(async () => {
    if (!activeChapter || !activeChapterId || (likedChapters[activeChapterId] ?? false) || (likingChapters[activeChapterId] ?? false)) return
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
  }, [activeChapter, activeChapterId, likedChapters, likingChapters, queryClient])

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

  const isInitialLoading = isInitialChapterLoading || isInitialImagesLoading || !sortedChapters || !activeEntry
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
  chapterEntries,
  sortedChapters,
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
