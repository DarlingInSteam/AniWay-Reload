import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, X, Loader2, Filter, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFilterData } from '@/hooks/useFilterData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface FilterState {
  selectedGenres: string[]
  selectedTags: string[]
  mangaType: string
  status: string
  ageRating: [number, number]
  rating: [number, number]
  releaseYear: [number, number]
  chapterRange: [number, number]
  strictMatch?: boolean
}

interface MangaFilterPanelProps {
  initialFilters?: FilterState
  onFiltersChange: (filters: FilterState) => void
  onReset: () => void
  onApply?: () => void
  className?: string
  appearance?: 'desktop' | 'mobile'
}

// Утилиты форматирования состояния
const summarize = {
  genres: (arr: string[]) => arr.length === 0 ? 'Любые' : arr.length <= 2 ? arr.join(', ') : `Выбрано ${arr.length}`,
  tags: (arr: string[]) => arr.length === 0 ? 'Любые' : `Выбрано ${arr.length}`,
  range: (r: [number, number], def: [number, number], suffix = '') => (r[0] === def[0] && r[1] === def[1]) ? 'Любые' : `${r[0]}–${r[1]}${suffix}`,
  single: (val: string, map: Record<string,string>) => val ? (map[val] || val) : 'Любой'
}

const TYPE_MAP: Record<string,string> = {
  MANGA: 'Манга', MANHWA: 'Манхва', MANHUA: 'Маньхуа', WESTERN_COMIC: 'Западный комикс', RUSSIAN_COMIC: 'Русский комикс', OEL: 'OEL', OTHER: 'Другое'
}
const STATUS_MAP: Record<string,string> = {
  ONGOING: 'Выходит', COMPLETED: 'Завершена', HIATUS: 'Пауза', CANCELLED: 'Отменена'
}

const DEFAULTS: FilterState = {
  selectedGenres: [],
  selectedTags: [],
  mangaType: '',
  status: '',
  ageRating: [0,21],
  rating: [0,10],
  releaseYear: [1990, new Date().getFullYear()],
  chapterRange: [0,1000],
  strictMatch: true
}

// Генерик компонент строки фильтра
interface RowProps {
  id: string
  title: string
  summary: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}
const FilterRow: React.FC<RowProps & { active?: boolean; appearance: 'desktop' | 'mobile' }> = ({
  id,
  title,
  summary,
  isOpen,
  onToggle,
  children,
  active,
  appearance
}) => {
  const isMobile = appearance === 'mobile'
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle()
      }
    }
    document.addEventListener('keydown', handleKey)
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  return (
    <div
      ref={containerRef}
      className="group/filter relative rounded-xl"
      aria-expanded={isOpen}
      aria-controls={id}
      role="group"
    >
      <button
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        className={cn(
          'w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#181f2c] px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-0',
          active && !isOpen ? 'border-primary/40 bg-[#1f293b] text-white' : '',
          isOpen ? 'bg-[#1f293b] shadow-[0_18px_32px_-24px_rgba(0,0,0,0.6)]' : 'hover:bg-[#1d2638]'
        )}
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium text-white tracking-tight">{title}</span>
          <span className="text-[11px] text-white/55 line-clamp-1">{summary}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-white/55 transition-transform duration-200',
            isOpen ? 'rotate-180 text-white/80' : ''
          )}
        />
      </button>

      {isOpen && (
        <div
          id={`${id}-content`}
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 rounded-xl border border-white/8 bg-[#111a27] p-4 shadow-[0_28px_60px_-32px_rgba(0,0,0,0.85)]',
            isMobile ? 'max-h-[70vh] overflow-y-auto' : ''
          )}
        >
          <div className={cn('space-y-3', isMobile ? 'text-[13px]' : 'text-sm')}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export const MangaFilterPanel: React.FC<MangaFilterPanelProps> = ({
  initialFilters,
  onFiltersChange,
  onReset,
  onApply,
  className,
  appearance = 'desktop'
}) => {
  const { genres, tags, isLoadingGenres, isLoadingTags, genresError, tagsError } = useFilterData()
  const [filters, setFilters] = useState<FilterState>(initialFilters ? { ...DEFAULTS, ...initialFilters, strictMatch: true } : DEFAULTS)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [genreSearch, setGenreSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')

  // Синхронизация входных фильтров
  useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({ ...prev, ...initialFilters, strictMatch: true }))
    }
  }, [initialFilters])

  const update = (partial: Partial<FilterState>) => {
    const next = { ...filters, ...partial, strictMatch: true }
    setFilters(next)
    onFiltersChange(next)
  }

  const toggleGenre = (g: string) => {
    const list = filters.selectedGenres.includes(g)
      ? filters.selectedGenres.filter(x => x !== g)
      : [...filters.selectedGenres, g]
    update({ selectedGenres: list })
  }
  const toggleTag = (t: string) => {
    const list = filters.selectedTags.includes(t)
      ? filters.selectedTags.filter(x => x !== t)
      : [...filters.selectedTags, t]
    update({ selectedTags: list })
  }

  const handleNumberRange = (field: keyof Pick<FilterState,'ageRating'|'rating'|'releaseYear'|'chapterRange'>, idx: 0|1, value: string) => {
    const current = [...(filters[field] as [number,number])]
    const num = parseInt(value) || 0
    current[idx] = num
    if (current[0] > current[1]) current[idx === 0 ? 1 : 0] = num
    update({ [field]: current } as any)
  }

  const resetAll = () => {
    setFilters(DEFAULTS)
    onFiltersChange(DEFAULTS)
    onReset()
  }

  const rowSummary = {
    genres: summarize.genres(filters.selectedGenres),
    tags: summarize.tags(filters.selectedTags),
    type: summarize.single(filters.mangaType, TYPE_MAP),
    status: summarize.single(filters.status, STATUS_MAP),
    age: summarize.range(filters.ageRating, DEFAULTS.ageRating, '+'),
    rating: summarize.range(filters.rating, DEFAULTS.rating),
    year: summarize.range(filters.releaseYear, DEFAULTS.releaseYear),
    chapters: summarize.range(filters.chapterRange, DEFAULTS.chapterRange)
  }

  const filteredGenres = genres.filter(g => g.name.toLowerCase().includes(genreSearch.toLowerCase()))
  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))

  const chip = (text: string, onClick: () => void, active: boolean) => (
    <button
      key={text}
      onClick={onClick}
      className={cn(
        'text-xs px-3 py-1.5 rounded-xl transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        active
          ? 'bg-primary/45 text-white font-medium shadow-[0_10px_28px_-18px_rgba(37,99,235,0.72)] hover:bg-primary/55'
          : 'bg-[#1d2635] text-white/80 hover:text-white hover:bg-[#263248]'
      )}
    >
      <span className="flex items-center gap-1.5">
        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
        <span>{text}</span>
      </span>
    </button>
  )

  const checkboxList = <T extends string>(items: readonly {value:T,label:string}[], value: string, field: keyof FilterState) => (
    <div className="flex flex-wrap gap-2">
      {items.map(it => chip(it.label, () => update({ [field]: value === it.value ? '' : it.value } as any), value === it.value))}
    </div>
  )

  const numberRange = (field: keyof Pick<FilterState,'ageRating'|'rating'|'releaseYear'|'chapterRange'>, min: number, max: number, step=1, suffix='') => {
    const val = filters[field]
    return (
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/65">
        <Input
          type="number"
          value={val[0]}
          min={min}
          max={val[1]}
          step={step}
          onChange={e=>handleNumberRange(field,0,e.target.value)}
          className="h-9 w-24 rounded-lg border border-white/10 bg-[#151f30] text-xs text-white/80 focus:border-primary/40 focus:bg-[#1d283c] focus:ring-0"
        />
        <span className="text-white/40">—</span>
        <Input
          type="number"
          value={val[1]}
          min={val[0]}
          max={max}
          step={step}
          onChange={e=>handleNumberRange(field,1,e.target.value)}
          className="h-9 w-24 rounded-lg border border-white/10 bg-[#151f30] text-xs text-white/80 focus:border-primary/40 focus:bg-[#1d283c] focus:ring-0"
        />
        {suffix && <span>{suffix}</span>}
      </div>
    )
  }

  // Active chips (flattened) for mobile quick view
  const activeChips: { label: string; onRemove: () => void; key: string }[] = []
  filters.selectedGenres.forEach(g => activeChips.push({ label: g, onRemove: () => toggleGenre(g), key: 'g-'+g }))
  filters.selectedTags.forEach(t => activeChips.push({ label: t, onRemove: () => toggleTag(t), key: 't-'+t }))
  if (filters.mangaType) activeChips.push({ label: TYPE_MAP[filters.mangaType] || filters.mangaType, onRemove: () => update({ mangaType: '' }), key: 'type' })
  if (filters.status) activeChips.push({ label: STATUS_MAP[filters.status] || filters.status, onRemove: () => update({ status: '' }), key: 'status' })
  if (filters.ageRating.some((v,i)=>v!==DEFAULTS.ageRating[i])) activeChips.push({ label: `${filters.ageRating[0]}+–${filters.ageRating[1]}+`, onRemove: () => update({ ageRating: DEFAULTS.ageRating }), key: 'age' })
  if (filters.rating.some((v,i)=>v!==DEFAULTS.rating[i])) activeChips.push({ label: `${filters.rating[0]}–${filters.rating[1]}`, onRemove: () => update({ rating: DEFAULTS.rating }), key: 'rating' })
  if (filters.releaseYear.some((v,i)=>v!==DEFAULTS.releaseYear[i])) activeChips.push({ label: `${filters.releaseYear[0]}–${filters.releaseYear[1]}`, onRemove: () => update({ releaseYear: DEFAULTS.releaseYear }), key: 'year' })
  if (filters.chapterRange.some((v,i)=>v!==DEFAULTS.chapterRange[i])) activeChips.push({ label: `${filters.chapterRange[0]}–${filters.chapterRange[1]} гл.`, onRemove: () => update({ chapterRange: DEFAULTS.chapterRange }), key: 'chapters' })

  const isMobile = appearance === 'mobile'
  const rowAppearance: 'desktop' | 'mobile' = isMobile ? 'mobile' : 'desktop'

  return (
    <div
      className={cn(
        'flex flex-col h-full max-h-full overflow-hidden text-white',
        isMobile
          ? 'w-full rounded-none bg-transparent shadow-none'
          : 'w-80 bg-transparent shadow-none',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'sticky top-0 z-30 px-5 py-4 bg-transparent'
        )}
      >
        <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
          <Filter className="h-4 w-4 text-primary/80" />
          <span>Фильтр</span>
          {!isMobile && activeChips.length > 0 && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary/85 leading-none">
              {activeChips.length}
            </span>
          )}
        </div>
        {!isMobile && (
          <div className="mt-3 text-[12px] text-white/45 leading-snug">
            Фильтры применяются в строгом режиме совпадений.
          </div>
        )}
      </div>

      {/* Active chips bar (mobile emphasis) */}
      {/* Mobile secondary actions & helper text */}
      {isMobile && (
        <div className="px-5 pt-3 text-[12px] text-white/45 leading-snug">
          Фильтры применяются в строгом режиме совпадений.
        </div>
      )}
      {isMobile && activeChips.length === 0 && (
        <div className="px-5 mt-2 text-[12px] text-white/45 leading-snug">
          Выберите параметры ниже. Жанры и теги имеют встроенный поиск внутри секций.
        </div>
      )}

      {activeChips.length > 0 && (
        <div
          className={cn(
            'px-5 pt-3 pb-3 flex flex-wrap gap-2',
            isMobile ? 'mt-3' : ''
          )}
        >
          {activeChips.map(c => (
            <button
              key={c.key}
              onClick={c.onRemove}
              aria-label={`Удалить фильтр ${c.label}`}
              className="group flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-[11px] font-medium text-primary/85 shadow-[0_10px_24px_-14px_rgba(37,99,235,0.6)] transition hover:bg-primary/25"
            >
              <span className="leading-none">{c.label}</span>
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/30 text-primary/95 group-hover:bg-primary/45 group-hover:text-white">
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className={cn('flex-1 overflow-y-auto px-0 scrollbar-custom', isMobile ? 'space-y-2 pt-2 pb-24' : 'space-y-2 pb-4')}>
        <FilterRow
          id="row-genres"
          title="Жанры"
          summary={rowSummary.genres}
          isOpen={openRow==='genres'}
          onToggle={()=>setOpenRow(openRow==='genres'?null:'genres')}
          active={filters.selectedGenres.length>0}
          appearance={rowAppearance}
        >
          {isLoadingGenres ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>
          ) : genresError ? <div className="text-xs text-red-400 py-2">{genresError}</div> : (
            <div className="space-y-3">
              <Input value={genreSearch} onChange={e=>setGenreSearch(e.target.value)} placeholder="Поиск жанров" className="h-8 text-xs rounded-lg border border-white/10 bg-[#151f30] text-white/80 placeholder:text-white/40 focus:border-primary/40 focus:bg-[#1d283c]" />
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-custom">
                {filteredGenres.map(g => (
                  <button
                    key={g.id}
                    onClick={()=>toggleGenre(g.name)}
                    className={cn(
                      'text-[11px] px-2.5 py-1.5 rounded-lg transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                      filters.selectedGenres.includes(g.name)
                        ? 'bg-primary/45 text-white shadow-[0_10px_28px_-18px_rgba(37,99,235,0.72)] hover:bg-primary/55'
                        : 'bg-[#1d2635] text-white/80 hover:text-white hover:bg-[#263248]'
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              {filters.selectedGenres.length>0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.selectedGenres.map(g => (
                    <Badge key={g} className="bg-primary/25 text-primary hover:bg-primary/35 cursor-pointer" onClick={()=>toggleGenre(g)}>{g}<X className="h-3 w-3 ml-1" /></Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </FilterRow>

        <FilterRow
          id="row-tags"
          title="Теги"
          summary={rowSummary.tags}
          isOpen={openRow==='tags'}
          onToggle={()=>setOpenRow(openRow==='tags'?null:'tags')}
          active={filters.selectedTags.length>0}
          appearance={rowAppearance}
        >
          {isLoadingTags ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>
          ) : tagsError ? <div className="text-xs text-red-400 py-2">{tagsError}</div> : (
            <div className="space-y-3">
              <Input value={tagSearch} onChange={e=>setTagSearch(e.target.value)} placeholder="Поиск тегов" className="h-8 text-xs rounded-lg border border-white/10 bg-[#151f30] text-white/80 placeholder:text-white/40 focus:border-primary/40 focus:bg-[#1d283c]" />
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-custom">
                {filteredTags.map(t => (
                  <button
                    key={t.id}
                    onClick={()=>toggleTag(t.name)}
                    style={{ color: t.color }}
                    className={cn(
                      'text-[11px] px-2.5 py-1.5 rounded-lg transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                      filters.selectedTags.includes(t.name)
                        ? 'bg-white/25 text-[#f4f7ff] shadow-[0_10px_26px_-18px_rgba(255,255,255,0.55)] hover:bg-white/30'
                        : 'bg-[#1d2635] text-white/80 hover:text-white hover:bg-[#263248]'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {filters.selectedTags.length>0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.selectedTags.map(t => (
                    <Badge key={t} className="bg-white/25 text-white hover:bg-white/35 cursor-pointer" onClick={()=>toggleTag(t)}>{t}<X className="h-3 w-3 ml-1" /></Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </FilterRow>

        <FilterRow
          id="row-type"
          title="Тип"
          summary={rowSummary.type}
          isOpen={openRow==='type'}
          onToggle={()=>setOpenRow(openRow==='type'?null:'type')}
          active={!!filters.mangaType}
          appearance={rowAppearance}
        >
          {checkboxList([
            {value:'MANGA',label:'Манга'},{value:'MANHWA',label:'Манхва'},{value:'MANHUA',label:'Маньхуа'},{value:'WESTERN_COMIC',label:'Западный комикс'},{value:'RUSSIAN_COMIC',label:'Русский комикс'},{value:'OEL',label:'OEL'},{value:'OTHER',label:'Другое'}
          ] as const, filters.mangaType, 'mangaType')}
        </FilterRow>

        <FilterRow
          id="row-status"
          title="Статус"
          summary={rowSummary.status}
          isOpen={openRow==='status'}
          onToggle={()=>setOpenRow(openRow==='status'?null:'status')}
          active={!!filters.status}
          appearance={rowAppearance}
        >
          {checkboxList([
            {value:'ONGOING',label:'Выходит'},{value:'COMPLETED',label:'Завершена'},{value:'HIATUS',label:'Пауза'},{value:'CANCELLED',label:'Отменена'}
          ] as const, filters.status, 'status')}
        </FilterRow>

        <FilterRow
          id="row-age"
          title="Возрастной рейтинг"
          summary={rowSummary.age}
          isOpen={openRow==='age'}
          onToggle={()=>setOpenRow(openRow==='age'?null:'age')}
          active={filters.ageRating.some((v,i)=>v!==DEFAULTS.ageRating[i])}
          appearance={rowAppearance}
        >
          {numberRange('ageRating',0,21,1,'+')}
        </FilterRow>

        <FilterRow
          id="row-rating"
          title="Рейтинг"
          summary={rowSummary.rating}
          isOpen={openRow==='rating'}
          onToggle={()=>setOpenRow(openRow==='rating'?null:'rating')}
          active={filters.rating.some((v,i)=>v!==DEFAULTS.rating[i])}
          appearance={rowAppearance}
        >
          {numberRange('rating',0,10,1)}
        </FilterRow>

        <FilterRow
          id="row-year"
          title="Год релиза"
          summary={rowSummary.year}
          isOpen={openRow==='year'}
          onToggle={()=>setOpenRow(openRow==='year'?null:'year')}
          active={filters.releaseYear.some((v,i)=>v!==DEFAULTS.releaseYear[i])}
          appearance={rowAppearance}
        >
          {numberRange('releaseYear',1990,new Date().getFullYear(),1)}
        </FilterRow>

        <FilterRow
          id="row-chapters"
          title="Количество глав"
          summary={rowSummary.chapters}
          isOpen={openRow==='chapters'}
          onToggle={()=>setOpenRow(openRow==='chapters'?null:'chapters')}
          active={filters.chapterRange.some((v,i)=>v!==DEFAULTS.chapterRange[i])}
          appearance={rowAppearance}
        >
          {numberRange('chapterRange',0,1000,1,'гл.')}
        </FilterRow>
      </div>

      {onApply && (
        <div
          className={cn(
            'mt-auto flex w-full items-center gap-3 px-5 py-4',
            isMobile
              ? 'sticky bottom-0 bg-[#0b0d10]/90 backdrop-blur-2xl shadow-[0_-2px_12px_-3px_rgba(0,0,0,0.6)] sm:hidden'
              : 'border-t border-white/5'
          )}
        >
          <Button
            type="button"
            onClick={onApply}
            className={cn(
              'h-11 w-full rounded-xl bg-primary/80 text-[13px] font-semibold uppercase tracking-wide text-white shadow-[0_14px_28px_-16px_rgba(37,99,235,0.75)] transition hover:bg-primary'
            )}
          >
            Применить
          </Button>
        </div>
      )}
    </div>
  )
}

export default MangaFilterPanel
