import React, { useState, useEffect, useRef } from 'react'
import { Bold, Italic, Code, Eye, EyeOff, Quote, Link as LinkIcon, List, ListOrdered, Minus, Sparkles } from 'lucide-react'

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  minRows?: number;
  maxRows?: number;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  submitting?: boolean;
}

// Simple utility to insert wrapper or prefix
function applyFormat(text: string, selStart: number, selEnd: number, before: string, after = before): { next: string; start: number; end: number } {
  const selected = text.slice(selStart, selEnd) || 'текст'
  const next = text.slice(0, selStart) + before + selected + after + text.slice(selEnd)
  const cursorStart = selStart + before.length
  const cursorEnd = cursorStart + selected.length
  return { next, start: cursorStart, end: cursorEnd }
}

function applyLinePrefix(text: string, selStart: number, selEnd: number, prefix: string){
  const before = text.slice(0, selStart)
  const segment = text.slice(selStart, selEnd)
  const after = text.slice(selEnd)
  const lines = segment.split(/\n/)
  const changed = lines.map(l => l ? (prefix + ' ' + l) : l).join('\n')
  const next = before + changed + after
  return { next, start: selStart, end: selStart + changed.length }
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, onSubmit, minRows=6, maxRows=20, placeholder='Введите текст...', autoFocus, compact, submitting }) => {
  const [preview, setPreview] = useState(false)
  const ref = useRef<HTMLTextAreaElement|null>(null)
  const handle = (action: string) => {
    if(!ref.current) return
    const ta = ref.current
    const { selectionStart: s, selectionEnd: e } = ta
    let res: { next: string; start: number; end: number } | null = null
    switch(action){
      case 'bold': res = applyFormat(value, s, e, '**', '**'); break
      case 'italic': res = applyFormat(value, s, e, '*', '*'); break
      case 'code': res = applyFormat(value, s, e, '`', '`'); break
      case 'spoiler': res = applyFormat(value, s, e, '||', '||'); break
      case 'quote': res = applyLinePrefix(value, s, e, '>'); break
      case 'ul': res = applyLinePrefix(value, s, e, '-'); break
      case 'ol': res = applyLinePrefix(value, s, e, '1.'); break
      case 'hr': {
        const insert = '\n\n---\n\n'
        const next = value.slice(0,e) + insert + value.slice(e)
        res = { next, start: e + insert.length, end: e + insert.length }
        break
      }
      case 'link': {
        res = applyFormat(value, s, e, '[', '](https://)')
        break
      }
      default: break
    }
    if(res){ onChange(res.next); requestAnimationFrame(()=> { if(ref.current){ ref.current.focus(); ref.current.selectionStart = res!.start; ref.current.selectionEnd = res!.end }}) }
  }
  const rows = Math.min(maxRows, Math.max(minRows, value.split(/\n/).length + 1))
  const toolbarBtn = (label: string, icon: React.ReactNode, action: string) => (
    <button type="button" onClick={()=> handle(action)} title={label} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40 text-[11px] flex items-center">
      {icon}
    </button>
  )
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 ${compact? 'p-3':'p-4'} space-y-3 max-w-full overflow-hidden`}> 
      <div className="flex flex-wrap items-center gap-1">
        {toolbarBtn('Жирный', <Bold className="h-4 w-4" />, 'bold')}
        {toolbarBtn('Курсив', <Italic className="h-4 w-4" />, 'italic')}
        {toolbarBtn('Код', <Code className="h-4 w-4" />, 'code')}
        {toolbarBtn('Ссылка', <LinkIcon className="h-4 w-4" />, 'link')}
        {toolbarBtn('Цитата', <Quote className="h-4 w-4" />, 'quote')}
        {toolbarBtn('Список', <List className="h-4 w-4" />, 'ul')}
        {toolbarBtn('Нумер. список', <ListOrdered className="h-4 w-4" />, 'ol')}
        {toolbarBtn('Спойлер', <Sparkles className="h-4 w-4" />, 'spoiler')}
        {toolbarBtn('Разделитель', <Minus className="h-4 w-4" />, 'hr')}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={()=> setPreview(p=> !p)} className="px-2 py-1 rounded-md bg-white/10 text-[11px] text-white/70 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center gap-1">
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? 'Ред.' : 'Превью'}
          </button>
        </div>
      </div>
      {!preview && (
        <textarea ref={ref} value={value} onChange={e=> onChange(e.target.value)} rows={rows} placeholder={placeholder} autoFocus={autoFocus}
          className="w-full resize-y rounded-md bg-black/30 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium tracking-wide leading-relaxed" />
      )}
      {preview && (
        <div className="prose prose-invert max-w-none text-sm leading-relaxed markdown-body max-w-full overflow-hidden break-words">
          <MarkdownRenderer value={value || '*Пусто*'} />
        </div>
      )}
      {onSubmit && (
        <div className="flex justify-end pt-1">
          <button disabled={!value.trim() || submitting} onClick={()=> onSubmit(value)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition">{submitting? 'Отправка...' : 'Отправить'}</button>
        </div>
      )}
      <p className="text-[10px] text-white/40">Поддерживается Markdown + GFM. Спойлер: выделите текст и нажмите Спойлер (||текст||).</p>
    </div>
  )
}

// Lazy import renderer to avoid circular import - define after component
import { MarkdownRenderer } from './MarkdownRenderer'
