import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, X, RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFilterData } from '@/hooks/useFilterData'
import { Genre, Tag } from '@/services/filterDataService'

// Константы для фильтров
const MANGA_STATUSES = [
  { value: 'ONGOING', label: 'Выходит' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'HIATUS', label: 'На паузе' },
  { value: 'CANCELLED', label: 'Отменена' }
]

const MANGA_TYPES = [
  { value: 'MANGA', label: 'Манга' },
  { value: 'MANHWA', label: 'Манхва' },
  { value: 'MANHUA', label: 'Маньхуа' },
  { value: 'WESTERN_COMIC', label: 'Западный комикс' },
  { value: 'RUSSIAN_COMIC', label: 'Русский комикс' },
  { value: 'OEL', label: 'OEL' },
  { value: 'OTHER', label: 'Другое' }
]

// Заглушки для жанров и тегов (будут заменены на данные с бэкенда)
const PLACEHOLDER_GENRES = [
  'Экшен', 'Приключения', 'Комедия', 'Драма', 'Фэнтези', 'Ужасы', 
  'Повседневность', 'Романтика', 'Научная фантастика', 'Спорт',
  'Триллер', 'Мистика', 'Исторический', 'Военный', 'Психология'
]

const PLACEHOLDER_TAGS = [
  'Сильный протагонист', 'Магия', 'Школа', 'Демоны', 'Эльфы',
  'Боевые искусства', 'Система', 'Реинкарнация', 'Игровой мир',
  'Академия', 'Гильдии', 'Монстры', 'Рыцари', 'Королевство'
]

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

interface MangaFilterSidebarProps {
  className?: string
  initialFilters?: FilterState
  onFiltersChange: (filters: FilterState) => void
  onReset: () => void
  onApply?: () => void // Добавляем функцию применения фильтров
}

// Разделитель в стиле каталога
const Separator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("h-px bg-white/10", className)} />
)

// Простой компонент аккордеона
const FilterSection: React.FC<{
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}> = React.memo(({ title, isOpen, onToggle, children }) => (
  <div className="space-y-4">
    <Button
      variant="ghost"
      onClick={onToggle}
      className="w-full justify-between p-0 h-auto font-semibold text-white hover:text-primary hover:bg-transparent group transition-all duration-200"
    >
      <span className="text-base group-hover:translate-x-1 transition-transform duration-200">{title}</span>
      <div className={cn(
        "transition-transform duration-200",
        isOpen ? "rotate-180" : "rotate-0"
      )}>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
    </Button>
    <div className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
    )}>
      <div className="mt-4">{children}</div>
    </div>
  </div>
))

// Компонент мультиселекта для жанров
const GenreMultiSelectFilter: React.FC<{
  genres: Genre[]
  selectedItems: string[]
  onSelectionChange: (items: string[]) => void
  placeholder: string
}> = ({ genres, selectedItems, onSelectionChange, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Защита от невалидных массивов
  const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];
  const safeGenres = Array.isArray(genres) ? genres : [];
  
  const filteredGenres = safeGenres.filter(genre =>
    genre.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleItem = (genreName: string) => {
    if (safeSelectedItems.includes(genreName)) {
      onSelectionChange(safeSelectedItems.filter(i => i !== genreName))
    } else {
      onSelectionChange([...safeSelectedItems, genreName])
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9 text-sm bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50 transition-colors duration-200"
      />
      
      {safeSelectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {safeSelectedItems.map(item => (
            <Badge
              key={item}
              variant="secondary"
              className="text-xs bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => toggleItem(item)}
            >
              {item}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
      
      <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-custom">
        {filteredGenres.map(genre => (
          <Button
            key={genre.id}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-between h-8 text-xs px-2 transition-all duration-200 rounded-lg",
              safeSelectedItems.includes(genre.name)
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            )}
            onClick={() => toggleItem(genre.name)}
          >
            <span className="truncate">{genre.name}</span>
            <span className="text-[10px] text-gray-500 ml-2">
              {genre.mangaCount}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// Компонент мультиселекта для тегов
const TagMultiSelectFilter: React.FC<{
  tags: Tag[]
  selectedItems: string[]
  onSelectionChange: (items: string[]) => void
  placeholder: string
}> = ({ tags, selectedItems, onSelectionChange, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Защита от невалидных массивов
  const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];
  const safeTags = Array.isArray(tags) ? tags : [];
  
  const filteredTags = safeTags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleItem = (tagName: string) => {
    if (safeSelectedItems.includes(tagName)) {
      onSelectionChange(safeSelectedItems.filter(i => i !== tagName))
    } else {
      onSelectionChange([...safeSelectedItems, tagName])
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9 text-sm bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50 transition-colors duration-200"
      />
      
      {safeSelectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {safeSelectedItems.map(item => {
            const tag = safeTags.find(t => t.name === item)
            return (
              <Badge
                key={item}
                variant="secondary"
                className="text-xs hover:bg-opacity-80 cursor-pointer transition-all duration-200 hover:scale-105"
                style={{ 
                  backgroundColor: tag?.color + '20', 
                  color: tag?.color,
                  borderColor: tag?.color + '40'
                }}
                onClick={() => toggleItem(item)}
              >
                {item}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )
          })}
        </div>
      )}
      
      <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-custom">
        {filteredTags.map(tag => (
          <Button
            key={tag.id}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-between h-8 text-xs px-2 transition-all duration-200 rounded-lg",
              safeSelectedItems.includes(tag.name)
                ? "bg-white/20 text-white hover:bg-white/30"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            )}
            onClick={() => toggleItem(tag.name)}
          >
            <div className="flex items-center">
              <div 
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: tag.color }}
              />
              <span className="truncate">{tag.name}</span>
            </div>
            <span className="text-[10px] text-gray-500 ml-2">
              {tag.mangaCount}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// Оригинальный компонент мультиселекта (для обратной совместимости)
const MultiSelectFilter: React.FC<{
  items: string[]
  selectedItems: string[]
  onSelectionChange: (items: string[]) => void
  placeholder: string
}> = ({ items, selectedItems, onSelectionChange, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Защита от невалидных массивов
  const safeSelectedItems = Array.isArray(selectedItems) ? selectedItems : [];
  const safeItems = Array.isArray(items) ? items : [];
  
  const filteredItems = safeItems.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleItem = (item: string) => {
    if (safeSelectedItems.includes(item)) {
      onSelectionChange(safeSelectedItems.filter(i => i !== item))
    } else {
      onSelectionChange([...safeSelectedItems, item])
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-9 text-sm bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50 transition-colors duration-200"
      />
      
      {safeSelectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {safeSelectedItems.map(item => (
            <Badge
              key={item}
              variant="secondary"
              className="text-xs bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={() => toggleItem(item)}
            >
              {item}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
      
      <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-hide">
        {filteredItems.slice(0, 10).map(item => (
          <Button
            key={item}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start h-8 text-xs px-2 transition-all duration-200 rounded-lg",
              safeSelectedItems.includes(item)
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5 hover:translate-x-1"
            )}
            onClick={() => toggleItem(item)}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors duration-200",
                selectedItems.includes(item) ? "bg-primary" : "bg-muted-foreground/30"
              )} />
              {item}
            </div>
          </Button>
        ))}
        {filteredItems.length > 10 && (
          <div className="text-xs text-muted-foreground px-2 py-1 italic">
            +{filteredItems.length - 10} ещё...
          </div>
        )}
      </div>
    </div>
  )
}

// Простой слайдер диапазона
const RangeSlider: React.FC<{
  label: string
  value: [number, number]
  min: number
  max: number
  step?: number
  onValueChange: (value: [number, number]) => void
  suffix?: string
}> = ({ label, value, min, max, step = 1, onValueChange, suffix = '' }) => {
  // Защита от невалидного value
  const safeValue = Array.isArray(value) && value.length >= 2 ? value : [min, max];
  
  const handleMinChange = (val: string) => {
    const newMin = Math.max(min, Math.min(parseInt(val) || min, safeValue[1]))
    onValueChange([newMin, safeValue[1]])
  }

  const handleMaxChange = (val: string) => {
    const newMax = Math.min(max, Math.max(parseInt(val) || max, safeValue[0]))
    onValueChange([safeValue[0], newMax])
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-white flex items-center gap-2">
        <div className="w-1 h-1 bg-primary rounded-full"></div>
        {label}
      </Label>
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <Input
              type="number"
              value={safeValue[0]}
              onChange={(e) => handleMinChange(e.target.value)}
              min={min}
              max={safeValue[1]}
              className="h-9 text-xs bg-white/5 backdrop-blur-sm border-white/10 text-white focus:border-primary/50 transition-colors duration-200"
              placeholder="Мин"
            />
          </div>
          <div className="text-muted-foreground text-sm font-mono">—</div>
          <div className="flex-1">
            <Input
              type="number"
              value={safeValue[1]}
              onChange={(e) => handleMaxChange(e.target.value)}
              min={safeValue[0]}
              max={max}
              className="h-9 text-xs bg-white/5 backdrop-blur-sm border-white/10 text-white focus:border-primary/50 transition-colors duration-200"
              placeholder="Макс"
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="bg-white/5 px-2 py-1 rounded">{min}{suffix}</span>
          <span className="bg-white/5 px-2 py-1 rounded">{max}{suffix}</span>
        </div>
      </div>
    </div>
  )
}

export const MangaFilterSidebar: React.FC<MangaFilterSidebarProps> = ({
  className,
  initialFilters,
  onFiltersChange,
  onReset,
  onApply
}) => {
  // Загрузка данных фильтров с бэкенда
  const { 
    genres, 
    tags, 
    isLoadingGenres, 
    isLoadingTags, 
    genresError, 
    tagsError 
  } = useFilterData()

  // Инициализируем фильтры с переданными значениями или дефолтными
  const [filters, setFilters] = useState<FilterState>(() => 
    initialFilters || {
      selectedGenres: [],
      selectedTags: [],
      mangaType: '',
      status: '',
      ageRating: [0, 21],
      rating: [0, 10],
      releaseYear: [1990, new Date().getFullYear()],
      chapterRange: [0, 1000]
    }
  )

  // Обновляем локальные фильтры когда приходят новые initialFilters
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  // Функция для получения сохраненного состояния секций
  const getSavedOpenSections = () => {
    try {
      const saved = localStorage.getItem('manga-filter-sections')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn('Failed to load saved filter sections:', error)
    }
    // Возвращаем дефолтное состояние
    return {
      genres: true,
      types: true,
      tags: false,
      status: true,
      ageRating: false,
      rating: false,
      releaseYear: false,
      chapters: false
    }
  }

  const [openSections, setOpenSections] = useState(getSavedOpenSections)

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections((prev: typeof openSections) => {
      const newState = { ...prev, [section]: !prev[section] }
      // Сохраняем состояние в localStorage
      try {
        localStorage.setItem('manga-filter-sections', JSON.stringify(newState))
      } catch (error) {
        console.warn('Failed to save filter sections:', error)
      }
      return newState
    })
  }, [])

  // Обновление локального состояния фильтров (без применения)
  const updateFilters = (newFilters: Partial<FilterState>) => {
    console.log('MangaFilterSidebar: Updating draft filters with:', newFilters)
    const updatedFilters = { ...filters, ...newFilters }
    console.log('MangaFilterSidebar: Updated draft filters:', updatedFilters)
    
    // Обновляем локальное состояние
    setFilters(updatedFilters)
    
    // Передаем изменения в родительский компонент (CatalogPage)
    onFiltersChange(updatedFilters)
  }

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      selectedGenres: [],
      selectedTags: [],
      mangaType: '',
      status: '',
      ageRating: [0, 21],
      rating: [0, 10],
      releaseYear: [1990, new Date().getFullYear()],
      chapterRange: [0, 1000]
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
    onReset() // Вызываем родительскую функцию сброса
  }

  return (
    <div className={cn(
      "w-80 h-fit relative overflow-hidden", 
      "bg-white/10 backdrop-blur-sm",
      "border border-white/20",
      "rounded-xl shadow-lg",
      className
    )}>
      {/* Заголовок в стиле каталога */}
      <div className="relative p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Фильтры
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            {onApply && (
              <Button
                variant="default"
                size="sm"
                onClick={onApply}
                className="h-8 px-3 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all duration-200 rounded-lg text-xs font-medium shadow-lg shadow-primary/20"
              >
                Применить
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Основная область фильтров */}
      <div className="p-4 space-y-6">
        {/* Жанры */}
        <FilterSection
          title="Жанры"
          isOpen={openSections.genres}
          onToggle={() => toggleSection('genres')}
        >
          {isLoadingGenres ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="ml-2 text-sm text-gray-400">Загрузка жанров...</span>
            </div>
          ) : genresError ? (
            <div className="text-sm text-red-400 py-4">
              {genresError}
            </div>
          ) : (
            <GenreMultiSelectFilter
              genres={genres}
              selectedItems={filters.selectedGenres}
              onSelectionChange={(genres) => updateFilters({ selectedGenres: genres })}
              placeholder="Поиск жанров..."
            />
          )}
        </FilterSection>

        <Separator />

        {/* Тип манги */}
        <FilterSection
          title="Тип манги"
          isOpen={openSections.types}
          onToggle={() => toggleSection('types')}
        >
          <Select value={filters.mangaType || "all"} onValueChange={(type) => updateFilters({ mangaType: type === "all" ? "" : type })}>
            <SelectTrigger className="bg-white/5 backdrop-blur-sm border-white/10 text-white hover:border-primary/50 transition-colors duration-200">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent className="bg-black/95 border-white/20 backdrop-blur-xl">
              <SelectItem value="all" className="text-white hover:bg-white/10">Все типы</SelectItem>
              {MANGA_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10 focus:bg-primary/20">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        <Separator />

        {/* Теги */}
        <FilterSection
          title="Теги"
          isOpen={openSections.tags}
          onToggle={() => toggleSection('tags')}
        >
          {isLoadingTags ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="ml-2 text-sm text-gray-400">Загрузка тегов...</span>
            </div>
          ) : tagsError ? (
            <div className="text-sm text-red-400 py-4">
              {tagsError}
            </div>
          ) : (
            <TagMultiSelectFilter
              tags={tags}
              selectedItems={filters.selectedTags}
              onSelectionChange={(tags) => updateFilters({ selectedTags: tags })}
              placeholder="Поиск тегов..."
            />
          )}
        </FilterSection>

        <Separator />

        {/* Статус */}
        <FilterSection
          title="Статус"
          isOpen={openSections.status}
          onToggle={() => toggleSection('status')}
        >
          <Select value={filters.status || "all"} onValueChange={(status) => updateFilters({ status: status === "all" ? "" : status })}>
            <SelectTrigger className="bg-white/5 backdrop-blur-sm border-white/10 text-white hover:border-primary/50 transition-colors duration-200">
              <SelectValue placeholder="Выберите статус" />
            </SelectTrigger>
            <SelectContent className="bg-black/95 border-white/20 backdrop-blur-xl">
              <SelectItem value="all" className="text-white hover:bg-white/10">Все статусы</SelectItem>
              {MANGA_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value} className="text-white hover:bg-white/10 focus:bg-primary/20">
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        <Separator />

        {/* Возрастной рейтинг */}
        <FilterSection
          title="Возрастной рейтинг"
          isOpen={openSections.ageRating}
          onToggle={() => toggleSection('ageRating')}
        >
          <RangeSlider
            label="Возраст"
            value={filters.ageRating}
            min={0}
            max={21}
            onValueChange={(ageRating) => updateFilters({ ageRating })}
            suffix="+"
          />
        </FilterSection>

        <Separator />

        {/* Рейтинг */}
        <FilterSection
          title="Рейтинг"
          isOpen={openSections.rating}
          onToggle={() => toggleSection('rating')}
        >
          <RangeSlider
            label="Оценка"
            value={filters.rating}
            min={0}
            max={10}
            onValueChange={(rating) => updateFilters({ rating })}
          />
        </FilterSection>

        <Separator />

        {/* Год выпуска */}
        <FilterSection
          title="Год выпуска"
          isOpen={openSections.releaseYear}
          onToggle={() => toggleSection('releaseYear')}
        >
          <RangeSlider
            label="Год"
            value={filters.releaseYear}
            min={1990}
            max={new Date().getFullYear()}
            onValueChange={(releaseYear) => updateFilters({ releaseYear })}
          />
        </FilterSection>

        <Separator />

        {/* Количество глав */}
        <FilterSection
          title="Количество глав"
          isOpen={openSections.chapters}
          onToggle={() => toggleSection('chapters')}
        >
          <RangeSlider
            label="Главы"
            value={filters.chapterRange}
            min={0}
            max={1000}
            onValueChange={(chapterRange) => updateFilters({ chapterRange })}
          />
        </FilterSection>
        
        {/* Кнопки действий в стиле каталога */}
        <div className="pt-4 border-t border-white/10 flex gap-3">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex-1 h-10 border-white/20 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Сбросить
          </Button>
          {onApply && (
            <Button
              onClick={onApply}
              className="flex-1 h-10 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              Применить
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
