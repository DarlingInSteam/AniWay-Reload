import { ForumThread } from '@/types/forum'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Heart, Pin, Lock } from 'lucide-react'
import { AvatarMini } from './AvatarMini'
import { Badge } from '@/components/ui/badge'
import { ThreadHoverPreview } from './ThreadHoverPreview'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, useCallback } from 'react'

interface Props { thread: ForumThread; users?: Record<number, any>; density?: 'comfortable' | 'compact'; isNew?: boolean; isUpdated?: boolean }

export function ForumThreadCard({ thread, users, density = 'comfortable', isNew, isUpdated }: Props) {
  const qc = useQueryClient()
  const hoverTimer = useRef<any>(null)
  const [open, setOpen] = useState(false)
  const handleEnter = useCallback(()=> {
    if(hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(()=> {
      qc.prefetchQuery({ queryKey: ['forum','threadPreview', thread.id] })
      setOpen(true)
    }, 320)
  }, [thread.id])
  const handleLeave = useCallback(()=> {
    if(hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(()=> setOpen(false), 150)
  }, [])
  const u = users?.[thread.authorId]
  const name = u?.displayName || thread.authorName || `Пользователь ${thread.authorId}`
  const avatar = u?.avatar || thread.authorAvatar
  const snippet = (thread.content || '').replace(/\s+/g,' ').slice(0, 160) + ((thread.content||'').length > 160 ? '…' : '')
  const padding = density === 'compact' ? 'p-3' : 'p-4'
  const titleClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const snippetClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const metricsText = density === 'compact' ? 'text-[10px]' : 'text-[11px]'
  const highlight = isNew || isUpdated
  const ring = isNew ? 'ring-2 ring-emerald-500/40' : isUpdated ? 'ring-2 ring-sky-500/40' : ''
  return (
  <Link to={`/forum/thread/${thread.id}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave} aria-label={highlight ? (isNew ? 'Новая тема' : 'Обновлённая тема') : undefined} className={`group relative block rounded-xl border border-white/10 bg-white/5 ${padding} hover:bg-white/10 transition-colors ${ring}`}> 
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-start gap-1 w-16 pt-0.5">
            <div className="flex flex-wrap gap-1">
              {thread.isPinned && <Badge variant="pinned" size="xs" className="flex items-center gap-1"><Pin className="h-3 w-3" /> PIN</Badge>}
              {thread.isLocked && <Badge variant="locked" size="xs" className="flex items-center gap-1"><Lock className="h-3 w-3" /> LOCK</Badge>}
              {isNew && <Badge variant="new" size="xs">NEW</Badge>}
              {!isNew && isUpdated && <Badge variant="updated" size="xs">UPD</Badge>}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h4 className={`${titleClamp} font-medium text-white tracking-tight`}>{thread.title}</h4>
            {snippet && <p className={`${snippetClamp} text-xs text-white/70 leading-snug`}>{snippet}</p>}
            <div className={`flex flex-wrap items-center gap-4 ${metricsText} text-muted-foreground`}>
              <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.repliesCount}</span>
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{thread.viewsCount}</span>
              <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{thread.likesCount}</span>
              <span className="inline-flex items-center gap-2">
                <AvatarMini avatar={avatar} name={name} size={22} />
                <span className="truncate max-w-[140px]">{name}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <ThreadHoverPreview threadId={thread.id} open={open} />
    </Link>
  )
}
