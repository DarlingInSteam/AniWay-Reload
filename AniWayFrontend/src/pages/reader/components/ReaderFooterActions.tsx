import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Home, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ReaderFooterActionsProps {
  previousChapterAvailable: boolean
  nextChapterAvailable: boolean
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onOpenChapterList: () => void
  onOpenComments: () => void
  manga?: any
}

export const ReaderFooterActions = ({
  previousChapterAvailable,
  nextChapterAvailable,
  onNavigatePrevious,
  onNavigateNext,
  onOpenChapterList,
  onOpenComments,
  manga
}: ReaderFooterActionsProps) => (
  <div className="mt-12 mb-16">
    <div className="max-w-6xl mx-auto px-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-white/[0.03] backdrop-blur-md shadow-xl shadow-black/30 p-6 space-y-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={onNavigatePrevious}
            disabled={!previousChapterAvailable}
            className={cn(
              'px-4 py-3 rounded-xl text-sm md:text-base font-medium border transition flex items-center gap-2 min-w-[140px] justify-center',
              previousChapterAvailable
                ? 'bg-white/7 hover:bg-white/10 border-white/15 text-white'
                : 'bg-white/5 border-white/10 text-white/35 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-5 w-5" /> Предыдущая
          </button>
          <button
            onClick={onOpenChapterList}
            className="px-5 py-3 rounded-xl text-sm md:text-base font-semibold border bg-primary/85 hover:bg-primary transition border-primary/40 text-white flex items-center gap-2 shadow-md shadow-primary/30"
          >
            <BookOpen className="h-5 w-5" /> Список глав
          </button>
          <button
            onClick={onNavigateNext}
            disabled={!nextChapterAvailable}
            className={cn(
              'px-4 py-3 rounded-xl text-sm md:text-base font-medium border transition flex items-center gap-2 min-w-[140px] justify-center',
              nextChapterAvailable
                ? 'bg-white/7 hover:bg-white/10 border-white/15 text-white'
                : 'bg-white/5 border-white/10 text-white/35 cursor-not-allowed'
            )}
          >
            Следующая <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {manga && (
            <Link
              to={`/manga/${manga.id}`}
              className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-white/6 hover:bg-white/10 border-white/15 text-white transition flex items-center gap-2"
            >
              <Home className="h-5 w-5" /> Страница манги
            </Link>
          )}
          <button
            onClick={onOpenComments}
            className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-blue-600/85 hover:bg-blue-600 border-blue-500/40 text-white transition flex items-center gap-2 shadow-md shadow-blue-600/30"
          >
            <MessageCircle className="h-5 w-5" /> Комментарии
          </button>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-5 py-3 rounded-xl text-sm md:text-base font-medium border bg-white/6 hover:bg-white/10 border-white/15 text-white/90 transition flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5 rotate-90" /> Вверх
          </button>
        </div>
      </div>
    </div>
  </div>
)
