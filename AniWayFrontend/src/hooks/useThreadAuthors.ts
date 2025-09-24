import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import type { ForumThread } from '@/types/forum'

interface UserMini { id: number; username: string; displayName?: string; avatar?: string }

const cache = new Map<number, { data: UserMini; ts: number }>()
const TTL = 5 * 60 * 1000

async function fetchOne(id: number): Promise<UserMini | null> {
  const c = cache.get(id)
  const now = Date.now()
  if (c && now - c.ts < TTL) return c.data
  try {
    const profile = await apiClient.getUserProfile(id)
    const u: UserMini = { id: profile.id, username: profile.username, displayName: profile.displayName || profile.username, avatar: profile.avatar }
    cache.set(id, { data: u, ts: now })
    return u
  } catch {
    try {
      const pub = await apiClient.getUserPublicProfile(id)
      const u: UserMini = { id: pub.id, username: pub.username, displayName: pub.displayName || pub.username, avatar: pub.avatar }
      cache.set(id, { data: u, ts: now })
      return u
    } catch { return null }
  }
}

export function useThreadAuthors(threads: ForumThread[]) {
  const [users, setUsers] = useState<Record<number, UserMini>>({})
  useEffect(()=> {
    const ids = Array.from(new Set(threads.map(t=> t.authorId).filter(Boolean))) as number[]
    if (!ids.length) return
    let cancelled = false
    ;(async()=> {
      const entries = await Promise.all(ids.map(id=> fetchOne(id).then(u=> [id,u] as const)))
      if (cancelled) return
      const map: Record<number, UserMini> = {}
      entries.forEach(([id,u])=> { if (u) map[id]=u })
      setUsers(map)
    })()
    return ()=> { cancelled = true }
  }, [threads.map(t=> t.id).join('|')])
  return users
}
