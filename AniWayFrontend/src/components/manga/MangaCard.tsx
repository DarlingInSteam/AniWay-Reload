import { Link } from 'react-router-dom'
import { Calendar, User, Star, Eye, Heart, Bookmark } from 'lucide-react'
import { MangaResponseDTO } from '@/types'
import { formatDate, getStatusColor, getStatusText, cn } from '@/lib/utils'
import { useBookmarks } from '@/hooks/useBookmarks'
import { useAuth } from '@/contexts/AuthContext'
import { useReadingProgress } from '@/hooks/useProgress'

interface MangaCardProps {
  manga: MangaResponseDTO
  size?: 'default' | 'compact' | 'large'
  showMetadata?: boolean
}

export function MangaCard({ manga, size = 'default', showMetadata = true }: MangaCardProps) {
  const { isAuthenticated } = useAuth()
  const { getMangaBookmark } = useBookmarks()
  const { getMangaReadingPercentage, getMangaProgress } = useReadingProgress()
  
  // Адаптивные размеры для разных экранов
  const cardSizes = {
    compact: 'aspect-[3/4]', // Убираем фиксированные размеры
    default: 'aspect-[3/4]',
    large: 'aspect-[3/4]'
  }

  // Генерируем фейковый рейтинг для демонстрации (в реальном проекте это будет из API)
  const rating = (4 + Math.random()).toFixed(1)
  const views = Math.floor(Math.random() * 10000) + 1000

  // Получаем статус закладки
  const bookmarkInfo = isAuthenticated ? getMangaBookmark(manga.id) : null
  const isInBookmarks = bookmarkInfo !== null
  
  // Получаем прогресс чтения
  const readingProgress = isAuthenticated ? getMangaReadingPercentage(manga.id, manga.totalChapters) : 0
  
  // Вычисляем количество прочитанных глав более точно
  const getReadChaptersCount = () => {
    if (!isAuthenticated || manga.totalChapters === 0) return 0
    const mangaProgressData = getMangaProgress(manga.id)
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

  return (
    <div className="group flex flex-col space-y-2 md:space-y-3 animate-fade-in w-full">
      {/* Cover Image Card */}
      <Link
        to={`/manga/${manga.id}`}
        className="manga-card block relative overflow-hidden rounded-lg md:rounded-xl"
      >
        <div className={cn('relative overflow-hidden', cardSizes[size])}>
          <img
            src={manga.coverImageUrl}
            alt={manga.title}
            className="manga-cover h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-manga.jpg'
            }}
          />

          {/* Gradient Overlay for bottom text */}
          <div className="manga-gradient-overlay absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status Badge */}
          <div className="absolute top-2 md:top-3 left-2 md:left-3">
            <span className={cn(
              'px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-medium rounded-full backdrop-blur-sm',
              getStatusColor(manga.status)
            )}>
              {getStatusText(manga.status)}
            </span>
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

          {/* Rating Badge */}
          <div className="absolute top-2 md:top-3 right-2 md:right-3 flex items-center space-x-1 bg-black/70 backdrop-blur-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
            <Star className="h-2.5 w-2.5 md:h-3 md:w-3 text-accent fill-current" />
            <span className="text-xs font-medium text-white">{rating}</span>
          </div>

          {/* Chapter Count with Reading Progress */}
          <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 bg-black/70 backdrop-blur-sm text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium">
            {isAuthenticated && readChapters > 0 ? (
              <span className="text-green-400">{readChapters}/{manga.totalChapters} гл.</span>
            ) : (
              <span>{manga.totalChapters} гл.</span>
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

      {/* Metadata */}
      {showMetadata && (
        <div className="flex flex-col px-1 h-[4.5rem] md:h-[5rem]">
          {/* Title - строго фиксированная высота для 2 строк */}
          <Link
            to={`/manga/${manga.id}`}
            className="block mb-1 md:mb-1.5"
          >
            <h3 className="text-xs md:text-sm font-semibold text-white line-clamp-2 hover:text-primary transition-colors duration-200 leading-tight h-[2rem] md:h-[2.25rem] overflow-hidden">
              {manga.title}
            </h3>
          </Link>

          {/* Genre and Year - строго фиксированная высота */}
          <div className="flex items-center justify-between text-xs text-muted-foreground h-4 mb-1">
            <span className="line-clamp-1 flex-1 mr-2">
              {manga.genre.split(',')[0]}
            </span>
            <span className="flex-shrink-0">
              {new Date(manga.releaseDate).getFullYear()}
            </span>
          </div>

          {/* Rating and Views - строго фиксированная высота */}
          <div className="flex items-center justify-between h-4">
            <div className="flex items-center space-x-1">
              <Star className="h-2.5 w-2.5 md:h-3 md:w-3 text-accent fill-current" />
              <span className="text-xs font-medium text-accent">{rating}</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Eye className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="hidden sm:inline">{views.toLocaleString()}</span>
                <span className="sm:hidden">{(views / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
