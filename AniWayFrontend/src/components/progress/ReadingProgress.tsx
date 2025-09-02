import React from 'react'
import { useReadingProgress } from '../../hooks/useProgress'
import { useAuth } from '../../contexts/AuthContext'

interface ReadingProgressBarProps {
  mangaId: number
  totalChapters: number
  className?: string
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({ 
  mangaId, 
  totalChapters, 
  className = '' 
}) => {
  const { isAuthenticated } = useAuth()
  const { getMangaReadingPercentage } = useReadingProgress()

  if (!isAuthenticated || totalChapters === 0) {
    return null
  }

  const percentage = getMangaReadingPercentage(mangaId, totalChapters)

  if (percentage === 0) {
    return null
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
        <span>Прогресс чтения</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface ChapterProgressProps {
  chapterId: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export const ChapterProgress: React.FC<ChapterProgressProps> = ({
  chapterId,
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  const { isAuthenticated } = useAuth()
  const { saveProgress } = useReadingProgress()

  if (!isAuthenticated) {
    return null
  }

  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newPercentage = (clickX / rect.width) * 100
    const newPage = Math.ceil((newPercentage / 100) * totalPages)
    
    onPageChange(Math.max(1, Math.min(newPage, totalPages)))
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Страница {currentPage} из {totalPages}</span>
        <span>{percentage}%</span>
      </div>
      
      <div 
        className="w-full bg-white/20 rounded-full h-3 cursor-pointer hover:bg-white/30 transition-colors"
        onClick={handleProgressClick}
        title="Нажмите для перехода к странице"
      >
        <div 
          className="bg-primary h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Начало</span>
        <span>Конец</span>
      </div>
    </div>
  )
}

interface LastReadChapterProps {
  mangaId: number
  className?: string
}

export const LastReadChapter: React.FC<LastReadChapterProps> = ({ mangaId, className = '' }) => {
  const { isAuthenticated } = useAuth()
  const { getLastReadChapter } = useReadingProgress()

  if (!isAuthenticated) {
    return null
  }

  const lastRead = getLastReadChapter(mangaId)

  if (!lastRead) {
    return null
  }

  const isCompleted = lastRead.page >= lastRead.totalPages
  const progressText = isCompleted 
    ? 'Прочитана' 
    : `Стр. ${lastRead.page}/${lastRead.totalPages}`

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Последняя глава: {lastRead.chapter?.chapterNumber || `Глава ${lastRead.chapterId}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {progressText} • {new Date(lastRead.lastReadAt).toLocaleDateString()}
          </p>
        </div>
        
        <a
          href={`/manga/${mangaId}/chapter/${lastRead.chapterId}${!isCompleted ? `?page=${lastRead.page}` : ''}`}
          className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-primary/80 transition-colors"
        >
          {isCompleted ? 'Перечитать' : 'Продолжить'}
        </a>
      </div>
    </div>
  )
}

interface RecentlyReadProps {
  limit?: number
  className?: string
}

export const RecentlyRead: React.FC<RecentlyReadProps> = ({ limit = 5, className = '' }) => {
  const { isAuthenticated } = useAuth()
  const { getRecentlyRead } = useReadingProgress()

  if (!isAuthenticated) {
    return null
  }

  const recentlyRead = getRecentlyRead(limit)

  if (recentlyRead.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">Нет недавно прочитанных глав</p>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-white">Недавно прочитанное</h3>
      <div className="space-y-3">
        {recentlyRead.map((progress) => (
          <div key={`${progress.mangaId}-${progress.chapterId}`} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-white">
                {progress.manga?.title || `Манга ${progress.mangaId}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Глава {progress.chapter?.chapterNumber || progress.chapterId} • 
                Стр. {progress.page}/{progress.totalPages}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(progress.lastReadAt).toLocaleDateString()}
              </p>
            </div>
            
            <a
              href={`/manga/${progress.mangaId}/chapter/${progress.chapterId}?page=${progress.page}`}
              className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-primary/80 transition-colors"
            >
              Продолжить
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
