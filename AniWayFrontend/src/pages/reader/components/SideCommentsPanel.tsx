import { X } from 'lucide-react'
import { CommentSection } from '@/components/comments/CommentSection'
import { getDisplayChapterNumber } from '@/lib/chapterUtils'

interface SideCommentsPanelProps {
  isOpen: boolean
  chapter?: any
  onClose: () => void
}

export const SideCommentsPanel = ({ isOpen, chapter, onClose }: SideCommentsPanelProps) => {
  if (!isOpen || !chapter) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full sm:w-[480px] md:w-[520px] bg-[#0f1115]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-sm sm:text-base">
            Комментарии к главе {getDisplayChapterNumber(chapter.chapterNumber)}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">
          <CommentSection targetId={chapter.id} type="CHAPTER" title="" maxLevel={3} hideHeader />
        </div>
      </div>
    </div>
  )
}
