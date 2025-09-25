import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export interface MangaMini { id: number; title: string; cover?: string }

const cache = new Map<number, { data: MangaMini; ts: number }>()
const TTL = 5 * 60 * 1000

async function fetchManga(id: number): Promise<MangaMini | null> {
  const c = cache.get(id)
  const now = Date.now()
  if (c && now - c.ts < TTL) return c.data
  try {
    const m = await apiClient.getMangaById(id)
  const title = (m as any).title || (m as any).titleRussian || (m as any).titleEnglish || (m as any).name || `Манга #${m.id}`
  const cover = (m as any).coverImageUrl || (m as any).coverUrl || (m as any).imageUrl || (m as any).cover || (m as any).image
  const mini: MangaMini = { id: m.id, title, cover }
    cache.set(id, { data: mini, ts: now })
    return mini
  } catch { return null }
}

export function useMangaMiniBatch(ids: (number|undefined|null)[]) {
  const [items, setItems] = useState<Record<number, MangaMini>>({})
  useEffect(()=> {
    const unique = Array.from(new Set(ids.filter((v): v is number => typeof v === 'number')))
    if (!unique.length) return
    let cancelled = false
    ;(async()=> {
      const entries = await Promise.all(unique.map(id => fetchManga(id).then(m => [id, m] as const)))
      if (cancelled) return
      const map: Record<number, MangaMini> = {}
      entries.forEach(([id,m])=> { if (m) map[id]=m })
      setItems(map)
    })()
    return ()=> { cancelled = true }
  }, [ids.map(i=> i ?? 'x').join('|')])
  return items
}

export default useMangaMiniBatch
