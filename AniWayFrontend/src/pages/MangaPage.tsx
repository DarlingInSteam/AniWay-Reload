import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, Play, Eye, Heart, Star, ChevronDown, ChevronUp, Send,
  Bookmark, Edit, AlertTriangle, Share, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Check
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor, getStatusText, cn } from '@/lib/utils'
import { formatChapterTitle, formatChapterNumber, formatVolumeNumber } from '@/lib/chapterUtils'
import { BookmarkControls } from '../components/bookmarks/BookmarkControls'
import { ReadingProgressBar, LastReadChapter } from '../components/progress/ReadingProgress'
import { ReadingButton } from '../components/reading/ReadingButton'
import { useReadingProgress } from '@/hooks/useProgress'
import { CommentSection } from '../components/comments/CommentSection'
import MangaReviews from '../components/MangaReviews'
import { useAuth } from '@/contexts/AuthContext'
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
  const [showFullStats, setShowFullStats] = useState(false)
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

  // Track screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const { data: manga, isLoading: mangaLoading } = useQuery({
    queryKey: ['manga', mangaId, user?.id],
    queryFn: () => apiClient.getMangaById(mangaId, user?.id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

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

  const { isChapterCompleted } = useReadingProgress()

  // Оптимизированная загрузка статусов лайков глав
  useEffect(() => {
    const loadChapterLikeStatuses = async () => {
      if (!chapters || !user || chapters.length === 0) {
        console.log('Skipping like status load:', { chapters: !!chapters, user: !!user, length: chapters?.length })
        return
      }

      console.log('Loading like statuses for', chapters.length, 'chapters')
      try {
        // Ограничиваем количество одновременных запросов и добавляем кеширование
        const batchSize = 10
        const likeStatuses = []
        
        for (let i = 0; i < chapters.length; i += batchSize) {
          const batch = chapters.slice(i, i + batchSize)
          const batchPromises = batch.map(async (chapter) => {
            try {
              // Добавляем задержку между запросами для снижения нагрузки
              if (i > 0) await new Promise(resolve => setTimeout(resolve, 100))
              const response = await apiClient.isChapterLiked(chapter.id)
              return { chapterId: chapter.id, liked: response.liked }
            } catch (error) {
              console.error(`Failed to load like status for chapter ${chapter.id}:`, error)
              return { chapterId: chapter.id, liked: false }
            }
          })
          
          const batchResults = await Promise.all(batchPromises)
          likeStatuses.push(...batchResults)
        }

        const likedChapterIds = likeStatuses
          .filter(status => status.liked)
          .map(status => status.chapterId)

        console.log('Loaded like statuses:', likedChapterIds.length, 'liked chapters')
        setLikedChapters(new Set(likedChapterIds))
      } catch (error) {
        console.error('Failed to load chapter like statuses:', error)
      }
    }

    // Добавляем debounce чтобы избежать множественных вызовов
    const timeoutId = setTimeout(loadChapterLikeStatuses, 500)
    return () => clearTimeout(timeoutId)
  }, [chapters, user])

  // Handle chapter like/unlike
  const handleChapterLike = async (chapterId: number, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to reader
    e.stopPropagation()

    if (likingChapters.has(chapterId)) return // Prevent double-clicks

    setLikingChapters(prev => new Set(prev).add(chapterId))

    try {
      const response = await apiClient.toggleChapterLike(chapterId)
      console.log('Toggle like response:', response)

      // Update local state based on server response
      if (response.liked) {
        setLikedChapters(prev => new Set(prev).add(chapterId))
      } else {
        setLikedChapters(prev => {
          const newSet = new Set(prev)
          newSet.delete(chapterId)
          return newSet
        })
      }

      // Оптимистично обновляем кеш без полной инвалидации
      queryClient.setQueryData(['chapters', mangaId], (oldData: any) => {
        if (!oldData) return oldData
        return oldData.map((chapter: any) => {
          if (chapter.id === chapterId) {
            console.log(`Updating chapter ${chapterId} likeCount from ${chapter.likeCount} to ${response.likeCount}`)
            return {
              ...chapter,
              likeCount: response.likeCount
            }
          }
          return chapter
        })
      })

    } catch (error) {
      console.error('Failed to toggle chapter like:', error)
    } finally {
      setLikingChapters(prev => {
        const newSet = new Set(prev)
        newSet.delete(chapterId)
        return newSet
      })
    }
  }

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

  // Фейковые данные
  const rating = (4 + Math.random()).toFixed(1)
  const views = manga?.views || 0
  const likes = Math.floor(Math.random() * 5000) + 500

  // Получаем жанры из API или используем фейковые
  const genres = manga.genre ? manga.genre.split(',').map(g => g.trim()) : ['Экшен', 'Приключения', 'Драма', 'Фэнтези', 'Романтика', 'Комедия']

  // Получаем альтернативные названия из API
  const alternativeTitles = manga.alternativeNames 
    ? manga.alternativeNames.split(';').map(name => name.trim()).filter(name => name) 
    : []

  // Получаем теги из API
  const tags = manga.tags ? manga.tags.split(',').map(t => t.trim()) : []

  // Функция для получения отображаемого типа
  const getTypeDisplay = (type?: string) => {
    switch (type) {
      case 'MANGA': return 'Манга'
      case 'MANHWA': return 'Манхва'
      case 'MANHUA': return 'Маньхуа'
      case 'WESTERN_COMIC': return 'Западный комикс'
      case 'RUSSIAN_COMIC': return 'Русский комикс'
      case 'OEL': return 'OEL'
      case 'OTHER': return 'Другое'
      default: return 'Манга'
    }
  }

  // Фейковая статистика рейтингов
  const ratingStats = [
    { rating: 10, count: 156 },
    { rating: 9, count: 234 },
    { rating: 8, count: 189 },
    { rating: 7, count: 145 },
    { rating: 6, count: 98 },
    { rating: 5, count: 67 },
    { rating: 4, count: 34 },
    { rating: 3, count: 23 },
    { rating: 2, count: 12 },
    { rating: 1, count: 8 }
  ]

  // Фейковая статистика закладок
  const bookmarkStats = [
    { status: 'Читаю', count: 2341 },
    { status: 'Буду читать', count: 1876 },
    { status: 'Прочитано', count: 945 },
    { status: 'Отложено', count: 234 },
    { status: 'Брошено', count: 156 },
    { status: 'Любимое', count: 567 }
  ]

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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
            {/* Left Column - Cover and Controls */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-4 md:space-y-6">
                {/* Cover Image */}
                <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-white/5 backdrop-blur-sm max-w-sm mx-auto lg:max-w-none border border-white/10">
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

                {/* Title */}
                <div className="text-center lg:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{manga.title}</h1>
                  {/* Mobile - Type and Year after title */}
                  <div className="lg:hidden flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <span>{getTypeDisplay(manga.type)}</span>
                    <span>•</span>
                    <span>{new Date(manga.releaseDate).getFullYear()}</span>
                  </div>
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
                    className="mb-4" 
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
            <div className="lg:col-span-2 -mt-2">
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
                  className="mb-4" 
                />

                {/* Кнопки действий */}
                <BookmarkControls mangaId={mangaId} />
              </div>

              {/* Tabs */}
              <div className="border-b border-white/20 mb-6">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {tabs.map(tab => {
                    if (tab.mobileOnly && isDesktop) return null
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabParam(tab.id as any)}
                        className={cn(
                          'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
                          activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-white'
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
                      <h3 className="text-lg font-bold text-white mb-3">Описание</h3>
                      <div className="text-muted-foreground text-sm md:text-base">
                        <div className={cn(
                          'transition-all duration-300',
                          showFullDescription ? '' : 'line-clamp-3'
                        )}>
                          {manga.description || 'Описание отсутствует. Это длинный текст описания манги, который может занимать много строк и нуждается в сокращении для лучшего отображения на странице.'}
                        </div>
                        {!showFullDescription && (
                          <button
                            onClick={() => setShowFullDescription(true)}
                            className="flex items-center gap-1 text-primary mt-2 hover:text-primary/80 transition-colors"
                          >
                            <ChevronDown className="h-4 w-4" />
                            Показать полностью
                          </button>
                        )}
                        {showFullDescription && (
                          <button
                            onClick={() => setShowFullDescription(false)}
                            className="flex items-center gap-1 text-primary mt-2 hover:text-primary/80 transition-colors"
                          >
                            <ChevronUp className="h-4 w-4" />
                            Свернуть
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Genres - полная ширина (clickable -> catalog with filter) */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-white mb-3">Жанры</h3>
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => navigate(`/catalog?genres=${encodeURIComponent(genre)}`)}
                            className="group px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-sm rounded-full border border-white/20 hover:bg-primary/30 hover:border-primary/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label={`Перейти в каталог по жанру ${genre}`}
                          >
                            <span className="pointer-events-none select-none">{genre}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags - только если есть теги (clickable -> catalog with filter) */}
                    {tags.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-3">Теги</h3>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => navigate(`/catalog?tags=${encodeURIComponent(tag)}`)}
                              className="group px-3 py-1 bg-primary/10 backdrop-blur-sm text-primary text-sm rounded-full border border-primary/30 hover:bg-primary/30 hover:text-white hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                              aria-label={`Перейти в каталог по тегу ${tag}`}
                            >
                              <span className="pointer-events-none select-none">{tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info Section - полная ширина */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-white mb-4">Информация</h3>
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <div className="text-muted-foreground text-sm min-w-[150px]">Тип</div>
                          <div className="text-white font-medium">
                            {getTypeDisplay(manga.type)}
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <div className="text-muted-foreground text-sm min-w-[150px]">Статус</div>
                          <div className="text-white font-medium">
                            {getStatusText(manga.status)}
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <div className="text-muted-foreground text-sm min-w-[150px]">Год</div>
                          <div className="text-white">{new Date(manga.releaseDate).getFullYear()}</div>
                        </div>

                        {manga.author && (
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="text-muted-foreground text-sm min-w-[150px]">Автор</div>
                            <div className="text-white">{manga.author}</div>
                          </div>
                        )}

                        {manga.artist && (
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="text-muted-foreground text-sm min-w-[150px]">Художник</div>
                            <div className="text-white">{manga.artist}</div>
                          </div>
                        )}

                        {manga.ageLimit && (
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="text-muted-foreground text-sm min-w-[150px]">Возрастное ограничение</div>
                            <div className="text-white">{manga.ageLimit}+</div>
                          </div>
                        )}

                        {manga.isLicensed !== undefined && (
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="text-muted-foreground text-sm min-w-[150px]">Лицензия</div>
                            <div className="text-white">
                              {manga.isLicensed ? 'Лицензировано' : 'Не лицензировано'}
                            </div>
                          </div>
                        )}

                        {manga.engName && (
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="text-muted-foreground text-sm min-w-[150px]">Английское название</div>
                            <div className="text-white">{manga.engName}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternative Titles - только если есть альтернативные названия */}
                    {alternativeTitles.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-3">Альтернативные названия</h3>
                        <div className="space-y-1">
                          {alternativeTitles.map((title, index) => (
                            <div key={index} className="text-muted-foreground text-sm">{title}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 md:p-6 border border-white/10">
                      <h3 className="text-lg font-bold text-white mb-4">Статистика</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Rating Stats */}
                        <div>
                          <div className="text-muted-foreground text-sm mb-3">Оценки</div>
                          <div className="space-y-2">
                            {ratingStats.slice(0, showFullStats ? ratingStats.length : 3).map((stat) => (
                              <div key={stat.rating} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-accent fill-current" />
                                  <span className="text-white">{stat.rating}</span>
                                </div>
                                <span className="text-muted-foreground">{stat.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bookmark Stats */}
                        <div>
                          <div className="text-muted-foreground text-sm mb-3">В закладках</div>
                          <div className="space-y-2">
                            {bookmarkStats.slice(0, showFullStats ? bookmarkStats.length : 3).map((stat) => (
                              <div key={stat.status} className="flex items-center justify-between">
                                <span className="text-white">{stat.status}</span>
                                <span className="text-muted-foreground">{stat.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {!showFullStats && (
                        <button
                          onClick={() => setShowFullStats(true)}
                          className="w-full mt-4 text-primary hover:text-primary/80 transition-colors text-sm"
                        >
                          Показать больше
                        </button>
                      )}
                      {showFullStats && (
                        <button
                          onClick={() => setShowFullStats(false)}
                          className="w-full mt-4 text-primary hover:text-primary/80 transition-colors text-sm"
                        >
                          Свернуть
                        </button>
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
                                disabled={likingChapters.has(chapter.id)}
                                className={cn(
                                  "flex items-center space-x-1 px-2 py-1 rounded-lg transition-all duration-200 border",
                                  likedChapters.has(chapter.id)
                                    ? "text-red-400 bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
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
            <div className="hidden lg:block lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <h3 className="text-lg md:text-xl font-bold text-white mb-4">Похожие</h3>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex space-x-3 p-3 bg-white/5 backdrop-blur-sm rounded-3xl hover:bg-white/10 transition-colors border border-white/10">
                      <div className="w-16 h-20 bg-white/10 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm line-clamp-2 mb-1">
                          Название похожей манги {i}
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          Жанр • 2024
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
