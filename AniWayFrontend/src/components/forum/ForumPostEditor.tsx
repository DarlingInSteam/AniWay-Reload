import { useEffect, useRef, useState } from 'react'

interface Props {
  value?: string;
  onSubmit: (content: string) => void;
  placeholder?: string;
  submitting?: boolean;
  draftKey?: string; // unique key for autosave (threadId-root / threadId-postId)
  autoFocus?: boolean;
}

function loadDraft(key?: string){
  if(!key || typeof window === 'undefined') return null
  try { const raw = localStorage.getItem('forum.replyDrafts'); if(!raw) return null; const map = JSON.parse(raw); return map[key] || null } catch { return null }
}

function saveDraft(key: string, value: string){
  try { const raw = localStorage.getItem('forum.replyDrafts'); const map = raw? JSON.parse(raw): {}; if(value) { map[key]=value } else { delete map[key] } localStorage.setItem('forum.replyDrafts', JSON.stringify(map)) } catch {}
}

export function ForumPostEditor({ value = '', onSubmit, placeholder = 'Ваш ответ...', submitting, draftKey, autoFocus }: Props) {
  const initial = draftKey ? (loadDraft(draftKey) ?? value) : value
  const [text, setText] = useState(initial)
  const saveTimer = useRef<any>(null)
  useEffect(()=> {
    if(!draftKey) return
    if(saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(()=> { saveDraft(draftKey, text.trim() ? text : '') }, 400)
    return () => { if(saveTimer.current) clearTimeout(saveTimer.current) }
  }, [text, draftKey])
  const handleSubmit = () => {
    const trimmed = text.trim()
    if(!trimmed) return
    onSubmit(trimmed)
    if(draftKey) saveDraft(draftKey, '')
    setText('')
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className="h-32 w-full resize-none rounded-md bg-black/30 p-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        autoFocus={autoFocus}
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={!text.trim() || submitting}
          onClick={handleSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition"
        >
          {submitting ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}
