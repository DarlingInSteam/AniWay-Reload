import { Link } from 'react-router-dom'
import { Bookmark, Star } from 'lucide-react'
import { Bookmark as BookmarkType } from '@/types'
import { cn } from '@/lib/utils'
import { useReadingProgress } from '@/hooks/useProgress'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface BookmarkMangaCardProps {
  bookmark: BookmarkType
}

export function BookmarkMangaCard({ bookmark }: BookmarkMangaCardProps) {
  const { getMangaReadingPercentage, getMangaProgress } = useReadingProgress()
  
  // Адаптивные размеры для разных экранов - как в каталоге
  const cardSizes = {
    compact: 'aspect-[3/4]',
    default: 'aspect-[3/4]',
    large: 'aspect-[3/4]'
  }

  // Загружаем полные данные манги
  const { data: manga, isError, error } = useQuery({
    queryKey: ['manga', bookmark.mangaId],
    queryFn: () => apiClient.getMangaById(bookmark.mangaId),
    enabled: !!bookmark.mangaId,
    retry: false,
  })

  // Если манга не найдена (404 или другая ошибка), не отображаем карточку
  if (isError) {
    console.warn(`Manga ${bookmark.mangaId} not found, bookmark may be outdated`)
    return null
  }

  // Используем либо загруженные данные манги, либо данные из закладки
  const mangaData = manga || bookmark.manga || {
    id: bookmark.mangaId,
    title: (bookmark as any).mangaTitle || `Манга ${bookmark.mangaId}`,
    coverImageUrl: (bookmark as any).mangaCoverUrl,
    totalChapters: 0,
    genre: (bookmark as any).mangaGenre || '',
    releaseDate: (bookmark as any).mangaReleaseDate || new Date().toISOString()
  }

  // Получаем прогресс чтения
  const readingProgress = getMangaReadingPercentage(mangaData.id, mangaData.totalChapters || 1)
  
  // Вычисляем количество прочитанных глав более точно
  const mangaProgress = getMangaProgress(mangaData.id)
  const readChapters = mangaProgress.filter(p => p.isCompleted).length

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

  return (
    <div className="group flex flex-col space-y-2 md:space-y-3 animate-fade-in w-full">
      {/* Cover Image Card */}
      <Link
        to={`/manga/${mangaData.id}`}
        className="manga-card block relative overflow-hidden rounded-lg md:rounded-xl"
      >
        <div className={cn('relative overflow-hidden', cardSizes.default)}>
          <img
            src={mangaData.coverImageUrl || '/placeholder-manga.jpg'}
            alt={mangaData.title}
            className="manga-cover h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-manga.jpg'
            }}
          />

          {/* Gradient Overlay for bottom text */}
          <div className="manga-gradient-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Bookmark Status Badge */}
          <div className="absolute top-2 md:top-3 left-2 md:left-3">
            <span className={cn(
              'px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full backdrop-blur-sm text-white flex items-center gap-1',
              getBookmarkStatusColor(bookmark.status)
            )}>
              <Bookmark className="h-2.5 w-2.5 md:h-3 md:w-3 fill-current" />
              {getBookmarkStatusText(bookmark.status)}
            </span>
          </div>

          {/* Chapter Count with Reading Progress */}
          <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-black/70 backdrop-blur-sm text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
            {readChapters > 0 ? (
              <span className="text-green-400">{readChapters}/{mangaData.totalChapters} гл.</span>
            ) : (
              <span>{mangaData.totalChapters} гл.</span>
            )}
          </div>

          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="hidden md:flex items-center space-x-2">
              <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1.5 rounded-full text-sm font-medium">
                Читать
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Metadata - как в каталоге */}
      <div className="flex flex-col px-1 h-[4.5rem] md:h-[5rem]">
        {/* Title - строго фиксированная высота для 2 строк */}
        <Link
          to={`/manga/${mangaData.id}`}
          className="block mb-1 md:mb-1.5"
        >
          <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 hover:text-primary transition-colors duration-200 leading-tight h-[2rem] md:h-[2.25rem] overflow-hidden">
            {mangaData.title}
          </h3>
        </Link>

        {/* Genre and Year - строго фиксированная высота */}
        <div className="flex items-center justify-between text-xs text-muted-foreground h-4 mb-1">
          <span className="line-clamp-1 flex-1 mr-2">
            {mangaData.genre ? mangaData.genre.split(',')[0] : 'Без жанра'}
          </span>
          <span className="flex-shrink-0">
            {new Date(mangaData.releaseDate).getFullYear()}
          </span>
        </div>

        {/* Progress Info - строго фиксированная высота */}
        <div className="flex items-center justify-between h-4">
          <div className="flex items-center space-x-1">
            <Bookmark className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary fill-current" />
            <span className="text-xs font-medium text-primary">
              {getBookmarkStatusText(bookmark.status)}
            </span>
          </div>
          {readChapters > 0 && (
            <div className="text-xs text-muted-foreground">
              Прочитано: {readChapters}/{mangaData.totalChapters}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
