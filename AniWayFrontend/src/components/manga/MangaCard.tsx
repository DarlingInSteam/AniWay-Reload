import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, User, Star, Eye, Heart, Bookmark, Flame, ShieldCheck } from 'lucide-react'
import { MangaResponseDTO } from '@/types'
import { formatDate, getStatusColor, getStatusText, cn } from '@/lib/utils'
import { computeMangaBadges } from '@/utils/mangaBadges'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useAuth } from '@/contexts/AuthContext'
import { useReadingProgress } from '@/hooks/useProgress'
import { useRating } from '@/hooks/useRating'

interface MangaCardProps {
  manga: MangaResponseDTO
  size?: 'default' | 'compact' | 'large'
  showMetadata?: boolean
}

export function MangaCard({ manga, size = 'default', showMetadata = true }: MangaCardProps) {
  // Временное логирование для диагностики
  // Debug logs removed

  const { isAuthenticated } = useAuth()
  const { getMangaBookmark } = useBookmarks()
  const { getMangaReadingPercentage, getMangaProgress } = useReadingProgress()
  const { rating } = useRating(manga.id)
  
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

  // Генерируем фейковые просмотры для демонстрации (в реальном проекте это будет из API)
  const views = manga.views || 0
  // Removed verbose views log

  // Получаем статус закладки
  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const isInBookmarks = bookmarkInfo !== null
  
  // Получаем прогресс чтения
  const readingProgress = isAuthenticated ? getMangaReadingPercentage(manga.id, manga.totalChapters) : 0
  
  // Вычисляем количество прочитанных глав более точно
  const getReadChaptersCount = () => {
    if (!isAuthenticated || manga.totalChapters === 0) return 0
    const mangaProgressData = getMangaProgress(manga.id)
    if (!mangaProgressData || !Array.isArray(mangaProgressData)) return 0
    return mangaProgressData.filter((p: any) => p.isCompleted).length
  }
  
  const readChapters = getReadChaptersCount()

  const getBookmarkStatusText = (status: string) => {
    switch (status) {
      case 'READING': return 'Читаю'
      case 'COMPLETED': return 'Прочитано'
      case 'ON_HOLD': return 'Отложено'
      case 'DROPPED': return 'Брошено'
      case 'PLAN_TO_READ': return 'Запланировано'
      default: return 'В закладках'
    }
  }

  const getBookmarkStatusColor = (status: string) => {
    switch (status) {
      case 'READING': return 'bg-green-500'
      case 'COMPLETED': return 'bg-blue-500'
      case 'ON_HOLD': return 'bg-yellow-500'
      case 'DROPPED': return 'bg-red-500'
      case 'PLAN_TO_READ': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
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

  // Derived flags via util
  const { isTrending, isLicensed } = computeMangaBadges(manga, rating?.averageRating)

  // Condense genres (до 2 + +N)
  const rawGenres = manga.genre ? manga.genre.split(',').map(g=>g.trim()).filter(Boolean) : []
  const primaryGenres = rawGenres.slice(0,2)
  const hiddenGenresCount = rawGenres.length - primaryGenres.length

  return (
    <div className="group flex flex-col space-y-2 md:space-y-3 w-full transition-transform duration-300 will-change-transform hover:-translate-y-1">
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
            className={cn(
              'manga-cover h-full w-full object-cover transition-[opacity,transform,filter] duration-500 ease-out',
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 blur-md scale-[1.03]',
              'group-hover:scale-105'
            )}
            loading="lazy"
            decoding="async"
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

          {/* Gradient Overlay for bottom text */}
          <div className="manga-gradient-overlay pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status Badge */}
          <div className="absolute top-2 md:top-3 left-2 md:left-3 flex flex-col gap-1">
            <span className={cn(
              'px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] font-semibold rounded-full backdrop-blur-sm tracking-tight shadow',
              getStatusColor(manga.status)
            )}>
              {getStatusText(manga.status)}
            </span>
            {isLicensed && (
              <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] font-semibold rounded-full bg-emerald-500/80 text-white backdrop-blur-sm flex items-center gap-1 shadow">
                <ShieldCheck className="h-3 w-3" />
                LIC
              </span>
            )}
            {isTrending && (
              <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] font-semibold rounded-full bg-orange-500/80 text-white backdrop-blur-sm flex items-center gap-0.5 shadow">
                <Flame className="h-3 w-3" />TOP
              </span>
            )}
          </div>

          {/* Bookmark Status Badge */}
          {isInBookmarks && bookmarkInfo && (
            <div className="absolute top-2 md:top-3 left-2 md:left-3 mt-8">
              <span className={cn(
                'px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full backdrop-blur-sm text-white flex items-center gap-1',
                getBookmarkStatusColor(bookmarkInfo.status)
              )}>
                <Bookmark className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />
                {getBookmarkStatusText(bookmarkInfo.status)}
              </span>
            </div>
          )}

          {/* Rating + Views (top-right) */}
          <div className="absolute top-2 md:top-3 right-2 md:right-3 flex flex-col items-end gap-1">
            <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
              <Star className="h-2.5 w-2.5 md:h-3 md:w-3 text-accent fill-current" />
              <span className="text-xs font-medium text-white">
                {rating?.averageRating ? rating.averageRating.toFixed(1) : '—'}
              </span>
            </div>
            <div className="flex items-center space-x-1 bg-black/60 backdrop-blur-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
              <Eye className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
              <span className="text-[10px] md:text-xs font-medium text-white/90">
                {views >= 1000 ? (views/1000).toFixed(1).replace(/\.0$/,'') + 'k' : views}
              </span>
            </div>
          </div>

          {/* Chapter Count with Reading Progress */}
          <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-black/70 backdrop-blur-sm text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
            {isAuthenticated && readChapters > 0 ? (
              <span className="text-green-400">{readChapters}/{manga.totalChapters} гл.</span>
            ) : (
              <span>{manga.totalChapters} гл.</span>
            )}
          </div>

          {/* Subtle hover dim (без описаний и кнопок) */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>

      {/* Metadata */}
    {showMetadata && (
  <div className="flex flex-col px-1 h-[3.9rem] md:h-[4.2rem] select-none">
          {/* Title - строго фиксированная высота для 2 строк */}
          <Link
            to={`/manga/${manga.id}`}
            className="block mb-1 md:mb-1.5"
          >
            <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 hover:text-primary transition-colors duration-200 leading-tight h-[2rem] md:h-[2.25rem] overflow-hidden tracking-tight">
              {manga.title}
            </h3>
          </Link>

          {/* Genre and Year - строго фиксированная высота */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground h-4 mb-1 gap-2">
            <span className="line-clamp-1 flex-1 mr-2 flex items-center gap-1">
              {primaryGenres.map(g => (
                <span key={g} className="bg-white/5 px-1.5 py-0.5 rounded-md text-[10px] leading-none text-white/80">{g}</span>
              ))}
              {hiddenGenresCount > 0 && (
                <span className="bg-white/5 px-1.5 py-0.5 rounded-md text-[10px] leading-none text-white/50">+{hiddenGenresCount}</span>
              )}
              {primaryGenres.length===0 && <span className="italic opacity-60">Нет жанров</span>}
            </span>
            <span className="flex-shrink-0">
              {manga.releaseDate ? new Date(manga.releaseDate).getFullYear() : '—'}
            </span>
          </div>

          {/* Удален нижний блок рейтинга и просмотров */}
        </div>
      )}
    </div>
  )
}
