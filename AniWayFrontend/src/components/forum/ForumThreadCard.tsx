import { ForumThread } from '@/types/forum'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Heart, Pin, Lock, Trash2 } from 'lucide-react'
import { AvatarMini } from './AvatarMini'
import { Badge } from '@/components/ui/badge'
import { ThreadHoverPreview } from './ThreadHoverPreview'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, useCallback, useEffect } from 'react'

interface Props { thread: ForumThread; users?: Record<number, any>; density?: 'comfortable' | 'compact'; isNew?: boolean; isUpdated?: boolean; isAdmin?: boolean; onPinToggle?: (id:number, next:boolean)=>void; onDelete?: (id:number)=>void }

export function ForumThreadCard({ thread, users, density = 'comfortable', isNew, isUpdated, isAdmin, onPinToggle, onDelete }: Props) {
  const qc = useQueryClient()
  const hoverTimer = useRef<any>(null)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'right'|'left'|'overlay'>('right')
  const rootRef = useRef<HTMLAnchorElement|null>(null)
  const recalcPlacement = () => {
    if(!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    if(vw < 640) { setPlacement('overlay'); return }
    const spaceRight = vw - rect.right
    const spaceLeft = rect.left
    if(spaceRight > 380) setPlacement('right')
    else if(spaceLeft > 380) setPlacement('left')
    else setPlacement('overlay')
  }
  useEffect(()=> { if(open) recalcPlacement() }, [open])
  const handleEnter = useCallback(()=> {
    if(hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(()=> {
      qc.prefetchQuery({ queryKey: ['forum','threadPreview', thread.id] })
      setOpen(true)
      recalcPlacement()
    }, 320)
  }, [thread.id])
  const handleLeave = useCallback(()=> {
    if(hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(()=> setOpen(false), 150)
  }, [])
  const u = users?.[thread.authorId]
  const name = u?.displayName || thread.authorName || `Пользователь ${thread.authorId}`
  const avatar = u?.avatar || thread.authorAvatar
  const raw = thread.content || ''
  const plain = raw
    .replace(/```[\s\S]*?```/g,' ') // code blocks
    .replace(/`[^`]*`/g,' ') // inline code
    .replace(/\|\|([^|]+)\|\|/g,' $1 ') // spoilers -> reveal in snippet
    .replace(/\!\[[^\]]*\]\([^)]*\)/g,' ') // images
    .replace(/\[[^\]]*\]\([^)]*\)/g,' ') // links text removed; or keep text inside []
    .replace(/[*_~`>#-]/g,' ') // markdown symbols
    .replace(/\s+/g,' ')
    .trim()
  const MAX_SNIPPET = 160
  const EXTENDED_SNIPPET = 420
  const [expanded, setExpanded] = useState(false)
  const snippet = expanded
    ? (plain.slice(0, EXTENDED_SNIPPET) + (plain.length > EXTENDED_SNIPPET ? '…' : ''))
    : (plain.slice(0, MAX_SNIPPET) + (plain.length > MAX_SNIPPET ? '…' : ''))
  const padding = density === 'compact' ? 'p-3' : 'p-4'
  const titleClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const snippetClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const metricsText = density === 'compact' ? 'text-[10px]' : 'text-[11px]'
  const highlight = isNew || isUpdated
  const ring = isNew ? 'ring-2 ring-emerald-500/40' : isUpdated ? 'ring-2 ring-sky-500/40' : ''
  return (
    <div className={`group relative flex h-full rounded-lg border border-white/10 bg-white/[0.03] ${padding} hover:border-primary/40 hover:bg-primary/5 transition-colors ${ring} focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40`}>
      <div className="min-w-0 flex-1 space-y-2">
        <Link ref={rootRef} to={`/forum/thread/${thread.id}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave} aria-label={highlight ? (isNew ? 'Новая тема' : 'Обновлённая тема') : undefined} role="article" className="block focus:outline-none">
          <h4 className={`${titleClamp} font-medium text-white tracking-tight`}>{thread.title}</h4>
          {snippet && <p className={`${snippetClamp} text-xs text-white/70 leading-snug mt-1`}>{snippet}</p>}
        </Link>
        <div className={`flex flex-wrap items-center gap-3 ${metricsText} text-white/60`}>
          <span className="inline-flex items-center gap-2">
            <AvatarMini avatar={avatar} name={name} size={22} />
            <span className="truncate max-w-[180px] text-white/80 group-hover:text-white">{name}</span>
          </span>
          <span className="inline-flex items-center gap-2 text-white/55">
            <MessageSquare className="h-3 w-3" /> {thread.repliesCount}
            <Eye className="h-3 w-3" /> {thread.viewsCount}
            <Heart className="h-3 w-3" /> {thread.likesCount}
          </span>
          {thread.isPinned && <span className="inline-flex items-center gap-1 text-amber-400"><Pin className="h-3 w-3"/> PIN</span>}
          {thread.isLocked && <span className="inline-flex items-center gap-1 text-red-400"><Lock className="h-3 w-3"/> LOCK</span>}
          {isNew && <Badge variant="new" size="xs">NEW</Badge>}
          {!isNew && isUpdated && <Badge variant="updated" size="xs">UPD</Badge>}
          {plain.length > MAX_SNIPPET && (
            <button
              type="button"
              onClick={()=> setExpanded(e=> !e)}
              className="text-[10px] rounded-full bg-white/5 px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white transition"
            >
              {expanded ? 'Свернуть' : 'Подробнее'}
            </button>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 pt-1"> 
            <button onClick={()=> onPinToggle?.(thread.id, !thread.isPinned)} className="text-[10px] rounded bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10">{thread.isPinned ? 'Открепить' : 'Закрепить'}</button>
            {thread.canDelete && <button onClick={()=> onDelete?.(thread.id)} className="text-[10px] rounded bg-red-600/70 px-2 py-1 text-white hover:bg-red-600 flex items-center gap-1"><Trash2 className="h-3 w-3"/>Удалить</button>}
          </div>
        )}
      </div>
      <ThreadHoverPreview threadId={thread.id} open={open} placement={placement} />
    </div>
  )
}
