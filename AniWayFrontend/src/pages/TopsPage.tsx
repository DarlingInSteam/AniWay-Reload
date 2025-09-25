import { useState, useMemo, useEffect } from 'react'
import { Users, MessageSquare, Hash, Quote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useUserMiniBatch } from '@/hooks/useUserMiniBatch'
import { useMangaMiniBatch } from '@/hooks/useMangaMiniBatch'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardRow } from '@/components/tops/LeaderboardRow'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { Link, useNavigate } from 'react-router-dom'

type UserMetric = 'readers' | 'likes' | 'comments' | 'level'
type Range = 'all' | '7' | '30'

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: 'За всё время', value: 'all' },
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' }
]

const USER_METRICS: { label: string; value: UserMetric; desc: string }[] = [
  { label: 'Читатели', value: 'readers', desc: 'По количеству прочитанных глав' },
  { label: 'Лайки', value: 'likes', desc: 'По количеству поставленных лайков' },
  { label: 'Комментарии', value: 'comments', desc: 'По количеству комментариев' },
  { label: 'Уровень', value: 'level', desc: 'По уровню (XP)' }
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

  // Tabs
  type TabKey = 'users' | 'reviews' | 'threads' | 'posts' | 'comments'
  const [activeTab, setActiveTab] = useState<TabKey>('users')
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'users', label: 'Пользователи' },
    { key: 'reviews', label: 'Обзоры' },
    { key: 'threads', label: 'Темы форума' },
    { key: 'posts', label: 'Посты' },
    { key: 'comments', label: 'Комментарии' }
  ]

  const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={"rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 md:p-6 space-y-4 " + (className||'')}>{children}</div>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((u: any, idx: number) => {
          const statLabel = (() => {
            switch (userMetric) {
              case 'readers': return `${u.chaptersReadCount ?? 0} глав`
              case 'likes': return `${u.likesGivenCount ?? 0} лайков`
              case 'comments': return `${u.commentsCount ?? 0} комм.`
              case 'level': return `LVL ${u.level ?? 1}`
            }
          })()
          const metric = (() => {
            switch (userMetric) {
              case 'readers': return u.chaptersReadCount ?? 0
              case 'likes': return u.likesGivenCount ?? 0
              case 'comments': return u.commentsCount ?? 0
              case 'level': return u.level ?? 0
            }
          })()
          return (
            <div key={u.id || idx} id={`user-${u.id}`} onClick={() => u.id && navigate(`/profile/${u.id}#from-tops`)}
              className="group cursor-pointer relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/40 to-slate-900/40 hover:from-indigo-700/30 hover:to-fuchsia-800/30 transition-colors p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-sm font-semibold text-white/70 border border-white/10">
                  {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover"/> : (u.username||'?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate text-white/90">{idx+1}. {u.username || 'Без имени'}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">{statLabel}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-white/40">
                    {u.level != null && <span className="rounded bg-purple-600/30 px-1.5 py-0.5">LVL {u.level}</span>}
                    {u.xp != null && <span className="rounded bg-indigo-600/30 px-1.5 py-0.5">XP {u.xp}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-white/40 pt-1">
                <span>Метрика: {metric}</span>
                <span>ID: {u.id}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Collect userIds for enrichment (reviews may have userId)
  const reviewUserMap = useUserMiniBatch((reviewsQuery.data||[]).map((r:any)=> r.userId))
  const reviewMangaMap = useMangaMiniBatch((reviewsQuery.data||[]).map((r:any)=> r.mangaId))
  const threadAuthorMap = useUserMiniBatch((threadsQuery.data||[]).map((t:any)=> t.authorId))
  const postAuthorMap = useUserMiniBatch((postsQuery.data||[]).map((p:any)=> p.authorId))
  const commentAuthorMap = useUserMiniBatch((commentsQuery.data||[]).map((c:any)=> c.userId))

  const renderReviews = () => {
    if (reviewsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (reviewsQuery.isError) return <LeaderboardError onRetry={() => reviewsQuery.refetch()} />
    const reviews = reviewsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {reviews.map((r: any, idx: number) => {
          const trust = (r.likeCount ?? 0) - (r.dislikeCount ?? 0)
          const author = reviewUserMap[r.userId]
          return (
            <div key={r.id || idx} id={`review-${r.id}`} className="glass-panel p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 border border-white/10">
                  {author?.avatar ? <img src={author.avatar} className="w-full h-full object-cover" alt={author.username}/> : (author?.username||'?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="font-semibold text-white/90">{idx+1}. {author?.displayName || author?.username || r.username || 'Пользователь'}</span>
                    {r.rating != null && <span className="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-200 font-medium">{r.rating}/10</span>}
                    <span className={`px-2 py-0.5 rounded text-purple-200 ${trust>0 ? 'bg-emerald-600/30 text-emerald-200' : trust<0 ? 'bg-rose-700/40 text-rose-200' : 'bg-purple-600/30 text-purple-200'}`}>Trust {trust}</span>
                    <span className="px-2 py-0.5 rounded bg-pink-600/30 text-pink-200">👍 {r.likeCount ?? r.likesCount ?? 0}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-600/30 text-rose-200">👎 {r.dislikeCount ?? r.dislikesCount ?? 0}</span>
                  </div>
                  <div className="mt-2 prose prose-invert text-sm max-w-none whitespace-pre-wrap leading-relaxed">
                    {r.comment || '—'}
                  </div>
                </div>
              </div>
              {r.mangaId && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition" onClick={()=> navigate(`/manga/${r.mangaId}#review-${r.id}`)}>
                  <div className="w-12 h-16 bg-white/10 rounded overflow-hidden flex items-center justify-center text-[10px] text-white/40">
                    {(() => {
                      const mini = reviewMangaMap[r.mangaId]
                      if (mini?.cover) return <img src={mini.cover} alt={mini.title} className="w-full h-full object-cover" />
                      return '—'
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/80 truncate">{(() => { const mini = reviewMangaMap[r.mangaId]; return mini?.title || r.mangaTitle || `Манга #${r.mangaId}` })()}</div>
                    <div className="text-[10px] text-white/40">Перейти к манге</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderThreads = () => {
    if (threadsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (threadsQuery.isError) return <LeaderboardError onRetry={() => threadsQuery.refetch()} />
    const threads = threadsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {threads.map((t: any, idx: number) => {
          const author = threadAuthorMap[t.authorId]
          return (
            <div key={t.id || idx} id={`thread-${t.id}`} className="glass-panel p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-200 font-bold text-sm">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white/90 mb-1 truncate">{t.title || `Тема #${t.id}`}</h3>
                  {author && <div className="text-[11px] text-white/50 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      {author.avatar && <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt={author.username}/>} {author.displayName || author.username}
                    </span>
                  </div>}
                  <div className="prose prose-invert text-sm max-w-none line-clamp-none whitespace-pre-wrap">{t.content}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/50">
                    <span>Ответы: {t.repliesCount ?? 0}</span>
                    <span>Лайки: {t.likesCount ?? 0}</span>
                    <span>Просмотры: {t.viewsCount ?? 0}</span>
                    <button onClick={()=> navigate(`/forum/thread/${t.id}#from-tops`)} className="underline decoration-dotted hover:text-white/80">Перейти</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderPosts = () => {
    if (postsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (postsQuery.isError) return <LeaderboardError onRetry={() => postsQuery.refetch()} />
    const posts = postsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {posts.map((p: any, idx: number) => {
          const trust = (p.likeCount ?? 0) - (p.dislikeCount ?? 0)
          const author = postAuthorMap[p.authorId]
          return (
            <div key={p.id || idx} id={`post-${p.id}`} className="glass-panel p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-fuchsia-600/30 flex items-center justify-center text-[11px] text-fuchsia-200 font-bold">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  {author && <div className="text-[11px] text-white/50 mb-1 flex items-center gap-2">
                    {author.avatar && <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt={author.username}/>}
                    <span>{author.displayName || author.username}</span>
                  </div>}
                  <div className="text-xs flex flex-wrap gap-2 mb-2 text-white/60">
                    <span className={`px-2 py-0.5 rounded ${trust>0 ? 'bg-emerald-600/30 text-emerald-200' : trust<0 ? 'bg-rose-700/40 text-rose-200' : 'bg-purple-600/30'}`}>Trust {trust}</span>
                    <span className="px-2 py-0.5 rounded bg-pink-600/30">👍 {p.likeCount ?? p.likesCount ?? 0}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-600/30">👎 {p.dislikeCount ?? p.dislikesCount ?? 0}</span>
                  </div>
                  <div className="prose prose-invert text-sm whitespace-pre-wrap">{p.content || p.contentExcerpt}</div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/50">
                    <button onClick={()=> navigate(`/forum/thread/${p.threadId}#post-${p.id}`)} className="underline decoration-dotted hover:text-white/80">Перейти к посту</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderComments = () => {
    if (commentsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (commentsQuery.isError) return <LeaderboardError onRetry={() => commentsQuery.refetch()} />
    const comments = commentsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {comments.map((c: any, idx: number) => {
          const trust = (c.likeCount ?? 0) - (c.dislikeCount ?? 0)
          const targetLink = (() => {
            const type = (c.commentType || '').toUpperCase()
            switch(type){
              case 'MANGA': return `/manga/${c.targetId}#comment-${c.id}`
              case 'CHAPTER': return `/reader/${c.targetId}#comment-${c.id}`
              default: return `/comments/${c.id}`
            }
          })()
          const author = commentAuthorMap[c.userId]
          return (
            <div key={c.id || idx} id={`comment-${c.id}`} className="glass-panel p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-200">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  {author && <div className="text-[11px] text-white/50 mb-1 flex items-center gap-2">
                    {author.avatar && <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt={author.username}/>}
                    <span>{author.displayName || author.username}</span>
                  </div>}
                  <div className="flex flex-wrap gap-2 text-[10px] text-white/60 mb-2">
                    <span className={`px-2 py-0.5 rounded ${trust>0 ? 'bg-emerald-600/30 text-emerald-200' : trust<0 ? 'bg-rose-700/40 text-rose-200' : 'bg-purple-600/30'}`}>Trust {trust}</span>
                    <span className="px-2 py-0.5 rounded bg-pink-600/30">👍 {c.likeCount ?? c.likesCount ?? 0}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-600/30">👎 {c.dislikeCount ?? c.dislikesCount ?? 0}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-600/30">{c.commentType}</span>
                  </div>
                  <div className="prose prose-invert text-sm whitespace-pre-wrap">{c.content || c.contentExcerpt}</div>
                  <div className="mt-3 flex gap-3 text-[10px] text-white/50">
                    <button onClick={()=> navigate(targetLink)} className="underline decoration-dotted hover:text-white/80">Перейти к источнику</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">Топы сообщества</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">Пятисекционные рейтинги активности: пользователи, обзоры, темы, посты и комментарии. Клик ведёт к исходному контенту с якорями.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={()=> setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${activeTab===t.key ? 'bg-primary text-white shadow-inner' : 'bg-white/5 text-white/60 hover:text-white/90'}`}>{t.label}</button>
          ))}
          {activeTab==='users' && (
            <div className="ml-auto"><Segmented value={userMetric} onChange={setUserMetric} options={USER_METRICS} /></div>
          )}
          {activeTab==='reviews' && (
            <div className="ml-auto"><Segmented value={String(reviewsDays)} onChange={(v)=> setReviewsDays(Number(v))} options={[{label:'7 д', value:'7'},{label:'30 д', value:'30'},{label:'90 д', value:'90'}]} /></div>
          )}
          {activeTab==='threads' && (
            <div className="ml-auto"><Segmented value={threadsRange} onChange={setThreadsRange} options={RANGE_OPTIONS} /></div>
          )}
          {activeTab==='posts' && (
            <div className="ml-auto"><Segmented value={postsRange} onChange={setPostsRange} options={RANGE_OPTIONS} /></div>
          )}
          {activeTab==='comments' && (
            <div className="ml-auto"><Segmented value={commentsRange} onChange={setCommentsRange} options={RANGE_OPTIONS} /></div>
          )}
        </div>
      </div>

      <div>
        {activeTab === 'users' && <Panel>{renderUsers()}</Panel>}
        {activeTab === 'reviews' && <Panel>{renderReviews()}</Panel>}
        {activeTab === 'threads' && <Panel>{renderThreads()}</Panel>}
        {activeTab === 'posts' && <Panel>{renderPosts()}</Panel>}
        {activeTab === 'comments' && <Panel>{renderComments()}</Panel>}
      </div>
    </div>
  )
}

export default TopsPage
