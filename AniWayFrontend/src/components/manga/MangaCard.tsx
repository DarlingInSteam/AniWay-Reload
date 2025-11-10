import React, { useState, useEffect, useRef, useMemo } from 'react'
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

/**
 * Оптимизированная карточка манги с мемоизацией.
 * Избегает лишних re-renders при скролле каталога.
 */
const MangaCardComponent = ({ manga, size = 'default', showMetadata = true }: MangaCardProps) => {
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
  const releaseYear = useMemo(() => {
    if (!manga.releaseDate) return undefined
    const date = new Date(manga.releaseDate)
    return Number.isNaN(date.getTime()) ? undefined : date.getFullYear()
  }, [manga.releaseDate])

  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const bookmarkBadge = useMemo(() => {
    if (!bookmarkInfo) return null
    return BOOKMARK_BADGE_STYLES[bookmarkInfo.status as BookmarkStatus] ?? DEFAULT_BOOKMARK_BADGE
  }, [bookmarkInfo])

  return (
    <div className="group flex flex-col space-y-1.5 md:space-y-2.5 w-full transition-transform duration-300 will-change-transform hover:md:-translate-y-1 hover:lg:-translate-y-1 motion-reduce:transform-none">
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
              // Уменьшаем scale для оптимизации и отключаем hover на touch-устройствах
              'group-hover:scale-[1.02] [@media(hover:none)]:group-hover:scale-100 motion-reduce:transform-none'
            )}
            loading="lazy"
            decoding="async"
            style={{ imageRendering: 'crisp-edges' }}
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, (max-width: 1536px) 15vw, 12vw"
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

          <div className="absolute inset-x-2 top-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between md:inset-x-2.5 md:top-2.5 pointer-events-none">
            <div className="flex items-center pointer-events-auto">
              <div className={cn(overlayBadgeBase, 'bg-black/70 text-white/90 border border-white/10')}>
                <Star className="h-3 w-3 text-accent fill-current" />
                <span className="font-semibold">
                  {rating?.averageRating ? rating.averageRating.toFixed(1) : '—'}
                </span>
              </div>
            </div>

            {bookmarkBadge && (
              <div className="flex items-center self-end sm:self-auto sm:justify-end pointer-events-auto">
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
          </div>

          <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </Link>

      {/* Metadata */}
      {showMetadata && (
  <div className="flex flex-col gap-1 px-0.5 pb-1 select-none antialiased">
          <Link
            to={`/manga/${manga.id}`}
            className="block"
          >
            <h3 className="text-[11px] sm:text-xs md:text-sm font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors duration-200 leading-tight tracking-tight antialiased" style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
              {manga.title}
            </h3>
          </Link>
          <div className="text-[11px] md:text-xs text-foreground/70 antialiased" style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
            {typeLabel || 'Неизвестный тип'}
            {releaseYear ? <span className="ml-2 text-foreground/45">{releaseYear}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Экспортируем мемоизированную версию для предотвращения лишних re-renders.
 * Компонент будет пере-рендериться только при изменении manga.id, coverImageUrl или title.
 */
export const MangaCard = React.memo(MangaCardComponent, (prevProps, nextProps) => {
  // Сравниваем только важные поля для оптимизации
  return (
    prevProps.manga.id === nextProps.manga.id &&
    prevProps.manga.coverImageUrl === nextProps.manga.coverImageUrl &&
    prevProps.manga.title === nextProps.manga.title &&
    prevProps.size === nextProps.size &&
    prevProps.showMetadata === nextProps.showMetadata
  )
})

MangaCard.displayName = 'MangaCard'

