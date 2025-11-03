import React from 'react'
import { Link } from 'react-router-dom'
import { Play, BookOpen } from 'lucide-react'
import { useReadingProgress } from '../../hooks/useProgress'
import { useAuth } from '../../contexts/AuthContext'
import { getDisplayChapterNumber } from '../../lib/chapterUtils'

interface ReadingButtonProps {
  mangaId: number
  firstChapterId?: number
  allChapters?: any[] // Добавляем список всех глав для правильной логики
  className?: string
}

export const ReadingButton: React.FC<ReadingButtonProps> = ({
  mangaId,
  firstChapterId,
  allChapters = [],
  className = ''
}) => {
  const { isAuthenticated } = useAuth()
  const { getLastReadChapter, isChapterCompleted } = useReadingProgress()

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className={`inline-flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors ${className}`}
      >
        <BookOpen className="w-5 h-5" />
        <span>Войти для чтения</span>
      </Link>
    )
  }

  if (!firstChapterId) {
    return (
      <div className={`inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-500 text-white font-medium rounded-lg cursor-not-allowed ${className}`}>
        <BookOpen className="w-5 h-5" />
        <span>Главы недоступны</span>
      </div>
    )
  }

  const lastRead = getLastReadChapter(mangaId)

  if (!lastRead) {
    // Пользователь еще не читал эту мангу - показываем "Начать читать"
    return (
      <Link
        to={`/reader/${firstChapterId}`}
        state={{ manualNavigation: true }}
        className={`inline-flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors ${className}`}
      >
        <Play className="w-5 h-5" />
        <span>Начать читать</span>
      </Link>
    )
  }

  // Определяем правильную главу для продолжения
  let targetChapterId = lastRead.chapterId
  // Используем chapterId для получения номера, а не chapterNumber из lastRead
  const lastReadChapterData = allChapters.find(ch => ch.id === lastRead.chapterId)
  const displayChapterNum = lastReadChapterData 
    ? getDisplayChapterNumber(lastReadChapterData.chapterNumber)
    : getDisplayChapterNumber(lastRead.chapterNumber || 0)
  let actionText = `Продолжить главу ${displayChapterNum}`

  // Если последняя глава завершена, найти следующую незавершенную
  if (lastRead.isCompleted && allChapters && Array.isArray(allChapters) && allChapters.length > 0) {
    const sortedChapters = allChapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
    const currentIndex = sortedChapters.findIndex(ch => ch.id === lastRead.chapterId)
    
    // Проверяем, это ли последняя глава в манге
    const isLastChapter = currentIndex === sortedChapters.length - 1
    
    if (isLastChapter) {
      // Пользователь прочитал последнюю главу - показываем "Прочитано"
      return (
        <div className={`inline-flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg ${className}`}>
          <BookOpen className="w-5 h-5" />
          <span>Прочитано</span>
        </div>
      )
    }
    
    // Найти следующую незавершенную главу
    let nextUnreadChapter = null
    for (let i = currentIndex + 1; i < sortedChapters.length; i++) {
      const chapter = sortedChapters[i]
      if (!isChapterCompleted(chapter.id)) {
        nextUnreadChapter = chapter
        break
      }
    }

    if (nextUnreadChapter) {
      targetChapterId = nextUnreadChapter.id
      const nextDisplayNum = getDisplayChapterNumber(nextUnreadChapter.chapterNumber)
      actionText = `Читать главу ${nextDisplayNum}`
    } else {
      // Все главы прочитаны, но не последняя (странная ситуация)
      actionText = `Перечитать главу ${displayChapterNum}`
    }
  }

  return (
    <Link
      to={`/reader/${targetChapterId}`}
      state={{ manualNavigation: true }}
      className={`inline-flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors ${className}`}
    >
      <BookOpen className="w-5 h-5" />
      <span>{actionText}</span>
    </Link>
  )
}

interface QuickReadingButtonProps {
  mangaId: number
  firstChapterId?: number
  className?: string
}

export const QuickReadingButton: React.FC<QuickReadingButtonProps> = ({
  mangaId,
  firstChapterId,
  className = ''
}) => {
  const { isAuthenticated } = useAuth()
  const { getLastReadChapter } = useReadingProgress()

  if (!isAuthenticated || !firstChapterId) {
    return null
  }

  const lastRead = getLastReadChapter(mangaId)
  const targetChapterId = lastRead ? lastRead.chapterId : firstChapterId

  return (
    <Link
      to={`/reader/${targetChapterId}`}
      state={{ manualNavigation: true }}
      className={`inline-flex items-center justify-center px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors ${className}`}
    >
      <Play className="w-4 h-4 mr-1" />
      {lastRead ? 'Продолжить' : 'Читать'}
    </Link>
  )
}
