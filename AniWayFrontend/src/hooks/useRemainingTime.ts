import { useEffect, useState } from 'react'

// Generic hook to compute remaining time label for a future ISO timestamp
export function useRemainingTime(targetIso?: string | null, refreshMs = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!targetIso) return
    const id = setInterval(() => setNow(Date.now()), refreshMs)
    return () => clearInterval(id)
  }, [targetIso, refreshMs])

  if (!targetIso) return { label: null, expired: false }
  const end = new Date(targetIso).getTime()
  if (isNaN(end)) return { label: null, expired: false }
  const diffMs = end - now
  if (diffMs <= 0) return { label: 'истек', expired: true }
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return { label: mins + 'м', expired: false }
  const hours = Math.floor(mins / 60)
  if (hours < 24) return { label: hours + 'ч', expired: false }
  const days = Math.floor(hours / 24)
  return { label: days + 'д', expired: false }
}
