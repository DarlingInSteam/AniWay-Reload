import { useState, useEffect, useRef, type CSSProperties, type ReactNode, type MouseEvent, type TouchEvent } from 'react'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatChapterTitle } from '@/lib/chapterUtils'
import { ChapterTransitionPreview } from './ChapterTransitionPreview'
import type { ChapterEntry } from '../types'

interface ChapterImageListProps {
  images: any[]
  imageWidth: 'fit' | 'full' | 'wide'
  showUI: boolean
  previousChapter?: any
  handleImageClick: (event: MouseEvent | TouchEvent) => void
  handleTapOrClick: (event: MouseEvent | TouchEvent) => void
  handleDoubleClickDesktop: (event: MouseEvent) => void
  handleTouchStartSwipe: (event: TouchEvent) => void
  handleTouchMoveSwipe: (event: TouchEvent) => void
  handleTouchEndSwipe: (event: TouchEvent) => void
}

const ChapterImageList = ({
  images,
  imageWidth,
  showUI,
  previousChapter,
  handleImageClick,
  handleTapOrClick,
  handleDoubleClickDesktop,
  handleTouchStartSwipe,
  handleTouchMoveSwipe,
  handleTouchEndSwipe
}: ChapterImageListProps) => {
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

  return (
    <div className={cn('mx-auto px-2 sm:px-4 overflow-x-hidden', getWidthClass())}>
      {images.map((image: any, index: number) => {
        const isVisible = visibleIndexes.has(index)
        const recordedSize = intrinsicSizes[index]
        const naturalWidth = (image?.width ?? 0) > 0 ? image.width : recordedSize?.width
        const naturalHeight = (image?.height ?? 0) > 0 ? image.height : recordedSize?.height
        const imageStyle: CSSProperties = naturalWidth
          ? { width: '100%', maxWidth: `${naturalWidth}px` }
          : { width: '100%' }
        if (naturalWidth && naturalHeight && !imageStyle.aspectRatio) {
          ;(imageStyle as CSSProperties).aspectRatio = `${naturalWidth} / ${naturalHeight}`
        }
        const renderOverlay = (): ReactNode => {
          if (!(index === 0 && showUI && isVisible)) return null
          return (
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
          )
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
                  'block h-auto transition-all duration-200 will-change-transform',
                  imageWidth === 'fit' && 'max-w-4xl',
                  imageWidth === 'full' && 'max-w-none w-full sm:w-screen px-0',
                  imageWidth === 'wide' && 'max-w-6xl'
                )}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : index < 3 ? 'auto' : 'low'}
                style={imageStyle}
                onError={(event) => {
                  const target = event.target as HTMLImageElement
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
                onClick={event => handleImageClick(event)}
                onDoubleClick={handleDoubleClickDesktop}
                onTouchStart={(event) => { handleTouchStartSwipe(event); handleTapOrClick(event) }}
                onTouchMove={handleTouchMoveSwipe}
                onTouchEnd={handleTouchEndSwipe}
              />
            ) : (
              <div
                className={cn(
                  'w-full animate-pulse bg-white/5 rounded-lg',
                  imageWidth === 'fit' && 'max-w-4xl h-[60vh]',
                  imageWidth === 'full' && 'max-w-none w-full sm:w-screen h-[65vh]',
                  imageWidth === 'wide' && 'max-w-6xl h-[60vh]'
                )}
              />
            )}
            <div className={cn(
              'absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 border border-white/20',
              showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            )}>
              {image.pageNumber} / {images.length}
            </div>
            {renderOverlay()}
          </div>
        )
      })}
    </div>
  )
}

export interface ChapterBlockProps {
  entry: ChapterEntry
  imageWidth: 'fit' | 'full' | 'wide'
  showUI: boolean
  previousChapter?: any
  handleImageClick: (event: React.MouseEvent | React.TouchEvent) => void
  handleTapOrClick: (event: React.MouseEvent | React.TouchEvent) => void
  handleDoubleClickDesktop: (event: React.MouseEvent) => void
  handleTouchStartSwipe: (event: React.TouchEvent) => void
  handleTouchMoveSwipe: (event: React.TouchEvent) => void
  handleTouchEndSwipe: (event: React.TouchEvent) => void
  onNearBottom: () => void
  onNearTop: () => void
  onCompleted: () => void
  registerNode: (index: number, node: HTMLDivElement | null) => void
  onContentResize: (index: number) => void
  isActive: boolean
  showTransitionPreview?: boolean
  onShowAllComments?: () => void
  onVisibilityChange: (index: number, isVisible: boolean) => void
}

export const ChapterBlock = ({
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
  onNearBottom,
  onNearTop,
  onCompleted,
  registerNode,
  onContentResize,
  isActive,
  onVisibilityChange,
  showTransitionPreview,
  onShowAllComments
}: ChapterBlockProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const completionSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    registerNode(entry.index, containerRef.current)
    return () => registerNode(entry.index, null)
  }, [entry.index, registerNode])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    if (typeof window === 'undefined') return
    let didCancel = false
    const observer = new IntersectionObserver((entries) => {
      if (didCancel) return
      entries.forEach(item => {
        if (item.target === node) {
          onVisibilityChange(entry.index, item.isIntersecting)
        }
      })
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.95], rootMargin: '0px 0px 0px 0px' })
    observer.observe(node)
    const immediateCheck = () => {
      if (didCancel) return
      const rect = node.getBoundingClientRect()
      const isVisible = rect.bottom > 0 && rect.top < window.innerHeight
      onVisibilityChange(entry.index, isVisible)
    }
    immediateCheck()
    return () => {
      didCancel = true
      observer.disconnect()
      onVisibilityChange(entry.index, false)
    }
  }, [entry.index, onVisibilityChange])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      onContentResize(entry.index)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [entry.index, onContentResize])

  useEffect(() => {
    const node = topSentinelRef.current
    if (!node) return
    if (!onNearTop) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(item => {
        if (item.isIntersecting) onNearTop()
      })
    }, { rootMargin: '300px 0px 0px 0px', threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onNearTop])

  useEffect(() => {
    const node = bottomSentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(item => {
        if (item.isIntersecting) onNearBottom()
      })
    }, { rootMargin: '0px 0px 600px 0px', threshold: 0 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [onNearBottom])

  useEffect(() => {
    const node = completionSentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(item => {
        if (item.isIntersecting) onCompleted()
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
        <div className="relative px-4 sm:px-6">
          {entry.index === 0 ? (
            <div className="py-6" />
          ) : (
            <div className="py-8">
              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-white/10" />
                <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-black/80 backdrop-blur-sm text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  <span className="hidden sm:inline text-white/50">Глава</span>
                  <span>{formatChapterTitle(entry.chapter)}</span>
                </div>
                <span className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}
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
      />
      <div ref={completionSentinelRef} aria-hidden className="h-1 w-full" />
      <div ref={bottomSentinelRef} aria-hidden className="w-full">
        {showTransitionPreview && entry.chapter ? (
          <ChapterTransitionPreview
            chapterId={entry.chapter.id}
            chapterNumber={entry.chapter.chapterNumber}
            onShowAll={() => onShowAllComments?.()}
          />
        ) : (
          <div className="h-64" />
        )}
      </div>
    </section>
  )
}
