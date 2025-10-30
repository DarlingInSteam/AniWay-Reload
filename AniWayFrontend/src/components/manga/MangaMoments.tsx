import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { toast } from 'sonner'
import { Flame, Heart, MessageCircle, Sparkles, ThumbsDown, Upload, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { buildProfileUrl } from '@/lib/profileUrl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MomentUploadDialog } from '@/components/manga/MomentUploadDialog'
import { MomentViewerModal } from '@/components/manga/MomentViewerModal'
import { useUserMiniBatch } from '@/hooks/useUserMiniBatch'
import type { UserMini } from '@/hooks/useUserMiniBatch'
import type { MomentPageResponse, MomentReactionType, MomentResponse, MomentSortOption } from '@/types/moments'

interface MangaMomentsProps {
  mangaId: number
  mangaTitle: string
}

interface ReactionPayload {
  momentId: number
  reaction: MomentReactionType
}

const sortOptions: Array<{ key: MomentSortOption; label: string; icon: ReactNode }> = [
  { key: 'new', label: 'Новые', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'popular', label: 'Популярные', icon: <Heart className="h-4 w-4" /> },
  { key: 'active', label: 'Обсуждаемые', icon: <Flame className="h-4 w-4" /> }
]

export function MangaMoments({ mangaId, mangaTitle }: MangaMomentsProps) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<MomentSortOption>('new')
  const [activeMomentId, setActiveMomentId] = useState<number | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<'next' | null>(null)
  const [reactionOverrides, setReactionOverrides] = useState<Record<number, MomentReactionType | null>>({})

  const queryKey = useMemo(() => ['manga-moments', mangaId, sort] as const, [mangaId, sort])

  const momentsQuery = useInfiniteQuery<MomentPageResponse>({
    queryKey,
    queryFn: ({ pageParam = 0 }) => apiClient.listMangaMoments(mangaId, {
      page: typeof pageParam === 'number' ? pageParam : 0,
      size: 12,
      sort
    }),
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    initialPageParam: 0,
    staleTime: 15_000,
    refetchOnWindowFocus: false
  })

  const pages = momentsQuery.data?.pages ?? []
  const moments = useMemo(() => pages.flatMap((page) => page.items), [pages])
  const momentIds = useMemo(() => moments.map((item) => item.id), [moments])
  const uploaderIds = useMemo(() => moments.map((item) => item.uploaderId), [moments])
  const uploaderMap = useUserMiniBatch(uploaderIds)

  const commentCountsQuery = useQuery({
    queryKey: ['moment-comment-counts', mangaId, sort, momentIds.join(',')],
    queryFn: () => apiClient.getMomentCommentsCount(momentIds),
    enabled: momentIds.length > 0
  })

  const commentCountMap = useMemo(() => {
    const base: Record<number, number> = {}
    moments.forEach((moment) => {
      base[moment.id] = moment.commentsCount
    })
    const extra = commentCountsQuery.data ?? {}
    Object.entries(extra as Record<string, number>).forEach(([key, value]) => {
      const id = Number(key)
      if (!Number.isNaN(id)) {
        base[id] = typeof value === 'number' ? value : 0
      }
    })
    return base
  }, [moments, commentCountsQuery.data])

  useEffect(() => {
    setReactionOverrides((prev) => {
      if (!Object.keys(prev).length) {
        return prev
      }
      const next: Record<number, MomentReactionType | null> = { ...prev }
      let changed = false
      for (const key of Object.keys(prev)) {
        const id = Number(key)
        if (Number.isNaN(id)) {
          continue
        }
        const moment = moments.find((item) => item.id === id)
        if (!moment) {
          delete next[id]
          changed = true
          continue
        }
        const serverReaction = moment.userReaction ?? null
        if (serverReaction === prev[id]) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [moments])

  const reactionMap = useMemo(() => {
    const map: Record<number, MomentReactionType | null> = {}
    moments.forEach((moment) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(reactionOverrides, moment.id)
      const override = hasOverride ? reactionOverrides[moment.id] : undefined
      map[moment.id] = override !== undefined ? override : (moment.userReaction ?? null)
    })
    return map
  }, [moments, reactionOverrides])

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.5 })

  const updateCache = useCallback((updated: MomentResponse) => {
    queryClient.setQueryData<InfiniteData<MomentPageResponse>>(queryKey, (current) => {
      if (!current) return current
      let found = false
      const patchedPages = current.pages.map((page) => {
        let pageChanged = false
        const items = page.items.map((item) => {
          if (item.id === updated.id) {
            found = true
            pageChanged = true
            return { ...item, ...updated }
          }
          return item
        })
        return pageChanged ? { ...page, items } : page
      })
      if (!found) {
        return current
      }
      return { ...current, pages: patchedPages }
    })
  }, [queryClient, queryKey])

  const injectCreatedMoment = useCallback((created: MomentResponse) => {
    queryClient.setQueryData<InfiniteData<MomentPageResponse>>(queryKey, (current) => {
      if (!current) {
        return {
          pageParams: [0],
          pages: [{
            items: [created],
            page: 0,
            size: 12,
            total: 1,
            hasNext: false
          }]
        }
      }
      const [firstPage, ...rest] = current.pages
      const capacity = firstPage?.size ?? 12
      const updatedFirst: MomentPageResponse = {
        ...firstPage,
        items: [created, ...firstPage.items].slice(0, capacity),
        total: firstPage.total + 1,
        hasNext: firstPage.hasNext || firstPage.items.length >= capacity
      }
      return {
        ...current,
        pages: [updatedFirst, ...rest]
      }
    })
    setActiveMomentId(created.id)
    setViewerOpen(true)
  }, [queryClient, queryKey])

  const setReactionMutation = useMutation<MomentResponse, Error, ReactionPayload>({
    mutationFn: ({ momentId, reaction }) => apiClient.setMomentReaction(momentId, reaction),
    onSuccess: (data, variables) => {
      const nextReaction = data.userReaction ?? variables.reaction
      setReactionOverrides((prev) => ({ ...prev, [variables.momentId]: nextReaction }))
      updateCache({ ...data, userReaction: nextReaction })
    },
    onError: () => {
      toast.error('Не удалось сохранить реакцию')
    }
  })

  const clearReactionMutation = useMutation<MomentResponse, Error, { momentId: number }>({
    mutationFn: ({ momentId }) => apiClient.clearMomentReaction(momentId),
    onSuccess: (data, variables) => {
      const nextReaction = data.userReaction ?? null
      setReactionOverrides((prev) => ({ ...prev, [variables.momentId]: nextReaction }))
      updateCache({ ...data, userReaction: nextReaction })
    },
    onError: () => {
      toast.error('Не удалось обновить реакцию')
    }
  })

  const isProcessing = useCallback((momentId: number) => {
    return (
      (setReactionMutation.isPending && setReactionMutation.variables?.momentId === momentId) ||
      (clearReactionMutation.isPending && clearReactionMutation.variables?.momentId === momentId)
    )
  }, [setReactionMutation.isPending, setReactionMutation.variables, clearReactionMutation.isPending, clearReactionMutation.variables])

  const handleToggleReaction = useCallback((moment: MomentResponse, reaction: MomentReactionType) => {
    if (!isAuthenticated) {
      toast.info('Войдите, чтобы реагировать на моменты')
      return
    }
    setReactionMutation.mutate({ momentId: moment.id, reaction })
  }, [isAuthenticated, setReactionMutation])

  const handleClearReaction = useCallback((moment: MomentResponse) => {
    if (!isAuthenticated) {
      return
    }
    clearReactionMutation.mutate({ momentId: moment.id })
  }, [isAuthenticated, clearReactionMutation])

  const handleMomentCreated = useCallback((created: MomentResponse) => {
    injectCreatedMoment(created)
    if (sort !== 'new') {
      toast.info('Новый момент доступен во вкладке "Новые"')
    }
    setPendingNavigation(null)
  }, [injectCreatedMoment, sort])

  const activeMoment = useMemo(() => moments.find((item) => item.id === activeMomentId) ?? null, [moments, activeMomentId])
  const enrichedActiveMoment = useMemo(() => {
    if (!activeMoment) {
      return null
    }
    const commentCount = commentCountMap[activeMoment.id] ?? activeMoment.commentsCount
    const userReaction = reactionMap[activeMoment.id] ?? null
    return { ...activeMoment, commentsCount: commentCount, userReaction }
  }, [activeMoment, commentCountMap, reactionMap])
  const activeUploader = enrichedActiveMoment ? uploaderMap[enrichedActiveMoment.uploaderId] : undefined
  const currentMomentIndex = useMemo(() => {
    if (!activeMomentId) return -1
    return moments.findIndex((item) => item.id === activeMomentId)
  }, [moments, activeMomentId])
  const canNavigatePrev = currentMomentIndex > 0
  const canNavigateNext = currentMomentIndex >= 0 && (currentMomentIndex < moments.length - 1 || momentsQuery.hasNextPage)
  const isNextLoading = currentMomentIndex >= 0 && currentMomentIndex === moments.length - 1 && momentsQuery.isFetchingNextPage

  const handleOpenMoment = (momentId: number) => {
    setActiveMomentId(momentId)
    setViewerOpen(true)
    setPendingNavigation(null)
  }

  const handleViewerClose = () => {
    setPendingNavigation(null)
    setViewerOpen(false)
  }

  const handleCommentCountChange = useCallback((momentId: number, count: number) => {
    queryClient.setQueryData<InfiniteData<MomentPageResponse>>(queryKey, (current) => {
      if (!current) return current
      let changed = false
      const patchedPages = current.pages.map((page) => {
        const items = page.items.map((item) => {
          if (item.id === momentId) {
            changed = true
            return { ...item, commentsCount: count, commentsCount7d: count }
          }
          return item
        })
        return changed ? { ...page, items } : page
      })
      if (!changed) return current
      return { ...current, pages: patchedPages }
    })
  }, [queryClient, queryKey])

  const handleLoadMore = useCallback(() => {
    if (momentsQuery.hasNextPage && !momentsQuery.isFetchingNextPage) {
      momentsQuery.fetchNextPage()
    }
  }, [momentsQuery.hasNextPage, momentsQuery.isFetchingNextPage, momentsQuery.fetchNextPage])

  const handleNavigatePrev = useCallback(() => {
    if (currentMomentIndex <= 0) return
    setPendingNavigation(null)
    const previous = moments[currentMomentIndex - 1]
    if (previous) {
      setActiveMomentId(previous.id)
    }
  }, [currentMomentIndex, moments])

  const handleNavigateNext = useCallback(() => {
    if (currentMomentIndex === -1) return
    const nextIndex = currentMomentIndex + 1
    const nextMoment = moments[nextIndex]
    if (nextMoment) {
      setPendingNavigation(null)
      setActiveMomentId(nextMoment.id)
      return
    }
    if (pendingNavigation === 'next') return
    if (momentsQuery.hasNextPage) {
      setPendingNavigation('next')
      if (!momentsQuery.isFetchingNextPage) {
        momentsQuery.fetchNextPage()
      }
    }
  }, [currentMomentIndex, moments, momentsQuery.hasNextPage, momentsQuery.isFetchingNextPage, momentsQuery.fetchNextPage, pendingNavigation])

  useEffect(() => {
    if (pendingNavigation !== 'next') return
    if (currentMomentIndex === -1) return
    const nextIndex = currentMomentIndex + 1
    if (nextIndex < moments.length) {
      const nextMoment = moments[nextIndex]
      if (nextMoment) {
        setActiveMomentId(nextMoment.id)
        setPendingNavigation(null)
      }
      return
    }
    if (!momentsQuery.hasNextPage || !momentsQuery.isFetchingNextPage) {
      setPendingNavigation(null)
    }
  }, [pendingNavigation, currentMomentIndex, moments, momentsQuery.hasNextPage, momentsQuery.isFetchingNextPage])

  useEffect(() => {
    if (inView) {
      handleLoadMore()
    }
  }, [inView, handleLoadMore])

  const isEmpty = !momentsQuery.isLoading && moments.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.key}
              variant={option.key === sort ? 'default' : 'outline'}
              onClick={() => setSort(option.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm',
                option.key === sort
                  ? 'bg-primary text-black hover:bg-primary/90'
                  : 'border-white/20 text-white/75 hover:bg-white/10'
              )}
            >
              {option.icon}
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
        <MomentUploadDialog
          mangaId={mangaId}
          onCreated={handleMomentCreated}
          trigger={(
            <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10">
              <Upload className="h-4 w-4 mr-2" />
              Поделиться моментом
            </Button>
          )}
        />
      </div>

      {momentsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/70 space-y-4">
          <ImageIcon className="h-10 w-10 mx-auto text-white/40" />
          <div>
            <p className="text-lg font-semibold">В этой манге пока нет моментов</p>
            <p className="text-sm text-white/50">Будьте первым, поделитесь любимым кадром из «{mangaTitle}».</p>
          </div>
          <MomentUploadDialog mangaId={mangaId} onCreated={handleMomentCreated} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moments.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              onOpen={handleOpenMoment}
              onToggleReaction={handleToggleReaction}
              onClearReaction={handleClearReaction}
              disabled={isProcessing(moment.id)}
              commentCount={commentCountMap[moment.id] ?? moment.commentsCount}
              resolvedReaction={reactionMap[moment.id] ?? null}
              uploader={uploaderMap[moment.uploaderId]}
            />
          ))}
        </div>
      )}

      {momentsQuery.hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {momentsQuery.isFetchingNextPage ? <LoadingSpinner /> : <Button variant="outline" onClick={handleLoadMore}>Загрузить ещё</Button>}
        </div>
      )}

      <MomentViewerModal
        moment={enrichedActiveMoment}
        open={viewerOpen && !!enrichedActiveMoment}
        onClose={handleViewerClose}
        onToggleReaction={handleToggleReaction}
        onClearReaction={handleClearReaction}
        isProcessing={isProcessing}
        onCommentCountChange={handleCommentCountChange}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
        isNextLoading={isNextLoading}
        uploader={activeUploader}
      />
    </div>
  )
}

interface MomentCardProps {
  moment: MomentResponse
  onOpen: (momentId: number) => void
  onToggleReaction: (moment: MomentResponse, reaction: MomentReactionType) => void
  onClearReaction: (moment: MomentResponse) => void
  disabled: boolean
  commentCount: number
  resolvedReaction: MomentReactionType | null
  uploader?: UserMini
}

function MomentCard({ moment, onOpen, onToggleReaction, onClearReaction, disabled, commentCount, resolvedReaction, uploader }: MomentCardProps) {
  const reaction = resolvedReaction ?? moment.userReaction ?? null
  const isLiked = reaction === 'LIKE'
  const isDisliked = reaction === 'DISLIKE'
  const showWarning = moment.nsfw || moment.spoiler
  const displayName = uploader?.displayName || uploader?.username || `Пользователь ${moment.uploaderId}`
  const profileUrl = uploader ? buildProfileUrl(uploader.id, uploader.displayName, uploader.username) : undefined
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleLike = () => {
    if (isLiked) {
      onClearReaction(moment)
    } else {
      onToggleReaction(moment, 'LIKE')
    }
  }

  const handleDislike = () => {
    if (isDisliked) {
      onClearReaction(moment)
    } else {
      onToggleReaction(moment, 'DISLIKE')
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(moment.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(moment.id)
        }
      }}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:border-primary/40 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="aspect-[4/5] overflow-hidden bg-black/60">
        <img
          src={moment.image.url}
          alt={moment.caption}
          className={cn('h-full w-full object-cover transition duration-500 group-hover:scale-105', showWarning ? 'blur-lg' : '')}
        />
        {showWarning && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/70 py-2 text-sm text-white/80">
            {moment.spoiler ? 'Спойлер' : 'NSFW'} — откройте, чтобы увидеть
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          {profileUrl ? (
            <Link
              to={profileUrl}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-3 text-sm font-medium text-white/85 hover:text-white"
            >
              <Avatar className="h-10 w-10 border border-white/10 bg-white/10">
                {uploader?.avatar ? (
                  <AvatarImage src={uploader.avatar} alt={displayName} />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
              {displayName}
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white/10 bg-white/10">
                {uploader?.avatar ? (
                  <AvatarImage src={uploader.avatar} alt={displayName} />
                ) : (
                  <AvatarFallback>{initials}</AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium text-white/80">{displayName}</span>
            </div>
          )}
          <span className="text-xs text-white/50">{formatRelativeTime(moment.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span>Обновлено {formatRelativeTime(moment.lastActivityAt)}</span>
          {moment.chapterId && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
              Глава {moment.chapterId}
            </span>
          )}
          {moment.pageNumber && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
              Стр. {moment.pageNumber}
            </span>
          )}
        </div>
        <p className="line-clamp-3 text-sm text-white/85 whitespace-pre-line">{moment.caption || 'Без подписи'}</p>
        <div className="flex flex-wrap gap-2">
          {moment.spoiler && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">Спойлер</Badge>}
          {moment.nsfw && <Badge variant="secondary" className="bg-red-500/20 text-red-300">NSFW</Badge>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => { event.stopPropagation(); handleLike() }}
              disabled={disabled}
              className={cn('flex items-center gap-1 text-sm', isLiked ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/70 hover:text-white')}
            >
              <Heart className={cn('h-4 w-4', isLiked ? 'fill-current' : '')} />
              {moment.likesCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => { event.stopPropagation(); handleDislike() }}
              disabled={disabled}
              className={cn('flex items-center gap-1 text-sm', isDisliked ? 'text-slate-300' : 'text-white/70 hover:text-white')}
            >
              <ThumbsDown className={cn('h-4 w-4', isDisliked ? 'fill-current' : '')} />
              {moment.dislikesCount}
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            <MessageCircle className="h-4 w-4" />
            {commentCount}
          </div>
        </div>
      </div>
    </div>
  )
}
