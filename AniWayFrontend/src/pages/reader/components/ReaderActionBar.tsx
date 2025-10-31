import { ArrowLeft, BookOpen, Heart, MessageCircle, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReaderActionBarProps {
  visible: boolean
  hasActiveChapter: boolean
  onOpenChapterList: () => void
  onOpenComments: () => void
  onLike: () => void
  onToggleSettings: () => void
  onBack: () => void
  likeDisabled: boolean
  likeActive: boolean
}

export const ReaderActionBar = ({
  visible,
  hasActiveChapter,
  onOpenChapterList,
  onOpenComments,
  onLike,
  onToggleSettings,
  onBack,
  likeDisabled,
  likeActive
}: ReaderActionBarProps) => {
  if (!hasActiveChapter) return null

  return (
    <div
      className={cn(
        'fixed top-1/2 -translate-y-1/2 right-1.5 xs:right-2 sm:right-4 z-40 flex flex-col space-y-2 sm:space-y-3',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <button onClick={onOpenChapterList} className="reader-fab" title="Список глав" aria-label="Список глав">
        <BookOpen className="h-5 w-5 group-hover:text-primary transition-colors" />
      </button>
      <button onClick={onOpenComments} className="reader-fab" title="Комментарии" aria-label="Комментарии">
        <MessageCircle className="h-5 w-5 group-hover:text-blue-400 transition-colors" />
      </button>
      <button
        onClick={onLike}
        disabled={likeDisabled}
        className={cn('reader-fab', likeActive && 'text-red-400 opacity-80 cursor-default')}
        title={likeActive ? 'Лайк уже поставлен' : 'Поставить лайк'}
        aria-pressed={likeActive}
      >
        <Heart className={cn('h-5 w-5', likeActive && 'fill-current')} />
      </button>
      <button onClick={onToggleSettings} className="reader-fab" title="Настройки" aria-label="Настройки">
        <Settings className="h-5 w-5 group-hover:text-amber-300 transition-colors" />
      </button>
      <button onClick={onBack} className="reader-fab" title="Назад" aria-label="Назад">
        <ArrowLeft className="h-5 w-5 group-hover:text-gray-300" />
      </button>
    </div>
  )
}
