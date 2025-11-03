import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle, Search, ListFilter, Layers, Trash2, Eraser } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { EmptyChaptersCleanupResult } from '@/types'
import { ImportQueueMonitor } from './ImportQueueMonitor'

interface AutoParseMangaMetric {
  index: number
  slug: string
  normalized_slug?: string
  status: string
  started_at?: string
  completed_at?: string
  duration_ms: number
  duration_formatted?: string
  title?: string
  reason?: string
  error_message?: string
  final_message?: string
  import_task_id?: string
  full_parsing_task_id?: string
  parse_task_id?: string
  metrics?: Record<string, unknown>
}

interface AutoParseTask {
  task_id: string
  status: string
  progress: number
  message: string
  total_slugs: number
  processed_slugs: number
  skipped_slugs: string[]
  imported_slugs: string[]
  failed_slugs: string[]
  start_time: string
  end_time?: string | null
  duration_ms?: number
  duration_formatted?: string
  page?: number
  limit?: number | null
  min_chapters?: number | null
  max_chapters?: number | null
  manga_metrics: AutoParseMangaMetric[]
  logs?: string[]  // Логи в реальном времени
}

interface AutoUpdateSummaryEntry {
  slug: string
  title?: string
  new_chapters: number
  chapter_labels: string[]
  chapter_numbers?: number[]
}

interface AutoUpdateTask {
  task_id: string
  status: string
  progress: number
  message: string
  total_mangas: number
  processed_mangas: number
  updated_mangas: string[]
  failed_mangas: string[]
  new_chapters_count: number
  start_time: string
  end_time?: string
  logs?: string[]  // Логи в реальном времени
  mangas_with_updates?: number
  updated_slugs?: string[]
  updated_details?: AutoUpdateSummaryEntry[]
}

interface SlugBackfillSnapshot {
  updated: Record<string, number>
  completedAt: string
}

const AUTO_PARSE_STORAGE_KEY = 'autoParseTaskState'
const AUTO_UPDATE_STORAGE_KEY = 'autoUpdateTaskState'
const AUTO_TASK_POLL_INTERVAL = 1000 // Уменьшено с 2000ms до 1000ms для лучшего UX
const FINAL_AUTO_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const LOG_DISPLAY_TIMEZONE = 'Asia/Novosibirsk'
const LOG_TIMEZONE_LABEL = 'НСК'

const LOG_TIME_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  timeZone: LOG_DISPLAY_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

const normalizeTimestampForDate = (timestamp: string): string | null => {
  if (typeof timestamp !== 'string') {
    return null
  }

  let candidate = timestamp.trim()
  if (!candidate) {
    return null
  }

  // Заменяем запятые в миллисекундах на точки, чтобы браузер корректно распознал дробную часть
  candidate = candidate.replace(/,/g, '.')

  // Преобразуем пробел между датой и временем в "T", если ISO-разделитель отсутствует
  if (/^\d{4}-\d{2}-\d{2}\s/.test(candidate)) {
    candidate = `${candidate.slice(0, 10)}T${candidate.slice(11)}`
  }

  // Нормализуем таймзону вида +0700 → +07:00
  candidate = candidate.replace(/([+-]\d{2})(\d{2})$/, (_match, hours: string, minutes: string) => `${hours}:${minutes}`)

  const hasZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(candidate)
  if (!hasZone) {
    candidate = `${candidate}Z`
  }

  return candidate
}

const tryConvertTimestampToNovosibirsk = (timestamp: string): string | null => {
  const normalized = normalizeTimestampForDate(timestamp)
  if (!normalized) {
    return null
  }

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const formatted = LOG_TIME_FORMATTER
    .format(date)
    .replace(',', '')
    .replace(/\s+/g, ' ')
    .trim()

  return formatted
}

const formatLogLineForDisplay = (log: string): string => {
  const match = log.match(/^\[(\d{4}-\d{2}-\d{2}[T\s][0-9:.,+-]+)\]/)

  if (!match) {
    return log
  }

  const converted = tryConvertTimestampToNovosibirsk(match[1])
  if (!converted) {
    return log
  }

  return log.replace(match[0], `[${converted} ${LOG_TIMEZONE_LABEL}]`)
}

const ensureIsoString = (value: unknown): string | null => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString()
  }

  return null
}

const formatTimestampLabel = (value?: string | Date | null): string => {
  const iso = ensureIsoString(value)
  if (!iso) {
    return '—'
  }

  const converted = tryConvertTimestampToNovosibirsk(iso)
  if (converted) {
    return `${converted} ${LOG_TIMEZONE_LABEL}`
  }

  const normalizedForFallback = normalizeTimestampForDate(iso) ?? iso
  const fallbackDate = new Date(normalizedForFallback)
  if (!Number.isNaN(fallbackDate.getTime())) {
    return `${LOG_TIME_FORMATTER.format(fallbackDate)} ${LOG_TIMEZONE_LABEL}`
  }

  return iso
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return undefined
}

const formatDurationFromMs = (value?: number | null, fallback?: string): string => {
  if (typeof fallback === 'string' && fallback.length > 0) {
    return fallback
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((v) => v.toString().padStart(2, '0'))
    .join(':')
}

type DisplayLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'UNKNOWN'

const BASE_LOG_LEVELS: DisplayLogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']

const LOG_LEVEL_LABELS: Record<DisplayLogLevel, string> = {
  TRACE: 'Trace',
  DEBUG: 'Debug',
  INFO: 'Info',
  WARN: 'Warn',
  ERROR: 'Error',
  FATAL: 'Fatal',
  UNKNOWN: 'Другое'
}

const LOG_LEVEL_COLORS: Record<DisplayLogLevel, string> = {
  TRACE: 'text-purple-300',
  DEBUG: 'text-blue-300',
  INFO: 'text-green-300',
  WARN: 'text-yellow-300',
  ERROR: 'text-red-400',
  FATAL: 'text-red-500',
  UNKNOWN: 'text-gray-300'
}

const LOG_LEVEL_DOT_COLORS: Record<DisplayLogLevel, string> = {
  TRACE: 'bg-purple-400',
  DEBUG: 'bg-blue-400',
  INFO: 'bg-green-400',
  WARN: 'bg-yellow-400',
  ERROR: 'bg-red-500',
  FATAL: 'bg-red-600',
  UNKNOWN: 'bg-gray-500'
}

type AutomationLogSource = 'combined' | 'auto-parse' | 'auto-update'

const AUTOMATION_SOURCE_LABELS: Record<AutomationLogSource, string> = {
  combined: 'Все логи',
  'auto-parse': 'Автопарсинг',
  'auto-update': 'Автообновление'
}

const AUTOMATION_SOURCE_PREFIX: Record<Exclude<AutomationLogSource, 'combined'>, string> = {
  'auto-parse': 'AUTO_PARSE',
  'auto-update': 'AUTO_UPDATE'
}

const LOG_FILTER_DEFAULT_STATE: Record<DisplayLogLevel, boolean> = {
  TRACE: true,
  DEBUG: true,
  INFO: true,
  WARN: true,
  ERROR: true,
  FATAL: true,
  UNKNOWN: true
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractLogLevel = (log: string): DisplayLogLevel => {
  const match = log.match(/\[(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\]/i)
  if (match) {
    const level = match[1].toUpperCase() as DisplayLogLevel
    if ((BASE_LOG_LEVELS as DisplayLogLevel[]).includes(level)) {
      return level
    }
  }
  if (log.includes('[WARN') || log.includes('[WARNING')) {
    return 'WARN'
  }
  if (log.includes('[ERROR')) {
    return 'ERROR'
  }
  if (log.includes('[DEBUG')) {
    return 'DEBUG'
  }
  if (log.includes('[INFO')) {
    return 'INFO'
  }
  return 'UNKNOWN'
}

const parseLogTimestamp = (log: string): number => {
  const match = log.match(/\[(\d{4}-\d{2}-\d{2}T[0-9:.+-]+)\]/)
  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  const raw = match[1]
  const isoWithZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`
  const date = new Date(isoWithZone)
  const time = date.getTime()
  if (Number.isNaN(time)) {
    return Number.MAX_SAFE_INTEGER
  }
  return time
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Готово',
  failed: 'Ошибка',
  running: 'Выполняется',
  pending: 'В очереди',
  cancelled: 'Отменено',
  skipped: 'Пропущено'
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  failed: 'bg-red-500/20 text-red-200 border-red-500/40',
  running: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  pending: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
  cancelled: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  skipped: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40'
}

const getStatusLabel = (status?: string): string => {
  if (!status) {
    return '—'
  }
  const normalized = status.toLowerCase()
  return STATUS_LABELS[normalized] ?? status
}

const getStatusBadgeClass = (status?: string): string => {
  if (!status) {
    return STATUS_BADGE_CLASSES.pending
  }
  const normalized = status.toLowerCase()
  return STATUS_BADGE_CLASSES[normalized] ?? STATUS_BADGE_CLASSES.pending
}

const isTaskActive = (status?: string | null): boolean => {
  if (!status) {
    return false
  }

  const normalized = status.toLowerCase()
  return normalized === 'pending' || normalized === 'running'
}

const normalizeAutoParseMetric = (payload: unknown, fallbackIndex: number): AutoParseMangaMetric => {
  const raw = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}

  const startedAt = ensureIsoString(raw.started_at) ?? undefined
  const completedAt = ensureIsoString(raw.completed_at) ?? undefined
  const explicitDuration = toNumber(raw.duration_ms)
  const inferredDuration = startedAt && completedAt
    ? Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime())
    : undefined
  const durationMs = explicitDuration ?? inferredDuration ?? 0

  const metricsPayload = raw.metrics && typeof raw.metrics === 'object'
    ? raw.metrics as Record<string, unknown>
    : undefined

  return {
    index: toNumber(raw.index) ?? fallbackIndex + 1,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    normalized_slug: typeof raw.normalized_slug === 'string' ? raw.normalized_slug : undefined,
    status: typeof raw.status === 'string' ? raw.status : 'unknown',
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    duration_formatted: formatDurationFromMs(durationMs, typeof raw.duration_formatted === 'string' ? raw.duration_formatted : undefined),
    title: typeof raw.title === 'string' ? raw.title : undefined,
    reason: typeof raw.reason === 'string' ? raw.reason : undefined,
    error_message: typeof raw.error_message === 'string' ? raw.error_message : undefined,
    final_message: typeof raw.final_message === 'string' ? raw.final_message : undefined,
    import_task_id: typeof raw.import_task_id === 'string' ? raw.import_task_id : undefined,
    full_parsing_task_id: typeof raw.full_parsing_task_id === 'string' ? raw.full_parsing_task_id : undefined,
    parse_task_id: typeof raw.parse_task_id === 'string' ? raw.parse_task_id : undefined,
    metrics: metricsPayload
  }
}

const normalizeAutoParseTask = (
  payload: Partial<AutoParseTask> | null | undefined,
  previous?: AutoParseTask | null
): AutoParseTask => {
  const raw = (payload ?? {}) as Record<string, unknown>

  const normalizedStart = ensureIsoString(raw.start_time ?? (raw as any).startTime)
    ?? previous?.start_time
    ?? new Date().toISOString()
  const normalizedEnd = ensureIsoString(raw.end_time ?? (raw as any).endTime)
    ?? previous?.end_time
    ?? undefined

  const explicitDurationMs = toNumber(raw.duration_ms ?? (raw as any).durationMs)
  const inferredDurationMs = normalizedEnd
    ? Math.max(0, new Date(normalizedEnd).getTime() - new Date(normalizedStart).getTime())
    : undefined
  const durationMs = explicitDurationMs ?? inferredDurationMs ?? previous?.duration_ms ?? 0

  const durationFormattedRaw = typeof raw.duration_formatted === 'string'
    ? raw.duration_formatted as string
    : typeof (raw as any).durationFormatted === 'string'
      ? (raw as any).durationFormatted
      : previous?.duration_formatted

  const rawMetrics = Array.isArray(raw.manga_metrics)
    ? raw.manga_metrics
    : Array.isArray((raw as any).mangaMetrics)
      ? (raw as any).mangaMetrics
      : undefined

  const metricsList = rawMetrics
    ? (rawMetrics as unknown[]).map((entry, index) => normalizeAutoParseMetric(entry, index))
    : previous?.manga_metrics ?? []

  const parsedLogs = collectAutomationLogs(raw)
  const mergedLogs = mergeAutomationLogs(previous?.logs, parsedLogs)

  return {
    task_id: String(raw.task_id ?? (raw as any).taskId ?? previous?.task_id ?? ''),
    status: String(raw.status ?? previous?.status ?? 'pending'),
    progress: typeof raw.progress === 'number'
      ? raw.progress
      : toNumber(raw.progress) ?? previous?.progress ?? 0,
    message: typeof raw.message === 'string' ? raw.message : previous?.message ?? '',
    total_slugs: typeof raw.total_slugs === 'number'
      ? raw.total_slugs
      : toNumber((raw as any).totalSlugs) ?? previous?.total_slugs ?? 0,
    processed_slugs: typeof raw.processed_slugs === 'number'
      ? raw.processed_slugs
      : toNumber((raw as any).processedSlugs) ?? previous?.processed_slugs ?? 0,
    skipped_slugs: normalizeStringArray(raw.skipped_slugs ?? (raw as any).skippedSlugs ?? previous?.skipped_slugs ?? []),
    imported_slugs: normalizeStringArray(raw.imported_slugs ?? (raw as any).importedSlugs ?? previous?.imported_slugs ?? []),
    failed_slugs: normalizeStringArray(raw.failed_slugs ?? (raw as any).failedSlugs ?? previous?.failed_slugs ?? []),
    start_time: normalizedStart,
    end_time: normalizedEnd,
    duration_ms: durationMs,
    duration_formatted: formatDurationFromMs(durationMs, durationFormattedRaw ?? undefined),
    page: toNumber(raw.page ?? (raw as any).page) ?? previous?.page,
    limit: toNumber(raw.limit ?? (raw as any).limit) ?? previous?.limit ?? null,
    min_chapters: toNumber(raw.min_chapters ?? (raw as any).minChapters) ?? previous?.min_chapters ?? null,
    max_chapters: toNumber(raw.max_chapters ?? (raw as any).maxChapters) ?? previous?.max_chapters ?? null,
    manga_metrics: metricsList,
    logs: mergedLogs
  }
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: string[] = []
  value.forEach((entry) => {
    if (entry === null || entry === undefined) {
      return
    }
    const str = typeof entry === 'string' ? entry.trim() : String(entry).trim()
    if (str.length > 0) {
      normalized.push(str)
    }
  })
  return normalized
}

const normalizeNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: number[] = []
  value.forEach((entry) => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      normalized.push(entry)
      return
    }
    if (typeof entry === 'string' && entry.trim() !== '') {
      const parsed = Number(entry)
      if (Number.isFinite(parsed)) {
        normalized.push(parsed)
      }
    }
  })
  return normalized
}

const normalizeAutomationLogEntries = (source: unknown): string[] => {
  const result: string[] = []

  const append = (entry: unknown) => {
    if (entry === null || entry === undefined) {
      return
    }

    if (Array.isArray(entry)) {
      entry.forEach(append)
      return
    }

    if (typeof entry === 'string') {
      const pieces = entry
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (pieces.length > 0) {
        result.push(...pieces)
      }
      return
    }

    if (typeof entry === 'object') {
      Object.values(entry as Record<string, unknown>).forEach(append)
      return
    }

    const stringified = String(entry).trim()
    if (stringified.length > 0) {
      result.push(stringified)
    }
  }

  append(source)
  return result
}

const mergeAutomationLogs = (previous: string[] = [], incoming: string[] = []): string[] => {
  if (previous.length === 0 && incoming.length === 0) {
    return []
  }

  const seen = new Set<string>()
  const merged: string[] = []

  const register = (line: string) => {
    if (!line || seen.has(line)) {
      return
    }
    seen.add(line)
    merged.push(line)
  }

  previous.forEach(register)
  incoming.forEach(register)

  const MAX_LOG_LINES = 500
  return merged.length > MAX_LOG_LINES ? merged.slice(-MAX_LOG_LINES) : merged
}

const collectAutomationLogs = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const container = payload as Record<string, unknown>
  const sources: unknown[] = []

  const pushSource = (value: unknown) => {
    if (value !== undefined) {
      sources.push(value)
    }
  }

  pushSource(container.logs)
  pushSource((container as any).log_lines)
  pushSource((container as any).logLines)
  pushSource((container as any).log_entries)
  pushSource((container as any).logEntries)
  pushSource((container as any).automation_logs)
  pushSource((container as any).automationLogs)
  pushSource((container as any).combined_logs)
  pushSource((container as any).combinedLogs)
  pushSource((container as any).auto_parse_logs)
  pushSource((container as any).autoParseLogs)
  pushSource((container as any).auto_update_logs)
  pushSource((container as any).autoUpdateLogs)
  pushSource((container as any).messages)
  pushSource((container as any).events)

  const logsByType = (container as any).logsByType ?? (container as any).logs_by_type
  if (logsByType && typeof logsByType === 'object') {
    Object.values(logsByType as Record<string, unknown>).forEach(pushSource)
  }

  const normalized = sources.flatMap((source) => normalizeAutomationLogEntries(source))
  return normalized
}

const normalizeAutoUpdateDetails = (value: unknown): AutoUpdateSummaryEntry[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: AutoUpdateSummaryEntry[] = []
  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      return
    }

    const record = entry as Record<string, unknown>
    const slugSource = record.slug ?? (record as Record<string, unknown>)['melon_slug'] ?? (record as Record<string, unknown>)['melonSlug']
    if (slugSource === null || slugSource === undefined) {
      return
    }

    const slug = typeof slugSource === 'string' ? slugSource.trim() : String(slugSource).trim()
    if (!slug) {
      return
    }

    const titleSource = record.title ?? record['name'] ?? record['manga_title']
    const title = typeof titleSource === 'string' ? titleSource : undefined

    const newChapters = toNumber(record.new_chapters ?? record.newChapters) ?? 0
    const chapterLabels = normalizeStringArray(record.chapter_labels ?? record.chapterLabels)
    const chapterNumbers = normalizeNumberArray(record.chapter_numbers ?? record.chapterNumbers)

    const detail: AutoUpdateSummaryEntry = {
      slug,
      title,
      new_chapters: newChapters,
      chapter_labels: chapterLabels
    }

    if (chapterNumbers.length > 0) {
      detail.chapter_numbers = chapterNumbers
    }

    normalized.push(detail)
  })

  return normalized
}

const normalizeAutoUpdateTask = (
  payload: Partial<AutoUpdateTask> | null | undefined,
  previous?: AutoUpdateTask | null
): AutoUpdateTask => {
  const raw = (payload ?? {}) as Record<string, unknown>

  const updatedMangas = normalizeStringArray(raw.updated_mangas ?? (raw as any).updatedMangas ?? previous?.updated_mangas ?? [])
  const failedMangas = normalizeStringArray(raw.failed_mangas ?? (raw as any).failedMangas ?? previous?.failed_mangas ?? [])
  const updatedDetails = normalizeAutoUpdateDetails(
    (raw as any).updated_details ?? (raw as any).updatedDetails ?? previous?.updated_details ?? []
  )
  const updatedSlugs = normalizeStringArray(raw.updated_slugs ?? (raw as any).updatedSlugs ?? previous?.updated_slugs ?? [])
  const rawMangasWithUpdates = toNumber((raw as any).mangas_with_updates ?? (raw as any).mangasWithUpdates)

  const parsedLogs = collectAutomationLogs(raw)
  const mergedLogs = mergeAutomationLogs(previous?.logs, parsedLogs)

  const computedMangasWithUpdates = typeof rawMangasWithUpdates === 'number'
    ? rawMangasWithUpdates
    : updatedDetails.length > 0
      ? updatedDetails.length
      : updatedSlugs.length > 0
        ? updatedSlugs.length
        : updatedMangas.length

  return {
    task_id: String(raw.task_id ?? (raw as any).taskId ?? previous?.task_id ?? ''),
    status: String(raw.status ?? previous?.status ?? 'pending'),
    progress: typeof raw.progress === 'number'
      ? raw.progress
      : toNumber(raw.progress) ?? previous?.progress ?? 0,
    message: typeof raw.message === 'string' ? raw.message : previous?.message ?? '',
    total_mangas: typeof raw.total_mangas === 'number'
      ? raw.total_mangas
      : toNumber((raw as any).totalMangas) ?? previous?.total_mangas ?? 0,
    processed_mangas: typeof raw.processed_mangas === 'number'
      ? raw.processed_mangas
      : toNumber((raw as any).processedMangas) ?? previous?.processed_mangas ?? 0,
    updated_mangas: updatedMangas,
    failed_mangas: failedMangas,
    new_chapters_count: typeof raw.new_chapters_count === 'number'
      ? raw.new_chapters_count
      : toNumber((raw as any).newChaptersCount) ?? previous?.new_chapters_count ?? 0,
    start_time: typeof raw.start_time === 'string'
      ? raw.start_time
      : typeof (raw as any).startTime === 'string'
        ? (raw as any).startTime
        : previous?.start_time ?? new Date().toISOString(),
    end_time: typeof raw.end_time === 'string'
      ? raw.end_time
      : typeof (raw as any).endTime === 'string'
        ? (raw as any).endTime
        : previous?.end_time,
    logs: mergedLogs,
    mangas_with_updates: computedMangasWithUpdates,
    updated_slugs: updatedSlugs,
    updated_details: updatedDetails
  }
}

const normalizeCleanupIdList = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        return entry
      }
      if (typeof entry === 'string' && entry.trim() !== '') {
        const parsed = Number(entry)
        if (Number.isFinite(parsed)) {
          return parsed
        }
      }
      return null
    })
    .filter((entry): entry is number => typeof entry === 'number')
}

const normalizeCleanupResult = (payload: Partial<EmptyChaptersCleanupResult> | null | undefined): EmptyChaptersCleanupResult => {
  return {
    totalChecked: typeof payload?.totalChecked === 'number' ? payload.totalChecked : 0,
    emptyDetected: typeof payload?.emptyDetected === 'number' ? payload.emptyDetected : 0,
    deletedCount: typeof payload?.deletedCount === 'number' ? payload.deletedCount : 0,
    deletedChapterIds: normalizeCleanupIdList(payload?.deletedChapterIds),
    deletionFailedIds: normalizeCleanupIdList(payload?.deletionFailedIds),
    pageCheckFailedIds: normalizeCleanupIdList(payload?.pageCheckFailedIds)
  }
}

// Компонент для отображения логов в реальном времени
function LogViewer({ logs }: { logs?: string[] }) {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilters, setLevelFilters] = useState<Record<DisplayLogLevel, boolean>>(() => ({ ...LOG_FILTER_DEFAULT_STATE }))

  const trimmedQuery = searchTerm.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()

  const availableLevels = useMemo(() => {
    if (!logs || logs.length === 0) {
      return [] as DisplayLogLevel[]
    }

    const set = new Set<DisplayLogLevel>()
    logs.forEach((log) => {
      set.add(extractLogLevel(log))
    })

    const order: DisplayLogLevel[] = [...BASE_LOG_LEVELS, 'UNKNOWN']
    return order.filter((level) => set.has(level))
  }, [logs])

  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) {
      return []
    }

    return logs.filter((log) => {
      const level = extractLogLevel(log)
      if (!(levelFilters[level] ?? true)) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return log.toLowerCase().includes(normalizedQuery)
    })
  }, [logs, levelFilters, normalizedQuery])

  const processedLogs = useMemo(
    () => filteredLogs.map((log) => ({
      raw: log,
      formatted: formatLogLineForDisplay(log),
      level: extractLogLevel(log)
    })),
    [filteredLogs]
  )

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [processedLogs, autoScroll])

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setAutoScroll(isAtBottom)
    }
  }

  const toggleLevel = (level: DisplayLogLevel) => {
    setLevelFilters((prev) => ({
      ...prev,
      [level]: !(prev[level] ?? true)
    }))
  }

  const resetFilters = () => {
    setSearchTerm('')
    setLevelFilters({ ...LOG_FILTER_DEFAULT_STATE })
  }

  const totalCount = logs?.length ?? 0
  const filteredCount = processedLogs.length
  const filtersActive = Boolean(trimmedQuery) || availableLevels.some((level) => !(levelFilters[level] ?? true))

  const highlightMatch = (text: string) => {
    if (!trimmedQuery) {
      return text
    }

    const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig')
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (part.toLowerCase() === normalizedQuery && trimmedQuery.length > 0) {
        return (
          <mark
            key={`match-${index}`}
            className="bg-yellow-500/40 text-yellow-100 px-1 rounded"
          >
            {part}
          </mark>
        )
      }

      return <span key={`part-${index}`}>{part}</span>
    })
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm text-gray-400 border border-gray-800">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ожидание логов...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-white flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            Логи выполнения
          </Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={autoScroll ? 'default' : 'secondary'} className="text-[11px]">
              {autoScroll ? '🔄 Автоскролл' : '⏸️ Пауза'}
            </Badge>
            <span>
              {filteredCount}
              {filtersActive && totalCount !== filteredCount ? ` / ${totalCount}` : ''} строк
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Поиск по тексту лога"
              className="pl-9 pr-3 bg-gray-950 text-white border-gray-800 focus-visible:border-blue-400"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="whitespace-nowrap"
          >
            Сбросить
          </Button>
        </div>
      </div>

      {availableLevels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors flex items-center gap-2 ${
                levelFilters[level] ?? true
                  ? 'border-blue-500/60 bg-blue-500/15 text-blue-100 shadow-sm'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${LOG_LEVEL_DOT_COLORS[level] ?? 'bg-gray-500'}`} />
              {LOG_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
      )}

      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="bg-gray-950 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto border border-gray-800 shadow-inner"
        style={{
          scrollBehavior: autoScroll ? 'smooth' : 'auto'
        }}
      >
        {processedLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Нет логов, удовлетворяющих текущим фильтрам.
          </div>
        ) : (
          processedLogs.map((log, index) => (
            <div
              key={`${log.raw}-${index}`}
              className={`${LOG_LEVEL_COLORS[log.level] ?? 'text-gray-300'} leading-relaxed hover:bg-gray-900/70 px-2 py-1 rounded transition-colors break-words`}
              title={log.raw}
            >
              {highlightMatch(log.formatted)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function MangaManagement() {
  const [catalogPage, setCatalogPage] = useState<number>(1)
  const [parseLimit, setParseLimit] = useState<number | null>(null)
  const [minChapterCount, setMinChapterCount] = useState<number | null>(null)
  const [maxChapterCount, setMaxChapterCount] = useState<number | null>(null)
  const [autoParseTask, setAutoParseTask] = useState<AutoParseTask | null>(null)
  const [autoUpdateTask, setAutoUpdateTask] = useState<AutoUpdateTask | null>(null)
  const [isAutoParsing, setIsAutoParsing] = useState(false)
  const [isAutoUpdating, setIsAutoUpdating] = useState(false)
  const [isCleaningMelon, setIsCleaningMelon] = useState(false)
  const [isCleaningEmptyChapters, setIsCleaningEmptyChapters] = useState(false)
  const [isBackfillingSlugIds, setIsBackfillingSlugIds] = useState(false)
  const [lastCleanupResult, setLastCleanupResult] = useState<EmptyChaptersCleanupResult | null>(null)
  const [slugBackfillResult, setSlugBackfillResult] = useState<SlugBackfillSnapshot | null>(null)
  const [slugBackfillStartPage, setSlugBackfillStartPage] = useState<string>('1')
  const [automationHydrated, setAutomationHydrated] = useState(false)
  const [selectedLogSource, setSelectedLogSource] = useState<AutomationLogSource>('combined')

  const autoParseIntervalRef = useRef<number | null>(null)
  const autoUpdateIntervalRef = useRef<number | null>(null)
  const autoParseTaskRef = useRef<AutoParseTask | null>(null)
  const autoUpdateTaskRef = useRef<AutoUpdateTask | null>(null)
  const autoParsePrevStatusRef = useRef<string | null>(null)
  const autoUpdatePrevStatusRef = useRef<string | null>(null)

  const autoParseSummary = useMemo(() => {
    const metrics = autoParseTask?.manga_metrics ?? []

    if (!metrics.length) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        cancelled: 0,
        totalChapters: 0,
        importedChapters: 0,
        totalPages: 0,
        importedPages: 0
      }
    }

    let completed = 0
    let failed = 0
    let skipped = 0
    let cancelled = 0
    let totalChapters = 0
    let importedChapters = 0
    let totalPages = 0
    let importedPages = 0

    metrics.forEach((metric) => {
      const status = metric.status?.toLowerCase() ?? 'unknown'
      if (status === 'completed') {
        completed += 1
      } else if (status === 'failed') {
        failed += 1
      } else if (status === 'skipped') {
        skipped += 1
      } else if (status === 'cancelled') {
        cancelled += 1
      }

      const detail = metric.metrics ?? {}
      const totalCh = toNumber(detail['total_chapters'])
      const importedCh = toNumber(detail['imported_chapters'])
      const totalPg = toNumber(detail['total_pages'])
      const importedPg = toNumber(detail['imported_pages'])

      if (typeof totalCh === 'number') {
        totalChapters += totalCh
      }
      if (typeof importedCh === 'number') {
        importedChapters += importedCh
      }
      if (typeof totalPg === 'number') {
        totalPages += totalPg
      }
      if (typeof importedPg === 'number') {
        importedPages += importedPg
      }
    })

    return {
      total: metrics.length,
      completed,
      failed,
      skipped,
      cancelled,
      totalChapters,
      importedChapters,
      totalPages,
      importedPages
    }
  }, [autoParseTask?.manga_metrics])

  const slugBackfillPreview = useMemo(() => {
    if (!slugBackfillResult) {
      return {
        count: 0,
        entries: [] as Array<[string, number]>,
        remaining: 0
      }
    }

    const entries = Object.entries(slugBackfillResult.updated ?? {}) as Array<[string, number]>
    const preview = entries.slice(0, 8)
    return {
      count: entries.length,
      entries: preview,
      remaining: Math.max(entries.length - preview.length, 0)
    }
  }, [slugBackfillResult])

  const combinedAutomationLogs = useMemo(() => {
    const parseLogs = autoParseTask?.logs ?? []
    const updateLogs = autoUpdateTask?.logs ?? []

    if (selectedLogSource === 'auto-parse') {
      return parseLogs
    }

    if (selectedLogSource === 'auto-update') {
      return updateLogs
    }

    const augmented: string[] = []

    parseLogs.forEach((log) => {
      const prefix = AUTOMATION_SOURCE_PREFIX['auto-parse']
      augmented.push(`[${prefix}] ${log}`)
    })

    updateLogs.forEach((log) => {
      const prefix = AUTOMATION_SOURCE_PREFIX['auto-update']
      augmented.push(`[${prefix}] ${log}`)
    })

    augmented.sort((a, b) => parseLogTimestamp(a) - parseLogTimestamp(b))
    return augmented
  }, [autoParseTask?.logs, autoUpdateTask?.logs, selectedLogSource])

  const updatedDetails = autoUpdateTask?.updated_details ?? []
  const updatedSlugs = autoUpdateTask?.updated_slugs ?? []
  const fallbackUpdatedMangas = autoUpdateTask?.updated_mangas ?? []
  const updatedMangaCount = autoUpdateTask?.mangas_with_updates
    ?? (updatedDetails.length > 0
      ? updatedDetails.length
      : updatedSlugs.length > 0
        ? updatedSlugs.length
        : fallbackUpdatedMangas.length)

  const persistAutoParseTask = useCallback((task: AutoParseTask | null) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!task || !task.task_id) {
      window.localStorage.removeItem(AUTO_PARSE_STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(AUTO_PARSE_STORAGE_KEY, JSON.stringify(task))
    } catch (error) {
      console.error('Не удалось сохранить состояние автопарсинга:', error)
    }
  }, [])

  const persistAutoUpdateTask = useCallback((task: AutoUpdateTask | null) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!task || !task.task_id) {
      window.localStorage.removeItem(AUTO_UPDATE_STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(AUTO_UPDATE_STORAGE_KEY, JSON.stringify(task))
    } catch (error) {
      console.error('Не удалось сохранить состояние автообновления:', error)
    }
  }, [])

  useEffect(() => {
    autoParseTaskRef.current = autoParseTask
  }, [autoParseTask])

  useEffect(() => {
    autoUpdateTaskRef.current = autoUpdateTask
  }, [autoUpdateTask])

  useEffect(() => {
    if (!automationHydrated) {
      return
    }

    if (autoParseTask && autoParseTask.task_id) {
      persistAutoParseTask(autoParseTask)
    } else {
      persistAutoParseTask(null)
    }
  }, [automationHydrated, autoParseTask, persistAutoParseTask])

  useEffect(() => {
    if (!automationHydrated) {
      return
    }

    if (autoUpdateTask && autoUpdateTask.task_id) {
      persistAutoUpdateTask(autoUpdateTask)
    } else {
      persistAutoUpdateTask(null)
    }
  }, [automationHydrated, autoUpdateTask, persistAutoUpdateTask])

  const startAutoParsePolling = useCallback((taskId: string) => {
    if (!taskId) {
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/parser/auto-parse/status/${taskId}`)
        const data = await response.json()

        if (response.ok) {
          const normalized = normalizeAutoParseTask(
            { ...data, task_id: taskId },
            autoParseTaskRef.current
          )
          setAutoParseTask(normalized)
          const running = isTaskActive(normalized.status)
          setIsAutoParsing(running)

          if (!running && autoParseIntervalRef.current) {
            window.clearInterval(autoParseIntervalRef.current)
            autoParseIntervalRef.current = null
          }
        } else {
          console.error('Ошибка получения статуса автопарсинга:', data?.error ?? response.statusText)
        }
      } catch (error) {
        console.error('Ошибка получения статуса автопарсинга:', error)
      }
    }

    if (autoParseIntervalRef.current) {
      window.clearInterval(autoParseIntervalRef.current)
    }

    fetchStatus()
    autoParseIntervalRef.current = window.setInterval(fetchStatus, AUTO_TASK_POLL_INTERVAL)
  }, [])

  const startAutoUpdatePolling = useCallback((taskId: string) => {
    if (!taskId) {
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/parser/auto-update/status/${taskId}`)
        const data = await response.json()

        if (response.ok) {
          const normalized = normalizeAutoUpdateTask(
            { ...data, task_id: taskId },
            autoUpdateTaskRef.current
          )
          setAutoUpdateTask(normalized)
          const running = isTaskActive(normalized.status)
          setIsAutoUpdating(running)

          if (!running && autoUpdateIntervalRef.current) {
            window.clearInterval(autoUpdateIntervalRef.current)
            autoUpdateIntervalRef.current = null
          }
        } else {
          console.error('Ошибка получения статуса автообновления:', data?.error ?? response.statusText)
        }
      } catch (error) {
        console.error('Ошибка получения статуса автообновления:', error)
      }
    }

    if (autoUpdateIntervalRef.current) {
      window.clearInterval(autoUpdateIntervalRef.current)
    }

    fetchStatus()
    autoUpdateIntervalRef.current = window.setInterval(fetchStatus, AUTO_TASK_POLL_INTERVAL)
  }, [])

  useEffect(() => () => {
    if (autoParseIntervalRef.current) {
      window.clearInterval(autoParseIntervalRef.current)
      autoParseIntervalRef.current = null
    }
    if (autoUpdateIntervalRef.current) {
      window.clearInterval(autoUpdateIntervalRef.current)
      autoUpdateIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const currentStatus = autoParseTask?.status ?? null
    const previousStatus = autoParsePrevStatusRef.current

    if (currentStatus && currentStatus !== previousStatus && FINAL_AUTO_STATUSES.has(currentStatus.toLowerCase())) {
      if (currentStatus.toLowerCase() === 'completed') {
        const imported = autoParseTask?.imported_slugs?.length ?? 0
        const skipped = autoParseTask?.skipped_slugs?.length ?? 0
        toast.success(`Автопарсинг завершен! Импортировано: ${imported}, пропущено: ${skipped}`)
      } else if (currentStatus.toLowerCase() === 'cancelled') {
        toast.warning('Автопарсинг отменен')
      } else if (currentStatus.toLowerCase() === 'failed') {
        toast.error('Автопарсинг завершился с ошибкой')
      }
    }

    autoParsePrevStatusRef.current = currentStatus
  }, [autoParseTask])

  useEffect(() => {
    const currentStatus = autoUpdateTask?.status ?? null
    const previousStatus = autoUpdatePrevStatusRef.current

    if (currentStatus && currentStatus !== previousStatus && FINAL_AUTO_STATUSES.has(currentStatus.toLowerCase())) {
      if (currentStatus.toLowerCase() === 'completed') {
        const updated = autoUpdateTask?.mangas_with_updates
          ?? autoUpdateTask?.updated_details?.length
          ?? autoUpdateTask?.updated_slugs?.length
          ?? autoUpdateTask?.updated_mangas?.length
          ?? 0
        const newChapters = autoUpdateTask?.new_chapters_count ?? 0
        toast.success(`Автообновление завершено! Тайтлов с новыми главами: ${updated}, добавлено глав: ${newChapters}`)
      } else if (currentStatus.toLowerCase() === 'failed') {
        toast.error('Автообновление завершилось с ошибкой')
      }
    }

    autoUpdatePrevStatusRef.current = currentStatus
  }, [autoUpdateTask])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setAutomationHydrated(true)
      return
    }

    try {
      const storedAutoParse = window.localStorage.getItem(AUTO_PARSE_STORAGE_KEY)
      if (storedAutoParse) {
        const parsed = normalizeAutoParseTask(JSON.parse(storedAutoParse))
        if (parsed.task_id) {
          setAutoParseTask(parsed)
          autoParseTaskRef.current = parsed
          if (isTaskActive(parsed.status)) {
            setIsAutoParsing(true)
            startAutoParsePolling(parsed.task_id)
          }
        }
      }

      const storedAutoUpdate = window.localStorage.getItem(AUTO_UPDATE_STORAGE_KEY)
      if (storedAutoUpdate) {
        const parsed = normalizeAutoUpdateTask(JSON.parse(storedAutoUpdate))
        if (parsed.task_id) {
          setAutoUpdateTask(parsed)
          autoUpdateTaskRef.current = parsed
          if (isTaskActive(parsed.status)) {
            setIsAutoUpdating(true)
            startAutoUpdatePolling(parsed.task_id)
          }
        }
      }
    } catch (error) {
      console.error('Не удалось восстановить состояние автоматизации из localStorage:', error)
      window.localStorage.removeItem(AUTO_PARSE_STORAGE_KEY)
      window.localStorage.removeItem(AUTO_UPDATE_STORAGE_KEY)
    } finally {
      setAutomationHydrated(true)
    }
  }, [startAutoParsePolling, startAutoUpdatePolling])

  // Автопарсинг манги из каталога
  const startAutoParsing = async () => {
    if (catalogPage <= 0) {
      toast.error('Номер страницы должен быть больше 0')
      return
    }

    // Валидация limit
    if (parseLimit !== null && parseLimit <= 0) {
      toast.error('Ограничение должно быть больше 0')
      return
    }

    if (minChapterCount !== null && minChapterCount < 0) {
      toast.error('Минимальное количество глав не может быть отрицательным')
      return
    }

    if (maxChapterCount !== null && maxChapterCount < 0) {
      toast.error('Максимальное количество глав не может быть отрицательным')
      return
    }

    if (minChapterCount !== null && maxChapterCount !== null && minChapterCount > maxChapterCount) {
      toast.error('Минимальное количество глав не может превышать максимальное')
      return
    }

    setIsAutoParsing(true)
    
    try {
      const response = await fetch('/api/parser/auto-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          page: catalogPage,
          limit: parseLimit,
          minChapters: minChapterCount,
          maxChapters: maxChapterCount 
        })
      })

      const data = await response.json()

      if (response.ok) {
        const taskId = String(data.task_id ?? data.taskId ?? '')
        const normalized = normalizeAutoParseTask({
          ...data,
          task_id: taskId,
          start_time: data.start_time ?? new Date().toISOString()
        }, autoParseTaskRef.current)
        setAutoParseTask(normalized)
        autoParseTaskRef.current = normalized
        setIsAutoParsing(true)
        toast.success('Автопарсинг запущен')
        startAutoParsePolling(taskId)
      } else {
        toast.error(data.error || 'Ошибка запуска автопарсинга')
        setIsAutoParsing(false)
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setIsAutoParsing(false)
    }
  }

  // Отмена автопарсинга
  const cancelAutoParsing = async () => {
    if (!autoParseTask?.task_id) {
      toast.error('Нет активной задачи для отмены')
      return
    }

    try {
      const response = await fetch(`/api/parser/auto-parse/cancel/${autoParseTask.task_id}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.cancelled) {
        toast.success('Автопарсинг отменяется...')
        // Статус обновится через polling
      } else {
        toast.error(data.message || 'Не удалось отменить задачу')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    }
  }

  const cleanupMelonStorage = async () => {
    setIsCleaningMelon(true)

    try {
      const response = await fetch('/api/parser/cleanup/melon', { method: 'POST' })
      let data: any = null

      try {
        data = await response.json()
      } catch (error) {
        // Игнорируем ошибки парсинга тела – может быть пустой ответ
      }

      if (response.ok && (data?.success ?? true)) {
        const removedTotal = Array.isArray(data?.details)
          ? data.details.reduce((acc: number, entry: any) => acc + (Number(entry?.removed_items) || 0), 0)
          : undefined
        toast.success(
          removedTotal && removedTotal > 0
            ? `Хранилище Melon очищено. Удалено элементов: ${removedTotal}`
            : 'Хранилище Melon очищено'
        )
      } else {
        toast.error(data?.message || 'Не удалось очистить хранилище Melon')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером при очистке Melon')
    } finally {
      setIsCleaningMelon(false)
    }
  }

  const cleanupEmptyChapters = async () => {
    if (isCleaningEmptyChapters) {
      return
    }

    setIsCleaningEmptyChapters(true)

    try {
      const result = await apiClient.cleanupEmptyChapters()
      const normalized = normalizeCleanupResult(result)
      setLastCleanupResult(normalized)

      if (normalized.deletedCount > 0) {
        toast.success(`Удалено пустых глав: ${normalized.deletedCount}`)
      } else if (normalized.emptyDetected > 0) {
        toast.warning('Найдены пустые главы, но удалить их не удалось. Проверьте логи.')
      } else {
        toast.success('Пустых глав не обнаружено')
      }

      if (normalized.deletionFailedIds.length > 0) {
        toast.warning(`Не удалось удалить ${normalized.deletionFailedIds.length} глав`)
      }

      if (normalized.pageCheckFailedIds.length > 0) {
        toast.warning(`Не удалось проверить страницы у ${normalized.pageCheckFailedIds.length} глав`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка соединения с сервером при очистке пустых глав'
      toast.error(message)
    } finally {
      setIsCleaningEmptyChapters(false)
    }
  }

  const runSlugIdBackfill = async () => {
    if (isBackfillingSlugIds) {
      return
    }

    const startPageInput = slugBackfillStartPage.trim()
    if (!startPageInput) {
      toast.error('Укажите номер страницы каталога MangaLib')
      return
    }

    const parsedStart = Number(startPageInput)
    if (!Number.isFinite(parsedStart) || parsedStart < 1) {
      toast.error('Номер страницы должен быть положительным целым числом')
      return
    }

    const startPage = Math.floor(parsedStart)
    setSlugBackfillStartPage(String(startPage))

    setIsBackfillingSlugIds(true)

    try {
      const result = await apiClient.backfillMelonSlugIds({ startPage })
      const normalized = result ?? {}
      const updatedCount = Object.keys(normalized).length

      setSlugBackfillResult({
        updated: normalized,
        completedAt: new Date().toISOString()
      })

      if (updatedCount > 0) {
        toast.success(`Проставлены MangaLib ID для ${updatedCount} тайтлов (страница ${startPage})`)
      } else {
        toast.info('Все манги уже имеют MangaLib ID')
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Не удалось синхронизировать MangaLib ID'
      toast.error(message)
    } finally {
      setIsBackfillingSlugIds(false)
    }
  }

  // Автообновление манги
  const startAutoUpdate = async () => {
    setIsAutoUpdating(true)

    try {
      const response = await fetch('/api/parser/auto-update', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        const taskId = String(data.task_id ?? data.taskId ?? '')
        const normalized = normalizeAutoUpdateTask({
          ...data,
          task_id: taskId,
          start_time: data.start_time ?? new Date().toISOString()
        }, autoUpdateTaskRef.current)
        setAutoUpdateTask(normalized)
        autoUpdateTaskRef.current = normalized
        setIsAutoUpdating(true)
        toast.success('Автообновление запущено')
        startAutoUpdatePolling(taskId)
      } else {
        toast.error(data.error || 'Ошибка запуска автообновления')
        setIsAutoUpdating(false)
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setIsAutoUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Управление мангой</h3>
        <p className="text-sm text-muted-foreground">
          Автоматический парсинг и обновление манги
        </p>
      </div>

      {/* Автопарсинг */}
      <Card>
        <CardHeader>
          <CardTitle>Автопарсинг манги</CardTitle>
          <CardDescription>
            Автоматический парсинг, билдинг и импорт манг из каталога MangaLib. Пропускает уже существующие манги.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2 h-full">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                  <span>Очистить Output/mangalib (archives, images, titles) на MelonService</span>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={cleanupMelonStorage}
                  disabled={isCleaningMelon}
                  className="whitespace-nowrap"
                >
                  {isCleaningMelon ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Очистка...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Очистить Melon
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Удаляет артефакты прошлых запусков (архивы, изображения и JSON файлы), сохраняя структуру директорий.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2 h-full">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eraser className="h-4 w-4" />
                  <span>Очистить пустые главы (0 страниц) во всех мангах</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={cleanupEmptyChapters}
                  disabled={isCleaningEmptyChapters}
                  className="whitespace-nowrap"
                >
                  {isCleaningEmptyChapters ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Очистка...
                    </>
                  ) : (
                    <>
                      <Eraser className="h-4 w-4 mr-2" />
                      Очистить пустые главы
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Перепроверяет каждую главу через ImageStorageService и удаляет только те, в которых нет страниц. Список удалённых глав появится ниже.
              </p>
              {lastCleanupResult && (
                <div className="text-xs text-muted-foreground/90 space-y-1">
                  <p>
                    Проверено глав: <span className="text-white">{lastCleanupResult.totalChecked}</span>. Найдено пустых: <span className="text-white">{lastCleanupResult.emptyDetected}</span>. Удалено: <span className="text-green-400">{lastCleanupResult.deletedCount}</span>.
                  </p>
                  {(lastCleanupResult.deletionFailedIds.length > 0 || lastCleanupResult.pageCheckFailedIds.length > 0) && (
                    <p>
                      Пропущено из-за ошибок: {lastCleanupResult.deletionFailedIds.length + lastCleanupResult.pageCheckFailedIds.length}.{' '}
                      {lastCleanupResult.deletionFailedIds.length > 0 && (
                        <span>Удаление: <span className="text-white">{lastCleanupResult.deletionFailedIds.length}</span>. </span>
                      )}
                      {lastCleanupResult.pageCheckFailedIds.length > 0 && (
                        <span>Проверка страниц: <span className="text-white">{lastCleanupResult.pageCheckFailedIds.length}</span>.</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2 xl:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span>Проставить MangaLib ID тайтлам без числового slug'а</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={runSlugIdBackfill}
                  disabled={isBackfillingSlugIds}
                  className="whitespace-nowrap"
                >
                  {isBackfillingSlugIds ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Синхронизация...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Синхронизировать slug'и
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Сканирует каталог MangaLib и определяет числовые идентификаторы для манг, у которых в базе сохранён только текстовый slug.
              </p>
              <div className="space-y-1">
                <Label htmlFor="slugBackfillStartPage" className="text-xs text-muted-foreground">
                  Стартовая страница каталога
                </Label>
                <Input
                  id="slugBackfillStartPage"
                  type="number"
                  min={1}
                  value={slugBackfillStartPage}
                  onChange={(event) => setSlugBackfillStartPage(event.target.value)}
                  disabled={isBackfillingSlugIds}
                  className="bg-background text-white"
                />
                <p className="text-[11px] text-muted-foreground">
                  По умолчанию синхронизация начинается с первой страницы каталога MangaLib.
                </p>
              </div>
              {slugBackfillResult && (
                <div className="text-xs text-muted-foreground/90 space-y-1">
                  <p>
                    Обновлено тайтлов: <span className="text-white">{slugBackfillPreview.count}</span>. Завершено: <span className="text-white">{formatTimestampLabel(slugBackfillResult.completedAt)}</span>
                  </p>
                  {slugBackfillPreview.count === 0 ? (
                    <p className="text-muted-foreground">Новых сопоставлений не найдено.</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Примеры сопоставлений:</p>
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {slugBackfillPreview.entries.map(([mangaId, slugId]) => (
                          <div
                            key={mangaId}
                            className="flex items-center justify-between rounded border border-gray-800 bg-gray-900/50 px-2 py-1 text-[11px] font-mono text-muted-foreground"
                          >
                            <span className="text-white">#{mangaId}</span>
                            <span className="text-blue-300">→ {slugId}</span>
                          </div>
                        ))}
                      </div>
                      {slugBackfillPreview.remaining > 0 && (
                        <p className="text-muted-foreground">
                          И ещё {slugBackfillPreview.remaining} {slugBackfillPreview.remaining === 1 ? 'тайтл' : slugBackfillPreview.remaining < 5 ? 'тайтла' : 'тайтлов'} обновлено.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="catalogPage">
                Номер страницы каталога MangaLib
              </Label>
              <Input
                id="catalogPage"
                type="number"
                min="1"
                placeholder="Введите номер страницы (например, 1, 2, 3...)"
                value={catalogPage}
                onChange={(event) => setCatalogPage(parseInt(event.target.value, 10) || 1)}
                disabled={isAutoParsing}
                className="bg-background text-white"
              />
              <p className="text-xs text-muted-foreground">
                Каждая страница содержит до 60 манг из каталога MangaLib
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parseLimit">
                Ограничение количества манг (опционально)
              </Label>
              <Input
                id="parseLimit"
                type="number"
                min="1"
                placeholder="Введите количество (например, 20, 100) или оставьте пустым для парсинга всех"
                value={parseLimit ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setParseLimit(value === '' ? null : parseInt(value, 10))
                }}
                disabled={isAutoParsing}
                className="bg-background text-white"
              />
              <p className="text-xs text-muted-foreground">
                Если указано, будет обработано только первые N манг со страницы
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minChapters">
                Минимальное количество глав для автопарсинга (опционально)
              </Label>
              <Input
                id="minChapters"
                type="number"
                min="0"
                placeholder="Например, 5"
                value={minChapterCount ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setMinChapterCount(value === '' ? null : parseInt(value, 10))
                }}
                disabled={isAutoParsing}
                className="bg-background text-white"
              />
              <p className="text-xs text-muted-foreground">
                Тайтлы с меньшим количеством глав будут пропущены.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxChapters">
                Максимальное количество глав для автопарсинга (опционально)
              </Label>
              <Input
                id="maxChapters"
                type="number"
                min="0"
                placeholder="Например, 150"
                value={maxChapterCount ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setMaxChapterCount(value === '' ? null : parseInt(value, 10))
                }}
                disabled={isAutoParsing}
                className="bg-background text-white"
              />
              <p className="text-xs text-muted-foreground">
                Тайтлы с большим количеством глав будут пропущены, чтобы избежать длинных импортаций.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={startAutoParsing}
              disabled={isAutoParsing}
              className="w-full sm:flex-1"
            >
              {isAutoParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Парсинг выполняется...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {parseLimit
                    ? `Запустить автопарсинг (страница ${catalogPage}, лимит: ${parseLimit})`
                    : `Запустить автопарсинг (страница ${catalogPage})`
                  }
                </>
              )}
            </Button>

            {isAutoParsing && autoParseTask?.status === 'running' && (
              <Button
                onClick={cancelAutoParsing}
                variant="destructive"
                className="w-full sm:w-auto sm:px-8"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Отменить
              </Button>
            )}
          </div>

          {/* Статус автопарсинга */}
          {autoParseTask && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(autoParseTask.status)}
                  <div>
                    <h4 className="font-medium text-white">Автопарсинг</h4>
                    <p className="text-sm text-muted-foreground">
                      {autoParseTask.message}
                    </p>
                  </div>
                </div>
                <Badge className={
                  autoParseTask.status === 'completed' ? 'bg-green-500' :
                  autoParseTask.status === 'failed' ? 'bg-red-500' :
                  autoParseTask.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                }>
                  {autoParseTask.status}
                </Badge>
              </div>

              <Progress value={autoParseTask.progress} className="h-2" />

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Всего:</span>
                  <span className="ml-2 text-white">{autoParseTask.total_slugs || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Обработано:</span>
                  <span className="ml-2 text-white">{autoParseTask.processed_slugs || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Импортировано:</span>
                  <span className="ml-2 text-green-500">{autoParseTask.imported_slugs?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Пропущено:</span>
                  <span className="ml-2 text-yellow-500">{autoParseTask.skipped_slugs?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ошибок:</span>
                  <span className="ml-2 text-red-500">{autoParseTask.failed_slugs?.length || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  Начало: <span className="text-white">{formatTimestampLabel(autoParseTask.start_time)}</span>
                </div>
                <div>
                  Завершение: <span className="text-white">{formatTimestampLabel(autoParseTask.end_time ?? null)}</span>
                </div>
                <div>
                  Длительность: <span className="text-white">{formatDurationFromMs(autoParseTask.duration_ms, autoParseTask.duration_formatted)}</span>
                </div>
                <div>
                  Страница каталога: <span className="text-white">{autoParseTask.page ?? '—'}</span>
                </div>
                <div>
                  Лимит: <span className="text-white">{autoParseTask.limit ?? 'все'}</span>
                </div>
                <div>
                  Тайтлов обработано: <span className="text-white">{autoParseSummary.total}</span>
                </div>
              </div>

              {autoParseSummary.total > 0 && (
                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-[0.7rem] ${getStatusBadgeClass('completed')}`}>
                      Готово: {autoParseSummary.completed}
                    </Badge>
                    <Badge variant="outline" className={`text-[0.7rem] ${getStatusBadgeClass('failed')}`}>
                      Ошибок: {autoParseSummary.failed}
                    </Badge>
                    <Badge variant="outline" className={`text-[0.7rem] ${getStatusBadgeClass('skipped')}`}>
                      Пропущено: {autoParseSummary.skipped}
                    </Badge>
                    <Badge variant="outline" className={`text-[0.7rem] ${getStatusBadgeClass('cancelled')}`}>
                      Отменено: {autoParseSummary.cancelled}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <span>
                      Глав: <span className="text-white">{autoParseSummary.importedChapters}</span>
                      {autoParseSummary.totalChapters > 0 ? ` / ${autoParseSummary.totalChapters}` : ''}
                    </span>
                    <span>
                      Страниц: <span className="text-white">{autoParseSummary.importedPages}</span>
                      {autoParseSummary.totalPages > 0 ? ` / ${autoParseSummary.totalPages}` : ''}
                    </span>
                  </div>
                </div>
              )}

              {autoParseTask.manga_metrics.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-sm font-medium text-white">Результаты по тайтлам</Label>
                    <Badge variant="outline" className="text-xs">
                      {autoParseTask.manga_metrics.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {autoParseTask.manga_metrics.map((metric) => {
                      const detail = metric.metrics ?? {}
                      const totalCh = toNumber(detail['total_chapters'])
                      const importedCh = toNumber(detail['imported_chapters'])
                      const totalPg = toNumber(detail['total_pages'])
                      const importedPg = toNumber(detail['imported_pages'])
                      const importDuration = formatDurationFromMs(
                        toNumber(detail['duration_ms']),
                        typeof detail['duration_formatted'] === 'string' ? detail['duration_formatted'] as string : undefined
                      )
                      const reasonLabel = metric.reason === 'already_imported'
                        ? 'Уже импортировано'
                        : metric.reason
                      const key = metric.full_parsing_task_id
                        ?? metric.import_task_id
                        ?? (metric.slug ? `${metric.slug}-${metric.index}` : String(metric.index))

                      return (
                        <div
                          key={key}
                          className="border border-border/60 bg-background/80 rounded-lg p-3 shadow-sm space-y-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-white">
                                {metric.title || metric.normalized_slug || metric.slug || `Тайтл #${metric.index}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Slug: {metric.normalized_slug || metric.slug || '—'}
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(metric.status)}`}>
                              {getStatusLabel(metric.status)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                            <div>
                              Начало: <span className="text-white">{formatTimestampLabel(metric.started_at ?? null)}</span>
                            </div>
                            <div>
                              Завершение: <span className="text-white">{formatTimestampLabel(metric.completed_at ?? null)}</span>
                            </div>
                            <div>
                              Суммарно: <span className="text-white">{formatDurationFromMs(metric.duration_ms, metric.duration_formatted)}</span>
                            </div>
                            {(typeof importedCh === 'number' || typeof totalCh === 'number') && (
                              <div>
                                Глав: <span className="text-white">{importedCh ?? 0}</span>
                                {typeof totalCh === 'number' ? ` / ${totalCh}` : ''}
                              </div>
                            )}
                            {(typeof importedPg === 'number' || typeof totalPg === 'number') && (
                              <div>
                                Страниц: <span className="text-white">{importedPg ?? 0}</span>
                                {typeof totalPg === 'number' ? ` / ${totalPg}` : ''}
                              </div>
                            )}
                            {(importDuration && importDuration !== '—') && (
                              <div>
                                Импорт: <span className="text-white">{importDuration}</span>
                              </div>
                            )}
                          </div>

                          {(metric.error_message || reasonLabel || metric.final_message) && (
                            <div className="text-xs text-red-300">
                              {metric.error_message || reasonLabel || metric.final_message}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {(autoParseTask.failed_slugs?.length || 0) > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ошибки при обработке: {autoParseTask.failed_slugs?.join(', ') || ''}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span>Источник логов</span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {(['combined', 'auto-parse', 'auto-update'] as AutomationLogSource[]).map((source) => (
                      <Button
                        key={source}
                        type="button"
                        variant={selectedLogSource === source ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLogSource(source)}
                        className="whitespace-nowrap"
                      >
                        {AUTOMATION_SOURCE_LABELS[source]}
                      </Button>
                    ))}
                  </div>
                </div>

                <LogViewer logs={combinedAutomationLogs} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Мониторинг очереди импорта */}
      <ImportQueueMonitor 
        isAutoParsing={isAutoParsing}
        className="mb-6"
      />

      {/* Автообновление */}
      <Card>
        <CardHeader>
          <CardTitle>Автообновление манги</CardTitle>
          <CardDescription>
            Проверка и импорт новых глав для всех манг в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Этот процесс проверит все манги в системе на наличие новых глав и автоматически импортирует их.
              Это может занять продолжительное время.
            </AlertDescription>
          </Alert>

          <Button
            onClick={startAutoUpdate}
            disabled={isAutoUpdating}
            className="w-full"
          >
            {isAutoUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Обновление выполняется...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Запустить автообновление
              </>
            )}
          </Button>

          {/* Статус автообновления */}
          {autoUpdateTask && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(autoUpdateTask.status)}
                  <div>
                    <h4 className="font-medium text-white">Автообновление</h4>
                    <p className="text-sm text-muted-foreground">
                      {autoUpdateTask.message}
                    </p>
                  </div>
                </div>
                <Badge className={
                  autoUpdateTask.status === 'completed' ? 'bg-green-500' :
                  autoUpdateTask.status === 'failed' ? 'bg-red-500' :
                  autoUpdateTask.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                }>
                  {autoUpdateTask.status}
                </Badge>
              </div>

              <Progress value={autoUpdateTask.progress} className="h-2" />

              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Всего манг:</span>
                  <span className="ml-2 text-white">{autoUpdateTask.total_mangas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Проверено:</span>
                  <span className="ml-2 text-white">{autoUpdateTask.processed_mangas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Тайтлов с новыми главами:</span>
                  <span className="ml-2 text-green-500">{updatedMangaCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Добавлено глав:</span>
                  <span className="ml-2 text-blue-500">{autoUpdateTask.new_chapters_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ошибок:</span>
                  <span className="ml-2 text-red-500">{autoUpdateTask.failed_mangas.length}</span>
                </div>
              </div>

              {(updatedDetails.length > 0 || updatedSlugs.length > 0 || fallbackUpdatedMangas.length > 0) && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Тайтлы с обновлениями:</p>
                  <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                    {updatedDetails.length > 0 ? (
                      updatedDetails.map((entry) => (
                        <div key={`${entry.slug}-${entry.new_chapters}`} className="leading-snug">
                          <span className="text-white">{entry.slug}</span>
                          {entry.title && <span className="text-muted-foreground"> — {entry.title}</span>}
                          <span className="text-green-400 ml-1">(+{entry.new_chapters} глав)</span>
                          {entry.chapter_labels.length > 0 && (
                            <div className="text-[11px] text-muted-foreground/80">
                              Главы: {entry.chapter_labels.join(', ')}
                            </div>
                          )}
                        </div>
                      ))
                    ) : updatedSlugs.length > 0 ? (
                      updatedSlugs.map((slug) => (
                        <div key={slug}>• {slug}</div>
                      ))
                    ) : (
                      fallbackUpdatedMangas.map((item, index) => (
                        <div key={`${item}-${index}`}>• {item}</div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {autoUpdateTask.failed_mangas.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ошибки при обновлении: {autoUpdateTask.failed_mangas.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Логи в реальном времени */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-sm font-medium text-white">Логи автообновления</Label>
                  {selectedLogSource !== 'auto-update' && (
                    <Badge variant="outline" className="text-xs">
                      Фокус на вкладке «Автообновление» вверху
                    </Badge>
                  )}
                </div>
                {(autoUpdateTask.logs?.length ?? 0) > 0 ? (
                  <LogViewer logs={autoUpdateTask.logs} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Логи появятся, как только задача начнёт отправлять сообщения.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
