import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { MangaResponseDTO, BookmarkStatus } from '@/types'
import { getTypeText, cn } from '@/lib/utils'
import { useRating } from '@/hooks/useRating'
import { useAuth } from '@/contexts/AuthContext'
import { useBookmarks } from '@/hooks/useBookmarks'

const BOOKMARK_BADGE_STYLES: Record<BookmarkStatus, { label: string; className: string }> = {
  READING: {
    label: 'Читаю',
    className: 'bg-emerald-500/90 text-white border border-emerald-300/40'
  },
  PLAN_TO_READ: {
    label: 'Буду читать',
    className: 'bg-violet-500/90 text-white border border-violet-300/40'
  },
  COMPLETED: {
    label: 'Прочитано',
    className: 'bg-sky-500/90 text-white border border-sky-300/40'
  },
  ON_HOLD: {
    label: 'Отложено',
    className: 'bg-amber-400/95 text-gray-900 border border-amber-200/60'
  },
  DROPPED: {
    label: 'Брошено',
    className: 'bg-rose-500/90 text-white border border-rose-300/40'
  }
}

const DEFAULT_BOOKMARK_BADGE = {
  label: 'В закладках',
  className: 'bg-slate-600/90 text-white border border-slate-400/30'
}

const overlayBadgeBase = 'inline-flex items-center gap-1 rounded-full px-2 text-[10px] font-medium leading-none shadow-sm backdrop-blur-md min-h-[22px]'

interface MangaCardProps {
  manga: MangaResponseDTO
  size?: 'default' | 'compact' | 'large'
  showMetadata?: boolean
}

export function MangaCard({ manga, size = 'default', showMetadata = true }: MangaCardProps) {
  // Временное логирование для диагностики
  // Debug logs removed
  const { rating } = useRating(manga.id)
  const { isAuthenticated } = useAuth()
  const { getMangaBookmark } = useBookmarks()
  
  // Удалено массовое инвалидирование кэша на монтировании, чтобы не вызывать шторм запросов.
  // Если потребуется обновление конкретной манги после мутаций, делать invalidate в месте мутации.
  
  // Проверяем корректность данных манги
  if (!manga || !manga.id) {
    console.warn('MangaCard: Invalid manga data:', manga)
    return null
  }
  
  // Удаляем ненужную инвалидацию кэша - она вызывает проблемы с фильтрами
  // Кэш должен инвалидироваться только при реальных изменениях данных
  
  // Адаптивные размеры для разных экранов
  const cardSizes = {
    compact: 'aspect-[3/4]', // Убираем фиксированные размеры
    default: 'aspect-[3/4]',
    large: 'aspect-[3/4]'
  }


  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Если изображение уже в кеше браузера и полностью загружено, снимаем блюр сразу
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true)
    }
  }, [manga.coverImageUrl])

  const typeLabel = getTypeText(manga.type)
  const releaseYear = (() => {
    if (!manga.releaseDate) return undefined
    const date = new Date(manga.releaseDate)
    return Number.isNaN(date.getTime()) ? undefined : date.getFullYear()
  })()

  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const bookmarkBadge = bookmarkInfo
    ? BOOKMARK_BADGE_STYLES[bookmarkInfo.status as BookmarkStatus] ?? DEFAULT_BOOKMARK_BADGE
    : null

  return (
    <div className="group flex flex-col space-y-2 md:space-y-3 w-full transition-transform duration-300 will-change-transform hover:md:-translate-y-1 hover:lg:-translate-y-1 motion-reduce:transform-none">
      {/* Cover Image Card */}
      <Link
        to={`/manga/${manga.id}`}
        className="manga-card block relative overflow-hidden rounded-lg md:rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-sm shadow-black/0 group-hover:shadow-black/40 group-hover:border-primary/40 transition-all duration-300"
      >
        <div className={cn('relative overflow-hidden', cardSizes[size])}>
          <img
            ref={imgRef}
            src={manga.coverImageUrl}
            alt={manga.title}
            width={480}
            height={640}
            className={cn(
              'manga-cover h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out transform-gpu will-change-transform image-rendering-crisp',
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]',
              'group-hover:scale-[1.04] motion-reduce:transform-none'
            )}
            loading="lazy"
            decoding="async"
            style={{ imageRendering: 'crisp-edges' }}
            sizes="(max-width: 480px) 45vw, (max-width: 768px) 25vw, (max-width: 1280px) 18vw, 180px"
            srcSet={[
              `${manga.coverImageUrl}?w=180 180w`,
              `${manga.coverImageUrl}?w=240 240w`,
              `${manga.coverImageUrl}?w=320 320w`,
              `${manga.coverImageUrl}?w=480 480w`,
              `${manga.coverImageUrl}?w=640 640w`,
              `${manga.coverImageUrl}?w=720 720w`,
              `${manga.coverImageUrl}?w=960 960w`
            ].join(', ')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-manga.jpg'
              setImageLoaded(true)
            }}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-white/5 animate-pulse" aria-hidden />
          )}

          <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 flex items-center">
            <div className={cn(overlayBadgeBase, 'bg-black/70 text-white/90 border border-white/10')}>
              <Star className="h-3 w-3 text-accent fill-current" />
              <span className="font-semibold">
                {rating?.averageRating ? rating.averageRating.toFixed(1) : '—'}
              </span>
            </div>
          </div>

          {bookmarkBadge && (
            <div className="absolute top-2 right-2 md:top-2.5 md:right-2.5 flex items-center">
              <span
                className={cn(
                  overlayBadgeBase,
                  bookmarkBadge.className
                )}
              >
                {bookmarkBadge.label}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </Link>

      {/* Metadata */}
      {showMetadata && (
        <div className="flex flex-col gap-1.5 px-1 pb-1 select-none antialiased">
          <Link
            to={`/manga/${manga.id}`}
            className="block"
          >
            <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 hover:text-primary transition-colors duration-200 leading-tight tracking-tight antialiased" style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
              {manga.title}
            </h3>
          </Link>
          <div className="text-[11px] md:text-xs text-white/70 antialiased" style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
            {typeLabel || 'Неизвестный тип'}
            {releaseYear ? <span className="ml-2 text-white/45">{releaseYear}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}
