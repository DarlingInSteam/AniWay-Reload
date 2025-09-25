import { useState, useMemo } from 'react'
import { Users, MessageSquare, ThumbsUp, Hash, Quote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardRow } from '@/components/tops/LeaderboardRow'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { Link, useNavigate } from 'react-router-dom'

type UserMetric = 'readers' | 'likes' | 'comments'
type Range = 'all' | '7' | '30'

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: 'За всё время', value: 'all' },
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' }
]

const USER_METRICS: { label: string; value: UserMetric; desc: string }[] = [
  { label: 'Читатели', value: 'readers', desc: 'По количеству прочитанных глав' },
  { label: 'Лайки', value: 'likes', desc: 'По количеству поставленных лайков' },
  { label: 'Комментарии', value: 'comments', desc: 'По количеству комментариев' }
]

export function TopsPage() {
  const [userMetric, setUserMetric] = useState<UserMetric>('readers')
  const [threadsRange, setThreadsRange] = useState<Range>('all')
  const [postsRange, setPostsRange] = useState<Range>('all')
  const [commentsRange, setCommentsRange] = useState<Range>('all')
  const [reviewsDays, setReviewsDays] = useState<number>(7)
  const navigate = useNavigate()

  // Users
  const usersQuery = useQuery({
    queryKey: ['tops-users', userMetric],
    queryFn: () => apiClient.getTopUsers({ metric: userMetric, limit: 20 }),
    staleTime: 60_000
  })

  // Reviews
  const reviewsQuery = useQuery({
    queryKey: ['tops-reviews', reviewsDays],
    queryFn: () => apiClient.getTopReviews({ days: reviewsDays, limit: 20 }),
    staleTime: 60_000
  })

  // Threads
  const threadsQuery = useQuery({
    queryKey: ['tops-threads', threadsRange],
    queryFn: () => apiClient.getTopThreads({ range: threadsRange, limit: 15 }),
    staleTime: 60_000
  })

  // Posts
  const postsQuery = useQuery({
    queryKey: ['tops-posts', postsRange],
    queryFn: () => apiClient.getTopPosts({ range: postsRange, limit: 15 }),
    staleTime: 60_000
  })

  // Comments
  const commentsQuery = useQuery({
    queryKey: ['tops-comments', commentsRange],
    queryFn: () => apiClient.getTopComments({ range: commentsRange, limit: 15 }),
    staleTime: 60_000
  })

  const Section = ({
    title,
    actions,
    icon,
    children
  }: { title: string; icon?: any; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/30 p-4 md:p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        {icon && <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-600/30 flex items-center justify-center text-indigo-300">{icon}</div>}
        <div className="flex-1">
          <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </div>
  )

  const Segmented = ({ value, onChange, options }: { value: string; onChange: (v: any) => void; options: { label: string; value: any }[] }) => (
    <div className="inline-flex rounded-full bg-card/30 p-1 border border-border/30 text-xs md:text-sm">
      {options.map(opt => (
        <button
          key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 md:px-4 py-1.5 rounded-full font-medium transition-colors ${value === opt.value ? 'bg-primary text-white shadow-inner' : 'text-muted-foreground hover:text-white'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  const renderUsers = () => {
    if (usersQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (usersQuery.isError) return <LeaderboardError onRetry={() => usersQuery.refetch()} />
    const users = usersQuery.data || []
    return (
      <div className="space-y-2">
        {users.map((u: any, idx: number) => (
          <LeaderboardRow
            key={u.id || idx}
            rank={idx + 1}
            primary={<span className="truncate">{u.username || u.name || 'Без имени'}</span>}
            secondary={
              userMetric === 'readers' ? `${u.chaptersReadCount ?? 0} глав` :
              userMetric === 'likes' ? `${u.likesGivenCount ?? 0} лайков` :
              `${u.commentsCount ?? 0} комм.`
            }
            metricValue={
              userMetric === 'readers' ? u.chaptersReadCount : userMetric === 'likes' ? u.likesGivenCount : u.commentsCount
            }
            onClick={() => u.id && navigate(`/profile/${u.id}`)}
          />
        ))}
      </div>
    )
  }

  const renderReviews = () => {
    if (reviewsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (reviewsQuery.isError) return <LeaderboardError onRetry={() => reviewsQuery.refetch()} />
    const reviews = reviewsQuery.data || []
    return (
      <div className="space-y-2">
        {reviews.map((r: any, idx: number) => (
          <LeaderboardRow
            key={r.id || idx}
            rank={idx + 1}
            primary={<span className="truncate">{r.title || `Обзор #${r.id}`}</span>}
            secondary={`${(r.likeCount ?? 0) - (r.dislikeCount ?? 0)} доверие • ${r.likeCount ?? 0}👍 / ${r.dislikeCount ?? 0}👎`}
            metricValue={(r.likeCount ?? 0) - (r.dislikeCount ?? 0)}
          />
        ))}
      </div>
    )
  }

  const renderThreads = () => {
    if (threadsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (threadsQuery.isError) return <LeaderboardError onRetry={() => threadsQuery.refetch()} />
    const threads = threadsQuery.data || []
    return (
      <div className="space-y-2">
        {threads.map((t: any, idx: number) => (
          <LeaderboardRow
            key={t.id || idx}
            rank={idx + 1}
            primary={<span className="truncate">{t.title || `Тема #${t.id}`}</span>}
            secondary={`${t.repliesCount ?? 0} ответов • ${t.likesCount ?? 0} лайков • ${t.viewsCount ?? 0} просмотров`}
            metricValue={t.repliesCount ?? 0}
            onClick={() => t.id && navigate(`/forum/thread/${t.id}`)}
          />
        ))}
      </div>
    )
  }

  const renderPosts = () => {
    if (postsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (postsQuery.isError) return <LeaderboardError onRetry={() => postsQuery.refetch()} />
    const posts = postsQuery.data || []
    return (
      <div className="space-y-2">
        {posts.map((p: any, idx: number) => (
          <LeaderboardRow
            key={p.id || idx}
            rank={idx + 1}
            primary={<span className="truncate">Пост #{p.id}</span>}
            secondary={`${(p.likeCount ?? 0) - (p.dislikeCount ?? 0)} доверие • ${p.likeCount ?? 0}👍 / ${p.dislikeCount ?? 0}👎`}
            metricValue={(p.likeCount ?? 0) - (p.dislikeCount ?? 0)}
          />
        ))}
      </div>
    )
  }

  const renderComments = () => {
    if (commentsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (commentsQuery.isError) return <LeaderboardError onRetry={() => commentsQuery.refetch()} />
    const comments = commentsQuery.data || []
    return (
      <div className="space-y-2">
        {comments.map((c: any, idx: number) => (
          <LeaderboardRow
            key={c.id || idx}
            rank={idx + 1}
            primary={<span className="truncate">Комментарий #{c.id}</span>}
            secondary={`${(c.likeCount ?? 0) - (c.dislikeCount ?? 0)} доверие • ${c.likeCount ?? 0}👍 / ${c.dislikeCount ?? 0}👎`}
            metricValue={(c.likeCount ?? 0) - (c.dislikeCount ?? 0)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
            Топы сообщества
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Лидеры по активности на площадке: читатели, авторы обзоров, популярные темы форума, посты и комментарии.
            Метрики обновляются в реальном времени на основе данных сервисов.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users */}
        <Section
          title="Пользователи"
          icon={<Users className="w-6 h-6" />}
          actions={<Segmented value={userMetric} onChange={setUserMetric} options={USER_METRICS} />}
        >
          {renderUsers()}
        </Section>

        {/* Reviews */}
        <Section
          title="Обзоры"
          icon={<Quote className="w-6 h-6" />}
          actions={
            <Segmented
              value={String(reviewsDays)}
              onChange={(v) => setReviewsDays(Number(v))}
              options={[
                { label: '7 д', value: '7' },
                { label: '30 д', value: '30' },
                { label: '90 д', value: '90' },
              ]}
            />
          }
        >
          {renderReviews()}
        </Section>

        {/* Threads */}
        <Section
          title="Темы форума"
          icon={<Hash className="w-6 h-6" />}
          actions={<Segmented value={threadsRange} onChange={setThreadsRange} options={RANGE_OPTIONS} />}
        >
          {renderThreads()}
        </Section>

        {/* Posts */}
        <Section
          title="Посты"
          icon={<MessageSquare className="w-6 h-6" />}
          actions={<Segmented value={postsRange} onChange={setPostsRange} options={RANGE_OPTIONS} />}
        >
          {renderPosts()}
        </Section>

        {/* Comments */}
        <Section
          title="Комментарии"
          icon={<MessageSquare className="w-6 h-6" />}
          actions={<Segmented value={commentsRange} onChange={setCommentsRange} options={RANGE_OPTIONS} />}
        >
          {renderComments()}
        </Section>
      </div>
    </div>
  )
}

export default TopsPage
