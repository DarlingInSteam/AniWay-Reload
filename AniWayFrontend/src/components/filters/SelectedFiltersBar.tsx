import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AGE_RATING_OPTIONS,
  RATING_OPTIONS,
  CHAPTER_OPTIONS,
  DEFAULT_AGE_RANGE,
  DEFAULT_RATING_RANGE,
  DEFAULT_RELEASE_YEAR_RANGE,
  DEFAULT_CHAPTER_RANGE,
  findRangeOption,
  rangesEqual
} from './filterOptions'

export interface ActiveFiltersState {
  genres?: string[]
  tags?: string[]
  type?: string
  status?: string
  ageRating?: [number, number]
  rating?: [number, number]
  releaseYear?: [number, number]
  chapterRange?: [number, number]
}

interface SelectedFiltersBarProps {
  activeFilters: ActiveFiltersState
  activeType: string
  onRemove: (category: string, value?: string) => void
  onClearAll: () => void
  className?: string
}

// Значения по умолчанию для проверки диапазонов
const DEFAULTS = {
  ageRating: DEFAULT_AGE_RANGE,
  rating: DEFAULT_RATING_RANGE,
  releaseYear: DEFAULT_RELEASE_YEAR_RANGE,
  chapterRange: DEFAULT_CHAPTER_RANGE
}

const humanizeType = (type?: string) => {
  if (!type) return ''
  const map: Record<string, string> = {
    MANGA: 'Манга',
    MANHWA: 'Манхва',
    MANHUA: 'Маньхуа',
    WESTERN_COMIC: 'Западный комикс',
    RUSSIAN_COMIC: 'Русский комикс',
    OEL: 'OEL',
    OTHER: 'Другое'
  }
  return map[type] || type
}

const humanizeStatus = (status?: string) => {
  if (!status) return ''
  const map: Record<string, string> = {
    ONGOING: 'Выходит',
    COMPLETED: 'Завершена',
    HIATUS: 'На паузе',
    CANCELLED: 'Отменена'
  }
  return map[status] || status
}

export const SelectedFiltersBar: React.FC<SelectedFiltersBarProps> = ({
  activeFilters,
  activeType,
  onRemove,
  onClearAll,
  className
}) => {
  // Собираем чипсы
  const chips: Array<{ key: string; label: string; value?: string }> = []

  if (activeType && activeType !== 'все') {
    chips.push({ key: 'activeType', label: activeType.charAt(0).toUpperCase() + activeType.slice(1) })
  }
  if (Array.isArray(activeFilters.genres)) {
    activeFilters.genres.forEach(g => chips.push({ key: 'genre', label: g, value: g }))
  }
  if (Array.isArray(activeFilters.tags)) {
    activeFilters.tags.forEach(t => chips.push({ key: 'tag', label: t, value: t }))
  }
  if (activeFilters.type) {
    chips.push({ key: 'type', label: humanizeType(activeFilters.type) })
  }
  if (activeFilters.status) {
    chips.push({ key: 'status', label: humanizeStatus(activeFilters.status) })
  }
  // Диапазоны - добавляем только если отличаются от дефолта
  if (activeFilters.ageRating && !rangesEqual(activeFilters.ageRating, DEFAULTS.ageRating)) {
    const option = findRangeOption(activeFilters.ageRating, AGE_RATING_OPTIONS)
    const label = option ? `Возраст: ${option.summary}` : `Возраст: ${activeFilters.ageRating[0]}+–${activeFilters.ageRating[1]}+`
    chips.push({ key: 'ageRating', label })
  }
  if (activeFilters.rating && !rangesEqual(activeFilters.rating, DEFAULTS.rating)) {
    const option = findRangeOption(activeFilters.rating, RATING_OPTIONS)
    const label = option ? `Рейтинг: ${option.summary}` : `Рейтинг: ${activeFilters.rating[0]}+`
    chips.push({ key: 'rating', label })
  }
  if (activeFilters.releaseYear && !rangesEqual(activeFilters.releaseYear, DEFAULTS.releaseYear)) {
    chips.push({ key: 'releaseYear', label: `Год: ${activeFilters.releaseYear[0]} – ${activeFilters.releaseYear[1]}` })
  }
  if (activeFilters.chapterRange && !rangesEqual(activeFilters.chapterRange, DEFAULTS.chapterRange)) {
    const option = findRangeOption(activeFilters.chapterRange, CHAPTER_OPTIONS)
    const label = option ? `Главы: ${option.summary}` : `Главы: ${activeFilters.chapterRange[0]}–${activeFilters.chapterRange[1]}`
    chips.push({ key: 'chapterRange', label })
  }

  if (chips.length === 0) return null

  return (
    <div className={cn('glass-panel px-3 py-2 rounded-xl flex flex-wrap gap-2 items-center relative', className)} aria-label="Выбранные фильтры">
      {chips.map(chip => (
        <button
          key={chip.key + chip.label}
          onClick={() => onRemove(chip.key, chip.value)}
          className={cn(
            'group flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs font-medium bg-white/10 hover:bg-white/15 text-white transition-all backdrop-blur-sm border border-white/15 hover:border-white/30',
            chip.key === 'genre' && 'bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary',
            chip.key === 'tag' && 'bg-white/20 text-white hover:bg-white/30'
          )}
        >
          <span className="line-clamp-1 max-w-[140px]">{chip.label}</span>
          <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
      >
        Очистить всё
      </button>
    </div>
  )
}

export default SelectedFiltersBar
