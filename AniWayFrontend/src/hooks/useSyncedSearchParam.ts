import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useSyncedSearchParam<T extends string>(key: string, defaultValue: T) {
  const [params, setParams] = useSearchParams()
  const current = (params.get(key) as T) || defaultValue

  const setValue = useCallback((value: T, options?: { replace?: boolean }) => {
    const next = new URLSearchParams(params)
    if (value === defaultValue) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setParams(next, { replace: options?.replace ?? true })
  }, [params, setParams, key, defaultValue])

  return [current, setValue] as const
}
