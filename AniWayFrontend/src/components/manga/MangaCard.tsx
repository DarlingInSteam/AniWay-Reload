import { Link } from 'react-router-dom'
import { Calendar, User, Star, Eye, Heart } from 'lucide-react'
import { MangaResponseDTO } from '@/types'
import { formatDate, getStatusColor, getStatusText, cn } from '@/lib/utils'

interface MangaCardProps {
  manga: MangaResponseDTO
  size?: 'default' | 'compact' | 'large'
  showMetadata?: boolean
}

export function MangaCard({ manga, size = 'default', showMetadata = true }: MangaCardProps) {
  const cardSizes = {
    compact: 'aspect-[3/4] w-[160px] h-[213px]', // Фиксированные размеры
    default: 'aspect-[3/4] w-[200px] h-[267px]', // Фиксированные размеры
    large: 'aspect-[2/3] w-[240px] h-[360px]'    // Фиксированные размеры
  }

  const cardWidths = {
    compact: 'w-[160px] max-w-[160px]',
    default: 'w-[200px] max-w-[200px]',
    large: 'w-[240px] max-w-[240px]'
  }

  // Генерируем фейковый рейтинг для демонстрации (в реальном проекте это будет из API)
  const rating = (4 + Math.random()).toFixed(1)
  const views = Math.floor(Math.random() * 10000) + 1000

  return (
    <div className={cn(
      "group flex flex-col space-y-3 animate-fade-in flex-shrink-0",
      cardWidths[size]
    )}>
      {/* Cover Image Card */}
      <Link
        to={`/manga/${manga.id}`}
        className="manga-card block relative overflow-hidden rounded-xl"
      >
        <div className={cn('relative overflow-hidden', cardSizes[size])}>
          <img
            src={manga.coverImageUrl}
            alt={manga.title}
            className="manga-cover h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-manga.jpg'
            }}
          />

          {/* Gradient Overlay for bottom text */}
          <div className="manga-gradient-overlay absolute inset-0" />

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm',
              getStatusColor(manga.status)
            )}>
              {getStatusText(manga.status)}
            </span>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full">
            <Star className="h-3 w-3 text-manga-rating fill-current" />
            <span className="text-xs font-medium text-white">{rating}</span>
          </div>

          {/* Chapter Count */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-medium">
            {manga.totalChapters} гл.
          </div>
        </div>
      </Link>

      {/* Metadata */}
      {showMetadata && (
        <div className="space-y-2 px-1">
          {/* Title */}
          <Link
            to={`/manga/${manga.id}`}
            className="block"
          >
            <h3 className="text-sm font-semibold text-white line-clamp-2 hover:text-primary transition-colors duration-200">
              {manga.title}
            </h3>
          </Link>

          {/* Genre and Year */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="line-clamp-1">
              {manga.genre.split(',')[0]}
            </span>
            <span>
              {new Date(manga.releaseDate).getFullYear()}
            </span>
          </div>

          {/* Rating and Views */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-manga-rating fill-current" />
              <span className="text-xs font-medium text-manga-rating">{rating}</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{views.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
