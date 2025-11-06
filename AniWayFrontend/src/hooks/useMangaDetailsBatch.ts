import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import type { MangaResponseDTO } from '@/types'

const detailCache = new Map<number, { data: MangaResponseDTO; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут
const CHUNK_SIZE = 50

type MangaDetailsRecord = Record<number, MangaResponseDTO>

export interface MangaDetailsBatchResult {
  data: MangaDetailsRecord
  loading: boolean
}

const normalizeIds = (ids: (number | null | undefined)[]): number[] => {
  return Array.from(
    new Set(
      ids.filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    )
  ).sort((a, b) => a - b)
}

export function useMangaDetailsBatch(ids: (number | null | undefined)[]): MangaDetailsBatchResult {
  const [data, setData] = useState<MangaDetailsRecord>({})
  const [loading, setLoading] = useState(false)

  const normalizedKey = useMemo(() => normalizeIds(ids).join(','), [ids])

  useEffect(() => {
    const normalizedIds = normalizeIds(ids)
    if (normalizedIds.length === 0) {
      setData({})
      setLoading(false)
      return
    }

    const now = Date.now()
    const cachedEntries: MangaDetailsRecord = {}
    const missing: number[] = []

    normalizedIds.forEach(id => {
      const cached = detailCache.get(id)
      if (cached && now - cached.ts < CACHE_TTL) {
        cachedEntries[id] = cached.data
      } else {
        missing.push(id)
      }
    })

    if (Object.keys(cachedEntries).length > 0) {
      setData(prev => ({ ...prev, ...cachedEntries }))
    }

    if (missing.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const fetchChunk = async (chunk: number[]) => {
      try {
        const response = await apiClient.getMangaBatch(chunk)
        if (!response || !Array.isArray(response)) {
          return {}
        }
        const timestamp = Date.now()
        const map: MangaDetailsRecord = {}
        response.forEach(item => {
          if (!item || typeof item.id !== 'number') return
          detailCache.set(item.id, { data: item, ts: timestamp })
          map[item.id] = item
        })
        return map
      } catch (error) {
        console.error('Failed to fetch manga batch', error)
        return {}
      }
    }

    ;(async () => {
      const aggregated: MangaDetailsRecord = {}
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        if (cancelled) return
        const chunk = missing.slice(i, i + CHUNK_SIZE)
        const chunkData = await fetchChunk(chunk)
        if (cancelled || !chunkData) return
        Object.assign(aggregated, chunkData)
      }

      if (cancelled) return
      if (Object.keys(aggregated).length > 0) {
        setData(prev => ({ ...prev, ...aggregated }))
      }
    })().finally(() => {
      if (!cancelled) {
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [normalizedKey, ids])

  return { data, loading }
}
