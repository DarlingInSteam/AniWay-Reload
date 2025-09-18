import React, { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, X, RotateCcw, Loader2 } from 'lucide-react'
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
}

interface MangaFilterPanelProps {
  initialFilters?: FilterState
  onFiltersChange: (filters: FilterState) => void
  onReset: () => void
  onApply?: () => void
  className?: string
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
  chapterRange: [0,1000]
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
const FilterRow: React.FC<RowProps> = ({ id, title, summary, isOpen, onToggle, children }) => (
  <div className="border-b border-white/10" aria-expanded={isOpen} aria-controls={id}> 
    <button onClick={onToggle} className={cn('w-full flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-white/5 transition-colors')}>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-white leading-none mb-1">{title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{summary}</div>
      </div>
      <div className={cn('text-muted-foreground transition-transform', isOpen ? 'rotate-90' : '')}>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
    {isOpen && (
      <div id={id} className="px-2 pb-4 animate-fade-in">
        {children}
      </div>
    )}
  </div>
)

export const MangaFilterPanel: React.FC<MangaFilterPanelProps> = ({
  initialFilters,
  onFiltersChange,
  onReset,
  onApply,
  className
}) => {
  const { genres, tags, isLoadingGenres, isLoadingTags, genresError, tagsError } = useFilterData()
  const [filters, setFilters] = useState<FilterState>(initialFilters || DEFAULTS)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [genreSearch, setGenreSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')

  // Синхронизация входных фильтров
  useEffect(() => { if (initialFilters) setFilters(initialFilters) }, [initialFilters])

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

  return (
    <div className={cn('w-80 glass-panel overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-sm font-semibold text-white">Фильтры</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 px-2 text-muted-foreground hover:text-white hover:bg-white/10"><RotateCcw className="h-4 w-4" /></Button>
          {onApply && <Button size="sm" onClick={onApply} className="h-8 px-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs">Применить</Button>}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/10">
        <FilterRow id="row-genres" title="Жанры" summary={rowSummary.genres} isOpen={openRow==='genres'} onToggle={()=>setOpenRow(openRow==='genres'?null:'genres')}>
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

        <FilterRow id="row-tags" title="Теги" summary={rowSummary.tags} isOpen={openRow==='tags'} onToggle={()=>setOpenRow(openRow==='tags'?null:'tags')}>
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

        <FilterRow id="row-type" title="Тип" summary={rowSummary.type} isOpen={openRow==='type'} onToggle={()=>setOpenRow(openRow==='type'?null:'type')}>
          {checkboxList([
            {value:'MANGA',label:'Манга'},{value:'MANHWA',label:'Манхва'},{value:'MANHUA',label:'Маньхуа'},{value:'WESTERN_COMIC',label:'Западный комикс'},{value:'RUSSIAN_COMIC',label:'Русский комикс'},{value:'OEL',label:'OEL'},{value:'OTHER',label:'Другое'}
          ] as const, filters.mangaType, 'mangaType')}
        </FilterRow>

        <FilterRow id="row-status" title="Статус" summary={rowSummary.status} isOpen={openRow==='status'} onToggle={()=>setOpenRow(openRow==='status'?null:'status')}>
          {checkboxList([
            {value:'ONGOING',label:'Выходит'},{value:'COMPLETED',label:'Завершена'},{value:'HIATUS',label:'Пауза'},{value:'CANCELLED',label:'Отменена'}
          ] as const, filters.status, 'status')}
        </FilterRow>

        <FilterRow id="row-age" title="Возрастной рейтинг" summary={rowSummary.age} isOpen={openRow==='age'} onToggle={()=>setOpenRow(openRow==='age'?null:'age')}>
          {numberRange('ageRating',0,21,1,'+')}
        </FilterRow>

        <FilterRow id="row-rating" title="Рейтинг" summary={rowSummary.rating} isOpen={openRow==='rating'} onToggle={()=>setOpenRow(openRow==='rating'?null:'rating')}>
          {numberRange('rating',0,10,1)}
        </FilterRow>

        <FilterRow id="row-year" title="Год релиза" summary={rowSummary.year} isOpen={openRow==='year'} onToggle={()=>setOpenRow(openRow==='year'?null:'year')}>
          {numberRange('releaseYear',1990,new Date().getFullYear(),1)}
        </FilterRow>

        <FilterRow id="row-chapters" title="Количество глав" summary={rowSummary.chapters} isOpen={openRow==='chapters'} onToggle={()=>setOpenRow(openRow==='chapters'?null:'chapters')}>
          {numberRange('chapterRange',0,1000,1,'гл.')}
        </FilterRow>
      </div>

      <div className="px-4 py-3 flex gap-2 border-t border-white/10">
        <Button variant="outline" onClick={resetAll} className="flex-1 h-9 bg-white/5 border-white/15 text-muted-foreground hover:bg-white/10 hover:text-white">Сбросить</Button>
        {onApply && <Button onClick={onApply} className="flex-1 h-9 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">Применить</Button>}
      </div>
    </div>
  )
}

export default MangaFilterPanel
