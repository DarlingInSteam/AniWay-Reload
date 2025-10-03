import { useEffect, useState, useRef } from 'react'
import { apiClient } from '@/lib/api'

/**
 * Batch fetch user levels for multiple user IDs using individual /levels/{id} calls with simple de-dupe + TTL cache.
 * Rationale: leaderboard returns only basic stats; we want authoritative level/xp, not heuristic.
 */
export interface UserLevelData { userId: number; level: number; totalXp: number; xpForNextLevel?: number; xpIntoCurrentLevel?: number; progress?: number }

interface CacheEntry { data: UserLevelData; ts: number }
const cache = new Map<number, CacheEntry>()
const TTL = 60_000 // 1 minute

async function fetchLevel(id: number): Promise<UserLevelData | null> {
  const now = Date.now()
  const c = cache.get(id)
  if (c && now - c.ts < TTL) return c.data
  try {
    const res = await (apiClient as any).request(`/levels/${id}`)
    if (res && typeof res.level === 'number') {
      const data: UserLevelData = {
        userId: id,
        level: res.level,
        totalXp: res.totalXp ?? res.xp ?? 0,
        xpForNextLevel: res.xpForNextLevel,
        xpIntoCurrentLevel: res.xpIntoCurrentLevel,
        progress: res.progress
      }
      cache.set(id, { data, ts: now })
      return data
    }
    return null
  } catch {
    return null
  }
}

export function useUserLevelsBatch(ids: (number|undefined|null)[]) {
  const [map, setMap] = useState<Record<number, UserLevelData>>({})
  const mounted = useRef(true)
  useEffect(()=> () => { mounted.current = false }, [])
  useEffect(()=> {
    const uniq = Array.from(new Set(ids.filter((v): v is number => typeof v === 'number')))
    if (!uniq.length) return
    let cancelled = false
    ;(async()=> {
      const entries = await Promise.all(uniq.map(id => fetchLevel(id).then(data => [id, data] as const)))
      if (cancelled || !mounted.current) return
      const next: Record<number, UserLevelData> = {}
      entries.forEach(([id, data])=> { if (data) next[id] = data })
      setMap(prev => ({ ...prev, ...next }))
    })()
    return ()=> { cancelled = true }
  }, [ids.map(i=> i ?? 'x').join('|')])
  return map
}

export default useUserLevelsBatch
