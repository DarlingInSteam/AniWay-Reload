import { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen, Bookmark, Eye, Heart, Star, ChevronDown, ChevronUp,
  Edit, AlertTriangle, Share, ChevronRight, ArrowUpDown,
  ArrowUp, ArrowDown, Check, ShieldCheck, CalendarDays, Clock, Sparkles
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, formatRelativeTime, getStatusText, getTypeText, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatChapterTitle, formatChapterNumber, formatVolumeNumber } from '@/lib/chapterUtils'
import { BookmarkControls } from '../components/bookmarks/BookmarkControls'
import { ReadingProgressBar, LastReadChapter } from '../components/progress/ReadingProgress'
import { ReadingButton } from '../components/reading/ReadingButton'
import { useReadingProgress } from '@/hooks/useProgress'
import { CommentSection } from '../components/comments/CommentSection'
import MangaReviews from '../components/MangaReviews'
import { useAuth } from '@/contexts/AuthContext'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import type { MangaResponseDTO } from '@/types'
import { useSyncedSearchParam } from '@/hooks/useSyncedSearchParam'

export function MangaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const rawId = id || '0'
  const numericId = (() => {
    const primary = rawId.split('--')[0] // preferred pattern id--slug
    if (/^\d+$/.test(primary)) return parseInt(primary, 10)
    // fallback single dash legacy
    const legacy = rawId.split('-')[0]
    return parseInt(legacy, 10) || 0
  })()
  const mangaId = numericId
  const [activeTabParam, setActiveTabParam] = useSyncedSearchParam<'main' | 'chapters' | 'reviews' | 'discussions' | 'moments' | 'cards' | 'characters' | 'similar'>('tab', 'main')
  const activeTab = activeTabParam
  const [chapterSort, setChapterSort] = useState<'asc' | 'desc' | 'none'>('asc')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showAllAlternativeTitles, setShowAllAlternativeTitles] = useState(false)
  const [showAllChips, setShowAllChips] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentFilter, setCommentFilter] = useState<'new' | 'popular'>('new')
  const [isDesktop, setIsDesktop] = useState(false)
  const [likedChapters, setLikedChapters] = useState<Set<number>>(new Set())
  const [likingChapters, setLikingChapters] = useState<Set<number>>(new Set())

  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  // Удалили избыточную инвалидацию кэша при входе на страницу
  // Это было причиной постоянных перезапросов

  // Инвалидируем кэш списка манг при входе на страницу манги
  useEffect(() => {
    console.log('MangaPage: Invalidating manga list cache on mount')
    queryClient.invalidateQueries({ queryKey: ['manga'] })
    queryClient.invalidateQueries({ queryKey: ['manga-catalog'] })
    queryClient.invalidateQueries({ queryKey: ['popular-manga'] })
    queryClient.invalidateQueries({ queryKey: ['recent-manga'] })

    // Принудительно обновляем все запросы
    queryClient.refetchQueries({ queryKey: ['manga'] })
    queryClient.refetchQueries({ queryKey: ['manga-catalog'] })
    queryClient.refetchQueries({ queryKey: ['popular-manga'] })
    queryClient.refetchQueries({ queryKey: ['recent-manga'] })
  }, [queryClient])

  // Track screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const leftColumnWidth = useMemo(() => (isDesktop ? '283px' : 'min(100%, 258px)'), [isDesktop])

  const { data: manga, isLoading: mangaLoading } = useQuery({
    queryKey: ['manga', mangaId, user?.id],
    queryFn: () => apiClient.getMangaById(mangaId, user?.id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const descriptionText = useMemo(() => (manga?.description || '').trim(), [manga?.description])
  const isDescriptionLong = descriptionText.length > 360

  useEffect(() => {
    setShowFullDescription(false)
  }, [manga?.id])

  // Slug handling: enhance URL to /manga/:id-:slug (client side only)
  useEffect(() => {
    if (!manga || !rawId) return
    const hasSlug = rawId.includes('--')

    // Collect candidate titles (primary + alternatives if present)
    const altRaw: string[] = []
    const possibleAlts: any = (manga as any)
    ;['alternativeTitles','alternativeNames','altTitles','alt_names','altNames']
      .forEach(k => { if (possibleAlts?.[k]) {
        const v = possibleAlts[k]
        if (Array.isArray(v)) altRaw.push(...v)
        else if (typeof v === 'string') altRaw.push(...v.split(/,|;|\n/))
      } })

    const candidates = [manga.title, ...altRaw].filter(Boolean) as string[]

    // Simple Cyrillic transliteration map (Russian)
    const translitMap: Record<string,string> = {
      а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
    }
    const transliterate = (s: string) => s.toLowerCase().split('').map(ch => translitMap[ch] ?? ch).join('')

    const sanitize = (s: string) => s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, ' ') // remove non-latin; keep digits & spaces
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g,'')

    // Pick best ASCII/romanized candidate: most a-z characters
    let best = candidates[0] || 'manga'
    let bestScore = -1
    for (const c of candidates) {
      const base = /[a-z]/i.test(c) ? c : transliterate(c)
      const ascii = base.replace(/[^a-z]/gi,'')
      const score = ascii.length
      if (score > bestScore) { bestScore = score; best = base }
    }

    const slug = sanitize(best) || 'manga'

    if (!hasSlug || (hasSlug && !rawId.endsWith(`--${slug}`))) {
      // Preserve existing search params (tab, etc.)
      const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
      navigate(`/manga/${mangaId}--${slug}${query}` , { replace: true })
    }
  }, [manga, rawId, mangaId, navigate, searchParams])

  // Удалили избыточную инвалидацию кэша после загрузки манги
  // Это было причиной "танца" тегов и жанров

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => apiClient.getMangaChapters(mangaId),
    enabled: !!mangaId,
    staleTime: 10 * 60 * 1000, // Кеш глав на 10 минут
  })

  const { data: recentlyUpdatedManga, isLoading: similarLoading } = useQuery({
    queryKey: ['manga-recently-updated', mangaId],
    queryFn: () => apiClient.getAllMangaPaged(0, 20, 'updatedAt', 'desc'),
    enabled: !!mangaId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: popularManga, isLoading: popularLoading } = useQuery({
    queryKey: ['manga-popular'],
    queryFn: () => apiClient.getAllMangaPaged(0, 20, 'views', 'desc'),
    staleTime: 10 * 60 * 1000,
  })

  const { data: bookmarkSubscribers, isLoading: bookmarkCountLoading } = useQuery({
    queryKey: ['manga-bookmark-subscribers', mangaId],
    queryFn: () => apiClient.getMangaBookmarkSubscriberCount(mangaId),
    enabled: !!mangaId,
    staleTime: 5 * 60 * 1000,
  })

  const similarAggregation = useMemo(() => {
    const page = recentlyUpdatedManga?.content
    if (!page || page.length === 0) {
      return { items: [] as MangaResponseDTO[], fallbackUsed: false, baseInsufficient: false }
    }

    const primary = page.filter((item) => item.id !== mangaId)
    const seen = new Set<number>()
    const result: MangaResponseDTO[] = []

    for (const entry of primary) {
      if (seen.has(entry.id)) continue
      seen.add(entry.id)
      result.push(entry)
      if (result.length >= 4) break
    }

    const baseInsufficient = result.length < 4
    let fallbackUsed = false

    if (baseInsufficient && popularManga?.content?.length) {
      for (const entry of popularManga.content) {
        if (entry.id === mangaId || seen.has(entry.id)) continue
        seen.add(entry.id)
        result.push(entry)
        fallbackUsed = true
        if (result.length >= 4) break
      }
    }

    return {
      items: result.slice(0, 4),
      fallbackUsed,
      baseInsufficient,
    }
  }, [recentlyUpdatedManga?.content, popularManga?.content, mangaId])

  const { items: similarManga, fallbackUsed: similarUsesFallback, baseInsufficient: similarBaseInsufficient } = similarAggregation
  const awaitingFallback = similarBaseInsufficient && !similarUsesFallback && popularLoading

  const { isChapterCompleted } = useReadingProgress()

  // Оптимизированная загрузка статусов лайков глав
  useEffect(() => {
    let cancelled = false

    const loadChapterLikeStatuses = async () => {
      if (!chapters || !user || chapters.length === 0) {
        setLikedChapters(new Set())
        return
      }

      try {
        const chapterIds = chapters.map((chapter) => chapter.id)
        const likedIdsAggregate: number[] = []
        const chunkSize = 100

        for (let i = 0; i < chapterIds.length; i += chunkSize) {
          const chunk = chapterIds.slice(i, i + chunkSize)
          const likedIds = await apiClient.getChapterLikeStatuses(chunk)
          likedIdsAggregate.push(...likedIds)
        }

        if (!cancelled) {
          setLikedChapters(new Set(likedIdsAggregate))
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load chapter like statuses:', error)
          setLikedChapters(new Set())
        }
      }
    }

    // небольшая задержка, чтобы избежать двойных вызовов при монтировании
    const timeoutId = setTimeout(loadChapterLikeStatuses, 200)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [chapters, user])

  // Handle chapter like/unlike
  const handleChapterLike = async (chapterId: number, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to reader
    e.stopPropagation()
    // One-way like: ignore if already liked
    if (likedChapters.has(chapterId)) return
    if (likingChapters.has(chapterId)) return // Prevent double-clicks

    setLikingChapters(prev => new Set(prev).add(chapterId))
    try {
      const response = await apiClient.toggleChapterLike(chapterId)
      if (response.liked) {
        setLikedChapters(prev => new Set(prev).add(chapterId))
        queryClient.setQueryData(['chapters', mangaId], (oldData: any) => {
          if (!oldData) return oldData
          return oldData.map((chapter: any) => {
            if (chapter.id === chapterId) {
              return { ...chapter, likeCount: response.likeCount }
            }
            return chapter
          })
        })
      }
    } catch (error) {
      console.error('Failed to like chapter:', error)
    } finally {
      setLikingChapters(prev => {
        const newSet = new Set(prev)
        newSet.delete(chapterId)
        return newSet
      })
    }
  }

  const views = manga?.views ?? 0
  const releaseYear = manga?.releaseDate ? new Date(manga.releaseDate).getFullYear() : undefined
  const availableChapters = manga?.chapterCount ?? chapters?.length ?? 0
  const totalChapters = manga?.totalChapters ?? availableChapters

  const genres = useMemo(() => {
    if (!manga?.genre) return [] as string[]
    return manga.genre
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)
  }, [manga?.genre])

  const alternativeTitles = useMemo(() => {
    if (!manga?.alternativeNames) return [] as string[]
    return manga.alternativeNames
      .split(';')
      .map((name) => name.trim())
      .filter(Boolean)
  }, [manga?.alternativeNames])

  const displayedAlternativeTitles = useMemo(() => {
    if (showAllAlternativeTitles) return alternativeTitles
    return alternativeTitles.slice(0, 2)
  }, [alternativeTitles, showAllAlternativeTitles])

  const hasHiddenAlternativeTitles = alternativeTitles.length > 2

  useEffect(() => {
    setShowAllAlternativeTitles(false)
  }, [alternativeTitles.length])

  const tags = useMemo(() => {
    if (!manga?.tags) return [] as string[]
    return manga.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [manga?.tags])

  const combinedChips = useMemo(
    () => {
      const chips = [
        ...genres.map((genre) => ({ type: 'genre' as const, label: genre })),
        ...tags.map((tag) => ({ type: 'tag' as const, label: tag })),
      ]
      // Сортируем по длине: сначала короткие, потом длинные
      return chips.sort((a, b) => a.label.length - b.label.length)
    },
    [genres, tags]
  )

  // Показываем кнопку если чипов больше порога
  const collapsedChipCount = 12
  const hasMoreChips = combinedChips.length > collapsedChipCount

  type ChipItem = { type: 'genre' | 'tag'; label: string }
  type ToggleItem = { type: 'toggle' }
  type RenderItem = ChipItem | ToggleItem

  const displayedChips = useMemo<RenderItem[]>(() => {
    if (!hasMoreChips) {
      // Если чипов мало, показываем все без кнопки
      return combinedChips
    }

    if (showAllChips) {
      // Expanded: все чипы + кнопка "Свернуть" в конце потока
      return [...combinedChips, { type: 'toggle' as const }]
    }

    // Collapsed: первые N чипов + кнопка "Больше" в конце потока
    return [...combinedChips.slice(0, collapsedChipCount), { type: 'toggle' as const }]
  }, [combinedChips, hasMoreChips, showAllChips, collapsedChipCount])

  useEffect(() => {
    setShowAllChips(false)
  }, [combinedChips.length])

  const compactNumberFormatter = useMemo(
    () => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }),
    []
  )

  const totalChapterLikes = useMemo(() => {
    if (!chapters) return 0
    return chapters.reduce((sum, chapter) => sum + (chapter.likeCount ?? 0), 0)
  }, [chapters])

  const bookmarkCount = bookmarkSubscribers ?? 0
  const isBookmarkCountReady = bookmarkSubscribers !== undefined || !bookmarkCountLoading

  const viewsDisplay = compactNumberFormatter.format(manga?.views ?? 0)
  const likesDisplay = chaptersLoading && !chapters
    ? '...'
    : compactNumberFormatter.format(totalChapterLikes)
  const bookmarksDisplay = isBookmarkCountReady
    ? compactNumberFormatter.format(bookmarkCount)
    : '...'

  const infoBadges = useMemo(() => {
    if (!manga) return [] as Array<{ label: string; icon: LucideIcon; className: string }>

    const badges: Array<{ label: string; icon: LucideIcon; className: string }> = []

    badges.push({
      label: getTypeText(manga.type),
      icon: BookOpen,
      className: 'border-primary/30 bg-primary/15 text-primary-foreground/90',
    })

    const statusBadgeClass = (() => {
      switch (manga.status) {
        case 'COMPLETED':
          return 'border-sky-400/40 bg-sky-500/10 text-sky-200'
        case 'ANNOUNCED':
          return 'border-purple-400/40 bg-purple-500/10 text-purple-200'
        case 'HIATUS':
          return 'border-amber-400/40 bg-amber-500/10 text-amber-200'
        case 'CANCELLED':
          return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
        default:
          return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
      }
    })()

    badges.push({
      label: getStatusText(manga.status),
      icon: Sparkles,
      className: statusBadgeClass,
    })

    if (typeof releaseYear === 'number') {
      badges.push({
        label: `${releaseYear}`,
        icon: CalendarDays,
        className: 'border-white/20 bg-white/5 text-white/80',
      })
    }

    if (manga.ageLimit) {
      badges.push({
        label: `${manga.ageLimit}+`,
        icon: ShieldCheck,
        className: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
      })
    }

    return badges
  }, [manga, releaseYear])

  const infoDetails = useMemo(() => {
    if (!manga) return [] as Array<{ label: string; value: string }>

    const details: Array<{ label: string; value: string }> = []

    if (manga.author) {
      details.push({ label: 'Автор', value: manga.author })
    }

    if (manga.artist && manga.artist !== manga.author) {
      details.push({ label: 'Художник', value: manga.artist })
    }

    if (manga.releaseDate) {
      details.push({ label: 'Публикуется с', value: formatDate(manga.releaseDate) })
    }

    if (manga.isLicensed !== undefined) {
      details.push({ label: 'Лицензия', value: manga.isLicensed ? 'Лицензировано' : 'Не лицензировано' })
    }

    if (manga.engName) {
      details.push({ label: 'Английское название', value: manga.engName })
    }

    return details
  }, [manga?.author, manga?.artist, manga?.releaseDate, manga?.isLicensed, manga?.engName, manga])

  if (mangaLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Манга не найдена</h1>
          <Link to="/catalog" className="text-primary hover:text-primary/80 transition-colors">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    )
  }

  // Функция сортировки глав
  const getSortedChapters = (chapters: any[]) => {
    if (!chapters) return []

    const sorted = [...chapters]
    if (chapterSort === 'asc') {
      return sorted.sort((a, b) => a.chapterNumber - b.chapterNumber)
    } else if (chapterSort === 'desc') {
      return sorted.sort((a, b) => b.chapterNumber - a.chapterNumber)
    }
    return sorted
  }

  const toggleSort = () => {
    setChapterSort(prev => {
      if (prev === 'asc') return 'desc'
      if (prev === 'desc') return 'none'
      return 'asc'
    })
  }

  // Tabs configuration
  const tabs = [
    { id: 'main', label: 'Главная', mobileOnly: false },
    { id: 'chapters', label: 'Главы', mobileOnly: false },
    { id: 'reviews', label: 'Отзывы', mobileOnly: false },
    { id: 'discussions', label: 'Обсуждения', mobileOnly: false },
    { id: 'moments', label: 'Моменты', mobileOnly: false },
    { id: 'cards', label: 'Карты', mobileOnly: false },
    { id: 'characters', label: 'Персонажи', mobileOnly: false },
    { id: 'similar', label: 'Похожие', mobileOnly: true },
  ]

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background with blurred cover */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="w-full h-[600px] md:h-96 lg:h-[500px] bg-cover bg-center opacity-40"
          style={{
            backgroundImage: `url(${manga.coverImageUrl})`,
            filter: 'blur(20px) brightness(0.7)',
            transform: 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 lg:px-8 py-4 md:py-8">
          <div className="grid grid-cols-1 gap-y-4 gap-x-4 md:gap-y-5 md:gap-x-4 lg:grid-cols-[283px_minmax(0,1fr)_320px] lg:gap-y-5 lg:gap-x-3 xl:gap-y-6 xl:gap-x-4">
            {/* Left Column - Cover and Controls */}
            <div className="lg:col-span-1">
              <div
                className="lg:sticky lg:top-24 mx-auto lg:mx-0 space-y-4 md:space-y-6"
                style={{ width: leftColumnWidth }}
              >
                {/* Cover Image */}
                <div className="aspect-[283/424] rounded-3xl overflow-hidden bg-white/5 backdrop-blur-sm w-full border border-white/10">
                  <img
                    src={manga.coverImageUrl}
                    alt={manga.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder-manga.jpg'
                    }}
                  />
                </div>

                {/* Action Buttons - только на ПК */}
                <div className="hidden lg:block space-y-3">
                  {/* Кнопка чтения */}
                  <ReadingButton 
                    mangaId={mangaId} 
                    firstChapterId={chapters && chapters.length > 0 ? chapters[0].id : undefined}
                    allChapters={chapters}
                    className="w-full"
                  />

                  {/* Компонент закладок */}
                  <BookmarkControls mangaId={mangaId} className="w-full" />

                  {/* Прогресс чтения */}
                  <ReadingProgressBar 
                    mangaId={mangaId} 
                    totalChapters={manga.totalChapters} 
                    className="w-full mb-4" 
                  />

                  <button className="w-full bg-white/5 backdrop-blur-sm text-white py-3 rounded-3xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/10">
                    <AlertTriangle className="h-5 w-5" />
                    Подписаться на карты
                  </button>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 bg-white/5 backdrop-blur-sm text-white py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center border border-white/10">
                      <Share className="h-4 w-4" />
                    </button>
                    <button className="flex-1 bg-white/5 backdrop-blur-sm text-white py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center border border-white/10">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-1 lg:col-start-2 xl:col-span-1 xl:col-start-2 lg:self-start">
              <div className="mb-6 flex flex-col items-center lg:items-start gap-4 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-white/80">
                  <span>{getTypeText(manga.type)}</span>
                  {typeof releaseYear === 'number' && (
                    <>
                      <span className="text-white/40">•</span>
                      <span>{releaseYear}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{manga.title}</h1>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-white/80" />
                    <span className="text-white font-semibold">{viewsDisplay}</span>
                    <span>просмотров</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-white/80" />
                    <span className="text-white font-semibold">{likesDisplay}</span>
                    <span>лайков</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-white/80" />
                    <span className="text-white font-semibold">{bookmarksDisplay}</span>
                    <span>закладок</span>
                  </div>
                </div>
              </div>
              {/* Mobile Action Buttons */}
              <div className="lg:hidden mb-6">
                {/* Кнопка чтения */}
                <ReadingButton 
                  mangaId={mangaId} 
                  firstChapterId={chapters && chapters.length > 0 ? chapters[0].id : undefined}
                  allChapters={chapters}
                  className="w-full mb-4"
                />

                {/* Прогресс чтения */}
                <ReadingProgressBar 
                  mangaId={mangaId} 
                  totalChapters={manga.totalChapters} 
                  className="w-full mb-4" 
                />

                {/* Кнопки действий */}
                <BookmarkControls mangaId={mangaId} />
              </div>

              {/* Tabs */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-sm">
                  {tabs.map(tab => {
                    if (tab.mobileOnly && isDesktop) return null
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabParam(tab.id as any)}
                        className={cn(
                          'px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors flex-shrink-0 border border-transparent',
                          activeTab === tab.id
                            ? 'bg-primary text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)]'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        )}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div>
                {/* Main Tab */}
                {activeTab === 'main' && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-foreground mb-3">Описание</h3>
                      <div className="text-muted-foreground text-sm md:text-base">
                        <div
                          className={cn(
                            'relative overflow-hidden transition-[max-height] duration-300 ease-out prose-ul:list-disc prose-ul:pl-5',
                            showFullDescription ? 'max-h-[1200px]' : 'max-h-[6.25rem]'
                          )}
                        >
                          <div
                            className="prose prose-invert max-w-none markdown-body"
                            style={
                              !showFullDescription && isDescriptionLong
                                ? {
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 4,
                                    overflow: 'hidden',
                                  }
                                : undefined
                            }
                          >
                            <MarkdownRenderer value={descriptionText || 'Описание отсутствует.'} />
                          </div>
                          {/* No fade overlay when collapsed; the clamp alone keeps layout tidy */}
                        </div>
                        {isDescriptionLong && (
                          <button
                            onClick={() => setShowFullDescription(prev => !prev)}
                            className="flex items-center gap-1 text-primary mt-3 hover:text-primary/80 transition-colors"
                          >
                            {showFullDescription ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Свернуть
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Показать полностью
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {combinedChips.length > 0 && (
                      <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                        <div
                          className={cn(
                            'flex flex-wrap gap-2 transition-[max-height] duration-300 ease-out',
                            showAllChips ? 'max-h-[480px]' : 'max-h-[4.75rem] overflow-hidden'
                          )}
                        >
                          {displayedChips.map((item, index) => {
                            if (item.type === 'toggle') {
                              return (
                                <button
                                  key="toggle-button"
                                  type="button"
                                  onClick={() => setShowAllChips((prev) => !prev)}
                                  className={cn(
                                    'px-3 py-1 text-xs font-semibold lowercase tracking-wide rounded-full border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                                    'border-primary/40 text-primary/80 hover:border-primary hover:text-primary'
                                  )}
                                  aria-label={showAllChips ? 'Свернуть список жанров и тегов' : 'Показать все жанры и теги'}
                                >
                                  {showAllChips ? 'свернуть' : 'больше'}
                                </button>
                              )
                            }

                            const isGenre = item.type === 'genre'
                            return (
                              <button
                                key={`${item.type}-${item.label}-${index}`}
                                type="button"
                                onClick={() =>
                                  isGenre
                                    ? navigate(`/catalog?genres=${encodeURIComponent(item.label)}`)
                                    : navigate(`/catalog?tags=${encodeURIComponent(item.label)}`)
                                }
                                className={cn(
                                  'group px-3 py-1 text-sm rounded-full border transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                                  isGenre
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-primary/30 hover:border-primary/50'
                                    : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/30 hover:text-white hover:border-primary/50'
                                )}
                                aria-label={
                                  isGenre
                                    ? `Перейти в каталог по жанру ${item.label}`
                                    : `Перейти в каталог по тегу ${item.label}`
                                }
                              >
                                <span className="pointer-events-none select-none">{item.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Info Section - полная ширина */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-foreground mb-4">Информация</h3>

                      {infoBadges.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {infoBadges.map((badge) => {
                            const Icon = badge.icon
                            return (
                              <Badge
                                key={badge.label}
                                variant="outline"
                                className={cn(
                                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur-sm',
                                  badge.className
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {badge.label}
                              </Badge>
                            )
                          })}
                        </div>
                      )}

                      {infoDetails.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {infoDetails.map((detail) => (
                            <div
                              key={detail.label}
                              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                                {detail.label}
                              </div>
                              <div className="mt-1.5 text-sm md:text-base font-medium text-white">
                                {detail.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Дополнительная информация пока недоступна.</div>
                      )}

                      {alternativeTitles.length > 0 && (
                        <div className="mt-6">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Альтернативные названия
                          </div>
                          <div className="mt-2 space-y-1">
                            {displayedAlternativeTitles.map((title, index) => (
                              <div key={`${title}-${index}`} className="text-sm text-muted-foreground">
                                {title}
                              </div>
                            ))}
                          </div>
                          {hasHiddenAlternativeTitles && (
                            <button
                              type="button"
                              onClick={() => setShowAllAlternativeTitles((prev) => !prev)}
                              className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              {showAllAlternativeTitles
                                ? 'Скрыть'
                                : `Показать все (${alternativeTitles.length})`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comments Section */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-white mb-4">Комментарии</h3>
            
                      {/* Comments List */}
                      <CommentSection
                        targetId={mangaId}
                        type="MANGA"
                        title="Обсуждение манги"
                      />
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    <MangaReviews 
                      mangaId={mangaId} 
                      mangaTitle={manga?.title || 'Манга'} 
                    />
                  </div>
                )}

                {/* Chapters Tab */}
                {activeTab === 'chapters' && (
                  <div className="space-y-3">
                    {/* Заголовок с сортировкой */}
                    <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-3xl p-4 border border-white/10">
                      <h2 className="text-lg md:text-xl font-bold text-white">Главы</h2>
                      <button
                        onClick={toggleSort}
                        className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg transition-colors text-sm border border-white/20"
                      >
                        {chapterSort === 'asc' && (
                          <>
                            <ArrowUp className="h-4 w-4" />
                            <span className="hidden sm:inline">По возрастанию</span>
                          </>
                        )}
                        {chapterSort === 'desc' && (
                          <>
                            <ArrowDown className="h-4 w-4" />
                            <span className="hidden sm:inline">По убыванию</span>
                          </>
                        )}
                        {chapterSort === 'none' && (
                          <>
                            <ArrowUpDown className="h-4 w-4" />
                            <span className="hidden sm:inline">Без сортировки</span>
                          </>
                        )}
                      </button>
                    </div>

                    {chaptersLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : chapters?.length ? (
                      getSortedChapters(chapters).map((chapter) => {
                        const isCompleted = isChapterCompleted(chapter.id)
                        return (
                          <Link
                            key={chapter.id}
                            to={`/reader/${chapter.id}`}
                            className={cn(
                              "flex items-center p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-3xl hover:bg-white/10 transition-all duration-200 hover:shadow-lg group border border-white/10",
                              isCompleted && "bg-green-500/10 border-green-500/20"
                            )}
                          >
                            {/* Chapter Number */}
                            <div className={cn(
                              "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-primary/20 text-primary rounded-full mr-3 md:mr-4 font-bold text-sm md:text-base backdrop-blur-sm border border-primary/30",
                              isCompleted && "bg-green-500/20 text-green-400 border-green-500/30"
                            )}>
                              {formatChapterNumber(chapter)}
                            </div>

                            {/* Chapter Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={cn(
                                  "text-white font-medium group-hover:text-primary transition-colors text-sm md:text-base line-clamp-1",
                                  isCompleted && "text-green-400"
                                )}>
                                  {formatChapterTitle(chapter)}
                                </h3>
                                {isCompleted && (
                                  <div className="flex items-center justify-center w-5 h-5 bg-green-500/20 rounded-full border border-green-500/30 flex-shrink-0">
                                    <Check className="w-3 h-3 text-green-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                                {formatVolumeNumber(chapter) && (
                                  <span className="text-primary/80">{formatVolumeNumber(chapter)}</span>
                                )}
                                <span>{formatDate(chapter.publishedDate)}</span>
                                {isCompleted && (
                                  <span className="text-green-400 text-xs">• Прочитано</span>
                                )}
                              </div>
                            </div>

                            {/* Like Button & Count */}
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={(e) => handleChapterLike(chapter.id, e)}
                                disabled={likingChapters.has(chapter.id) || likedChapters.has(chapter.id)}
                                aria-pressed={likedChapters.has(chapter.id)}
                                title={likedChapters.has(chapter.id) ? 'Лайк уже поставлен' : 'Поставить лайк'}
                                className={cn(
                                  "flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 border",
                                  likedChapters.has(chapter.id)
                                    ? "text-red-400 bg-red-500/20 border-red-500/30 cursor-default"
                                    : "text-muted-foreground bg-white/5 border-white/10 hover:bg-white/10 hover:text-red-400"
                                )}
                              >
                                <Heart
                                  className={cn(
                                    "h-3 w-3 md:h-4 md:w-4 transition-all",
                                    likedChapters.has(chapter.id) && "fill-current"
                                  )}
                                />
                                <span className="text-xs md:text-sm">{chapter.likeCount || 0}</span>
                              </button>
                              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform text-muted-foreground" />
                            </div>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Главы пока не добавлены</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Other Tabs - In Development */}
                {['discussions', 'moments', 'cards', 'characters', 'similar'].includes(activeTab) && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 text-center border border-white/10">
                    <div className="text-muted-foreground">Раздел в разработке</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Similar Manga (только на ПК) */}
            <div className="hidden lg:block lg:col-span-1 lg:col-start-3">
              <div className="lg:sticky lg:top-24">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4">Похожие</h3>
                <div className="space-y-3">
                  {(similarLoading || awaitingFallback) ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex space-x-3 p-3 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 animate-pulse">
                        <div className="w-16 h-20 bg-white/10 rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-3 bg-white/10 rounded-full w-3/4" />
                          <div className="h-3 bg-white/10 rounded-full w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : similarManga.length ? (
                    <>
                      {similarManga.map((item) => {
                        const itemYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null
                        const cover = item.coverImageUrl || ''
                        const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).filter(Boolean) : []
                        return (
                          <Link
                            key={item.id}
                            to={`/manga/${item.id}`}
                            className="flex space-x-3 p-3 bg-white/5 backdrop-blur-sm rounded-3xl hover:bg-white/10 transition-colors border border-white/10"
                          >
                            <div className="w-16 h-20 rounded-lg flex-shrink-0 overflow-hidden border border-white/10 bg-white/10">
                              {cover ? (
                                <img
                                  src={cover}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-2">
                                  Нет обложки
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-sm line-clamp-2 mb-1">
                                {item.title}
                              </h4>
                              <div className="text-muted-foreground text-xs flex items-center gap-1 truncate">
                                {genres.length > 0 && <span className="truncate">{genres.slice(0, 2).join(', ')}</span>}
                                {itemYear && genres.length > 0 && <span>•</span>}
                                {itemYear && <span>{itemYear}</span>}
                              </div>
                              {item.updatedAt && (
                                <p className="text-muted-foreground/70 text-xs mt-1">
                                  Обновлено: {formatDate(item.updatedAt)}
                                </p>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                      {similarUsesFallback && (
                        <p className="text-xs text-white/60 px-1">Добавлены популярные тайтлы, чтобы дополнить подборку.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground/80">Пока нет похожих тайтлов</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
