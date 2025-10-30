import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommentSection } from '@/components/comments/CommentSection'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { MomentReactionType, MomentResponse } from '@/types/moments'
import { Heart, ThumbsDown, MessageCircle } from 'lucide-react'

interface MomentViewerModalProps {
  moment: MomentResponse | null
  open: boolean
  onClose: () => void
  onToggleReaction: (moment: MomentResponse, reaction: MomentReactionType) => void
  onClearReaction: (moment: MomentResponse) => void
  isProcessing: (momentId: number) => boolean
  onCommentCountChange: (momentId: number, nextCount: number) => void
}

export function MomentViewerModal({
  moment,
  open,
  onClose,
  onToggleReaction,
  onClearReaction,
  isProcessing,
  onCommentCountChange
}: MomentViewerModalProps) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [moment?.id])

  const effectiveMoment = useMemo(() => moment, [moment])

  if (!effectiveMoment) {
    return null
  }

  const { spoiler, nsfw, userReaction } = effectiveMoment
  const showWarning = (spoiler || nsfw) && !revealed

  const handleLike = () => {
    if (userReaction === 'LIKE') {
      onClearReaction(effectiveMoment)
    } else {
      onToggleReaction(effectiveMoment, 'LIKE')
    }
  }

  const handleDislike = () => {
    if (userReaction === 'DISLIKE') {
      onClearReaction(effectiveMoment)
    } else {
      onToggleReaction(effectiveMoment, 'DISLIKE')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setRevealed(false); onClose() } }}>
      <DialogContent className="max-w-5xl bg-black/95 border border-white/15 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Момент #{effectiveMoment.id}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60">
            <img
              src={effectiveMoment.image.url}
              alt={effectiveMoment.caption}
              className={cn('w-full h-full object-contain transition-filter duration-300', showWarning ? 'blur-xl select-none' : '')}
            />
            {showWarning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 text-center px-6">
                <p className="text-lg font-semibold">
                  {nsfw ? 'NSFW-контент' : 'Спойлер'}
                </p>
                <p className="text-sm text-white/70 max-w-sm">
                  {nsfw
                    ? 'Изображение помечено как NSFW. Подтвердите, что хотите его просмотреть.'
                    : 'Изображение содержит сюжетный спойлер. Нажмите, чтобы открыть.'}
                </p>
                <Button variant="outline" onClick={() => setRevealed(true)}>Показать</Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {spoiler && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">Спойлер</Badge>}
                {nsfw && <Badge variant="secondary" className="bg-red-500/20 text-red-300">NSFW</Badge>}
                {effectiveMoment.hidden && <Badge variant="secondary" className="bg-white/20 text-white/80">Скрыт</Badge>}
              </div>
              <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                {effectiveMoment.caption || 'Без подписи'}
              </p>
              <div className="text-sm text-white/50 space-y-1">
                <div>Обновлено: {formatRelativeTime(effectiveMoment.lastActivityAt)}</div>
                <div>Создано: {formatRelativeTime(effectiveMoment.createdAt)}</div>
                {effectiveMoment.chapterId && (
                  <div>Глава: {effectiveMoment.chapterId}{effectiveMoment.pageNumber ? `, страница ${effectiveMoment.pageNumber}` : ''}</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={userReaction === 'LIKE' ? 'default' : 'outline'}
                  className={cn('flex items-center gap-2', userReaction === 'LIKE' ? 'bg-emerald-500 text-black hover:bg-emerald-500/90' : 'border-white/20 text-white/80 hover:text-white')}
                  onClick={handleLike}
                  disabled={isProcessing(effectiveMoment.id)}
                >
                  <Heart className={cn('h-4 w-4', userReaction === 'LIKE' ? 'fill-current' : '')} />
                  <span>{effectiveMoment.likesCount}</span>
                </Button>
                <Button
                  variant={userReaction === 'DISLIKE' ? 'default' : 'outline'}
                  className={cn('flex items-center gap-2', userReaction === 'DISLIKE' ? 'bg-slate-500 text-black hover:bg-slate-500/90' : 'border-white/20 text-white/80 hover:text-white')}
                  onClick={handleDislike}
                  disabled={isProcessing(effectiveMoment.id)}
                >
                  <ThumbsDown className={cn('h-4 w-4', userReaction === 'DISLIKE' ? 'fill-current' : '')} />
                  <span>{effectiveMoment.dislikesCount}</span>
                </Button>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                  <MessageCircle className="h-4 w-4" />
                  <span>{effectiveMoment.commentsCount}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="max-h-[420px] overflow-y-auto pr-1">
              <CommentSection
                targetId={effectiveMoment.id}
                type="MOMENT"
                title="Комментарии"
                onCountChange={(count) => onCommentCountChange(effectiveMoment.id, count)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
