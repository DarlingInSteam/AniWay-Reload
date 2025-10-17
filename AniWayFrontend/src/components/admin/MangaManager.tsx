import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { BookOpen, Edit, Trash2, Search, RefreshCw, Plus, Eye, Layers, Loader2, Save } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import type { ChapterDTO, ChapterCreateRequest, MangaResponseDTO } from '@/types'
import { MangaTooltip } from '@/components/manga'

interface MangaItem {
  id: number
  title: string
  author: string
  genre: string
  status: string
  description: string
  releaseDate: string
  coverImageUrl: string
  chapterCount: number
  createdAt: string
  updatedAt: string
  tags?: string
  type?: string
  views?: number
  totalChapters?: number
  engName?: string
}

interface EditMangaForm {
  title: string
  author: string
  genre: string
  status: string
  description: string
  releaseDate: string
}

interface ChapterForm {
  chapterNumber: string
  volumeNumber: string
  originalChapterNumber: string
  title: string
  publishedDate: string
}

const DEFAULT_CHAPTER_FORM: ChapterForm = {
  chapterNumber: '',
  volumeNumber: '',
  originalChapterNumber: '',
  title: '',
  publishedDate: ''
}

const MANGA_STATUSES = [
  { value: 'ONGOING', label: 'Выходит' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'HIATUS', label: 'На паузе' },
  { value: 'CANCELLED', label: 'Отменена' }
]

const TOOLTIP_TYPE_VALUES: readonly MangaResponseDTO['type'][] = ['MANGA', 'MANHWA', 'MANHUA', 'WESTERN_COMIC', 'RUSSIAN_COMIC', 'OEL', 'OTHER']
const TOOLTIP_STATUS_VALUES: readonly MangaResponseDTO['status'][] = ['ONGOING', 'COMPLETED', 'ANNOUNCED', 'HIATUS', 'CANCELLED']
const TOOLTIP_DATE_FALLBACK = '1970-01-01T00:00:00.000Z'

const normalizeTooltipIsoDate = (value?: string | null, fallback: string = TOOLTIP_DATE_FALLBACK) => {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return parsed.toISOString()
}

const normalizeTooltipType = (value?: string | null): MangaResponseDTO['type'] => {
  if (!value) return 'OTHER'
  const normalized = value.replace(/[-\s]/g, '_').toUpperCase() as MangaResponseDTO['type']
  return TOOLTIP_TYPE_VALUES.includes(normalized) ? normalized : 'OTHER'
}

const normalizeTooltipStatus = (value?: string | null): MangaResponseDTO['status'] => {
  if (!value) return 'ONGOING'
  const normalized = value.toUpperCase() as MangaResponseDTO['status']
  return TOOLTIP_STATUS_VALUES.includes(normalized) ? normalized : 'ONGOING'
}

const toTooltipManga = (manga: MangaItem): MangaResponseDTO => {
  const chapterCount = typeof manga.chapterCount === 'number' && !Number.isNaN(manga.chapterCount)
    ? manga.chapterCount
    : typeof manga.totalChapters === 'number' && !Number.isNaN(manga.totalChapters)
      ? manga.totalChapters
      : 0
  const totalChapters = typeof manga.totalChapters === 'number' && !Number.isNaN(manga.totalChapters)
    ? manga.totalChapters
    : chapterCount
  const views = typeof manga.views === 'number' && !Number.isNaN(manga.views) ? manga.views : 0
  const releaseIso = normalizeTooltipIsoDate(manga.releaseDate ?? manga.createdAt)
  const createdIso = normalizeTooltipIsoDate(manga.createdAt, releaseIso)
  const updatedIso = normalizeTooltipIsoDate(manga.updatedAt, createdIso)

  return {
    id: manga.id,
    title: manga.title,
    author: manga.author || 'Не указан',
    artist: undefined,
    genre: manga.genre || '',
    tags: manga.tags,
    engName: manga.engName,
    alternativeNames: undefined,
    type: normalizeTooltipType(manga.type),
    ageLimit: undefined,
    isLicensed: undefined,
    status: normalizeTooltipStatus(manga.status),
    description: manga.description || '',
    releaseDate: releaseIso,
    coverImageUrl: manga.coverImageUrl,
    chapterCount,
    totalChapters,
    views,
    createdAt: createdIso,
    updatedAt: updatedIso
  }
}

export function MangaManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED'>('all')
  const [editingManga, setEditingManga] = useState<MangaItem | null>(null)
  const [editForm, setEditForm] = useState<EditMangaForm>({
    title: '',
    author: '',
    genre: '',
    status: 'ONGOING',
    description: '',
    releaseDate: ''
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false)
  const [managedManga, setManagedManga] = useState<MangaItem | null>(null)
  const [chapterMode, setChapterMode] = useState<'create' | 'edit'>('create')
  const [chapterForm, setChapterForm] = useState<ChapterForm>({ ...DEFAULT_CHAPTER_FORM })
  const [activeChapter, setActiveChapter] = useState<ChapterDTO | null>(null)
  const [selectedMangaIds, setSelectedMangaIds] = useState<Set<number>>(new Set())
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Загрузка списка манги
  const { data: mangaList = [], isLoading, refetch } = useQuery({
    queryKey: ['manga-list', searchQuery, statusFilter],
    queryFn: async () => {
      if (searchQuery.trim()) {
        return apiClient.searchManga({
          query: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined
        })
      }
      const allManga = await apiClient.getAllManga()
      if (statusFilter !== 'all') {
        return allManga.filter(manga => manga.status === statusFilter)
      }
      return allManga
    },
    staleTime: 30000
  })

  const {
    data: chapterList = [],
    isFetching: isFetchingChapters,
    isLoading: isLoadingChapters,
    refetch: refetchChapters
  } = useQuery({
    queryKey: ['manga-chapters', managedManga?.id],
    queryFn: async () => {
      if (!managedManga?.id) {
        return [] as ChapterDTO[]
      }
      return apiClient.getChaptersByManga(managedManga.id)
    },
    enabled: isChapterDialogOpen && Boolean(managedManga?.id),
    staleTime: 30000
  })

  // Мутация для обновления манги
  const updateMangaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EditMangaForm }) => {
      return apiClient.updateManga(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      setIsEditDialogOpen(false)
      setEditingManga(null)
      toast.success('Манга успешно обновлена')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Мутация для удаления манги
  const deleteMangaMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.deleteManga(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      toast.success('Манга успешно удалена')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Мутация для batch удаления манги
  const batchDeleteMangaMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiClient.batchDeleteManga(ids)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      setSelectedMangaIds(new Set())
      setIsBatchDeleteDialogOpen(false)
      
      if (data.succeeded_count > 0) {
        toast.success(`Успешно удалено: ${data.succeeded_count} из ${data.total_requested}`)
      }
      if (data.failed_count > 0) {
        toast.error(`Не удалось удалить: ${data.failed_count} манга(и)`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Ошибка при удалении: ${error.message}`)
    }
  })

  const createChapterMutation = useMutation({
    mutationFn: async (payload: ChapterCreateRequest) => {
      return apiClient.createChapter(payload)
    },
    onSuccess: () => {
      toast.success('Глава успешно добавлена')
      if (managedManga?.id) {
        queryClient.invalidateQueries({ queryKey: ['manga-chapters', managedManga.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      setChapterMode('create')
      setActiveChapter(null)
      setChapterForm({ ...DEFAULT_CHAPTER_FORM })
      void refetchChapters()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ChapterCreateRequest }) => {
      return apiClient.updateChapter(id, payload)
    },
    onSuccess: (chapter) => {
      toast.success(`Глава ${chapter.chapterNumber} обновлена`)
      if (managedManga?.id) {
        queryClient.invalidateQueries({ queryKey: ['manga-chapters', managedManga.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      setChapterMode('create')
      setActiveChapter(null)
      setChapterForm({ ...DEFAULT_CHAPTER_FORM })
      void refetchChapters()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteChapterMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await apiClient.deleteChapter(id)
      return id
    },
    onSuccess: () => {
      toast.success('Глава удалена')
      if (managedManga?.id) {
        queryClient.invalidateQueries({ queryKey: ['manga-chapters', managedManga.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      void refetchChapters()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const isSavingChapter = createChapterMutation.isPending || updateChapterMutation.isPending
  const isDeletingChapter = deleteChapterMutation.isPending

  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }), [])

  const formatDateTime = useCallback((value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return dateTimeFormatter.format(date)
  }, [dateTimeFormatter])

  const formatChapterNumber = useCallback((value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—'
    return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/\.00$/, '')
  }, [])

  const toInputDateTime = useCallback((value?: string | null) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }, [])

  const fromInputDateTime = useCallback((value: string) => {
    if (!value || value.trim() === '') {
      return null
    }
    if (value.length === 16) {
      return `${value}:00`
    }
    return value
  }, [])

  const normalizeNumberInput = useCallback((value: string) => {
    if (!value) return undefined
    const normalized = value.replace(',', '.').trim()
    if (normalized === '') return undefined
    const number = Number(normalized)
    return Number.isFinite(number) ? number : undefined
  }, [])

  const suggestNextChapterNumber = useCallback(() => {
    if (!chapterList.length) {
      return '1'
    }
    const maxNumber = Math.max(...chapterList.map((chapter) => chapter.chapterNumber ?? 0))
    if (!Number.isFinite(maxNumber)) {
      return '1'
    }
    const increment = Number.isInteger(maxNumber) ? 1 : 0.1
    const nextValue = maxNumber + increment
    const formatted = Number.isInteger(nextValue) ? nextValue.toFixed(0) : nextValue.toFixed(2)
    return formatted.replace(/\.00$/, '')
  }, [chapterList])

  const toInputNumberString = useCallback((value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return ''
    }
    return Number.isInteger(value) ? value.toFixed(0) : value.toString()
  }, [])

  const resetChapterForm = useCallback((mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setChapterForm({
        ...DEFAULT_CHAPTER_FORM,
        chapterNumber: suggestNextChapterNumber()
      })
    } else {
      setChapterForm({ ...DEFAULT_CHAPTER_FORM })
    }
  }, [suggestNextChapterNumber])

  useEffect(() => {
    if (isChapterDialogOpen && chapterMode === 'create') {
      setChapterForm((prev) => ({ ...prev, chapterNumber: suggestNextChapterNumber() }))
    }
  }, [chapterList, chapterMode, isChapterDialogOpen, suggestNextChapterNumber])

  const openChapterDialog = useCallback((manga: MangaItem) => {
    setManagedManga(manga)
    setIsChapterDialogOpen(true)
    setChapterMode('create')
    setActiveChapter(null)
    resetChapterForm('create')
  }, [resetChapterForm])

  const closeChapterDialog = useCallback(() => {
    setIsChapterDialogOpen(false)
    setManagedManga(null)
    setActiveChapter(null)
    setChapterMode('create')
    setChapterForm({ ...DEFAULT_CHAPTER_FORM })
  }, [])

  const startCreateChapter = useCallback(() => {
    setChapterMode('create')
    setActiveChapter(null)
    resetChapterForm('create')
  }, [resetChapterForm])

  const startEditChapter = useCallback((chapter: ChapterDTO) => {
    setChapterMode('edit')
    setActiveChapter(chapter)
    setChapterForm({
      chapterNumber: toInputNumberString(chapter.chapterNumber),
      volumeNumber: toInputNumberString(chapter.volumeNumber),
      originalChapterNumber: toInputNumberString(chapter.originalChapterNumber),
      title: chapter.title || '',
      publishedDate: toInputDateTime(chapter.publishedDate || chapter.createdAt)
    })
  }, [toInputDateTime, toInputNumberString])

  const handleChapterSubmit = useCallback(() => {
    if (!managedManga?.id) {
      toast.error('Не выбрана манга для управления главами')
      return
    }

    const chapterNumber = normalizeNumberInput(chapterForm.chapterNumber)
    if (chapterNumber === undefined) {
      toast.error('Укажите корректный номер главы')
      return
    }

    const payload: ChapterCreateRequest = {
      mangaId: managedManga.id,
      chapterNumber,
      volumeNumber: normalizeNumberInput(chapterForm.volumeNumber) ?? null,
      originalChapterNumber: normalizeNumberInput(chapterForm.originalChapterNumber) ?? null,
      title: chapterForm.title?.trim() || null,
      publishedDate: fromInputDateTime(chapterForm.publishedDate || '')
    }

    if (chapterMode === 'create') {
      createChapterMutation.mutate(payload)
    } else if (chapterMode === 'edit' && activeChapter) {
      updateChapterMutation.mutate({ id: activeChapter.id, payload })
    }
  }, [activeChapter, chapterForm, chapterMode, createChapterMutation, fromInputDateTime, managedManga, normalizeNumberInput, updateChapterMutation])

  const handleDeleteChapter = useCallback((chapter: ChapterDTO) => {
    deleteChapterMutation.mutate({ id: chapter.id })
  }, [deleteChapterMutation])

  const openEditDialog = (manga: MangaItem) => {
    setEditingManga(manga)
    setEditForm({
      title: manga.title,
      author: manga.author,
      genre: manga.genre,
      status: manga.status,
      description: manga.description,
      releaseDate: manga.releaseDate ? manga.releaseDate.split('T')[0] : '' // Форматируем дату для input[type=date]
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingManga) return

    updateMangaMutation.mutate({
      id: editingManga.id,
      data: editForm
    })
  }

  const handleDeleteManga = (id: number) => {
    deleteMangaMutation.mutate(id)
  }

  const toggleMangaSelection = useCallback((id: number) => {
    setSelectedMangaIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedMangaIds.size === mangaList.length) {
      setSelectedMangaIds(new Set())
    } else {
      setSelectedMangaIds(new Set(mangaList.map((m) => m.id)))
    }
  }, [selectedMangaIds.size, mangaList])

  const handleBatchDelete = useCallback(() => {
    if (selectedMangaIds.size === 0) return
    batchDeleteMangaMutation.mutate(Array.from(selectedMangaIds))
  }, [selectedMangaIds, batchDeleteMangaMutation])

  return (
    <div className="space-y-6">
      {/* Фильтры и поиск */}
      <Card className="glass-panel border border-white/5 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Управление мангой
          </CardTitle>
          <CardDescription>
            Редактирование и удаление манги в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Название манги..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Статус</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED')}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {MANGA_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список манги */}
      <Card className="glass-panel border border-white/5 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Манга в системе ({mangaList.length})
            </CardTitle>
            {selectedMangaIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Выбрано: {selectedMangaIds.size}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMangaIds(new Set())}
                >
                  Снять выбор
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBatchDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить ({selectedMangaIds.size})
                </Button>
              </div>
            )}
          </div>
          {mangaList.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="select-all"
                checked={selectedMangaIds.size === mangaList.length && mangaList.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Выбрать все
              </Label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : mangaList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Манга не найдена</p>
              <p className="text-sm">Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <div className="relative grid
              grid-cols-2
              [grid-auto-rows:auto]
              gap-2 xs:gap-2.5 sm:gap-3 lg:gap-4 xl:gap-4.5
              sm:[grid-template-columns:repeat(auto-fill,minmax(165px,1fr))]
              md:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]
              lg:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]
              xl:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]
              items-start justify-items-start">
              {mangaList.map((manga) => {
                const releaseYear = manga.releaseDate ? new Date(manga.releaseDate).getFullYear() : '—'
                const resolvedChapterCount = typeof manga.chapterCount === 'number'
                  ? manga.chapterCount
                  : typeof manga.totalChapters === 'number'
                    ? manga.totalChapters
                    : undefined
                const hasChapterDelta = typeof manga.totalChapters === 'number'
                  && typeof manga.chapterCount === 'number'
                  && manga.totalChapters !== manga.chapterCount
                const statusInfo = MANGA_STATUSES.find((statusOption) => statusOption.value === manga.status)
                const basicMeta = [
                  manga.author || 'Автор неизвестен',
                  releaseYear !== '—' ? String(releaseYear) : null
                ].filter(Boolean).join(' · ')
                const tooltipPayload = toTooltipManga(manga)

                return (
                  <div key={manga.id} className="flex w-full max-w-[190px] flex-col gap-1.5">
                    <MangaTooltip manga={tooltipPayload}>
                      <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] shadow-lg transition-all duration-300 hover:border-primary/40 hover:shadow-primary/20 focus-within:border-primary/40 focus-within:shadow-primary/20">
                        <div className="relative aspect-[3/4]">
                          {/* Checkbox для выбора */}
                          <div className="absolute top-2 right-2 z-10">
                            <Checkbox
                              checked={selectedMangaIds.has(manga.id)}
                              onCheckedChange={() => toggleMangaSelection(manga.id)}
                              className="bg-black/70 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary backdrop-blur-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <img
                            src={manga.coverImageUrl}
                            alt={manga.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            onError={(event) => {
                              const target = event.target as HTMLImageElement
                              target.src = '/placeholder-manga.jpg'
                            }}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            <Badge
                              className="bg-black/70 text-white text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm border-transparent px-1.5 py-0.5"
                              title={statusInfo?.label || manga.status}
                            >
                              {statusInfo?.label || manga.status}
                            </Badge>
                            {manga.type ? (
                              <Badge
                                className="bg-white/15 text-white border-white/10 text-[9px] font-semibold uppercase tracking-wider backdrop-blur px-1.5 py-0.5"
                                title={manga.type}
                              >
                                {manga.type}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
                            <Badge
                              className="bg-blue-500/85 text-white border-blue-400/30 text-[10px] font-semibold shadow-lg backdrop-blur px-2 py-0.5"
                              title={typeof resolvedChapterCount === 'number' ? `Глав по факту: ${resolvedChapterCount}` : 'Нет данных по главам'}
                            >
                              {typeof resolvedChapterCount === 'number' ? `${resolvedChapterCount} глав` : 'Нет глав'}
                            </Badge>
                            {hasChapterDelta ? (
                              <Badge
                                className="bg-white/20 text-white border-transparent text-[9px] backdrop-blur px-1.5 py-0.5"
                                title={`В каталоге указано ${manga.totalChapters}`}
                              >
                                Каталог: {manga.totalChapters}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="absolute inset-0 flex items-end justify-end p-2">
                            <div className="flex gap-1 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/manga/${manga.id}`, '_blank')}
                                className="pointer-events-auto h-8 w-8 rounded-lg bg-black/45 text-white/75 hover:bg-primary/40 hover:text-white"
                                title="Открыть страницу манги"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(manga)}
                                className="pointer-events-auto h-8 w-8 rounded-lg bg-black/45 text-white/75 hover:bg-primary/40 hover:text-white"
                                title="Редактировать мангу"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openChapterDialog(manga)}
                                className="pointer-events-auto h-8 w-8 rounded-lg bg-black/45 text-white/80 hover:bg-primary/40 hover:text-white"
                                title="Управление главами"
                              >
                                <Layers className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="pointer-events-auto h-8 w-8 rounded-lg bg-black/45 text-red-200 hover:bg-red-500/25 hover:text-white"
                                    title="Удалить мангу"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить мангу?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Это действие нельзя отменить. Будут удалены все главы и изображения манги "{manga.title}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteManga(manga.id)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    </MangaTooltip>

                    <div className="flex flex-col gap-1 px-1">
                      <h3 className="text-xs font-semibold text-white line-clamp-2 md:text-sm" title={manga.title}>
                        {manga.title}
                      </h3>
                      {manga.engName ? (
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/45 line-clamp-1" title={manga.engName}>
                          {manga.engName}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-white/55 line-clamp-1" title={basicMeta}>
                        {basicMeta || 'Информация не указана'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать мангу</DialogTitle>
            <DialogDescription>
              Изменение информации о манге "{editingManga?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Название</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-author">Автор</Label>
                <Input
                  id="edit-author"
                  value={editForm.author}
                  onChange={(e) => setEditForm(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANGA_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-genre">Жанры</Label>
              <Input
                id="edit-genre"
                placeholder="Разделите жанры запятыми"
                value={editForm.genre}
                onChange={(e) => setEditForm(prev => ({ ...prev, genre: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-release-date">Дата выхода</Label>
              <Input
                id="edit-release-date"
                type="date"
                value={editForm.releaseDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, releaseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMangaMutation.isPending}>
              {updateMangaMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChapterDialogOpen} onOpenChange={(open) => { if (!open) closeChapterDialog() }}>
        <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-y-auto glass-panel border border-white/10">
          <DialogHeader>
            <DialogTitle>
              Управление главами
              {managedManga ? <span className="block text-base text-white/70">{managedManga.title}</span> : null}
            </DialogTitle>
            <DialogDescription>
              Добавляйте главы, обновляйте метаданные и поддерживайте каталог в актуальном состоянии.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-muted-foreground">
                {managedManga ? (
                  <span>
                    Текущих глав: <span className="text-white font-medium">{chapterList.length}</span>
                    {typeof managedManga.totalChapters === 'number' && managedManga.totalChapters > 0 ? (
                      <span className="ml-2 text-xs text-white/60">Всего в базе: {managedManga.totalChapters}</span>
                    ) : null}
                  </span>
                ) : (
                  <span>Выберите мангу, чтобы управлять её главами.</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchChapters()}
                  disabled={isFetchingChapters}
                  className="border-white/20 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingChapters ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCreateChapter}
                  className="border-blue-500/50 text-blue-100 hover:bg-blue-500/20 hover:border-blue-400"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Новая глава
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <GlassPanel className="border border-white/10 space-y-4 max-h-[55vh] overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Список глав</h3>
                  {isLoadingChapters ? <Loader2 className="h-4 w-4 animate-spin text-white/60" /> : null}
                </div>

                <div className="overflow-y-auto pr-1" style={{ maxHeight: '45vh' }}>
                  {isLoadingChapters ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                    </div>
                  ) : chapterList.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-lg p-6 text-center">
                      Главы пока не добавлены. Используйте форму справа, чтобы создать первую главу.
                    </div>
                  ) : (
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="border-white/10 text-white/60 uppercase tracking-wide text-[11px]">
                          <TableHead>Глава</TableHead>
                          <TableHead>Название</TableHead>
                          <TableHead className="text-center">Страниц</TableHead>
                          <TableHead className="text-right">Обновлено</TableHead>
                          <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chapterList.map((chapter) => (
                          <TableRow key={chapter.id} className="border-white/10 hover:bg-white/5 transition-colors">
                            <TableCell className="font-semibold text-white">
                              {formatChapterNumber(chapter.chapterNumber)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-white line-clamp-1">
                                  {chapter.title || 'Без названия'}
                                </span>
                                <span className="text-xs text-white/40">ID: {chapter.id}</span>
                                {chapter.volumeNumber != null && (
                                  <span className="text-xs text-white/50">Том {chapter.volumeNumber}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-white/80">
                              {chapter.pageCount ?? '—'}
                            </TableCell>
                            <TableCell className="text-right text-white/70">
                              {formatDateTime(chapter.updatedAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditChapter(chapter)}
                                  className="text-blue-200 hover:text-blue-100 hover:bg-blue-500/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-300 hover:text-red-100 hover:bg-red-500/10"
                                      disabled={isDeletingChapter}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Удалить главу {formatChapterNumber(chapter.chapterNumber)}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Удаление также очистит все страницы главы.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteChapter(chapter)}
                                        className="bg-red-500 hover:bg-red-600"
                                        disabled={isDeletingChapter}
                                      >
                                        Удалить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </GlassPanel>

              <GlassPanel className="border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                      {chapterMode === 'create' ? 'Новая глава' : 'Редактирование главы'}
                    </h3>
                    {chapterMode === 'edit' && activeChapter && (
                      <p className="text-xs text-white/60">
                        ID {activeChapter.id} • Глава {formatChapterNumber(activeChapter.chapterNumber)}
                      </p>
                    )}
                  </div>
                  {chapterMode === 'edit' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startCreateChapter}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      Отмена
                    </Button>
                  )}
                </div>

                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleChapterSubmit()
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="chapter-number">Номер главы</Label>
                      <Input
                        id="chapter-number"
                        value={chapterForm.chapterNumber}
                        onChange={(event) => setChapterForm((prev) => ({ ...prev, chapterNumber: event.target.value }))}
                        placeholder="Например, 96.5"
                        required
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volume-number">Номер тома</Label>
                      <Input
                        id="volume-number"
                        value={chapterForm.volumeNumber}
                        onChange={(event) => setChapterForm((prev) => ({ ...prev, volumeNumber: event.target.value }))}
                        placeholder="Опционально"
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="original-number">Оригинальный номер</Label>
                      <Input
                        id="original-number"
                        value={chapterForm.originalChapterNumber}
                        onChange={(event) => setChapterForm((prev) => ({ ...prev, originalChapterNumber: event.target.value }))}
                        placeholder="Например, 100.1"
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="published-date">Дата публикации</Label>
                      <Input
                        id="published-date"
                        type="datetime-local"
                        value={chapterForm.publishedDate}
                        onChange={(event) => setChapterForm((prev) => ({ ...prev, publishedDate: event.target.value }))}
                        className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chapter-title">Название главы</Label>
                    <Input
                      id="chapter-title"
                      value={chapterForm.title}
                      onChange={(event) => setChapterForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Введите название главы"
                      className="bg-black/40 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingChapter}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {chapterMode === 'create' ? 'Создать главу' : 'Сохранить изменения'}
                  </Button>
                </form>
              </GlassPanel>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить выбранную мангу?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить {selectedMangaIds.size} манга(и). Это действие нельзя отменить. 
              Будут удалены все главы и изображения выбранных манг.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={batchDeleteMangaMutation.isPending}
            >
              {batchDeleteMangaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить ({selectedMangaIds.size})
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
