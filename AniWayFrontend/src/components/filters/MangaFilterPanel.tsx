import React, { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, X, RotateCcw, Loader2, Filter, HelpCircle } from 'lucide-react'
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
  strictMatch: false
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
const FilterRow: React.FC<RowProps & { active?: boolean }> = ({ id, title, summary, isOpen, onToggle, children, active }) => (
  <div
    className="border-b border-white/10 mobile-filter:rounded-[14px] mobile-filter:border mobile-filter:border-white/10 mobile-filter:bg-gradient-to-br mobile-filter:from-white/4 mobile-filter:to-white/2 mobile-filter:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_4px_12px_-2px_rgba(0,0,0,0.4)] mobile-filter:overflow-hidden mobile-filter:backdrop-blur-sm"
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
        'w-full flex items-center gap-3 py-3 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors',
        'mobile-filter:px-4 mobile-filter:py-3.5',
        isOpen ? 'bg-white/5 mobile-filter:bg-white/10' : 'hover:bg-white/5 mobile-filter:hover:bg-white/10'
      )}
    >
      <div className="flex-1 text-left">
        <div className="text-[13px] font-semibold text-white leading-none mb-1 tracking-tight flex items-center gap-1.5">
          {title}
          {active && (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" aria-hidden />
          )}
        </div>
        <div className="text-[11px] text-muted-foreground/80 line-clamp-1 font-normal">{summary}</div>
      </div>
      <div className={cn('text-muted-foreground transition-transform shrink-0', isOpen ? 'rotate-90' : '')}>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
    <div
      id={`${id}-content`}
      hidden={!isOpen}
      className="px-2 pb-4 animate-fade-in mobile-filter:px-4 mobile-filter:pb-4 mobile-filter:pt-1"
    >
      {isOpen && children}
    </div>
  </div>
)

export const MangaFilterPanel: React.FC<MangaFilterPanelProps> = ({
  initialFilters,
  onFiltersChange,
  onReset,
  onApply,
  className,
  appearance = 'desktop'
}) => {
  const { genres, tags, isLoadingGenres, isLoadingTags, genresError, tagsError } = useFilterData()
  const [filters, setFilters] = useState<FilterState>(initialFilters ? { ...DEFAULTS, ...initialFilters } : DEFAULTS)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [genreSearch, setGenreSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')

  // Синхронизация входных фильтров
  useEffect(() => { if (initialFilters) setFilters(prev => ({ ...prev, ...initialFilters })) }, [initialFilters])

  const update = (partial: Partial<FilterState>) => {
    const next = { ...filters, ...partial }
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
      className={cn('text-xs px-2 py-1 rounded-md border transition-colors',
        active ? 'bg-primary/20 text-primary border-primary/40' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white')}
    >{text}</button>
  )

  const checkboxList = <T extends string>(items: readonly {value:T,label:string}[], value: string, field: keyof FilterState) => (
    <div className="flex flex-wrap gap-2">
      {items.map(it => chip(it.label, () => update({ [field]: value === it.value ? '' : it.value } as any), value === it.value))}
    </div>
  )

  const numberRange = (field: keyof Pick<FilterState,'ageRating'|'rating'|'releaseYear'|'chapterRange'>, min: number, max: number, step=1, suffix='') => {
    const val = filters[field]
    return (
      <div className="flex items-center gap-2">
        <Input type="number" value={val[0]} min={min} max={val[1]} step={step} onChange={e=>handleNumberRange(field,0,e.target.value)} className="h-8 w-20 bg-white/5 border-white/10 text-xs" />
        <span className="text-muted-foreground text-xs">—</span>
        <Input type="number" value={val[1]} min={val[0]} max={max} step={step} onChange={e=>handleNumberRange(field,1,e.target.value)} className="h-8 w-20 bg-white/5 border-white/10 text-xs" />
        {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
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

  return (
    <div className={cn(
      'flex flex-col h-full max-h-full',
      isMobile
        ? 'w-full rounded-none bg-[#0b0d10] text-white bg-[radial-gradient(circle_at_20%_0%,rgba(40,70,120,0.25),transparent_60%),radial-gradient(circle_at_80%_20%,rgba(120,60,160,0.18),transparent_55%)]'
        : 'w-80 glass-panel overflow-hidden rounded-xl bg-background/40'
    , className)}>
      {/* Header */}
      <div
        className={cn(
          'sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-xl',
          isMobile ? 'bg-[#0b0d10]/85' : 'bg-transparent backdrop-blur-none'
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Filter className="h-4 w-4 text-primary" /> Фильтры
          {activeChips.length > 0 && (
            <span className="text-[11px] font-medium text-primary/70 bg-primary/10 rounded-full px-2 py-0.5 leading-none">
              {activeChips.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-8 px-2 text-muted-foreground hover:text-white hover:bg-white/10"
            aria-label="Сбросить все фильтры"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {/* Desktop strict toggle (compact, tooltip on hover) */}
          {!isMobile && (
            <div className="relative group">
              <button
                type="button"
                onClick={() => update({ strictMatch: !filters.strictMatch })}
                className={cn(
                  'h-8 px-2.5 rounded-md border text-[11px] font-medium tracking-tight transition flex items-center gap-1',
                  filters.strictMatch
                    ? 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10'
                )}
                aria-pressed={filters.strictMatch ? 'true' : 'false'}
                aria-describedby="strict-tooltip"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-current" />
                Строго
              </button>
              <div
                id="strict-tooltip"
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-0 mt-2 w-56 rounded-md border border-white/15 bg-[#111418] p-2.5 shadow-lg text-[11px] leading-snug text-muted-foreground z-50"
              >
                Показать только тайтлы, у которых есть все выбранные жанры и теги (И). Выключено — любое совпадение (ИЛИ).
                <div className="absolute -top-2 left-4 h-2 w-2 rotate-45 bg-[#111418] border-l border-t border-white/15" />
              </div>
            </div>
          )}
          {onApply && !isMobile && (
            <Button
              size="sm"
              onClick={onApply}
              className="h-8 px-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs"
            >
              Применить
            </Button>
          )}
        </div>
      </div>

      {/* Active chips bar (mobile emphasis) */}
      {/* Mobile secondary actions & search */}
      {isMobile && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 px-3 text-[11px] bg-white/5 border-white/15 text-muted-foreground cursor-not-allowed"
          >
            Сохранить пресет
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-8 px-3 text-[11px] text-muted-foreground hover:text-white hover:bg-white/10"
          >
            Сбросить
          </Button>
          <button
            type="button"
            onClick={() => update({ strictMatch: !filters.strictMatch })}
            className={cn(
              'h-8 px-3 text-[11px] rounded-md border transition flex items-center gap-1',
              filters.strictMatch
                ? 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
                : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10'
            )}
            aria-pressed={filters.strictMatch ? 'true' : 'false'}
            aria-label="Строгое совпадение жанров и тегов"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-current opacity-80" />
            Строго
          </button>
        </div>
      )}
      {isMobile && activeChips.length === 0 && (
        <div className="px-4 mt-2 text-[11px] text-muted-foreground/70 leading-snug">
          Выберите параметры ниже. Жанры и теги имеют встроенный поиск внутри секций.
        </div>
      )}

      {activeChips.length > 0 && (
        <div
          className={cn(
            'px-4 pt-3 pb-2 overflow-x-auto scrollbar-thin flex gap-2 flex-wrap',
            isMobile && 'bg-transparent mt-1'
          )}
        >
          {activeChips.map(c => (
            <button
              key={c.key}
              onClick={c.onRemove}
              aria-label={`Удалить фильтр ${c.label}`}
              className="group flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[11px] bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 hover:border-primary/40 transition"
            >
              <span className="font-medium leading-none">{c.label}</span>
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/25 group-hover:bg-primary/35">
                <X className="h-3 w-3" />
              </span>
            </button>
          ))}
          {filters.strictMatch && (
            <span className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[11px] bg-amber-400/20 text-amber-300 border border-amber-300/30">
              AND
              <button
                onClick={() => update({ strictMatch: false })}
                aria-label="Выключить строгий режим"
                className="flex items-center justify-center h-4 w-4 rounded-full bg-amber-400/25 hover:bg-amber-400/40 transition"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetAll}
            className="text-[11px] px-2 py-1 rounded-full bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/10"
            aria-label="Очистить все фильтры"
          >
            Очистить
          </button>
        </div>
      )}

      {/* Scrollable content */}
  <div className={cn('flex-1 overflow-y-auto px-0 scrollbar-custom', isMobile ? 'space-y-2 pt-2 pb-24' : 'divide-y divide-white/10 pb-4')}>        
        <FilterRow id="row-genres" title="Жанры" summary={rowSummary.genres} isOpen={openRow==='genres'} onToggle={()=>setOpenRow(openRow==='genres'?null:'genres')} active={filters.selectedGenres.length>0}>
          {isLoadingGenres ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>
          ) : genresError ? <div className="text-xs text-red-400 py-2">{genresError}</div> : (
            <div className="space-y-3">
              <Input value={genreSearch} onChange={e=>setGenreSearch(e.target.value)} placeholder="Поиск жанров" className="h-8 text-xs bg-white/5 border-white/10" />
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-custom">
                {filteredGenres.map(g => (
                  <button key={g.id} onClick={()=>toggleGenre(g.name)} className={cn('text-[11px] px-2 py-1 rounded-md border transition',
                    filters.selectedGenres.includes(g.name)?'bg-primary/25 text-primary border-primary/40':'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white')}>{g.name}</button>
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

  <FilterRow id="row-tags" title="Теги" summary={rowSummary.tags} isOpen={openRow==='tags'} onToggle={()=>setOpenRow(openRow==='tags'?null:'tags')} active={filters.selectedTags.length>0}>
          {isLoadingTags ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>
          ) : tagsError ? <div className="text-xs text-red-400 py-2">{tagsError}</div> : (
            <div className="space-y-3">
              <Input value={tagSearch} onChange={e=>setTagSearch(e.target.value)} placeholder="Поиск тегов" className="h-8 text-xs bg-white/5 border-white/10" />
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto scrollbar-custom">
                {filteredTags.map(t => (
                  <button key={t.id} onClick={()=>toggleTag(t.name)} style={{borderColor: t.color+'55', color: t.color }} className={cn('text-[11px] px-2 py-1 rounded-md border transition',
                    filters.selectedTags.includes(t.name)?'bg-white/20':'bg-white/5 hover:bg-white/10')}>{t.name}</button>
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

  <FilterRow id="row-type" title="Тип" summary={rowSummary.type} isOpen={openRow==='type'} onToggle={()=>setOpenRow(openRow==='type'?null:'type')} active={!!filters.mangaType}>
          {checkboxList([
            {value:'MANGA',label:'Манга'},{value:'MANHWA',label:'Манхва'},{value:'MANHUA',label:'Маньхуа'},{value:'WESTERN_COMIC',label:'Западный комикс'},{value:'RUSSIAN_COMIC',label:'Русский комикс'},{value:'OEL',label:'OEL'},{value:'OTHER',label:'Другое'}
          ] as const, filters.mangaType, 'mangaType')}
        </FilterRow>

  <FilterRow id="row-status" title="Статус" summary={rowSummary.status} isOpen={openRow==='status'} onToggle={()=>setOpenRow(openRow==='status'?null:'status')} active={!!filters.status}>
          {checkboxList([
            {value:'ONGOING',label:'Выходит'},{value:'COMPLETED',label:'Завершена'},{value:'HIATUS',label:'Пауза'},{value:'CANCELLED',label:'Отменена'}
          ] as const, filters.status, 'status')}
        </FilterRow>

  <FilterRow id="row-age" title="Возрастной рейтинг" summary={rowSummary.age} isOpen={openRow==='age'} onToggle={()=>setOpenRow(openRow==='age'?null:'age')} active={filters.ageRating.some((v,i)=>v!==DEFAULTS.ageRating[i])}>
          {numberRange('ageRating',0,21,1,'+')}
        </FilterRow>

  <FilterRow id="row-rating" title="Рейтинг" summary={rowSummary.rating} isOpen={openRow==='rating'} onToggle={()=>setOpenRow(openRow==='rating'?null:'rating')} active={filters.rating.some((v,i)=>v!==DEFAULTS.rating[i])}>
          {numberRange('rating',0,10,1)}
        </FilterRow>

  <FilterRow id="row-year" title="Год релиза" summary={rowSummary.year} isOpen={openRow==='year'} onToggle={()=>setOpenRow(openRow==='year'?null:'year')} active={filters.releaseYear.some((v,i)=>v!==DEFAULTS.releaseYear[i])}>
          {numberRange('releaseYear',1990,new Date().getFullYear(),1)}
        </FilterRow>

  <FilterRow id="row-chapters" title="Количество глав" summary={rowSummary.chapters} isOpen={openRow==='chapters'} onToggle={()=>setOpenRow(openRow==='chapters'?null:'chapters')} active={filters.chapterRange.some((v,i)=>v!==DEFAULTS.chapterRange[i])}>
          {numberRange('chapterRange',0,1000,1,'гл.')}
        </FilterRow>
      </div>

      {/* Sticky bottom bar (mobile) */}
      {isMobile && (
        <div className="sticky bottom-0 mt-auto bg-[#0b0d10]/90 backdrop-blur-2xl border-t border-white/10 px-4 py-3 flex gap-3 sm:hidden shadow-[0_-2px_12px_-3px_rgba(0,0,0,0.6)]">
          <Button
            variant="outline"
            onClick={resetAll}
            className="flex-1 h-11 bg-white/5 border-white/15 text-[13px] text-muted-foreground hover:bg-white/10 hover:text-white"
            aria-label="Сбросить фильтры"
          >
            Сброс
          </Button>
          <button
            type="button"
            onClick={() => update({ strictMatch: !filters.strictMatch })}
            className={cn(
              'h-11 px-3 rounded-lg border flex items-center gap-2 text-[12px] font-medium',
              filters.strictMatch
                ? 'bg-primary/25 border-primary/40 text-primary hover:bg-primary/35'
                : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10'
            )}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-current bg-current/70" />
            Строго
          </button>
          {onApply && (
            <Button
              onClick={onApply}
              className="flex-1 h-11 bg-primary/70 text-[13px] text-white font-semibold hover:bg-primary/80 shadow-lg shadow-primary/30"
              aria-label="Применить фильтры"
            >
              Применить
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default MangaFilterPanel
