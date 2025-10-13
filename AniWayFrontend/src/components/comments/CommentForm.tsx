import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType
} from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Save,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

interface CommentFormProps {
  onSubmit: (content: string) => void | Promise<void>
  onCancel?: () => void
  initialValue?: string
  placeholder?: string
  submitText?: string
  maxLength?: number
  showCancelButton?: boolean
}

type QuickActionKey =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'unordered-list'
  | 'ordered-list'
  | 'link'
  | 'storage'
  | 'help'

type QuickAction = {
  key: QuickActionKey
  icon: ComponentType<{ className?: string }>
  label: string
  shortcut?: string
}

const quickActions: QuickAction[] = [
  { key: 'bold', icon: Bold, label: 'Жирный', shortcut: 'Ctrl+B' },
  { key: 'italic', icon: Italic, label: 'Курсив', shortcut: 'Ctrl+I' },
  { key: 'strike', icon: Strikethrough, label: 'Зачёркнутый' },
  { key: 'underline', icon: Underline, label: 'Подчёркнутый' },
  { key: 'unordered-list', icon: List, label: 'Маркированный список' },
  { key: 'ordered-list', icon: ListOrdered, label: 'Нумерованный список' },
  { key: 'link', icon: LinkIcon, label: 'Ссылка' },
  { key: 'storage', icon: Save, label: 'Черновики' },
  { key: 'help', icon: HelpCircle, label: 'Подсказки' }
]

export function CommentForm({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Оставить комментарий',
  submitText = 'Отправить',
  maxLength,
  showCancelButton = true
}: CommentFormProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialValue)
  const [hasFocus, setHasFocus] = useState(Boolean(initialValue))
  const [showPreview, setShowPreview] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const effectiveMaxLength = maxLength ?? 600
  const isExpanded = hasFocus || content.length > 0

  useEffect(() => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [content])

  useEffect(() => {
    if (showPreview && previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [showPreview, content])

  const keepWithinLimit = useCallback(
    (value: string) => {
      if (!effectiveMaxLength) return value
      return value.length <= effectiveMaxLength
        ? value
        : value.slice(0, effectiveMaxLength)
    },
    [effectiveMaxLength]
  )

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return
    await onSubmit(content.trim())
    setContent('')
    setHasFocus(false)
    setShowPreview(false)
  }, [content, onSubmit])

  const handleCancel = () => {
    onCancel?.()
    setContent(initialValue)
    setHasFocus(false)
    setShowPreview(false)
    setShowDrafts(false)
    setShowHelp(false)
  }

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(keepWithinLimit(event.target.value))
  }

  const handleFocus = () => {
    setHasFocus(true)
  }

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const next = event.relatedTarget as HTMLElement | null
    if (next && containerRef.current?.contains(next)) {
      return
    }
    setHasFocus(false)
  }

  const handleContainerBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as HTMLElement | null
    if (next && containerRef.current?.contains(next)) {
      return
    }
    setHasFocus(false)
  }

  const applyWrappedSelection = (
    prefix: string,
    suffix = prefix,
    placeholderValue = 'текст'
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const selection = content.slice(start, end)
    const text = selection.length ? selection : placeholderValue
    const nextValue = `${content.slice(0, start)}${prefix}${text}${suffix}${content.slice(end)}`
    const truncated = keepWithinLimit(nextValue)

    setContent(truncated)

    requestAnimationFrame(() => {
      textarea.focus()
      const selectionStart = Math.min(start + prefix.length, truncated.length)
      const selectionEnd = Math.min(selectionStart + text.length, truncated.length)
      textarea.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  const applyListFormatting = (prefix: string | ((index: number) => string)) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? 0
    const end = textarea.selectionEnd ?? 0
    const hasSelection = start !== end

    if (!hasSelection) {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const linePrefix = typeof prefix === 'function' ? prefix(0) : prefix
      const nextValue = `${content.slice(0, lineStart)}${linePrefix}${content.slice(lineStart)}`
      const truncated = keepWithinLimit(nextValue)
      setContent(truncated)

      requestAnimationFrame(() => {
        textarea.focus()
        const caret = Math.min(lineStart + linePrefix.length, truncated.length)
        textarea.setSelectionRange(caret, caret)
      })
      return
    }

    const selection = content.slice(start, end)
    const lines = selection.split('\n')
    const formatted = lines
      .map((line, index) => {
        if (!line.trim()) return line
        const linePrefix = typeof prefix === 'function' ? prefix(index) : prefix
        const stripped = line.replace(/^([-*]\s+|\d+\.\s+)/, '')
        return `${linePrefix}${stripped}`
      })
      .join('\n')

    const nextValue = `${content.slice(0, start)}${formatted}${content.slice(end)}`
    const truncated = keepWithinLimit(nextValue)
    setContent(truncated)

    requestAnimationFrame(() => {
      textarea.focus()
      const selectionEnd = Math.min(start + formatted.length, truncated.length)
      textarea.setSelectionRange(start, selectionEnd)
    })
  }

  const handleAction = (action: QuickActionKey) => {
    switch (action) {
      case 'bold':
        return applyWrappedSelection('**')
      case 'italic':
        return applyWrappedSelection('*')
      case 'strike':
        return applyWrappedSelection('~~')
      case 'underline':
        return applyWrappedSelection('<u>', '</u>')
      case 'unordered-list':
        return applyListFormatting('- ')
      case 'ordered-list':
        return applyListFormatting(index => `${index + 1}. `)
      case 'link':
        return applyWrappedSelection('[', '](url)', 'текст')
      case 'storage':
        setShowDrafts(prev => !prev)
        return
      case 'help':
        setShowHelp(prev => !prev)
        return
      default:
        return
    }
  }

  const calculatedCharLeft = useMemo(() => {
    if (!effectiveMaxLength) return null
    return effectiveMaxLength - content.length
  }, [content.length, effectiveMaxLength])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  const isSubmitDisabled = !content.trim()

  useEffect(() => {
    if (!isExpanded) {
      setShowPreview(false)
      setShowDrafts(false)
      setShowHelp(false)
    }
  }, [isExpanded])

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={cn(
          'relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors',
          isExpanded ? 'pb-14' : 'pb-3',
          hasFocus
            ? 'border-primary/50 shadow-[0_20px_60px_-35px_rgba(59,130,246,0.9)]'
            : 'hover:border-white/20'
        )}
        onFocusCapture={() => setHasFocus(true)}
        onBlurCapture={handleContainerBlur}
      >
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full resize-none border-0 bg-transparent px-0 text-sm text-white placeholder:text-white/30 focus-visible:ring-0 transition-[min-height] duration-200',
            isExpanded ? 'min-h-[120px]' : 'min-h-[52px]'
          )}
        />

        {isExpanded && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {quickActions.map(action => {
                const Icon = action.icon
                const shortcutHint = action.shortcut ? ` • ${action.shortcut}` : ''
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleAction(action.key)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors',
                      action.key === 'storage' && showDrafts && 'text-primary',
                      action.key === 'help' && showHelp && 'text-primary',
                      'hover:bg-white/10 hover:text-white'
                    )}
                    aria-label={action.label}
                    title={`${action.label}${shortcutHint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            {calculatedCharLeft !== null && (
              <span
                className={cn(
                  'text-xs font-medium',
                  calculatedCharLeft < 30 ? 'text-amber-300' : 'text-white/40'
                )}
              >
                {content.length}/{effectiveMaxLength}
              </span>
            )}
          </div>
        )}

        {isExpanded && showDrafts && (
          <div className="mt-3 rounded-2xl border border-dashed border-white/15 p-3 text-sm text-white/60">
            Черновики появятся здесь позже
          </div>
        )}

        {isExpanded && showHelp && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs text-white/60">
            <p className="mb-2 font-medium text-white/70">Markdown поддерживается:</p>
            <ul className="space-y-1">
              <li><span className="text-white/80">**жирный**</span> — двойные звёздочки</li>
              <li><span className="text-white/80">*курсив*</span> — одиночная звёздочка</li>
              <li><span className="text-white/80">`код`</span> — обратные кавычки</li>
            </ul>
          </div>
        )}

        {isExpanded && showPreview && (
          <div
            ref={previewRef}
            className="mt-3 max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/90"
          >
            <MarkdownRenderer value={content} />
          </div>
        )}

        {isExpanded && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-xs text-white/50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(prev => !prev)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  showPreview ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:text-white'
                )}
              >
                <ChevronRight
                  className={cn(
                    'mr-1 inline-block h-3 w-3 align-middle transition-transform',
                    showPreview && 'rotate-90'
                  )}
                />
                Превью
              </button>
              <span className="hidden sm:inline">Ctrl + Enter — отправить</span>
            </div>

            <div className="flex items-center gap-2">
              {showCancelButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-3 text-white/60 hover:text-white"
                  onClick={handleCancel}
                >
                  Отменить
                </Button>
              )}

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                size="sm"
                className="rounded-full bg-primary px-4 text-white shadow-[0_12px_24px_-18px_rgba(59,130,246,0.9)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
              >
                {submitText}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
