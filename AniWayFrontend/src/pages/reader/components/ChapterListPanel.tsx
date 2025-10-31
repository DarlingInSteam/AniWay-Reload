import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatChapterTitle, getDisplayChapterNumber } from '@/lib/chapterUtils'

interface ChapterListPanelProps {
  isOpen: boolean
  manga?: any
  chapters?: any[]
  activeChapterId?: number
  onClose: () => void
  onSelectChapter: (chapterId: number) => void
}

export const ChapterListPanel = ({
  isOpen,
  manga,
  chapters,
  activeChapterId,
  onClose,
  onSelectChapter
}: ChapterListPanelProps) => {
  if (!isOpen || !manga || !chapters) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full sm:w-[420px] md:w-[460px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm sm:text-base">Главы • {manga.title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 space-y-2" id="chapter-list-scroll">
          {chapters.map(chapter => {
            const active = chapter.id === activeChapterId
            return (
              <button
                key={chapter.id}
                onClick={() => onSelectChapter(chapter.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition',
                  active
                    ? 'bg-primary/20 border-primary/40 text-white'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                )}
                data-active={active || undefined}
              >
                <span className="truncate">{formatChapterTitle(chapter)}</span>
                <span className="ml-3 text-xs opacity-70">#{getDisplayChapterNumber(chapter.chapterNumber)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
