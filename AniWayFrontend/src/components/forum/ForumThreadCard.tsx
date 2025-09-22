import { ForumThread } from '@/types/forum'
import { Link } from 'react-router-dom'
import { MessageSquare, Eye, Heart, Pin, Lock } from 'lucide-react'
import { AvatarMini } from './AvatarMini'
import { buildProfileSlug } from '@/utils/profileSlug'

interface Props { thread: ForumThread; users?: Record<number, any>; density?: 'comfortable' | 'compact' }

export function ForumThreadCard({ thread, users, density = 'comfortable' }: Props) {
  const u = users?.[thread.authorId]
  const name = u?.displayName || thread.authorName || `Пользователь ${thread.authorId}`
  const avatar = u?.avatar || thread.authorAvatar
  const snippet = (thread.content || '').replace(/\s+/g,' ').slice(0, 160) + ((thread.content||'').length > 160 ? '…' : '')
  const padding = density === 'compact' ? 'p-3' : 'p-4'
  const titleClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const snippetClamp = density === 'compact' ? 'line-clamp-1' : 'line-clamp-2'
  const metricsText = density === 'compact' ? 'text-[10px]' : 'text-[11px]'
  return (
    <Link to={`/forum/thread/${thread.id}`} className={`block rounded-xl border border-white/10 bg-white/5 ${padding} hover:bg-white/10 transition-colors`}> 
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-2 w-5 pt-1">
            {thread.isPinned && <Pin className="h-4 w-4 text-amber-400" />}
            {thread.isLocked && <Lock className="h-4 w-4 text-red-400" />}
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
    </Link>
  )
}
