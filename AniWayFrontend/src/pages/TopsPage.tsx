import { useState, useMemo, useEffect } from 'react'
import { Users, MessageSquare, Hash, Quote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { useUserMiniBatch } from '@/hooks/useUserMiniBatch'
import { useMangaMiniBatch } from '@/hooks/useMangaMiniBatch'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardRow } from '@/components/tops/LeaderboardRow'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

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
  // Removed forum posts tab (postsRange) per request
  const [commentsRange, setCommentsRange] = useState<Range>('all')
  const [wallRange, setWallRange] = useState<'all' | '7' | '30' | 'today'>('all')
  const [reviewsDays, setReviewsDays] = useState<number>(7)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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

  // Forum posts leaderboard removed

  // Comments
  const commentsQuery = useQuery({
    queryKey: ['tops-comments', commentsRange],
    queryFn: () => apiClient.getTopComments({ range: commentsRange, limit: 15 }),
    staleTime: 60_000
  })

  // Wall posts (profile posts)
  const wallPostsQuery = useQuery({
    queryKey: ['tops-wall-posts', wallRange],
    queryFn: () => apiClient.getTopWallPosts({ range: wallRange, limit: 15 }),
    staleTime: 60_000
  })

  // Tabs
  type TabKey = 'users' | 'reviews' | 'threads' | 'comments' | 'wall'
  const initialTab = (() => {
    const qp = (searchParams.get('tab') || '').toLowerCase()
    const allowed: TabKey[] = ['users','reviews','threads','comments','wall']
    return (allowed.includes(qp as TabKey) ? qp : 'users') as TabKey
  })()
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  // Update URL when tab changes (preserve other params)
  useEffect(()=> {
    const current = searchParams.get('tab')
    if(current !== activeTab){
      const sp = new URLSearchParams(searchParams.toString())
      sp.set('tab', activeTab)
      setSearchParams(sp, { replace: true })
    }
  }, [activeTab])
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'users', label: 'Пользователи' },
    { key: 'reviews', label: 'Обзоры' },
    { key: 'threads', label: 'Темы форума' },
    { key: 'comments', label: 'Комментарии' },
    { key: 'wall', label: 'Стена' }
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
          // Derive level consistently if mismatch: fallback formula from total activity if xp present
          const derivedLevel = (() => {
            // Simple progressive thresholds similar to profile fallback (0,50,150,300,500,...)
            const thresholds = [0,50,150,300,500,750,1000,1500,2000,3000]
            const xpVal = u.xp ?? 0
            for(let i=thresholds.length-1;i>=0;i--){
              if(xpVal >= thresholds[i]) return i+1
            }
            return 1
          })()
          const levelToShow = u.level && u.xp!=null ? (Math.abs(derivedLevel - u.level) > 1 ? derivedLevel : u.level) : (u.level ?? derivedLevel)
          const statLabel = (() => {
            switch (userMetric) {
              case 'readers': return `${u.chaptersReadCount ?? 0} глав`
              case 'likes': return `${u.likesGivenCount ?? 0} лайков`
              case 'comments': return `${u.commentsCount ?? 0} комм.`
              case 'level': return `LVL ${levelToShow}`
            }
          })()
          const metric = (() => {
            switch (userMetric) {
              case 'readers': return u.chaptersReadCount ?? 0
              case 'likes': return u.likesGivenCount ?? 0
              case 'comments': return u.commentsCount ?? 0
              case 'level': return levelToShow ?? 0
            }
          })()
          return (
            <div key={u.id || idx} id={`user-${u.id}`} onClick={() => u.id && navigate(`/profile/${u.id}#from-tops`)}
              className="glass-panel group cursor-pointer relative overflow-hidden rounded-xl p-4 flex flex-col gap-3 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-sm font-semibold text-white/70 border border-white/10 ring-1 ring-white/10">
                  {u.avatar ? <img src={u.avatar} alt={u.username} className="w-full h-full object-cover"/> : (u.username||'?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate text-white/90 flex-1">{idx+1}. {u.username || 'Без имени'}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-600/25 text-indigo-200/90 backdrop-blur-sm border border-white/10 shadow-sm">{statLabel}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    {levelToShow != null && <span className="px-2 py-0.5 rounded bg-purple-600/25 text-purple-200 border border-white/10">LVL {levelToShow}</span>}
                    {u.xp != null && <span className="px-2 py-0.5 rounded bg-fuchsia-600/25 text-fuchsia-200 border border-white/10">XP {u.xp}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/45 pt-1">
                <span className="font-medium tracking-tight">Метрика: <span className="text-white/70">{metric}</span></span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">ID {u.id}</span>
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
  // Removed forum posts author enrichment
  const wallAuthorMap = useUserMiniBatch((wallPostsQuery.data||[]).map((p:any)=> p.userId))
  // Collect manga references from wall posts for mini-cards (type === 'MANGA')
  const wallMangaRefIds = useMemo(()=> {
    return Array.from(new Set((wallPostsQuery.data||[])
      .flatMap((p:any)=> (p.references||[])
        .filter((r:any)=> (r.type||'').toUpperCase()==='MANGA')
        .map((r:any)=> r.refId))))
  }, [wallPostsQuery.data])
  const wallMangaMap = useMangaMiniBatch(wallMangaRefIds)
  const commentAuthorMap = useUserMiniBatch((commentsQuery.data||[]).map((c:any)=> c.userId))

  const renderReviews = () => {
    if (reviewsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (reviewsQuery.isError) return <LeaderboardError onRetry={() => reviewsQuery.refetch()} />
    const reviews = reviewsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {reviews.map((r: any, idx: number) => {
          const likeVal = r.likeCount ?? r.likesCount ?? 0
          const dislikeVal = r.dislikeCount ?? r.dislikesCount ?? 0
          const trust = likeVal - dislikeVal
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
                  <div className="mt-2 prose prose-invert text-sm max-w-none leading-relaxed markdown-body">
                    <MarkdownRenderer value={r.comment || ''} />
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
                  <div className="prose prose-invert text-sm max-w-none line-clamp-none markdown-body">
                    <MarkdownRenderer value={t.content || ''} />
                  </div>
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

  // renderPosts removed

  const renderComments = () => {
    if (commentsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (commentsQuery.isError) return <LeaderboardError onRetry={() => commentsQuery.refetch()} />
    const comments = commentsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {comments.map((c: any, idx: number) => {
          // Wider fallback scanning for like/dislike values
          const likeCandidates = [c.likeCount, c.likesCount, c.upVotes, c.positive, c.up]
          const dislikeCandidates = [c.dislikeCount, c.dislikesCount, c.downVotes, c.negative, c.down]
          const likeVal = likeCandidates.find(v=> typeof v === 'number') ?? (typeof c.trustFactor==='number' && c.trustFactor>0 ? c.trustFactor : 0)
          const dislikeVal = dislikeCandidates.find(v=> typeof v === 'number') ?? (typeof c.trustFactor==='number' && c.trustFactor<0 ? Math.abs(c.trustFactor) : 0)
          const trust = typeof c.trustFactor === 'number' ? c.trustFactor : (likeVal - dislikeVal)
          const targetLink = (() => {
            const type = (c.commentType || c.type || '').toUpperCase()
            switch(type){
              case 'MANGA': return `/manga/${c.targetId}#comment-${c.id}`
              case 'CHAPTER': return `/reader/${c.targetId}#comment-${c.id}`
              case 'REVIEW': return `/reviews/${c.targetId}#comment-${c.id}`
              case 'POST': return `/forum/post/${c.targetId}#comment-${c.id}`
              case 'PROFILE':
              case 'PROFILE_POST': return `/profile/${c.targetUserId || c.targetId || c.userId}#comment-${c.id}`
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
                    <span className="px-2 py-0.5 rounded bg-pink-600/30">👍 {likeVal}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-600/30">👎 {dislikeVal}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-600/30">{c.commentType}</span>
                  </div>
                  <div className="prose prose-invert text-sm markdown-body">
                    <MarkdownRenderer value={(c.content || c.contentExcerpt || '')} />
                  </div>
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

  const renderWallPosts = () => {
    if (wallPostsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
    if (wallPostsQuery.isError) return <LeaderboardError onRetry={() => wallPostsQuery.refetch()} />
    const wallPosts = wallPostsQuery.data || []
    return (
      <div className="flex flex-col gap-5">
        {wallPosts.map((p: any, idx: number) => {
          const stats = p.stats || {}
          const author = wallAuthorMap[p.userId]
          const mangaRefs = (p.references||[]).filter((r:any)=> (r.type||'').toUpperCase()==='MANGA')
          return (
            <div key={p.id || idx} id={`wall-post-${p.id}`} className="glass-panel p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-amber-600/30 flex items-center justify-center text-[11px] text-amber-200 font-bold">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  {author && <div className="text-[11px] text-white/50 mb-1 flex items-center gap-2">
                    {author.avatar && <img src={author.avatar} className="w-4 h-4 rounded-full object-cover" alt={author.username}/>}
                    <span>{author.displayName || author.username}</span>
                  </div>}
                  <div className="flex flex-wrap gap-2 text-[10px] text-white/60 mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-600/30">Score {typeof stats.score === 'number' ? stats.score : ( (stats.up || 0) - (stats.down || 0) )}</span>
                    <span className="px-2 py-0.5 rounded bg-pink-600/30">👍 {stats.up ?? 0}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-600/30">👎 {stats.down ?? 0}</span>
                  </div>
                  <div className="prose prose-invert text-sm markdown-body">
                    <MarkdownRenderer value={p.content || ''} />
                  </div>
                  {mangaRefs.length>0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {mangaRefs.map((r:any)=> {
                        const mini = wallMangaMap[r.refId]
                        if(!mini) return null
                        return (
                          <div key={r.id} onClick={()=> navigate(`/manga/${mini.id}#wall-post-${p.id}`)} className="group flex items-center gap-3 p-2 rounded-lg bg-blue-600/10 border border-blue-400/20 hover:bg-blue-600/15 cursor-pointer transition">
                            <div className="w-10 h-14 rounded bg-white/10 overflow-hidden flex items-center justify-center text-[10px] text-white/40">
                              {mini.cover ? <img src={mini.cover} alt={mini.title} className="w-full h-full object-cover"/> : '—'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-sky-300 truncate group-hover:text-sky-200">{mini.title}</div>
                              <div className="text-[10px] text-white/40">Манга</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {p.attachments?.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {p.attachments.slice(0,6).map((a: any) => (
                        <div key={a.id} className="relative group">
                          <img src={a.url} alt={a.filename} className="w-full h-24 object-cover rounded border border-white/10" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/50">
                    <button onClick={()=> navigate(`/profile/${p.userId}#wall-post-${p.id}`)} className="underline decoration-dotted hover:text-white/80">Перейти к посту</button>
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
          <p className="text-muted-foreground text-sm max-w-2xl">Рейтинги активности: пользователи, обзоры, темы форума, комментарии и посты на стене. Клик ведёт к исходному контенту с якорями.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={()=> setActiveTab(t.key)}
              className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition backdrop-blur-sm border ${(activeTab===t.key)
                ? 'bg-white/15 border-white/30 text-white shadow-sm'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white/85 hover:bg-white/10'} overflow-hidden`}
            >
              <span className="relative z-10">{t.label}</span>
              {activeTab===t.key && <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-pink-500/10" />}
            </button>
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
          {/* posts tab removed */}
          {activeTab==='comments' && (
            <div className="ml-auto"><Segmented value={commentsRange} onChange={setCommentsRange} options={RANGE_OPTIONS} /></div>
          )}
          {activeTab==='wall' && (
            <div className="ml-auto"><Segmented value={wallRange} onChange={setWallRange} options={[{label:'Все', value:'all'},{label:'Сегодня', value:'today'},{label:'7 д', value:'7'},{label:'30 д', value:'30'}]} /></div>
          )}
        </div>
      </div>

      <div>
        {activeTab === 'users' && <Panel>{renderUsers()}</Panel>}
        {activeTab === 'reviews' && <Panel>{renderReviews()}</Panel>}
        {activeTab === 'threads' && <Panel>{renderThreads()}</Panel>}
  {/* posts panel removed */}
        {activeTab === 'comments' && <Panel>{renderComments()}</Panel>}
        {activeTab === 'wall' && <Panel>{renderWallPosts()}</Panel>}
      </div>
    </div>
  )
}

export default TopsPage
