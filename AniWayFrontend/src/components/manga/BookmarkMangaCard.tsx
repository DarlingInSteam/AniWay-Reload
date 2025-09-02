import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
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
  
  // Загружаем полные данные манги
  const { data: manga, isError, error } = useQuery({
    queryKey: ['manga', bookmark.mangaId],
    queryFn: () => apiClient.getMangaById(bookmark.mangaId),
    enabled: !!bookmark.mangaId,
    retry: false, // Не повторяем запрос при ошибке
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
    totalChapters: 0
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
    <div className="group relative bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20">
      <Link to={`/manga/${mangaData.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={mangaData.coverImageUrl || '/placeholder-manga.jpg'}
            alt={mangaData.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-manga.jpg'
            }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Bookmark Status Badge */}
          <div className="absolute top-2 left-2">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm text-white flex items-center gap-1',
              getBookmarkStatusColor(bookmark.status)
            )}>
              <Bookmark className="h-3 w-3 fill-current" />
              {getBookmarkStatusText(bookmark.status)}
            </span>
          </div>

          {/* Reading Progress */}
          {readChapters > 0 && mangaData.totalChapters && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium">
              <span className="text-green-400">{readChapters}/{mangaData.totalChapters}</span>
            </div>
          )}

          {/* Progress Bar */}
          {readingProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${readingProgress}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Title */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
          {mangaData.title}
        </h3>
        
        {/* Reading Progress Text */}
        {readChapters > 0 && mangaData.totalChapters && (
          <p className="text-xs text-muted-foreground mt-1">
            Прочитано: {readChapters}/{mangaData.totalChapters}
          </p>
        )}
      </div>
    </div>
  )
}
