import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageCircle, ThumbsUp, Eye, Pin, Plus, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useThreadAuthors } from '@/hooks/useThreadAuthors'
import type { ForumThread, MangaDiscussionSort, PaginatedResponse } from '@/types/forum'

interface MangaDiscussionsProps {
  mangaId: number
  mangaTitle: string
}

const sortOptions: Array<{ key: MangaDiscussionSort; label: string }> = [
  { key: 'popular', label: 'Популярные' },
  { key: 'active', label: 'Активные' },
  { key: 'new', label: 'Новые' },
]

export function MangaDiscussions({ mangaId, mangaTitle }: MangaDiscussionsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<MangaDiscussionSort>('popular')
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const discussionsQuery = useInfiniteQuery<PaginatedResponse<ForumThread>, Error>({
    queryKey: ['manga-discussions', mangaId, sort],
    queryFn: ({ pageParam = 0 }) => apiClient.getMangaDiscussions(mangaId, {
      page: typeof pageParam === 'number' ? pageParam : 0,
      size: 10,
      sort,
    }),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    initialPageParam: 0,
    staleTime: 60 * 1000,
  })

  const threads: ForumThread[] = useMemo(() => {
    if (!discussionsQuery.data?.pages) return []
  return discussionsQuery.data.pages.flatMap((page: PaginatedResponse<ForumThread>) => page.content)
  }, [discussionsQuery.data])

  const authors = useThreadAuthors(threads)

  const createDiscussion = useMutation<void, Error, void>({
    mutationFn: async () => {
      const trimmedTitle = title.trim()
      const trimmedContent = content.trim()
      if (!trimmedTitle || !trimmedContent) {
        throw new Error('Заполните заголовок и текст обсуждения')
      }
      await apiClient.createMangaDiscussion(mangaId, {
        categoryName: mangaTitle,
        title: trimmedTitle,
        content: trimmedContent,
      })
    },
    onSuccess: () => {
      setIsCreating(false)
      setTitle('')
      setContent('')
      setFormError(null)
      queryClient.invalidateQueries({ queryKey: ['manga-discussions', mangaId] })
    },
    onError: (error) => {
      const message = error?.message || 'Не удалось создать обсуждение'
      setFormError(message)
    },
  })

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) {
      setFormError('Войдите в аккаунт, чтобы создавать обсуждения')
      return
    }
    setFormError(null)
    createDiscussion.mutate()
  }

  const isLoading = discussionsQuery.isLoading
  const isFetchingMore = discussionsQuery.isFetchingNextPage
  const hasMore = discussionsQuery.hasNextPage

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-white">Обсуждения манги</h3>
          <p className="text-sm text-white/60">Делитесь впечатлениями и находите собеседников</p>
        </div>
        <div className="flex items-center gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.key}
              variant={option.key === sort ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort(option.key)}
              className={option.key === sort ? 'bg-primary text-black hover:bg-primary/90' : 'border-white/20 text-white/80 hover:bg-white/10'}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-white">Создать обсуждение</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!user) {
                setFormError('Войдите в аккаунт, чтобы создавать обсуждения')
                return
              }
              setIsCreating((prev) => !prev)
              setFormError(null)
            }}
            className="border-white/20 text-white/80 hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? 'Отменить' : 'Новая тема'}
          </Button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/10">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`Заголовок обсуждения для «${mangaTitle}»`}
              maxLength={200}
              className="bg-black/40 text-white border-white/20 focus:border-primary"
            />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Опишите тему обсуждения, задайте вопрос или поделитесь мнением"
              className="min-h-[140px] bg-black/40 text-white border-white/20 focus:border-primary"
              maxLength={10000}
            />
            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={createDiscussion.isPending}>
                {createDiscussion.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохраняем...
                  </>
                ) : (
                  'Создать'
                )}
              </Button>
              <p className="text-xs text-white/60">Категория создастся автоматически, если её ещё нет</p>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            Пока обсуждений нет. Станьте первым и начните беседу!
          </div>
        ) : (
          threads.map((thread) => {
            const author = thread.authorId ? authors[thread.authorId] : undefined
            const snippet = (thread.content || '').replace(/\s+/g, ' ').trim()
            const preview = snippet.length > 180 ? `${snippet.slice(0, 180)}…` : snippet
            const activityTs = thread.lastActivityAt || thread.updatedAt || thread.createdAt
            const activityLabel = activityTs ? formatRelativeTime(activityTs) : 'Нет активности'

            return (
              <Link
                key={thread.id}
                to={`/forum/thread/${thread.id}`}
                className="block bg-black/40 border border-white/10 rounded-2xl p-4 hover:border-primary/60 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {thread.isPinned && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-transparent">
                        <Pin className="w-3 h-3 mr-1" />
                        Закреплено
                      </Badge>
                    )}
                    <h5 className="text-white text-lg font-semibold line-clamp-1">{thread.title}</h5>
                  </div>
                  {preview && <p className="text-sm text-white/70 line-clamp-2">{preview}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {thread.repliesCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {thread.likesCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {thread.viewsCount ?? 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {author ? author.displayName : `Пользователь ${thread.authorId}`}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      •
                      {activityLabel}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => discussionsQuery.fetchNextPage()}
            disabled={isFetchingMore}
            className="border-white/20 text-white/80 hover:bg-white/10"
          >
            {isFetchingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Загружаем ещё
              </>
            ) : (
              'Показать ещё'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
