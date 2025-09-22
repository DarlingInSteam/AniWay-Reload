import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

// Simple in-memory cache
const avatarCache = new Map<number, string>()

export function useResolvedAvatar(userId?: number, providedUrl?: string | null) {
  const [url, setUrl] = useState<string | undefined>(() => {
    if (providedUrl) return providedUrl
    if (userId && avatarCache.has(userId)) return avatarCache.get(userId)
    return undefined
  })
  useEffect(() => {
    let cancelled = false
    if (!userId) return
    if (providedUrl) {
      avatarCache.set(userId, providedUrl)
      setUrl(providedUrl)
      return
    }
    if (avatarCache.has(userId)) {
      const cached = avatarCache.get(userId)!
      setUrl(cached)
      return
    }
    apiClient.getUserAvatar(userId).then(meta => {
      if (!cancelled && meta) {
        const finalUrl = `${meta}${meta.includes('?') ? '&' : '?'}v=${Date.now()}`
        avatarCache.set(userId, finalUrl)
        setUrl(finalUrl)
      }
    })
    return () => { cancelled = true }
  }, [userId, providedUrl])
  return url
}