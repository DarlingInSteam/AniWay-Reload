import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, Hash, Quote, Sparkles, TrendingUp, Trophy, BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api'
import { LeaderboardSkeleton } from '@/components/tops/LeaderboardSkeleton'
import { LeaderboardRow } from '@/components/tops/LeaderboardRow'
import { LeaderboardError } from '@/components/tops/LeaderboardError'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { useUserLevelsBatch } from '@/hooks/useUserLevelsBatch'
import { useUserMiniBatch, type UserMini } from '@/hooks/useUserMiniBatch'
import { useMangaMiniBatch, type MangaMini } from '@/hooks/useMangaMiniBatch'
import type {
	TopUserDTO,
	TopReviewDTO,
	TopForumThreadDTO,
	TopCommentDTO,
	TopWallPostDTO
} from '@/types'

type TabKey = 'users' | 'reviews' | 'threads' | 'comments' | 'wall'
type Range = 'all' | '7' | '30'
type WallRange = Range | 'today'
type UserMetric = 'readers' | 'likes' | 'comments' | 'level'

type TabMeta = {
	label: string
	description: string
	hint: string
	icon: LucideIcon
}

type SummaryCard = {
	key: string
	label: string
	value: string
	hint: string
	icon: LucideIcon
	accent: string
}

type SegmentedOption = {
	label: string
	value: string
	hint?: string
}

const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const shortFormatter = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })

const TABS: TabKey[] = ['users', 'reviews', 'threads', 'comments', 'wall']

const USER_METRICS: Array<{ label: string; value: UserMetric; hint: string }> = [
	{ label: 'Читатели', value: 'readers', hint: 'Количество прочитанных глав' },
	{ label: 'Лайки', value: 'likes', hint: 'Поставленные реакции' },
	{ label: 'Комментарии', value: 'comments', hint: 'Активность в обсуждениях' },
	{ label: 'Уровень', value: 'level', hint: 'Уровень и набранный опыт' }
]

const RANGE_OPTIONS: Array<{ label: string; value: Range }> = [
	{ label: 'За всё время', value: 'all' },
	{ label: '30 дней', value: '30' },
	{ label: '7 дней', value: '7' }
]

const WALL_RANGE_OPTIONS: Array<{ label: string; value: WallRange }> = [
	{ label: 'Все время', value: 'all' },
	{ label: '30 дней', value: '30' },
	{ label: '7 дней', value: '7' },
	{ label: 'Сегодня', value: 'today' }
]

const REVIEW_RANGE_OPTIONS: SegmentedOption[] = [
	{ label: '7 дней', value: '7' },
	{ label: '30 дней', value: '30' },
	{ label: '90 дней', value: '90' }
]

const TAB_META: Record<TabKey, TabMeta> = {
	users: {
		label: 'Пользователи',
		description: 'Самые активные читатели и комментаторы за выбранный период.',
		hint: 'Кликайте по карточкам и строкам, чтобы перейти в профиль участника и посмотреть его активность.',
		icon: Users
	},
	reviews: {
		label: 'Обзоры',
		description: 'Подборка обзоров и рецензий, которые вызывают наибольший отклик.',
		hint: 'Карточка раскрывает автора и ссылку на мангу; переходите, чтобы прочитать полный обзор.',
		icon: Quote
	},
	threads: {
		label: 'Темы форума',
		description: 'Обсуждения, которые поддерживают общение и собирают ответы.',
		hint: 'Просматривайте метрики темы и переходите сразу к обсуждению на форуме.',
		icon: Hash
	},
	comments: {
		label: 'Комментарии',
		description: 'Реплики, которые набрали максимальное доверие и реакции.',
		hint: 'Карточка показывает автора, доверие и реакции; переходите прямо к источнику.',
		icon: MessageSquare
	},
	wall: {
		label: 'Стена',
		description: 'Посты сообщества и рекомендации на стенах пользователей.',
		hint: 'Ссылки и вложения открываются в соответствующих разделах — удобно для поиска интересных постов.',
		icon: Sparkles
	}
}

const CrownIcon = Trophy

function Panel({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				'rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-6',
				className
			)}
		>
			{children}
		</div>
	)
}

function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
			<span className="text-sm text-white/65">{message}</span>
			{action}
		</div>
	)
}

function SegmentedControl({
	value,
	options,
	onChange
}: {
	value: string
	options: SegmentedOption[]
	onChange: (value: string) => void
}) {
	return (
		<div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs md:text-sm">
			{options.map((option) => {
				const isActive = option.value === value
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={cn(
							'relative rounded-full px-3 py-1.5 font-medium transition',
							isActive
								? 'bg-white text-slate-900 shadow-sm shadow-indigo-500/30'
								: 'text-white/70 hover:bg-white/5 hover:text-white'
						)}
					>
						<span className="relative z-10">{option.label}</span>
						{option.hint && <span className="sr-only">{option.hint}</span>}
					</button>
				)
			})}
		</div>
	)
}

export function TopsPage() {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [userMetric, setUserMetric] = useState<UserMetric>('readers')
	const [threadsRange, setThreadsRange] = useState<Range>('all')
	const [commentsRange, setCommentsRange] = useState<Range>('all')
	const [wallRange, setWallRange] = useState<WallRange>('all')
	const [reviewsDays, setReviewsDays] = useState<number>(7)

	const [activeTab, setActiveTab] = useState<TabKey>(() => {
		const param = (searchParams.get('tab') || '').toLowerCase() as TabKey
		return TABS.includes(param) ? param : 'users'
	})

	useEffect(() => {
		const current = (searchParams.get('tab') || '').toLowerCase()
		if (current !== activeTab) {
			const nextParams = new URLSearchParams(searchParams.toString())
			nextParams.set('tab', activeTab)
			setSearchParams(nextParams, { replace: true })
		}
	}, [activeTab, searchParams, setSearchParams])

	const usersQuery = useQuery({
		queryKey: ['tops-users', userMetric],
		queryFn: () => apiClient.getTopUsers({ metric: userMetric, limit: 20 }),
		staleTime: 60_000
	})

	const reviewsQuery = useQuery({
		queryKey: ['tops-reviews', reviewsDays],
		queryFn: () => apiClient.getTopReviews({ days: reviewsDays, limit: 20 }),
		staleTime: 60_000
	})

	const threadsQuery = useQuery({
		queryKey: ['tops-threads', threadsRange],
		queryFn: () => apiClient.getTopThreads({ range: threadsRange, limit: 15 }),
		staleTime: 60_000
	})

	const commentsQuery = useQuery({
		queryKey: ['tops-comments', commentsRange],
		queryFn: () => apiClient.getTopComments({ range: commentsRange, limit: 15 }),
		staleTime: 60_000
	})

	const wallPostsQuery = useQuery({
		queryKey: ['tops-wall-posts', wallRange],
		queryFn: () => apiClient.getTopWallPosts({ range: wallRange, limit: 15 }),
		staleTime: 60_000
	})

	const userIds = useMemo(
		() => (usersQuery.data ?? []).map((user: TopUserDTO) => user.id),
		[usersQuery.data]
	)
	const reviewUserIds = useMemo(
		() => (reviewsQuery.data ?? []).map((review: TopReviewDTO) => review.userId),
		[reviewsQuery.data]
	)
	const reviewMangaIds = useMemo(
		() =>
			(reviewsQuery.data ?? [])
				.map((review: TopReviewDTO) => review.mangaId)
				.filter((id): id is number => typeof id === 'number'),
		[reviewsQuery.data]
	)
	const threadAuthorIds = useMemo(
		() => (threadsQuery.data ?? []).map((thread: TopForumThreadDTO) => thread.authorId),
		[threadsQuery.data]
	)
	const commentAuthorIds = useMemo(
		() => (commentsQuery.data ?? []).map((comment: TopCommentDTO) => comment.userId),
		[commentsQuery.data]
	)
	const wallAuthorIds = useMemo(
		() => (wallPostsQuery.data ?? []).map((post: TopWallPostDTO) => post.userId),
		[wallPostsQuery.data]
	)
	const wallMangaReferenceIds = useMemo(() => {
		const references = (wallPostsQuery.data ?? []).flatMap((post: TopWallPostDTO) => post.references ?? [])
		return Array.from(
			new Set(
				references
					.filter((ref) => (ref.type || '').toUpperCase() === 'MANGA' && typeof ref.refId === 'number')
					.map((ref) => ref.refId)
			)
		)
	}, [wallPostsQuery.data])

	const userLevelMap = useUserLevelsBatch(userIds)
	const reviewUserMap = useUserMiniBatch(reviewUserIds)
	const reviewMangaMap = useMangaMiniBatch(reviewMangaIds)
	const threadAuthorMap = useUserMiniBatch(threadAuthorIds)
	const commentAuthorMap = useUserMiniBatch(commentAuthorIds)
	const wallAuthorMap = useUserMiniBatch(wallAuthorIds)
	const wallMangaMap = useMangaMiniBatch(wallMangaReferenceIds)

	const summaryCards = useMemo<SummaryCard[]>(() => {
		const topUser = (usersQuery.data ?? [])[0] as TopUserDTO | undefined
		const topReview = (reviewsQuery.data ?? [])[0] as TopReviewDTO | undefined
		const topThread = (threadsQuery.data ?? [])[0] as TopForumThreadDTO | undefined
		const topComment = (commentsQuery.data ?? [])[0] as TopCommentDTO | undefined
		const topWallPost = (wallPostsQuery.data ?? [])[0] as TopWallPostDTO | undefined

		const highlightMetric = (() => {
			if (!topUser) return '—'
			switch (userMetric) {
				case 'level':
					return `LVL ${(userLevelMap[topUser.id]?.level ?? topUser.level ?? 0) || 0}`
				case 'likes':
					return `${numberFormatter.format(topUser.likesGivenCount ?? 0)} лайков`
				case 'comments':
					return `${numberFormatter.format(topUser.commentsCount ?? 0)} комм.`
				case 'readers':
				default:
					return `${numberFormatter.format(topUser.chaptersReadCount ?? 0)} глав`
			}
		})()

		const reviewMetric = topReview
			? typeof topReview.rating === 'number'
				? `${topReview.rating.toFixed(1)} / 10`
				: `${numberFormatter.format(topReview.likesCount ?? topReview.likeCount ?? 0)} лайков`
			: '—'

		const threadMetric = topThread
			? typeof topThread.repliesCount === 'number'
				? `${numberFormatter.format(topThread.repliesCount)} ответов`
				: typeof topThread.viewsCount === 'number'
					? `${shortFormatter.format(topThread.viewsCount)} просмотров`
					: '—'
			: '—'

		const commentTrust = topComment
			? numberFormatter.format(
					(topComment.likesCount ?? topComment.likeCount ?? 0) - (topComment.dislikesCount ?? topComment.dislikeCount ?? 0)
				)
			: '—'

		const wallMetric = topWallPost
			? `${shortFormatter.format(topWallPost.stats?.up ?? topWallPost.stats?.score ?? 0)} реакций`
			: '—'

		return [
			{
				key: 'users-top',
				label: topUser?.username ? 'Топ участник' : 'Активность',
				value: topUser?.username ?? 'Ещё собираем',
				hint: highlightMetric,
				icon: CrownIcon,
				accent: 'from-indigo-500/25 via-indigo-500/10 to-transparent'
			},
			{
				key: 'reviews-top',
				label: 'Сильный обзор',
				value: reviewMetric,
				hint: topReview?.mangaTitle || topReview?.comment?.slice(0, 60) || 'Ожидаем свежие обзоры',
				icon: Quote,
				accent: 'from-fuchsia-500/25 via-fuchsia-500/10 to-transparent'
			},
			{
				key: 'threads-top',
				label: 'Горячая тема',
				value: threadMetric,
				hint: topThread?.title || topThread?.contentExcerpt?.slice(0, 60) || 'Ждём обсуждений',
				icon: Hash,
				accent: 'from-purple-500/25 via-purple-500/10 to-transparent'
			},
			{
				key: 'comments-top',
				label: 'Комментарий дня',
				value: `${commentTrust} trust`,
				hint: topComment?.contentExcerpt?.slice(0, 60) || 'Здесь появится лучший комментарий',
				icon: MessageSquare,
				accent: 'from-sky-500/25 via-sky-500/10 to-transparent'
			},
			{
				key: 'wall-top',
				label: 'Пост на стене',
				value: wallMetric,
				hint: 'Следите за рекомендациями сообщества',
				icon: Sparkles,
				accent: 'from-amber-500/25 via-amber-500/10 to-transparent'
			}
		]
	}, [
		commentsQuery.data,
		threadsQuery.data,
		reviewsQuery.data,
		usersQuery.data,
		wallPostsQuery.data,
		userMetric,
		userLevelMap
	])

	const getUserMetricLabel = (user: TopUserDTO) => {
		const level = userLevelMap[user.id]?.level ?? user.level ?? 0
		switch (userMetric) {
			case 'likes':
				return `${numberFormatter.format(user.likesGivenCount ?? 0)} лайков`
			case 'comments':
				return `${numberFormatter.format(user.commentsCount ?? 0)} комм.`
			case 'level':
				return `LVL ${level}`
			case 'readers':
			default:
				return `${numberFormatter.format(user.chaptersReadCount ?? 0)} глав`
		}
	}

	const getUserMetricValue = (user: TopUserDTO) => {
		const level = userLevelMap[user.id]?.level ?? user.level ?? 0
		switch (userMetric) {
			case 'likes':
				return numberFormatter.format(user.likesGivenCount ?? 0)
			case 'comments':
				return numberFormatter.format(user.commentsCount ?? 0)
			case 'level':
				return `LVL ${level}`
			case 'readers':
			default:
				return numberFormatter.format(user.chaptersReadCount ?? 0)
		}
	}

	const renderUsers = () => {
		if (usersQuery.isLoading) return <LeaderboardSkeleton rows={10} />
		if (usersQuery.isError) return <LeaderboardError onRetry={() => usersQuery.refetch()} />

		const users = (usersQuery.data ?? []) as TopUserDTO[]
		if (!users.length) {
			return <EmptyState message="Ещё не набралось активности по выбранной метрике." />
		}

		const highlights = users.slice(0, 3)
		const others = users.slice(3)

		return (
			<div className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{highlights.map((user, idx) => {
						const level = userLevelMap[user.id]?.level ?? user.level ?? 0
						const xpTotal = userLevelMap[user.id]?.totalXp ?? user.xp
						return (
							<button
								type="button"
								key={user.id || idx}
								onClick={() => user.id && navigate(`/profile/${user.id}#from-tops`)}
								className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/30 hover:bg-white/8"
							>
								<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />
								<div className="relative z-10 space-y-5">
									<div className="flex items-start gap-4">
										<div className="relative">
											<div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white/80 ring-2 ring-white/20">
												{user.avatar ? (
													<img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
												) : (
													(user.username || '?')[0]
												)}
											</div>
											<div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-900 shadow-lg shadow-indigo-500/30">
												{idx + 1}
											</div>
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate text-base font-semibold text-white">{user.username || 'Без имени'}</div>
											<div className="mt-1 text-xs text-white/60">ID {user.id}</div>
											<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
												{level != null && <span className="glass-inline bg-white/10 px-2 py-0.5 font-medium">LVL {level}</span>}
												{xpTotal != null && <span className="glass-inline bg-white/10 px-2 py-0.5">XP {xpTotal}</span>}
											</div>
										</div>
									</div>
									<div className="flex items-center justify-between text-[11px] text-white/70">
										<span>Метрика</span>
										<span className="font-semibold text-white">{getUserMetricValue(user)}</span>
									</div>
								</div>
							</button>
						)
					})}
				</div>

				{others.length > 0 && (
					<div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
						{others.map((user, index) => {
							const rank = index + highlights.length + 1
							const level = userLevelMap[user.id]?.level ?? user.level ?? 0
							const avatar = user.avatar ? (
								<img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
							) : (
								<span className="text-xs font-semibold uppercase">{(user.username || '?').slice(0, 2)}</span>
							)
							const details = [getUserMetricLabel(user)]
							if (level) {
								details.push(`LVL ${level}`)
							}

							return (
								<LeaderboardRow
									key={user.id || rank}
									rank={rank}
									avatar={avatar}
									primary={
										<div className="flex w-full items-center justify-between gap-2">
											<span className="truncate text-sm font-medium text-white">{user.username || 'Без имени'}</span>
											<span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/60">ID {user.id}</span>
										</div>
									}
									secondary={<span className="text-[11px] text-white/60">{details.join(' · ')}</span>}
									metricValue={<span className="text-xs font-semibold text-white/85">{getUserMetricValue(user)}</span>}
									onClick={() => user.id && navigate(`/profile/${user.id}#from-tops`)}
								/>
							)
						})}
					</div>
				)}
			</div>
		)
	}

	const renderReviews = () => {
		if (reviewsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
		if (reviewsQuery.isError) return <LeaderboardError onRetry={() => reviewsQuery.refetch()} />

		const reviews = (reviewsQuery.data ?? []) as TopReviewDTO[]
		if (!reviews.length) {
			return <EmptyState message="За выбранный период обзоры ещё не успели набрать реакции." />
		}

		return (
			<div className="grid gap-4 xl:grid-cols-2">
				{reviews.map((review, idx) => {
					const likeVal = review.likeCount ?? review.likesCount ?? 0
					const dislikeVal = review.dislikeCount ?? review.dislikesCount ?? 0
					const trust = likeVal - dislikeVal
					const author: UserMini | undefined = reviewUserMap[review.userId]
					const manga: MangaMini | undefined = review.mangaId ? reviewMangaMap[review.mangaId] : undefined

					return (
						<article
							key={review.id || idx}
							id={`review-${review.id}`}
							className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-200 hover:border-white/30 hover:bg-white/8"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-transparent to-transparent opacity-60" />
							<div className="relative z-10 space-y-4">
								<div className="flex items-start gap-3">
									<div className="relative">
										<div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/70">
											{author?.avatar ? (
												<img src={author.avatar} className="h-full w-full object-cover" alt={author?.username} />
											) : (
												(author?.username || review.username || '?')[0]
											)}
										</div>
										<span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-900 shadow-md">
											{idx + 1}
										</span>
									</div>
									<div className="min-w-0 flex-1 space-y-3">
										<div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
											<span className="text-sm font-semibold text-white">
												{author?.displayName || author?.username || review.username || 'Пользователь'}
											</span>
											{review.rating != null && (
												<span className="rounded-full bg-indigo-500/25 px-2 py-0.5 font-medium text-indigo-100">
													{review.rating}/10
												</span>
											)}
											<span
												className={cn(
													'rounded-full px-2 py-0.5 font-semibold',
													trust > 0
														? 'bg-emerald-500/25 text-emerald-100'
														: trust < 0
															? 'bg-rose-600/40 text-rose-50'
															: 'bg-purple-500/25 text-purple-100'
												)}
											>
												Trust {trust}
											</span>
											<span className="rounded-full bg-pink-500/25 px-2 py-0.5 text-pink-100">👍 {likeVal}</span>
											<span className="rounded-full bg-rose-600/35 px-2 py-0.5 text-rose-100">👎 {dislikeVal}</span>
										</div>
										<div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
											<MarkdownRenderer value={review.comment || ''} />
										</div>
									</div>
								</div>
								{review.mangaId && (
									<button
										type="button"
										onClick={() => navigate(`/manga/${review.mangaId}#review-${review.id}`)}
										className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
									>
										<div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-[10px] text-white/40">
											{manga?.cover ? <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover" /> : '—'}
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate text-xs font-semibold text-white group-hover:text-indigo-100">
												{manga?.title || review.mangaTitle || `Манга #${review.mangaId}`}
											</div>
											<div className="text-[11px] text-white/55">Перейти к манге</div>
										</div>
									</button>
								)}
							</div>
						</article>
					)
				})}
			</div>
		)
	}

	const renderThreads = () => {
		if (threadsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
		if (threadsQuery.isError) return <LeaderboardError onRetry={() => threadsQuery.refetch()} />

		const threads = (threadsQuery.data ?? []) as TopForumThreadDTO[]
		if (!threads.length) {
			return <EmptyState message="Пока нет активных тем с выбранным диапазоном." />
		}

		return (
			<div className="grid gap-4 xl:grid-cols-2">
				{threads.map((thread, idx) => {
					const author: UserMini | undefined = threadAuthorMap[thread.authorId]
					return (
						<article
							key={thread.id || idx}
							id={`thread-${thread.id}`}
							className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-200 hover:border-white/30 hover:bg-white/8"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-transparent to-transparent opacity-55" />
							<div className="relative z-10 space-y-4">
								<div className="flex items-start gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/30 text-sm font-semibold text-indigo-100">
										{idx + 1}
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="text-base font-semibold text-white">{thread.title || `Тема #${thread.id}`}</h3>
										{author && (
											<div className="mt-1 flex items-center gap-2 text-[11px] text-white/60">
												{author.avatar && (
													<img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
												)}
												<span>{author.displayName || author.username}</span>
											</div>
										)}
									</div>
								</div>
								<div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
									<MarkdownRenderer value={thread.contentExcerpt || ''} />
								</div>
								<div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
									<span className="rounded-full bg-indigo-500/20 px-2 py-0.5">Ответы: {thread.repliesCount ?? 0}</span>
									<span className="rounded-full bg-pink-500/20 px-2 py-0.5">Лайки: {thread.likesCount ?? thread.likeCount ?? 0}</span>
									<span className="rounded-full bg-sky-500/20 px-2 py-0.5">Просмотры: {thread.viewsCount ?? 0}</span>
									<button
										type="button"
										onClick={() => navigate(`/forum/thread/${thread.id}#from-tops`)}
										className="ml-auto text-[11px] font-semibold text-indigo-200 underline decoration-dotted decoration-indigo-300/70 transition hover:text-white"
									>
										Читать тему
									</button>
								</div>
							</div>
						</article>
					)
				})}
			</div>
		)
	}

	const renderComments = () => {
		if (commentsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
		if (commentsQuery.isError) return <LeaderboardError onRetry={() => commentsQuery.refetch()} />

		const comments = (commentsQuery.data ?? []) as TopCommentDTO[]
		if (!comments.length) {
			return <EmptyState message="Комментарии для выбранного диапазона пока не выделяются." />
		}

		return (
			<div className="grid gap-4 xl:grid-cols-2">
				{comments.map((comment, idx) => {
					const likeVal =
						typeof comment.likesCount === 'number'
							? comment.likesCount
							: typeof comment.likeCount === 'number'
								? comment.likeCount
								: 0
					const dislikeVal =
						typeof comment.dislikesCount === 'number'
							? comment.dislikesCount
							: typeof comment.dislikeCount === 'number'
								? comment.dislikeCount
								: 0
					const trust = typeof comment.trustFactor === 'number' ? comment.trustFactor : likeVal - dislikeVal
					const type = (comment.commentType || '').toUpperCase()
					const targetLink = (() => {
						if (!comment.targetId) return `/comments/${comment.id}`
						switch (type) {
							case 'MANGA':
								return `/manga/${comment.targetId}#comment-${comment.id}`
							case 'CHAPTER':
								return `/reader/${comment.targetId}#comment-${comment.id}`
							case 'REVIEW':
								return `/reviews/${comment.targetId}#comment-${comment.id}`
							case 'POST':
								return `/forum/post/${comment.targetId}#comment-${comment.id}`
							case 'PROFILE':
							case 'PROFILE_POST':
								return `/profile/${comment.targetId}#comment-${comment.id}`
							default:
								return `/comments/${comment.id}`
						}
					})()
					const author: UserMini | undefined = commentAuthorMap[comment.userId]

					return (
						<article
							key={comment.id || idx}
							id={`comment-${comment.id}`}
							className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-200 hover:border-white/30 hover:bg-white/8"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 via-transparent to-transparent opacity-55" />
							<div className="relative z-10 space-y-4">
								<div className="flex items-start gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/30 text-sm font-semibold text-indigo-100">
										{idx + 1}
									</div>
									<div className="min-w-0 flex-1">
										{author && (
											<div className="mb-1 flex items-center gap-2 text-[11px] text-white/60">
												{author.avatar && (
													<img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
												)}
												<span>{author.displayName || author.username}</span>
											</div>
										)}
										<div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
											<span
												className={cn(
													'rounded-full px-2 py-0.5 font-semibold',
													trust > 0
														? 'bg-emerald-500/25 text-emerald-100'
														: trust < 0
															? 'bg-rose-600/40 text-rose-50'
															: 'bg-purple-500/25 text-purple-100'
												)}
											>
												Trust {trust}
											</span>
											<span className="rounded-full bg-pink-500/25 px-2 py-0.5 text-pink-100">👍 {likeVal}</span>
											<span className="rounded-full bg-rose-600/35 px-2 py-0.5 text-rose-100">👎 {dislikeVal}</span>
											<span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">{type || 'Комментарий'}</span>
										</div>
										<div className="mt-3 prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
											<MarkdownRenderer value={comment.contentExcerpt || ''} />
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3 text-[11px] text-white/60">
									<button
										type="button"
										onClick={() => navigate(targetLink)}
										className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-semibold text-white/80 underline decoration-dotted decoration-white/50 transition hover:bg-white/15 hover:text-white"
									>
										Перейти к источнику
									</button>
								</div>
							</div>
						</article>
					)
				})}
			</div>
		)
	}

	const renderWallPosts = () => {
		if (wallPostsQuery.isLoading) return <LeaderboardSkeleton rows={10} />
		if (wallPostsQuery.isError) return <LeaderboardError onRetry={() => wallPostsQuery.refetch()} />

		const wallPosts = (wallPostsQuery.data ?? []) as TopWallPostDTO[]
		if (!wallPosts.length) {
			return <EmptyState message="Пока нет ярких постов на стене." />
		}

		return (
			<div className="grid gap-4">
						{wallPosts.map((post, idx) => {
							const stats = post.stats
					const author: UserMini | undefined = wallAuthorMap[post.userId]
					const mangaRefs = (post.references || []).filter((ref) => (ref.type || '').toUpperCase() === 'MANGA')
							const score = typeof stats?.score === 'number' ? stats.score : (stats?.up ?? 0) - (stats?.down ?? 0)
							const attachments = post.attachments ?? []

					return (
						<article
							key={post.id || idx}
							id={`wall-post-${post.id}`}
							className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition duration-200 hover:border-white/30 hover:bg-white/8"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-55" />
							<div className="relative z-10 space-y-4">
								<div className="flex items-start gap-3">
									  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/30 text-sm font-semibold text-amber-100">
										{idx + 1}
									</div>
									<div className="min-w-0 flex-1 space-y-2">
										{author && (
											<div className="flex items-center gap-2 text-[11px] text-white/60">
												{author.avatar && (
													<img src={author.avatar} className="h-4 w-4 rounded-full object-cover" alt={author.username} />
												)}
												<span>{author.displayName || author.username}</span>
											</div>
										)}
										<div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body">
											<MarkdownRenderer value={post.content || ''} />
										</div>
									</div>
								</div>
												<div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
													<span className="rounded-full bg-indigo-500/20 px-2 py-0.5">Score {score}</span>
													<span className="rounded-full bg-pink-500/25 px-2 py-0.5 text-pink-100">👍 {stats?.up ?? 0}</span>
													<span className="rounded-full bg-rose-600/35 px-2 py-0.5 text-rose-100">👎 {stats?.down ?? 0}</span>
								</div>
								{mangaRefs.length > 0 && (
									<div className="grid gap-2 sm:grid-cols-2">
										{mangaRefs.map((ref) => {
											const manga = typeof ref.refId === 'number' ? wallMangaMap[ref.refId] : undefined
											if (!manga) return null
											return (
												<button
													type="button"
													key={ref.id || ref.refId}
													onClick={() => navigate(`/manga/${manga.id}#wall-post-${post.id}`)}
													className="group flex items-center gap-3 rounded-xl border border-white/10 bg-blue-600/10 p-3 text-left transition hover:border-sky-400/40 hover:bg-sky-500/15"
												>
													<div className="flex h-14 w-12 items-center justify-center overflow-hidden rounded-lg bg-white/10 text-[10px] text-white/40">
														{manga.cover ? <img src={manga.cover} alt={manga.title} className="h-full w-full object-cover" /> : '—'}
													</div>
													<div className="min-w-0 flex-1">
														<div className="truncate text-xs font-semibold text-sky-100 group-hover:text-white">{manga.title}</div>
														<div className="text-[11px] text-white/50">Манга</div>
													</div>
												</button>
											)
										})}
									</div>
								)}
												{attachments.length > 0 && (
													<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
														{attachments.slice(0, 6).map((attachment) => (
											<div key={attachment.id} className="relative overflow-hidden rounded-xl border border-white/10">
												<img src={attachment.url} alt={attachment.filename} className="h-24 w-full object-cover" />
											</div>
										))}
									</div>
								)}
								<div className="flex items-center gap-3 text-[11px] text-white/60">
									<button
										type="button"
										onClick={() => navigate(`/profile/${post.userId}#wall-post-${post.id}`)}
										className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-semibold text-white/80 underline decoration-dotted decoration-white/50 transition hover:bg-white/15 hover:text-white"
									>
										Перейти к посту
									</button>
								</div>
							</div>
						</article>
					)
				})}
			</div>
		)
	}

	const renderFilterControl = () => {
		switch (activeTab) {
			case 'users':
				return (
					<Panel className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-white/10 p-2 text-white/70">
								<Users className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-semibold text-white">Настроить метрику</div>
								<p className="text-xs text-white/60">Выберите способ оценки пользователей.</p>
							</div>
						</div>
						<SegmentedControl
							value={userMetric}
							onChange={(value) => setUserMetric(value as UserMetric)}
							options={USER_METRICS.map((option) => ({ label: option.label, value: option.value }))}
						/>
					</Panel>
				)
			case 'reviews':
				return (
					<Panel className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-white/10 p-2 text-white/70">
								<BookOpen className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-semibold text-white">Период обзоров</div>
								<p className="text-xs text-white/60">Сколько дней попадает в выборку рейтинга.</p>
							</div>
						</div>
						<SegmentedControl value={String(reviewsDays)} onChange={(value) => setReviewsDays(Number(value))} options={REVIEW_RANGE_OPTIONS} />
					</Panel>
				)
			case 'threads':
				return (
					<Panel className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-white/10 p-2 text-white/70">
								<Hash className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-semibold text-white">Диапазон обсуждений</div>
								<p className="text-xs text-white/60">Фильтруем темы форума по периоду активности.</p>
							</div>
						</div>
						<SegmentedControl value={threadsRange} onChange={(value) => setThreadsRange(value as Range)} options={RANGE_OPTIONS} />
					</Panel>
				)
			case 'comments':
				return (
					<Panel className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-white/10 p-2 text-white/70">
								<MessageSquare className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-semibold text-white">Диапазон комментариев</div>
								<p className="text-xs text-white/60">Сужайте выборку, чтобы видеть свежие обсуждения.</p>
							</div>
						</div>
						<SegmentedControl value={commentsRange} onChange={(value) => setCommentsRange(value as Range)} options={RANGE_OPTIONS} />
					</Panel>
				)
			case 'wall':
				return (
					<Panel className="space-y-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-white/10 p-2 text-white/70">
								<Sparkles className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<div className="text-sm font-semibold text-white">Период постов</div>
								<p className="text-xs text-white/60">Подборка рекомендаций и постов за выбранное время.</p>
							</div>
						</div>
						<SegmentedControl value={wallRange} onChange={(value) => setWallRange(value as WallRange)} options={WALL_RANGE_OPTIONS} />
					</Panel>
				)
			default:
				return null
		}
	}

	const activeMeta = TAB_META[activeTab]
	const ActiveIcon = activeMeta.icon

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#10182b] to-[#151b2f]" />
			<div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-[120px]" />
			<div className="absolute top-1/3 right-[-10%] h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[110px]" />
			<div className="relative z-10">
				<div className="container mx-auto space-y-10 px-4 py-10">
					<Panel className="relative overflow-hidden border-white/20 bg-white/5">
						<div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/25 via-transparent to-transparent" />
						<div className="absolute -top-24 right-10 h-48 w-48 rounded-full bg-sky-500/20 blur-[120px]" />
						<div className="relative z-10 space-y-6">
							<div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-indigo-100">
								<div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/30 px-3 py-1 text-indigo-50 shadow-sm shadow-indigo-900/30">
									<TrendingUp className="h-4 w-4" />
									Community Pulse
								</div>
							</div>
							<div className="space-y-3">
								<h1 className="text-3xl font-semibold text-white md:text-4xl">Топы сообщества</h1>
								<p className="max-w-2xl text-sm text-white/70 md:text-base">
									Следите за живой активностью на AniWay: кто сейчас в центре внимания, какие обзоры читают и какие обсуждения набирают обороты.
								</p>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
								{summaryCards.map((card) => {
									const CardIcon = card.icon
									return (
										<div
											key={card.key}
											className={cn(
												'relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition duration-200 hover:border-white/30 hover:bg-white/8',
												'shadow-[0_16px_40px_rgba(15,23,42,0.35)]',
												`bg-gradient-to-br ${card.accent}`
											)}
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="text-xs font-medium uppercase tracking-wide text-white/60">{card.label}</div>
													<div className="mt-2 text-xl font-semibold text-white md:text-2xl">{card.value}</div>
												</div>
												<div className="rounded-full bg-black/30 p-2 text-white/70">
													<CardIcon className="h-5 w-5" />
												</div>
											</div>
											<div className="mt-3 text-[11px] text-white/55">{card.hint}</div>
										</div>
									)
								})}
							</div>
						</div>
					</Panel>

					<nav className="flex flex-wrap gap-2 md:gap-3">
						{TABS.map((tabKey) => {
							const meta = TAB_META[tabKey]
							const Icon = meta.icon
							const isActive = tabKey === activeTab
							return (
								<button
									key={tabKey}
									type="button"
									onClick={() => setActiveTab(tabKey)}
									className={cn(
										'group relative flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition',
										isActive
											? 'border-white/40 bg-white/15 text-white shadow-lg shadow-indigo-500/25'
											: 'border-white/10 bg-white/5 text-white/65 hover:border-white/30 hover:text-white'
									)}
								>
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
										<Icon className="h-4 w-4" />
									</div>
									<div className="min-w-0">
										<div className="text-sm font-semibold">{meta.label}</div>
										<div className="text-[11px] text-white/55 line-clamp-2">{meta.description}</div>
									</div>
									{isActive && <span className="absolute inset-0 rounded-2xl border border-white/40" aria-hidden />}
								</button>
							)
						})}
					</nav>

					<div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)] xl:grid-cols-[360px,minmax(0,1fr)]">
						<aside className="space-y-6">
							<Panel className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="rounded-full bg-white/10 p-2 text-white/80">
										<ActiveIcon className="h-5 w-5" />
									</div>
									<div className="space-y-1">
										<div className="text-sm font-semibold text-white">{activeMeta.label}</div>
										<p className="text-xs text-white/60">{activeMeta.description}</p>
									</div>
								</div>
								<p className="text-xs leading-relaxed text-white/55">{activeMeta.hint}</p>
							</Panel>
							{renderFilterControl()}
						</aside>

						<main className="space-y-6">
							{activeTab === 'users' && <Panel>{renderUsers()}</Panel>}
							{activeTab === 'reviews' && <Panel>{renderReviews()}</Panel>}
							{activeTab === 'threads' && <Panel>{renderThreads()}</Panel>}
							{activeTab === 'comments' && <Panel>{renderComments()}</Panel>}
							{activeTab === 'wall' && <Panel>{renderWallPosts()}</Panel>}
						</main>
					</div>
				</div>
			</div>
		</div>
	)
}

export default TopsPage

