import { useEffect, useRef, useState } from 'react'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'

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
  return <MarkdownEditor value={text} onChange={v=> setText(v)} onSubmit={handleSubmit} compact placeholder={placeholder} autoFocus={autoFocus} submitting={submitting} />
}
