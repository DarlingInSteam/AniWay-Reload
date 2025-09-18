import React, { useState, useRef, useEffect } from 'react'
import { Bookmark, ChevronDown, X } from 'lucide-react'
import { MangaResponseDTO, BookmarkStatus } from '@/types'
import { getStatusColor, getStatusText, cn } from '@/lib/utils'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useAuth } from '@/contexts/AuthContext'

interface MangaTooltipProps {
  manga: MangaResponseDTO
  children: React.ReactNode
}

type TooltipSide = 'right' | 'left' | 'top' | 'bottom'

interface TooltipPosition {
  top: number
  left: number
  transform: string
  side: TooltipSide
}

export function MangaTooltip({ manga, children }: MangaTooltipProps) {
  if (!manga) {
    return <>{children}</>
  }

  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(false) // Монтируем раньше для расчёта позиции
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, transform: '', side: 'right' })
  const showTimeoutId = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutId = useRef<NodeJS.Timeout | null>(null)

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated } = useAuth()
  const { getMangaBookmark, changeStatus, addBookmark, removeBookmark } = useBookmarks()

  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const isInBookmarks = bookmarkInfo !== null

  // Статусы закладок
  const bookmarkStatuses: { value: BookmarkStatus; label: string; color: string }[] = [
    { value: 'READING', label: 'Читаю', color: 'bg-green-600' },
    { value: 'PLAN_TO_READ', label: 'Буду читать', color: 'bg-purple-600' },
    { value: 'COMPLETED', label: 'Прочитано', color: 'bg-blue-600' },
    { value: 'ON_HOLD', label: 'Отложено', color: 'bg-yellow-600' },
    { value: 'DROPPED', label: 'Брошено', color: 'bg-red-600' }
  ]

  // Функция для получения цвета возрастного ограничения
  const getAgeRatingColor = (ageLimit?: number) => {
    if (!ageLimit) return 'bg-gray-600 text-white'
    if (ageLimit <= 6) return 'bg-green-600 text-white'
    if (ageLimit <= 12) return 'bg-yellow-600 text-white'
    if (ageLimit <= 16) return 'bg-orange-600 text-white'
    return 'bg-red-600 text-white'
  }

  // Функция для форматирования возрастного ограничения
  const formatAgeRating = (ageLimit: number | null | undefined): string => {
    if (ageLimit === null || ageLimit === undefined) {
      return "Возрастное ограничение не указано";
    }
    return `${ageLimit}+`;
  };

  // Вычисление позиции tooltip
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8
    const gap = 10

    // Предпочитаем справа
    let side: TooltipSide = 'right'
    let top = triggerRect.top
    let left = triggerRect.right + gap

    const fitsRight = triggerRect.right + gap + tooltipRect.width <= vw - margin
    const fitsLeft = triggerRect.left - gap - tooltipRect.width >= margin
    const fitsBelow = triggerRect.bottom + gap + tooltipRect.height <= vh - margin
    const fitsAbove = triggerRect.top - gap - tooltipRect.height >= margin

    if (side === 'right' && !fitsRight) {
      if (fitsLeft) {
        side = 'left'
      } else if (fitsBelow) {
        side = 'bottom'
      } else if (fitsAbove) {
        side = 'top'
      } else {
        // Выберем сторону с наибольшим доступным пространством
        const spaceRight = vw - triggerRect.right
        const spaceLeft = triggerRect.left
        const spaceBottom = vh - triggerRect.bottom
        const spaceTop = triggerRect.top
        const maxSpace = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop)
        if (maxSpace === spaceLeft) side = 'left'
        else if (maxSpace === spaceBottom) side = 'bottom'
        else if (maxSpace === spaceTop) side = 'top'
        else side = 'right'
      }
    }

    switch (side) {
      case 'right':
        left = triggerRect.right + gap
        top = triggerRect.top + Math.min(0, vh - margin - (triggerRect.top + tooltipRect.height))
        break
      case 'left':
        left = triggerRect.left - tooltipRect.width - gap
        top = triggerRect.top + Math.min(0, vh - margin - (triggerRect.top + tooltipRect.height))
        break
      case 'bottom':
        top = triggerRect.bottom + gap
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
        break
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)
        break
    }

    // Горизонтальное ограничение для top/bottom
    if (side === 'top' || side === 'bottom') {
      if (left < margin) left = margin
      if (left + tooltipRect.width > vw - margin) left = vw - margin - tooltipRect.width
    }

    // Вертикальные ограничения
    if (top < margin) top = margin
    if (top + tooltipRect.height > vh - margin) top = vh - margin - tooltipRect.height

    setPosition({ top, left, transform: '', side })
  }

  // Обработчики событий мыши
  const handleMouseEnter = () => {
    if (hideTimeoutId.current) {
      clearTimeout(hideTimeoutId.current)
      hideTimeoutId.current = null
    }
    if (!isRendered) setIsRendered(true)
    if (!showTimeoutId.current) {
      showTimeoutId.current = setTimeout(() => {
        calculatePosition()
        setIsVisible(true)
        showTimeoutId.current = null
      }, 160)
    }
  }

  const handleMouseLeave = () => {
    if (showTimeoutId.current) {
      clearTimeout(showTimeoutId.current)
      showTimeoutId.current = null
    }
    hideTimeoutId.current = setTimeout(() => {
      setIsVisible(false)
      setShowDropdown(false)
    }, 160)
  }

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutId.current) {
      clearTimeout(hideTimeoutId.current)
      hideTimeoutId.current = null
    }
  }
  const handleTooltipMouseLeave = () => {
    hideTimeoutId.current = setTimeout(() => {
      setIsVisible(false)
      setShowDropdown(false)
    }, 160)
  }

  // Обработчик изменения статуса закладки
  const handleStatusChange = async (status: BookmarkStatus) => {
    if (!isAuthenticated) return

    try {
      if (isInBookmarks) {
        await changeStatus(manga.id, status)
      } else {
        await addBookmark(manga.id, status)
      }
      setShowDropdown(false)
    } catch (error) {
      console.error('Failed to update bookmark status:', error)
    }
  }

  // Обработчик удаления закладки
  const handleRemoveBookmark = async () => {
    if (!isAuthenticated || !isInBookmarks) return

    try {
      await removeBookmark(manga.id)
      setShowDropdown(false)
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    }
  }

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false)
        setShowDropdown(false)
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible])

  // Пересчет позиции при изменении видимости
  useEffect(() => {
    if (!isRendered) return
    calculatePosition()
  }, [isRendered])
  useEffect(() => {
    if (!isVisible) return
    const handleResize = () => calculatePosition()
    const handleHide = () => {
      setIsVisible(false)
      setShowDropdown(false)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleHide, { passive: true, capture: true })
    window.addEventListener('wheel', handleHide, { passive: true })
    window.addEventListener('touchmove', handleHide, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleHide, true as any)
      window.removeEventListener('wheel', handleHide)
      window.removeEventListener('touchmove', handleHide)
    }
  }, [isVisible])

  // Пересчёт позиции после загрузки изображений в карточке (если видим)
  useEffect(() => {
    if (!triggerRef.current) return
    const imgs = Array.from(triggerRef.current.querySelectorAll('img'))
    if (!imgs.length) return
    const onLoad = () => { if (isVisible) calculatePosition() }
    imgs.forEach(img => img.addEventListener('load', onLoad))
    return () => imgs.forEach(img => img.removeEventListener('load', onLoad))
  }, [isVisible])

  // Парсинг жанров
  const genres = manga.genre ? manga.genre.split(',').map(g => g.trim()).filter(Boolean) : []
  const visibleGenres = showAllGenres ? genres : genres.slice(0, 6)
  const hiddenGenresCount = Math.max(0, genres.length - 6)

  // Парсинг альтернативных названий
  const alternativeNames = manga.alternativeNames?.split(',').map(n => n.trim()).filter(Boolean) || []

  try {
    return (
      <>
        <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="w-full">
          {children}
        </div>
        {(isRendered) && (
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 9999,
              pointerEvents: isVisible ? 'auto' : 'none',
              opacity: isVisible ? 1 : 0,
              transform: (() => {
                const hiddenScale = '0.96'
                switch (position.side) {
                  case 'right':
                    return isVisible ? 'translateX(0) scale(1)' : 'translateX(6px) scale(' + hiddenScale + ')'
                  case 'left':
                    return isVisible ? 'translateX(0) scale(1)' : 'translateX(-6px) scale(' + hiddenScale + ')'
                  case 'bottom':
                    return isVisible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(' + hiddenScale + ')'
                  case 'top':
                    return isVisible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(' + hiddenScale + ')'
                }
              })(),
              transition: 'opacity 140ms ease, transform 140ms ease'
            }}
            className="hidden lg:block w-80 p-4 rounded-xl shadow-xl shadow-black/60 bg-black/80 backdrop-blur-md border border-white/15"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
          {/* Стрелочка динамическая */}
          {position.side === 'right' && (
            <div className="absolute top-4 -left-2">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-black/60"></div>
              <div className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-black/80"></div>
            </div>
          )}
          {position.side === 'left' && (
            <div className="absolute top-4 -right-2">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-black/60"></div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-black/80"></div>
            </div>
          )}
          {position.side === 'top' && (
            <div className="absolute -bottom-2 left-6">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black/60"></div>
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/80"></div>
            </div>
          )}
          {position.side === 'bottom' && (
            <div className="absolute -top-2 left-6">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-black/60"></div>
              <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black/80"></div>
            </div>
          )}

          {/* Заголовочная секция */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg text-white leading-tight mb-1">
              {manga.title}
            </h3>
            {alternativeNames.length > 0 && (
              <div className="text-sm text-gray-400 font-normal">
                {alternativeNames.slice(0, 2).join(', ')}
                {alternativeNames.length > 2 && ' ...'}
              </div>
            )}
          </div>

          {/* Мета-информация */}
          <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              getStatusColor(manga.status)
            )}>
              {getStatusText(manga.status)}
            </span>
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
              Переводится
            </span>
            <span className="text-gray-300">
              {new Date(manga.releaseDate).getFullYear()}
            </span>
            <span className="text-gray-300">
              {manga.totalChapters} гл.
            </span>
          </div>

          {/* Возрастное ограничение */}
          <div className="mb-3">
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-semibold',
              getAgeRatingColor(manga.ageLimit)
            )}>
              {formatAgeRating(manga.ageLimit)}
            </span>
          </div>

          {/* Жанры */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {visibleGenres.map((genre, index) => (
                <span
                  key={index}
                  className="bg-gray-700/80 text-gray-200 px-2 py-1 rounded-md text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  {genre}
                </span>
              ))}
              {hiddenGenresCount > 0 && !showAllGenres && (
                <span
                  onClick={() => setShowAllGenres(true)}
                  className="bg-gray-700/80 text-gray-200 px-2 py-1 rounded-md text-xs cursor-pointer hover:bg-gray-600 transition-colors"
                >
                  +{hiddenGenresCount} еще
                </span>
              )}
            </div>
          </div>

          {/* Описание */}
          <div className="mb-4">
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
              {manga.description || 'Описание недоступно'}
            </p>
          </div>

          {/* Секция действий */}
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between bg-gray-800/80 hover:bg-gray-700/80 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
              >
                <div className="flex items-center gap-2">
                  <Bookmark className={cn(
                    "h-4 w-4",
                    isInBookmarks ? "fill-current" : ""
                  )} />
                  <span>
                    {isInBookmarks && bookmarkInfo
                      ? bookmarkStatuses.find(s => s.value === bookmarkInfo.status)?.label || 'В закладках'
                      : 'Добавить в закладки'
                    }
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showDropdown && "rotate-180"
                )} />
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800/95 border border-gray-700/50 rounded-lg shadow-lg z-50 py-1"
                >
                  {bookmarkStatuses.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-gray-700/50 transition-colors flex items-center gap-2",
                        isInBookmarks && bookmarkInfo?.status === status.value
                          ? "bg-gray-700/50 text-white"
                          : "text-gray-300"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", status.color)} />
                      {status.label}
                    </button>
                  ))}

                  {isInBookmarks && (
                    <>
                      <hr className="border-gray-700/50 my-1" />
                      <button
                        onClick={handleRemoveBookmark}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                      >
                        <X className="h-3 w-3" />
                        Удалить из закладок
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </>
    )
  } catch (error) {
    console.error('MangaTooltip error:', error, 'for manga:', manga?.id);
    return <>{children}</>;
  }
}
