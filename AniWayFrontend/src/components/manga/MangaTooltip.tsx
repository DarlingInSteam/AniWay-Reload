import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bookmark, ChevronDown, X } from 'lucide-react'
import { MangaResponseDTO, BookmarkStatus } from '@/types'
import { getStatusText, cn } from '@/lib/utils'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useAuth } from '@/contexts/AuthContext'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

interface MangaTooltipProps {
  manga: MangaResponseDTO
  children: React.ReactNode
}

type TooltipSide = 'right' | 'left'

interface TooltipPosition {
  top: number
  left: number
  transform: string
  side: TooltipSide
  arrowX?: number
  arrowY?: number
}

type ChipItem = { label: string; type: 'genre' | 'tag' | 'age'; value?: number }

export function MangaTooltip({ manga, children }: MangaTooltipProps) {
  if (!manga) {
    return <>{children}</>
  }

  const [isVisible, setIsVisible] = useState(false)
  const [isRendered, setIsRendered] = useState(false) // Монтируем раньше для расчёта позиции
  const [showDropdown, setShowDropdown] = useState(false)
  const [chipsExpanded, setChipsExpanded] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, transform: '', side: 'right', arrowX: 0, arrowY: 0 })
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const showTimeoutId = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutId = useRef<NodeJS.Timeout | null>(null)

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chipsContainerRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { getMangaBookmark, changeStatus, addBookmark, removeBookmark } = useBookmarks()

  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const isInBookmarks = bookmarkInfo !== null
  const plainDescription = useMemo(() => (manga.description || '').trim(), [manga.description])
  const hasLongDescription = plainDescription.length > 360

  const releaseYear = useMemo(() => {
    if (!manga.releaseDate) return undefined
    const date = new Date(manga.releaseDate)
    return Number.isNaN(date.getTime()) ? undefined : date.getFullYear()
  }, [manga.releaseDate])

  const totalChapters = manga.totalChapters || manga.chapterCount || 0

  const translationLabel = useMemo(() => {
    if (manga.isLicensed === true) return 'Официальный'
    if (manga.isLicensed === false) return 'Любительский'
    return 'Не указан'
  }, [manga.isLicensed])

  const infoRows = useMemo(() => ([
    {
      label: 'Статус',
      value: getStatusText(manga.status),
      query: manga.status ? `status=${encodeURIComponent(manga.status)}` : undefined
    },
    {
      label: 'Перевод',
      value: translationLabel,
      query: manga.isLicensed !== undefined ? `licensed=${manga.isLicensed}` : undefined
    },
    {
      label: 'Выпуск',
      value: releaseYear ? `${releaseYear} г.` : 'Не указан',
      query: releaseYear ? `year=${releaseYear}` : undefined
    },
    {
      label: 'Глав',
      value: totalChapters > 0 ? totalChapters.toString() : '—'
    }
  ]), [manga.status, translationLabel, manga.isLicensed, releaseYear, totalChapters])


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
    if (ageLimit === undefined || ageLimit === null) return 'bg-gray-600 text-white'
    if (ageLimit <= 6) return 'bg-green-600 text-white'
    if (ageLimit <= 12) return 'bg-yellow-600 text-white'
    if (ageLimit <= 16) return 'bg-orange-600 text-white'
    return 'bg-red-600 text-white'
  }

  // Функция для форматирования возрастного ограничения
  const formatAgeRating = (ageLimit: number | null | undefined): string => {
    if (ageLimit === null || ageLimit === undefined) {
      return '—'
    }
    return `${ageLimit}+`
  };

  // Вычисление позиции tooltip
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return
  // Используем внутреннюю карточку, а не обёртку w-full
  const cardEl = triggerRef.current.querySelector('.manga-card') as HTMLElement | null
  const triggerRect = (cardEl || triggerRef.current).getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
  const margin = 8
  // Базовый визуальный gap сокращаем чтобы стрелка "врезалась" ближе
  const gap = 6

    // Предпочитаем справа
    let side: TooltipSide = 'right'
    let top = triggerRect.top
    let left = triggerRect.right + gap

    const fitsRight = triggerRect.right + gap + tooltipRect.width <= vw - margin
    const fitsLeft = triggerRect.left - gap - tooltipRect.width >= margin
    if (!fitsRight && fitsLeft) side = 'left'

    if (side === 'right') {
      left = triggerRect.right + gap
      top = triggerRect.top
    } else {
      left = triggerRect.left - tooltipRect.width - gap
      top = triggerRect.top
    }

    // Горизонтальное ограничение для top/bottom
    // (top/bottom больше не используются)

    // Вертикальные ограничения
    if (top < margin) top = margin
    if (top + tooltipRect.height > vh - margin) top = vh - margin - tooltipRect.height

    // Вычисление координат стрелки внутри tooltip (для right/left — по вертикали, top/bottom — по горизонтали)
    let arrowY = 0
    let arrowX = 0
    if (side === 'right' || side === 'left') {
      // Центр стрелки по середине высоты карточки
      arrowY = (triggerRect.top + triggerRect.height / 2) - top
      if (arrowY < 16) arrowY = 16
      if (arrowY > tooltipRect.height - 16) arrowY = tooltipRect.height - 16
    } else {
      arrowX = triggerRect.left - left + triggerRect.width / 2
      if (arrowX < 16) arrowX = 16
      if (arrowX > tooltipRect.width - 16) arrowX = tooltipRect.width - 16
    }

    setPosition({ top, left, transform: '', side, arrowX, arrowY })
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
      setIsDescriptionExpanded(false)
      setChipsExpanded(false)
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
      setIsDescriptionExpanded(false)
      setChipsExpanded(false)
    }, 160)
  }

  const handleChipClick = (chip: ChipItem) => {
    if (chip.type === 'age') return
    setIsVisible(false)
    setShowDropdown(false)
    setChipsExpanded(false)
    const queryKey = chip.type === 'genre' ? 'genres' : 'tags'
    navigate(`/catalog?${queryKey}=${encodeURIComponent(chip.label)}`)
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
        setIsDescriptionExpanded(false)
        setChipsExpanded(false)
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
      setIsDescriptionExpanded(false)
      setChipsExpanded(false)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleHide, { passive: true, capture: true })
    window.addEventListener('wheel', handleHide, { passive: true })
    window.addEventListener('touchmove', handleHide, { passive: true })
    // Повторно скорректируем позицию после первого кадра отображения (для точного tooltipRect)
    const id = requestAnimationFrame(() => calculatePosition())
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleHide, true as any)
      window.removeEventListener('wheel', handleHide)
      window.removeEventListener('touchmove', handleHide)
      cancelAnimationFrame(id)
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

  // Парсинг жанров и тегов
  const genres = useMemo(() => (
    manga.genre ? manga.genre.split(',').map(g => g.trim()).filter(Boolean) : []
  ), [manga.genre])

  const tags = useMemo(() => (
    manga.tags ? manga.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  ), [manga.tags])

  const chips = useMemo<ChipItem[]>(() => {
    const seen = new Set<string>()
    const list: ChipItem[] = []

    if (manga.ageLimit !== null && manga.ageLimit !== undefined) {
      list.push({ label: formatAgeRating(manga.ageLimit), type: 'age', value: manga.ageLimit })
    }

    const addChip = (label: string, type: 'genre' | 'tag') => {
      const normalized = label.toLowerCase()
      if (seen.has(normalized)) return
      seen.add(normalized)
      list.push({ label, type })
    }

    genres.forEach(label => addChip(label, 'genre'))
    tags.forEach(label => addChip(label, 'tag'))
    return list
  }, [genres, tags, manga.ageLimit])

  const MAX_COLLAPSED_CHIPS = 10
  const extraChipsCount = Math.max(0, chips.length - MAX_COLLAPSED_CHIPS)
  const hasMoreChips = extraChipsCount > 0
  const visibleChips = chipsExpanded || !hasMoreChips ? chips : chips.slice(0, MAX_COLLAPSED_CHIPS)
  const hiddenChipsCount = hasMoreChips && !chipsExpanded ? extraChipsCount : 0
  // Альтернативные названия больше не отображаем

  try {
    return (
      <>
        <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="w-full">
          {children}
        </div>
        {(isRendered) && createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 999999,
              pointerEvents: isVisible ? 'auto' : 'none',
              opacity: isVisible ? 1 : 0,
              transform: (() => {
                const hiddenScale = '0.96'
                if (position.side === 'right') {
                  return isVisible ? 'translateX(0) scale(1)' : 'translateX(6px) scale(' + hiddenScale + ')'
                }
                return isVisible ? 'translateX(0) scale(1)' : 'translateX(-6px) scale(' + hiddenScale + ')'
              })(),
              transition: 'opacity 140ms ease, transform 140ms ease'
            }}
            className="hidden lg:block w-[380px] p-6 rounded-2xl shadow-2xl shadow-black/70 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/98 backdrop-blur-xl border border-white/12"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
          {/* Стрелочка динамическая */}
          {position.side === 'right' && (
            <div className="absolute -left-2" style={{ top: position.arrowY }}>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-black/60"></div>
              <div className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-black/80"></div>
            </div>
          )}
          {position.side === 'left' && (
            <div className="absolute -right-2" style={{ top: position.arrowY }}>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-black/60"></div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-black/80"></div>
            </div>
          )}

          {/* Заголовочная секция */}
          <div className="mb-5 space-y-1.5">
            <h3 className="font-semibold text-lg text-white leading-tight">
              {manga.title}
            </h3>
            {manga.engName && (
              <div className="text-sm text-white/65">
                {manga.engName}
              </div>
            )}
          </div>

          {/* Мета-информация */}
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {infoRows.map(row => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => {
                    if (!row.query) return
                    setIsVisible(false)
                    navigate(`/catalog?${row.query}`)
                  }}
                  disabled={!row.query}
                  className={cn(
                    'flex flex-col items-start gap-1.5 text-left transition-colors rounded-xl px-4 py-3 border border-white/8 bg-white/[0.05]',
                    row.query
                      ? 'hover:border-primary/50 hover:bg-primary/15 focus:outline-none focus-visible:border-primary/60 focus-visible:bg-primary/20'
                      : 'cursor-default opacity-90'
                  )}
                >
                  <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">{row.label}</span>
                  <span className="text-sm font-semibold text-white/95">{row.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Жанры и теги */}
          {chips.length > 0 && (
            <div className="mb-5">
              <div
                ref={chipsContainerRef}
                className="flex flex-wrap gap-1.5 overflow-hidden"
                style={{ maxHeight: chipsExpanded ? 'none' : '52px' }}
              >
                {visibleChips.map(chip => (
                  chip.type === 'age' ? (
                    <span
                      key={`age-${chip.label}`}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm',
                        getAgeRatingColor(chip.value)
                      )}
                    >
                      {chip.label}
                    </span>
                  ) : (
                    <button
                      key={`${chip.type}-${chip.label}`}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-white/12 text-white/80 hover:bg-primary/25 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      {chip.label}
                    </button>
                  )
                ))}
              </div>
              {hasMoreChips && (
                <button
                  type="button"
                  onClick={() => setChipsExpanded(prev => !prev)}
                  className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
                >
                  {chipsExpanded ? 'Скрыть' : `Показать ещё (${extraChipsCount})`}
                </button>
              )}
            </div>
          )}

          {/* Описание */}
          <div className="mb-4">
            <div
              className={cn(
                'relative overflow-hidden text-sm text-gray-300 leading-relaxed markdown-body transition-[max-height] duration-300 ease-out',
                isDescriptionExpanded ? 'max-h-[420px]' : 'max-h-24'
              )}
              style={!isDescriptionExpanded && hasLongDescription ? {
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)'
              } : undefined}
            >
              <MarkdownRenderer value={plainDescription || 'Описание недоступно'} />
            </div>
            {hasLongDescription && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(prev => !prev)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
              >
                {isDescriptionExpanded ? 'Свернуть' : 'Подробнее…'}
              </button>
            )}
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
                      : 'Добавить в планы'
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
          </div>, document.body)
        }
      </>
    )
  } catch (error) {
    console.error('MangaTooltip error:', error, 'for manga:', manga?.id);
    return <>{children}</>;
  }
}
