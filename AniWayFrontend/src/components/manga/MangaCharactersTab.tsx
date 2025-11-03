import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  Hourglass,
  ImageOff,
  PencilLine,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wand2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type {
  MangaCharacterDTO,
  MangaCharacterModerationRequest,
  MangaCharacterRequest,
  MangaCharacterStatus,
} from '@/types'

type FormState = {
  namePrimary: string
  nameSecondary: string
  description: string
  strength: string
  affiliation: string
  gender: string
  age: string
  classification: string
  skills: string
  removeImage: boolean
}

const emptyForm: FormState = {
  namePrimary: '',
  nameSecondary: '',
  description: '',
  strength: '',
  affiliation: '',
  gender: '',
  age: '',
  classification: '',
  skills: '',
  removeImage: false,
}

type StatusMeta = {
  label: string
  className: string
  Icon: LucideIcon
}

const statusMeta: Record<MangaCharacterStatus, StatusMeta> = {
  APPROVED: {
    label: 'Одобрен',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    Icon: ShieldCheck,
  },
  PENDING: {
    label: 'На модерации',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    Icon: Hourglass,
  },
  REJECTED: {
    label: 'Отклонён',
    className: 'border-red-500/40 bg-red-500/15 text-red-200',
    Icon: X,
  },
}

const optionalField = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit for character images
const ACCEPTED_IMAGE_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]

const formatFileSize = (bytes?: number | null): string | null => {
  if (bytes == null || Number.isNaN(bytes) || bytes <= 0) {
    return null
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const formatted = value < 10 ? value.toFixed(1) : value.toFixed(0)
  return `${formatted} ${units[unitIndex]}`
}

const sortByName = (a: MangaCharacterDTO, b: MangaCharacterDTO) =>
  a.namePrimary.localeCompare(b.namePrimary, 'ru', { sensitivity: 'base' })

interface MangaCharactersTabProps {
  mangaId: number
  mangaTitle: string
}

interface ModerationState {
  character: MangaCharacterDTO
  target: MangaCharacterModerationRequest['status']
}

interface CharacterCardProps {
  character: MangaCharacterDTO
  onOpenDetails: (character: MangaCharacterDTO) => void
}

function CharacterImage({
  imageUrl,
  name,
  className,
  imageClassName,
}: {
  imageUrl?: string | null
  name: string
  className?: string
  imageClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  const containerClasses = cn(
    'flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-white/40 md:h-32 md:w-32',
    className
  )

  return (
    <div className={containerClasses}>
      {!imageUrl || failed ? (
        <>
          <ImageOff className="h-7 w-7" aria-hidden="true" />
          <span className="sr-only">Нет изображения для {name}</span>
        </>
      ) : (
        <img
          src={imageUrl}
          alt={name}
          className={cn('h-full w-full object-cover', imageClassName)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function CharacterCard({ character, onOpenDetails }: CharacterCardProps) {
  const { label: statusLabel, className: statusClassName, Icon } =
    statusMeta[character.status]

  const description = (character.description ?? '').trim()
  const statusTimestamp =
    character.statusUpdatedAt ?? character.updatedAt ?? character.createdAt

  return (
    <button
      type="button"
      onClick={() => onOpenDetails(character)}
      className="group flex w-full items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 md:p-5"
    >
      <CharacterImage
        imageUrl={character.imageUrl}
        name={character.namePrimary}
        className="h-24 w-24 shrink-0 border-white/15 bg-white/10 md:h-28 md:w-28"
        imageClassName="rounded-2xl"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-lg font-semibold text-white">
              {character.namePrimary}
            </h3>
            {character.nameSecondary && (
              <p className="truncate text-sm text-white/60">
                {character.nameSecondary}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-sm',
              statusClassName
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusLabel}
          </Badge>
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed text-white/70',
            description ? 'line-clamp-4' : 'italic text-white/40'
          )}
        >
          {description || 'Описание пока не добавлено.'}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
          <span>Обновлено {formatRelativeTime(statusTimestamp)}</span>
          {character.rejectionReason && (
            <span className="flex items-center gap-1 text-red-300">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Есть комментарий модератора
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

interface CharacterDetailsDialogProps {
  character: MangaCharacterDTO
  open: boolean
  canModerate: boolean
  isOwner: boolean
  isModerationLoading: boolean
  isDeleteLoading: boolean
  onEdit: (character: MangaCharacterDTO) => void
  onDelete: (character: MangaCharacterDTO) => void
  onModerate: (
    character: MangaCharacterDTO,
    target: MangaCharacterModerationRequest['status']
  ) => void
  onClose: () => void
}

function CharacterDetailsDialog({
  character,
  open,
  canModerate,
  isOwner,
  isModerationLoading,
  isDeleteLoading,
  onEdit,
  onDelete,
  onModerate,
  onClose,
}: CharacterDetailsDialogProps) {
  const { label: statusLabel, className: statusClassName, Icon } =
    statusMeta[character.status]

  const description = (character.description ?? '').trim()
  const skills = (character.skills ?? '').trim()
  const traits = [
    { label: 'Сила', value: character.strength },
    { label: 'Принадлежность', value: character.affiliation },
    { label: 'Пол', value: character.gender },
    { label: 'Возраст', value: character.age },
    { label: 'Класс', value: character.classification },
  ].filter((item) => !!item.value && item.value.trim() !== '')

  const imageSizeLabel = formatFileSize(character.imageSizeBytes)
  const hasImageDimensions =
    character.imageWidth != null && character.imageHeight != null

  const statusTimestamp =
    character.statusUpdatedAt ?? character.updatedAt ?? character.createdAt

  const isBusy = isModerationLoading || isDeleteLoading

  const canEdit = canModerate || (isOwner && character.status === 'PENDING')
  const canDelete = canModerate || (isOwner && character.status === 'PENDING')

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (isBusy) {
            return
          }
          onClose()
        }
      }}
    >
      <DialogContent className="w-[min(100vw-1rem,720px)] max-w-3xl overflow-hidden border border-white/10 bg-[#0f1116]/95 p-0 text-white">
        <div className="flex max-h-[calc(100vh-3rem)] flex-col">
          <DialogHeader className="space-y-3 border-b border-white/10 px-5 pb-4 pt-5">
            <DialogTitle className="flex flex-wrap items-center gap-3 text-lg sm:text-xl">
              <span className="truncate">{character.namePrimary}</span>
              <Badge
                variant="outline"
                className={cn(
                  'flex items-center gap-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                  statusClassName
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {statusLabel}
              </Badge>
            </DialogTitle>
            {character.nameSecondary && (
              <DialogDescription className="text-sm text-white/60">
                {character.nameSecondary}
              </DialogDescription>
            )}
            <DialogDescription className="text-xs text-white/40">
              Обновлено {formatRelativeTime(statusTimestamp)} • Добавлено{' '}
              {formatRelativeTime(character.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-6 sm:grid-cols-[208px,1fr] lg:grid-cols-[220px,1fr]">
              <div className="flex flex-col items-center gap-4">
                <CharacterImage
                  imageUrl={character.imageUrl}
                  name={character.namePrimary}
                  className="h-40 w-40 border-white/15 bg-white/10 sm:h-48 sm:w-full sm:max-w-[208px] lg:h-56 lg:max-w-[220px]"
                  imageClassName="rounded-3xl"
                />
                {(hasImageDimensions || imageSizeLabel) && (
                  <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
                    {hasImageDimensions && (
                      <div>
                        Разрешение: {character.imageWidth}x{character.imageHeight} px
                      </div>
                    )}
                    {imageSizeLabel && <div>Размер файла: {imageSizeLabel}</div>}
                  </div>
                )}
                {character.imageKey && (
                  <div className="w-full text-center text-xs text-white/40">
                    Хранилище: {character.imageKey}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                    Описание
                  </h4>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                    {description || 'Описание пока не добавлено.'}
                  </p>
                </section>

                {traits.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-white/60">
                      Основные сведения
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {traits.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 backdrop-blur-sm"
                        >
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-medium text-white/90">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {skills && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
                      Навыки
                    </h4>
                    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-100 backdrop-blur-sm">
                      <p className="whitespace-pre-line leading-relaxed">{skills}</p>
                    </div>
                  </section>
                )}

                {character.rejectionReason && (
                  <section className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-200">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Комментарий модератора
                    </h4>
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100 backdrop-blur-sm">
                      <p className="whitespace-pre-line leading-relaxed">
                        {character.rejectionReason}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/40">
              {character.createdBy != null && <span>Автор ID: {character.createdBy}</span>}
              {canModerate && character.status === 'APPROVED' && character.approvedBy != null && (
                <span>Одобрил ID: {character.approvedBy}</span>
              )}
              {canModerate && character.status === 'REJECTED' && character.rejectedBy != null && (
                <span>Отклонил ID: {character.rejectedBy}</span>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex flex-wrap justify-end gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    onEdit(character)
                    onClose()
                  }}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <PencilLine className="mr-2 h-4 w-4" aria-hidden="true" />
                  Редактировать
                </Button>
              )}
              {canModerate && character.status !== 'APPROVED' && (
                <Button
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onModerate(character, 'APPROVED')}
                  className="bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  Одобрить
                </Button>
              )}
              {canModerate && character.status !== 'REJECTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onModerate(character, 'REJECTED')}
                  className="border-red-400/40 text-red-200 hover:bg-red-500/20"
                >
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Отклонить
                </Button>
              )}
              {canModerate && character.status !== 'PENDING' && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onModerate(character, 'PENDING')}
                  className="text-amber-200 hover:bg-amber-500/20"
                >
                  <Hourglass className="mr-2 h-4 w-4" aria-hidden="true" />
                  На модерацию
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    onDelete(character)
                    onClose()
                  }}
                  className="text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Удалить
                </Button>
              )}
            </div>
          </div>
            </div>
      </DialogContent>
    </Dialog>
  )
}

export function MangaCharactersTab({ mangaId, mangaTitle }: MangaCharactersTabProps) {
  const { user, isAuthenticated, isModerator } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null
  const canModerate = isModerator

  const [formOpen, setFormOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [editingCharacter, setEditingCharacter] = useState<MangaCharacterDTO | null>(null)
  const [moderationState, setModerationState] = useState<ModerationState | null>(null)
  const [moderationReason, setModerationReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MangaCharacterDTO | null>(null)
  const [detailsCharacter, setDetailsCharacter] = useState<MangaCharacterDTO | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  const charactersQuery = useQuery({
    queryKey: ['manga-characters', mangaId, userId],
    queryFn: () => apiClient.getMangaCharacters(mangaId),
    enabled: mangaId > 0,
  })

  const characters = charactersQuery.data ?? []

  const grouped = useMemo(() => {
    const buckets: Record<MangaCharacterStatus, MangaCharacterDTO[]> = {
      APPROVED: [],
      PENDING: [],
      REJECTED: [],
    }

    for (const character of characters) {
      buckets[character.status].push(character)
    }

    Object.values(buckets).forEach((list) => list.sort(sortByName))
    return buckets
  }, [characters])

  const summary = useMemo(() => ({
    total: characters.length,
    approved: grouped.APPROVED.length,
    pending: grouped.PENDING.length,
    rejected: grouped.REJECTED.length,
  }), [characters.length, grouped])

  const hydrateFormFromCharacter = (character: MangaCharacterDTO): FormState => ({
    namePrimary: character.namePrimary ?? '',
    nameSecondary: character.nameSecondary ?? '',
    description: character.description ?? '',
    strength: character.strength ?? '',
    affiliation: character.affiliation ?? '',
    gender: character.gender ?? '',
    age: character.age ?? '',
    classification: character.classification ?? '',
    skills: character.skills ?? '',
    removeImage: false,
  })

  const resetImageState = () => {
    setImageError(null)
    setImageFile(null)
    setImagePreviewUrl(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      resetImageState()
      return
    }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Поддерживаются только изображения JPG, PNG, WEBP, AVIF или GIF')
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Файл слишком большой. Максимальный размер — 5 MB')
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
      return
    }

    setImageError(null)
    setImageFile(file)
    const blobUrl = URL.createObjectURL(file)
    setImagePreviewUrl(blobUrl)
    setFormState((prev) => ({
      ...prev,
      removeImage: false,
    }))
  }

  const clearImageFile = () => {
    resetImageState()
  }

  const upsertMutation = useMutation({
    mutationFn: ({
      payload,
      characterId,
      imageFile: selectedImage,
    }: {
      payload: MangaCharacterRequest
      characterId?: number
      imageFile?: File | null
    }) =>
      characterId
        ? apiClient.updateMangaCharacter(characterId, payload, selectedImage)
        : apiClient.createMangaCharacter(mangaId, payload, selectedImage),
    onSuccess: (data, variables) => {
      const message = variables.characterId
        ? 'Персонаж обновлён'
        : data.status === 'APPROVED'
          ? 'Персонаж опубликован'
          : 'Предложение отправлено на модерацию'

      toast.success(message)
      queryClient.invalidateQueries({ queryKey: ['manga-characters', mangaId] })
      resetImageState()
      setDetailsCharacter(null)
      setFormOpen(false)
      setEditingCharacter(null)
      setFormState(emptyForm)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось сохранить персонажа'
      toast.error(message)
    },
  })

  const moderationMutation = useMutation({
    mutationFn: ({
      characterId,
      status,
      reason,
    }: {
      characterId: number
      status: MangaCharacterModerationRequest['status']
      reason?: string
    }) => apiClient.moderateMangaCharacter(characterId, { status, reason }),
    onSuccess: (_, variables) => {
      const statusMessages: Record<MangaCharacterStatus, string> = {
        APPROVED: 'Персонаж одобрен',
        PENDING: 'Персонаж возвращён на модерацию',
        REJECTED: 'Персонаж отклонён',
      }
      toast.success(statusMessages[variables.status])
      queryClient.invalidateQueries({ queryKey: ['manga-characters', mangaId] })
      setDetailsCharacter((prev) =>
        prev && prev.id === variables.characterId ? null : prev
      )
      setModerationState(null)
      setModerationReason('')
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось выполнить действие модерации'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (characterId: number) => apiClient.deleteMangaCharacter(characterId),
    onSuccess: (_, characterId) => {
      toast.success('Персонаж удалён')
      queryClient.invalidateQueries({ queryKey: ['manga-characters', mangaId] })
      setDetailsCharacter((prev) =>
        prev && prev.id === characterId ? null : prev
      )
      setDeleteTarget(null)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось удалить персонажа'
      toast.error(message)
    },
  })

  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      toast.info('Авторизуйтесь, чтобы предложить нового персонажа')
      return
    }
    setEditingCharacter(null)
    setDetailsCharacter(null)
    resetImageState()
    setFormState(emptyForm)
    setFormOpen(true)
  }

  const handleEdit = (character: MangaCharacterDTO) => {
    if (!isAuthenticated) {
      toast.info('Авторизуйтесь, чтобы редактировать персонажа')
      return
    }
    setEditingCharacter(character)
    setDetailsCharacter(null)
    resetImageState()
    setFormState(hydrateFormFromCharacter(character))
    setFormOpen(true)
  }

  const handleDelete = (character: MangaCharacterDTO) => {
    setDeleteTarget(character)
  }

  const handleModerationRequest = (
    character: MangaCharacterDTO,
    target: MangaCharacterModerationRequest['status']
  ) => {
    setModerationState({ character, target })
    setModerationReason(target === 'REJECTED' ? character.rejectionReason ?? '' : '')
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAuthenticated) {
      toast.info('Авторизуйтесь, чтобы сохранять персонажей')
      return
    }

    const namePrimary = formState.namePrimary.trim()
    const description = formState.description.trim()

    if (!namePrimary) {
      toast.error('Укажите имя персонажа')
      return
    }

    if (!description) {
      toast.error('Добавьте описание персонажа')
      return
    }

    const payload: MangaCharacterRequest = {
      namePrimary,
      description,
      nameSecondary: optionalField(formState.nameSecondary),
      strength: optionalField(formState.strength),
      affiliation: optionalField(formState.affiliation),
      gender: optionalField(formState.gender),
      age: optionalField(formState.age),
      classification: optionalField(formState.classification),
      skills: optionalField(formState.skills),
      removeImage: formState.removeImage ? true : undefined,
    }

    upsertMutation.mutate({
      payload,
      characterId: editingCharacter?.id,
      imageFile,
    })
  }

  const handleModerationSubmit = () => {
    if (!moderationState) {
      return
    }

    if (
      moderationState.target === 'REJECTED' &&
      moderationReason.trim().length === 0
    ) {
      toast.error('Укажите причину отклонения')
      return
    }

    moderationMutation.mutate({
      characterId: moderationState.character.id,
      status: moderationState.target,
      reason:
        moderationState.target === 'REJECTED'
          ? moderationReason.trim()
          : undefined,
    })
  }

  const isFormBusy = upsertMutation.isPending
  const moderatingId = moderationMutation.variables?.characterId
  const deletingId = deleteMutation.variables

  const hasAnyCharacters = summary.total > 0
  const existingImageUrl = editingCharacter?.imageUrl ?? null
  const previewImageSrc = imagePreviewUrl ?? (formState.removeImage ? null : existingImageUrl)
  const existingImageMeta = existingImageUrl
    ? {
        width: editingCharacter?.imageWidth ?? null,
        height: editingCharacter?.imageHeight ?? null,
        size: editingCharacter?.imageSizeBytes ?? null,
      }
    : null
  const hasExistingDimensions =
    existingImageMeta?.width != null && existingImageMeta?.height != null
  const existingImageSizeLabel =
    existingImageMeta?.size != null ? formatFileSize(existingImageMeta.size) : null
  const detailsIsOwner =
    detailsCharacter != null && userId != null && detailsCharacter.createdBy === userId
  const isDetailsModerationLoading =
    detailsCharacter != null &&
    moderationMutation.isPending &&
    moderatingId === detailsCharacter.id
  const isDetailsDeleteLoading =
    detailsCharacter != null &&
    deleteMutation.isPending &&
    deletingId === detailsCharacter?.id

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Персонажи</h2>
            <p className="text-sm text-white/60">
              {canModerate
                ? 'Управляйте персонажами тайтла, одобряйте заявки и поддерживайте актуальность каталога.'
                : 'Предлагайте героев и их описания — после модерации они появятся в этом разделе.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80"
              >
                Всего: {summary.total}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
              >
                Одобрено: {summary.approved}
              </Badge>
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200"
              >
                В ожидании: {summary.pending}
              </Badge>
              <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200"
              >
                Отклонено: {summary.rejected}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => charactersQuery.refetch()}
                disabled={charactersQuery.isFetching}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Обновить
              </Button>
              <Button onClick={handleOpenCreate} size="sm">
                <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                {canModerate ? 'Добавить персонажа' : 'Предложить персонажа'}
              </Button>
            </div>
          </div>
        </div>
        {charactersQuery.isFetching && !charactersQuery.isLoading && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            <LoadingSpinner size="sm" />
            <span>Обновляем список…</span>
          </div>
        )}
      </div>

      {charactersQuery.isError ? (
        <div className="space-y-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-red-100">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            Не удалось загрузить персонажей
          </div>
          <p className="text-sm text-red-100/80">
            Попробуйте обновить страницу или повторите попытку позже.
          </p>
          <Button
            variant="outline"
            onClick={() => charactersQuery.refetch()}
            className="w-fit border-red-400/40 text-red-100 hover:bg-red-500/20"
          >
            Повторить запрос
          </Button>
        </div>
      ) : hasAnyCharacters ? (
        <div className="space-y-6">
          {grouped.PENDING.length > 0 && (
            <section className="space-y-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-white">
                  {canModerate ? 'Заявки на модерацию' : 'Ваши предложения'}
                </h3>
                <p className="text-sm text-white/60">
                  {canModerate
                    ? 'Проверьте новые карточки персонажей и примите решение.'
                    : 'Эти персонажи появятся в общем списке после одобрения модерацией.'}
                </p>
              </header>
              <div className="space-y-4">
                {grouped.PENDING.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onOpenDetails={(item) => setDetailsCharacter(item)}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.APPROVED.length > 0 && (
            <section className="space-y-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-white">
                  Одобренные персонажи
                </h3>
                <p className="text-sm text-white/60">
                  Основные герои, уже опубликованные для читателей.
                </p>
              </header>
              <div className="space-y-4">
                {grouped.APPROVED.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onOpenDetails={(item) => setDetailsCharacter(item)}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.REJECTED.length > 0 && (
            <section className="space-y-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-white">
                  Отклонённые предложения
                </h3>
                <p className="text-sm text-white/60">
                  Изучите комментарии модераторов и при необходимости отправьте персонажа повторно.
                </p>
              </header>
              <div className="space-y-4">
                {grouped.REJECTED.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onOpenDetails={(item) => setDetailsCharacter(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/70 backdrop-blur-sm">
          <p className="text-lg font-semibold">
            В тайтле «{mangaTitle}» пока нет персонажей
          </p>
          <p className="mt-2 text-sm text-white/60">
            {canModerate
              ? 'Добавьте первого героя, чтобы заполнить раздел персонажей.'
              : 'Предложите первого героя — команда рассмотрит вашу заявку.'}
          </p>
          <Button className="mt-4" onClick={handleOpenCreate}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Добавить персонажа
          </Button>
        </div>
      )}

      {detailsCharacter && (
        <CharacterDetailsDialog
          character={detailsCharacter}
          open
          canModerate={canModerate}
          isOwner={detailsIsOwner}
          isModerationLoading={isDetailsModerationLoading}
          isDeleteLoading={isDetailsDeleteLoading}
          onEdit={(character) => handleEdit(character)}
          onDelete={(character) => handleDelete(character)}
          onModerate={handleModerationRequest}
          onClose={() => setDetailsCharacter(null)}
        />
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && isFormBusy) {
            return
          }
          setFormOpen(open)
          if (!open) {
            setEditingCharacter(null)
            setFormState(emptyForm)
            resetImageState()
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCharacter ? 'Редактирование персонажа' : 'Новый персонаж'}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/60">
              Заполните основные сведения. После сохранения модерация проверит карточку перед публикацией.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="character-name-primary">Основное имя</Label>
                <Input
                  id="character-name-primary"
                  value={formState.namePrimary}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      namePrimary: event.target.value,
                    }))
                  }
                  required
                  placeholder="Например, Тацуми"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-name-secondary">Альтернативное имя</Label>
                <Input
                  id="character-name-secondary"
                  value={formState.nameSecondary}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      nameSecondary: event.target.value,
                    }))
                  }
                  placeholder="Имя или псевдоним"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="character-description">Описание</Label>
                <Textarea
                  id="character-description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  required
                  placeholder="Кратко расскажите о персонаже, его роли и характере"
                  rows={5}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="character-image">Изображение персонажа</Label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-32 w-full max-w-[8rem] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/5 sm:h-36 sm:w-36">
                    {previewImageSrc ? (
                      <img
                        src={previewImageSrc}
                        alt={formState.namePrimary || 'Предпросмотр изображения персонажа'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-xs text-white/40">
                        <ImageOff className="h-5 w-5" aria-hidden="true" />
                        <span>Нет изображения</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      ref={imageInputRef}
                      id="character-image"
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      onChange={handleImageFileChange}
                    />
                    <p className="text-xs text-white/50">
                      Загрузите JPG, PNG, WEBP, AVIF или GIF до 5 MB. Файл сохранится в медиатеке AniWay.
                    </p>
                    {imageFile && (
                      <p className="text-xs text-white/60">
                        {imageFile.name} • {formatFileSize(imageFile.size) ?? '—'}
                      </p>
                    )}
                    {imageError && (
                      <p className="text-xs text-red-300">{imageError}</p>
                    )}
                    {imageFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearImageFile}
                        className="w-fit border-white/20 bg-white/5 text-white hover:bg-white/10"
                      >
                        Очистить выбранный файл
                      </Button>
                    )}
                    {existingImageUrl && !imageFile && !formState.removeImage && (
                      <div className="space-y-1 text-xs text-white/60">
                        <p>
                          Текущее изображение сохранится, если не загружать новое и не отмечать удаление.
                        </p>
                        {(hasExistingDimensions || existingImageSizeLabel) && (
                          <p>
                            Размер:
                            {hasExistingDimensions
                              ? ` ${existingImageMeta?.width}x${existingImageMeta?.height} px`
                              : ' —'}
                            {existingImageSizeLabel ? ` • ${existingImageSizeLabel}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {existingImageUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="character-remove-image"
                          checked={formState.removeImage}
                          onCheckedChange={(checked) =>
                            setFormState((prev) => ({
                              ...prev,
                              removeImage: checked === true,
                            }))
                          }
                          disabled={!!imageFile}
                        />
                        <Label
                          htmlFor="character-remove-image"
                          className={cn(
                            'text-xs text-white/70',
                            imageFile ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          )}
                        >
                          Удалить текущее изображение
                        </Label>
                      </div>
                    )}
                    {formState.removeImage && (
                      <p className="text-xs text-amber-200">
                        При сохранении изображение будет удалено из карточки.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-strength">Сила / способности</Label>
                <Input
                  id="character-strength"
                  value={formState.strength}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      strength: event.target.value,
                    }))
                  }
                  placeholder="Магия, боевые навыки, таланты"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-affiliation">Принадлежность</Label>
                <Input
                  id="character-affiliation"
                  value={formState.affiliation}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      affiliation: event.target.value,
                    }))
                  }
                  placeholder="Организация, команда, клан"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-gender">Пол</Label>
                <Input
                  id="character-gender"
                  value={formState.gender}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      gender: event.target.value,
                    }))
                  }
                  placeholder="М / Ж / другое"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-age">Возраст</Label>
                <Input
                  id="character-age"
                  value={formState.age}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      age: event.target.value,
                    }))
                  }
                  placeholder="Число или приблизительное значение"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="character-classification">Класс / роль</Label>
                <Input
                  id="character-classification"
                  value={formState.classification}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      classification: event.target.value,
                    }))
                  }
                  placeholder="Например, Протагонист, Антагонист, Поддержка"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="character-skills">Дополнительные навыки</Label>
                <Textarea
                  id="character-skills"
                  value={formState.skills}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      skills: event.target.value,
                    }))
                  }
                  placeholder="Опишите уникальные приёмы, умения или интересные факты"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={isFormBusy}
                onClick={() => setFormOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isFormBusy}>
                {isFormBusy
                  ? 'Сохраняем…'
                  : editingCharacter
                    ? 'Сохранить изменения'
                    : 'Отправить на модерацию'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!moderationState}
        onOpenChange={(open) => {
          if (!open && moderationMutation.isPending) {
            return
          }
          if (!open) {
            setModerationState(null)
            setModerationReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationState?.target === 'APPROVED'
                ? 'Одобрить персонажа'
                : moderationState?.target === 'REJECTED'
                  ? 'Отклонить персонажа'
                  : 'Вернуть на доработку'}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/60">
              {moderationState?.character.namePrimary && (
                <>
                  Выберите действие для персонажа «
                  {moderationState.character.namePrimary}
                  ».
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {moderationState?.target === 'REJECTED' && (
            <div className="space-y-2">
              <Label htmlFor="moderation-reason">Причина отклонения</Label>
              <Textarea
                id="moderation-reason"
                value={moderationReason}
                onChange={(event) => setModerationReason(event.target.value)}
                placeholder="Опишите, что необходимо исправить"
                rows={4}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              disabled={moderationMutation.isPending}
              onClick={() => setModerationState(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleModerationSubmit}
              disabled={moderationMutation.isPending}
            >
              {moderationMutation.isPending ? 'Сохраняем…' : 'Подтвердить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && deleteMutation.isPending) {
            return
          }
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить персонажа?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>Вы уверены, что хотите удалить «{deleteTarget.namePrimary}»?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id)
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {deleteMutation.isPending ? 'Удаляем…' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
