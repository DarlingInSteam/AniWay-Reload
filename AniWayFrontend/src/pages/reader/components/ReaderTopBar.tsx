import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Home, Menu } from 'lucide-react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'

interface ReaderTopBarProps {
  showUI: boolean
  finalTitle: string
  titleRef: RefObject<HTMLButtonElement>
  currentChapterOrdinal: number
  totalChapters: number
  hasPreviousChapter: boolean
  hasNextChapter: boolean
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onBack: () => void
  onToggleMobileUI: () => void
  onOpenChapterList: () => void
  manga?: any
  activeChapter?: any
}

export const ReaderTopBar = ({
  showUI,
  finalTitle,
  titleRef,
  currentChapterOrdinal,
  totalChapters,
  hasPreviousChapter,
  hasNextChapter,
  onNavigatePrevious,
  onNavigateNext,
  onBack,
  onToggleMobileUI,
  onOpenChapterList,
  manga,
  activeChapter
}: ReaderTopBarProps) => {
  const title = finalTitle || (activeChapter ? activeChapter.title : '')

  return (
    <div
      data-reader-top-bar
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10 transition-all duration-300',
        showUI ? 'translate-y-0' : '-translate-y-full'
      )}
    >
      <div className="container mx-auto px-4 h-16">
        <div className="grid grid-cols-3 items-center h-full">
          <div className="flex items-center space-x-3 sm:space-x-4 justify-start min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {manga && (
              <Link
                to={`/manga/${manga.id}`}
                className="md:hidden p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label="Страница манги"
                title={manga.title}
              >
                <Home className="h-5 w-5" />
              </Link>
            )}
            <div className="hidden md:flex items-center space-x-2 min-w-0">
              <Link
                to="/"
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                aria-label="Главная"
              >
                <Home className="h-5 w-5" />
              </Link>
              {manga && (
                <Link
                  to={`/manga/${manga.id}`}
                  className="text-white hover:text-primary transition-colors truncate max-w-[150px]"
                  title={manga.title}
                >
                  {manga.title}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center text-white space-x-2 sm:space-x-3 min-w-0">
            <button
              disabled={!hasPreviousChapter}
              onClick={onNavigatePrevious}
              className={cn('p-1.5 sm:p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
              title="Предыдущая глава"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center min-w-0 max-w-full">
              <button
                ref={titleRef}
                onClick={onOpenChapterList}
                className="font-semibold text-base hover:text-primary transition-colors w-full max-w-[64vw] sm:max-w-[460px] text-center truncate whitespace-nowrap"
                style={{ minWidth: '40px' }}
                title={title}
              >
                {title}
              </button>
              <button
                onClick={onOpenChapterList}
                className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-wide text-gray-300/80 hover:text-primary/80 transition px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
                title="Открыть список глав"
              >
                <span className="font-medium">{currentChapterOrdinal}</span>
                <span className="opacity-60">/</span>
                <span>{totalChapters}</span>
              </button>
            </div>
            <button
              disabled={!hasNextChapter}
              onClick={onNavigateNext}
              className={cn('p-1.5 sm:p-2 rounded-lg border border-white/10 hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed')}
              title="Следующая глава"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              onClick={onToggleMobileUI}
              className="md:hidden p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="Переключить UI"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
