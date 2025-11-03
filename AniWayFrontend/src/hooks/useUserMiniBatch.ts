import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export interface UserMini { id: number; username: string; displayName?: string; avatar?: string }

// Simple in-memory cache with TTL to avoid spamming profile endpoints.
const cache = new Map<number, { data: UserMini; ts: number }>()
const TTL = 5 * 60 * 1000 // 5 minutes

async function fetchUserMini(id: number): Promise<UserMini | null> {
  const cached = cache.get(id)
  const now = Date.now()
  if (cached && now - cached.ts < TTL) return cached.data
  try {
    const pub = await apiClient.getUserPublicProfile(id)
    let avatar = pub.avatar
    if (!avatar) {
      try { avatar = await apiClient.getUserAvatar(id) || undefined } catch { /* ignore */ }
    }
    const u: UserMini = { id: pub.id, username: pub.username, displayName: pub.displayName || pub.username, avatar }
    cache.set(id, { data: u, ts: now })
    return u
  } catch {
    try {
      const profile = await apiClient.getUserProfile(id)
      let avatar = profile.avatar
      if (!avatar) {
        try { avatar = await apiClient.getUserAvatar(id) || undefined } catch { /* ignore */ }
      }
      const u: UserMini = { id: profile.id, username: profile.username, displayName: profile.displayName || profile.username, avatar }
      cache.set(id, { data: u, ts: now })
      return u
    } catch {
      return null
    }
  }
}

/**
 * Batch fetch mini user info for arbitrary collections of objects referencing user/author ID fields.
 * Provide an array of numeric user IDs; hook returns a map id->UserMini.
 */
export function useUserMiniBatch(ids: (number|undefined|null)[]) {
  const [users, setUsers] = useState<Record<number, UserMini>>({})
  useEffect(()=> {
    const list = Array.from(new Set(ids.filter((v): v is number => typeof v === 'number')))
    if (!list.length) return
    let cancelled = false
    ;(async()=> {
      const entries = await Promise.all(list.map(id => fetchUserMini(id).then(u => [id, u] as const)))
      if (cancelled) return
      const map: Record<number, UserMini> = {}
      entries.forEach(([id,u])=> { if (u) map[id] = u })
      setUsers(map)
    })()
    return ()=> { cancelled = true }
  }, [ids.map(i=> i ?? 'x').join('|')])
  return users
}

export default useUserMiniBatch
