import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { ForumPost, ForumThread } from '@/types/forum'

interface UserLite { id: number; username: string; displayName?: string; avatar?: string }

const cache = new Map<number, { user: UserLite; ts: number }>()
const TTL = 5 * 60 * 1000

async function fetchUser(id: number): Promise<UserLite | null> {
  // try cached
  const c = cache.get(id)
  const now = Date.now()
  if (c && now - c.ts < TTL) return c.user
  try {
    const profile = await apiClient.getUserProfile(id) // will fallback internal
    const u: UserLite = { id: profile.id, username: profile.username, displayName: (profile.displayName || profile.username), avatar: profile.avatar }
    cache.set(id, { user: u, ts: now })
    return u
  } catch {
    try {
      const pub = await apiClient.getUserPublicProfile(id)
      const u: UserLite = { id: pub.id, username: pub.username, displayName: (pub.displayName || pub.username), avatar: pub.avatar }
      cache.set(id, { user: u, ts: now })
      return u
    } catch { return null }
  }
}

export function useForumUsers(thread?: ForumThread, posts?: ForumPost[]) {
  const [users, setUsers] = useState<Record<number, UserLite>>({})
  const [loading, setLoading] = useState(false)

  useEffect(()=> {
    const ids = new Set<number>()
    if (thread?.authorId) ids.add(thread.authorId)
    function collect(ps: ForumPost[]|undefined){
      ps?.forEach(p=> { ids.add(p.authorId); if (p.replies && p.replies.length) collect(p.replies) })
    }
    collect(posts)
    if (!ids.size) return
    let cancelled = false
    setLoading(true)
    ;(async()=> {
      const entries = await Promise.all(Array.from(ids).map(id=> fetchUser(id).then(u=> [id,u] as const)))
      if (cancelled) return
      const map: Record<number, UserLite> = {}
      entries.forEach(([id,u])=> { if (u) map[id]=u })
      setUsers(map)
      setLoading(false)
    })()
    return ()=> { cancelled = true }
  }, [thread?.id, posts])

  return { users, loading }
}
