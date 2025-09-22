import { useEffect, useState } from 'react'
import { ForumThread } from '@/types/forum'
import { apiClient } from '@/lib/api'

interface UserLite { id: number; username: string; displayName?: string; avatar?: string }
const cache = new Map<number, { user: UserLite; ts: number }>()
const TTL = 5 * 60 * 1000

async function fetchUser(id: number): Promise<UserLite | null> {
  const c = cache.get(id); const now = Date.now(); if (c && now - c.ts < TTL) return c.user
  try {
    const profile = await apiClient.getUserProfile(id)
    let avatar = profile.avatar
    if (!avatar) { try { avatar = await apiClient.getUserAvatar(id) || undefined } catch {} }
    const u: UserLite = { id: profile.id, username: profile.username, displayName: profile.displayName || profile.username, avatar }
    cache.set(id, { user: u, ts: now }); return u
  } catch {
    try {
      const pub = await apiClient.getUserPublicProfile(id)
      let avatar = pub.avatar
      if (!avatar) { try { avatar = await apiClient.getUserAvatar(id) || undefined } catch {} }
      const u: UserLite = { id: pub.id, username: pub.username, displayName: pub.displayName || pub.username, avatar }
      cache.set(id, { user: u, ts: now }); return u
    } catch { return null }
  }
}

export function useThreadAuthors(threads?: ForumThread[]) {
  const [users, setUsers] = useState<Record<number, UserLite>>({})
  useEffect(()=> {
    if (!threads || !threads.length) return
    const ids = Array.from(new Set(threads.map(t=> t.authorId).filter(Boolean))) as number[]
    if (!ids.length) return
    let cancelled = false
    ;(async()=> {
      const entries = await Promise.all(ids.map(id=> fetchUser(id).then(u=> [id,u] as const)))
      if (cancelled) return
      const map: Record<number, UserLite> = {}
      entries.forEach(([id,u])=> { if (u) map[id]=u })
      setUsers(map)
    })()
    return ()=> { cancelled = true }
  }, [threads?.map(t=> t.id).join(',')])
  return users
}
