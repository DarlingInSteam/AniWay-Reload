import { useEffect, useMemo, useRef, useState } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommentSection } from '@/components/comments/CommentSection'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { MomentReactionType, MomentResponse } from '@/types/moments'
import { Heart, ThumbsDown, MessageCircle, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { buildProfileUrl } from '@/lib/profileUrl'
import { Link } from 'react-router-dom'
import type { UserMini } from '@/hooks/useUserMiniBatch'

interface MomentViewerModalProps {
  moment: MomentResponse | null
  open: boolean
  onClose: () => void
  onToggleReaction: (moment: MomentResponse, reaction: MomentReactionType) => void
  onClearReaction: (moment: MomentResponse) => void
  isProcessing: (momentId: number) => boolean
  onCommentCountChange: (momentId: number, nextCount: number) => void
  onNavigatePrev: () => void
  onNavigateNext: () => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
  isNextLoading?: boolean
  uploader?: UserMini
}

export function MomentViewerModal({
  moment,
  open,
  onClose,
  onToggleReaction,
  onClearReaction,
  isProcessing,
  onCommentCountChange,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev,
  canNavigateNext,
  isNextLoading = false,
  uploader
}: MomentViewerModalProps) {
  const [revealed, setRevealed] = useState(false)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return window.innerWidth >= 1024
  })
  const [showComments, setShowComments] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return window.innerWidth >= 1024
  })
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    setRevealed(false)
  }, [moment?.id])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResize = () => {
      const nextIsDesktop = window.innerWidth >= 1024
      setIsDesktop(nextIsDesktop)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isDesktop) {
      setShowComments(true)
    } else {
      setShowComments(false)
    }
  }, [isDesktop, moment?.id])

  useEffect(() => {
    if (!open && !isDesktop) {
      setShowComments(false)
    }
  }, [open, isDesktop])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (canNavigatePrev) {
          onNavigatePrev()
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (canNavigateNext) {
          onNavigateNext()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, canNavigatePrev, canNavigateNext, onNavigatePrev, onNavigateNext])

  const effectiveMoment = useMemo(() => moment, [moment])

  if (!effectiveMoment) {
    return null
  }

  const { spoiler, nsfw, userReaction } = effectiveMoment
  const showWarning = (spoiler || nsfw) && !revealed
  const displayName = uploader?.displayName || uploader?.username || `Пользователь ${effectiveMoment.uploaderId}`
  const profileUrl = uploader ? buildProfileUrl(uploader.id, uploader.displayName, uploader.username) : undefined
  const initials = displayName.slice(0, 2).toUpperCase()

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

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      touchStartYRef.current = null
      return
    }
    const touch = event.touches?.[0]
    touchStartYRef.current = touch ? touch.clientY : null
  }

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      touchStartYRef.current = null
      return
    }
    const startY = touchStartYRef.current
    const touch = event.changedTouches?.[0]
    touchStartYRef.current = null
    if (startY == null || !touch) {
      return
    }
    const delta = startY - touch.clientY
    if (Math.abs(delta) < 50) {
      return
    }
    if (delta > 0) {
      if (canNavigateNext) {
        onNavigateNext()
      }
    } else if (canNavigatePrev) {
      onNavigatePrev()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setRevealed(false); onClose() } }}>
      <DialogContent
        className={cn(
          'max-w-5xl border border-white/15 bg-black/95 text-white',
          !isDesktop && 'pb-[calc(env(safe-area-inset-bottom)+7rem)]'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
  <div className="pointer-events-none absolute inset-y-0 -right-16 hidden lg:flex flex-col items-center justify-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto bg-white/10 text-white hover:bg-white/20"
            onClick={onNavigatePrev}
            disabled={!canNavigatePrev}
            aria-label="Предыдущий момент"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="pointer-events-auto bg-white/10 text-white hover:bg-white/20"
            onClick={onNavigateNext}
            disabled={!canNavigateNext}
            aria-label="Следующий момент"
          >
            {isNextLoading ? <LoadingSpinner size="sm" /> : <ArrowDown className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          {!isDesktop && (
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 inline-flex items-center gap-2 text-white/70 hover:text-white"
              onClick={() => { setRevealed(false); onClose() }}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          )}
          <DialogHeader className="flex-1">
            <DialogTitle className="text-xl font-semibold">
              Момент #{effectiveMoment.id}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border border-white/10 bg-white/10">
              {uploader?.avatar ? (
                <AvatarImage src={uploader.avatar} alt={displayName} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              {profileUrl ? (
                <Link to={profileUrl} className="text-base font-semibold text-white hover:text-primary" onClick={(event) => event.stopPropagation()}>
                  {displayName}
                </Link>
              ) : (
                <span className="text-base font-semibold text-white/85">{displayName}</span>
              )}
              <span className="text-xs text-white/50">Создано {formatRelativeTime(effectiveMoment.createdAt)}</span>
            </div>
          </div>
          <div className="text-xs text-white/60">
            Обновлено {formatRelativeTime(effectiveMoment.lastActivityAt)}
          </div>
        </div>
        <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]', !isDesktop && 'pb-6')}>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 flex items-center justify-center max-h-[75vh]">
            <img
              src={effectiveMoment.image.url}
              alt={effectiveMoment.caption}
              className={cn('max-h-[75vh] w-full object-contain transition-filter duration-300', showWarning ? 'blur-xl select-none' : '')}
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
                {effectiveMoment.chapterId && (
                  <div>Глава: {effectiveMoment.chapterId}{effectiveMoment.pageNumber ? `, страница ${effectiveMoment.pageNumber}` : ''}</div>
                )}
              </div>
            </div>
            {isDesktop && (
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
            )}

            {isDesktop ? (
              <>
                <div className="h-px bg-white/10" />
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  <CommentSection
                    targetId={effectiveMoment.id}
                    type="MOMENT"
                    title="Комментарии"
                    onCountChange={(count) => onCommentCountChange(effectiveMoment.id, count)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {showComments && (
                  <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 pr-1">
                    <CommentSection
                      targetId={effectiveMoment.id}
                      type="MOMENT"
                      title="Комментарии"
                      onCountChange={(count) => onCommentCountChange(effectiveMoment.id, count)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {!isDesktop && (
          <div className="sticky bottom-0 left-0 right-0 -mx-6 mt-2 border-t border-white/10 bg-black/90 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <Button
                  size="sm"
                  variant={userReaction === 'LIKE' ? 'default' : 'outline'}
                  className={cn('flex-1 min-w-0 items-center justify-center gap-2', userReaction === 'LIKE' ? 'bg-emerald-500 text-black hover:bg-emerald-500/90' : 'border-white/20 text-white/80 hover:text-white')}
                  onClick={handleLike}
                  disabled={isProcessing(effectiveMoment.id)}
                >
                  <Heart className={cn('h-4 w-4', userReaction === 'LIKE' ? 'fill-current' : '')} />
                  <span>{effectiveMoment.likesCount}</span>
                </Button>
                <Button
                  size="sm"
                  variant={userReaction === 'DISLIKE' ? 'default' : 'outline'}
                  className={cn('flex-1 min-w-0 items-center justify-center gap-2', userReaction === 'DISLIKE' ? 'bg-slate-500 text-black hover:bg-slate-500/90' : 'border-white/20 text-white/80 hover:text-white')}
                  onClick={handleDislike}
                  disabled={isProcessing(effectiveMoment.id)}
                >
                  <ThumbsDown className={cn('h-4 w-4', userReaction === 'DISLIKE' ? 'fill-current' : '')} />
                  <span>{effectiveMoment.dislikesCount}</span>
                </Button>
              </div>
              <Button
                size="sm"
                variant={showComments ? 'default' : 'outline'}
                className={cn('flex items-center gap-2 whitespace-nowrap', showComments ? 'bg-white text-black hover:bg-white/90' : 'border-white/20 text-white/80 hover:text-white')}
                onClick={() => setShowComments((prev) => !prev)}
              >
                <MessageCircle className="h-4 w-4" />
                {showComments ? 'Скрыть' : effectiveMoment.commentsCount}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
