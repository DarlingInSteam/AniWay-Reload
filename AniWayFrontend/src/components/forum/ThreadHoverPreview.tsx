import { useThreadPreview } from '@/hooks/useForum'
import { useEffect, useRef, useState } from 'react'

interface Props { threadId: number; open: boolean; placement: 'right' | 'left' | 'overlay' }

export function ThreadHoverPreview({ threadId, open, placement }: Props){
  const { data, isLoading } = useThreadPreview(threadId)
  const ref = useRef<HTMLDivElement|null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(()=> { if(open) setMounted(true) }, [open])
  if(!mounted) return null
  const base = 'pointer-events-none absolute z-40 w-80 sm:w-96 max-w-[28rem] rounded-xl border border-white/10 bg-black/80 backdrop-blur p-4 text-xs text-white shadow-xl transition-opacity duration-150'
  const cls = placement === 'right'
    ? 'left-full top-0 ml-3'
    : placement === 'left'
      ? 'right-full top-0 mr-3'
      : 'left-0 right-0 top-full mt-2 w-full max-w-none'
  return (
    <div ref={ref} className={`${base} ${cls} ${open ? 'opacity-100' : 'opacity-0'} hidden sm:block`}>
      {isLoading && <div className="text-white/50">Загрузка…</div>}
      {data && (
        <div className="space-y-3">
          <div>
            <h5 className="text-sm font-semibold mb-1 line-clamp-2">{data.thread.title}</h5>
            <p className="text-white/70 line-clamp-5 whitespace-pre-wrap leading-snug">{(data.thread.content || '').slice(0, 480)}{(data.thread.content||'').length>480?'…':''}</p>
          </div>
          {data.posts.length > 1 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-white/40 font-medium">Последние ответы</div>
              <ul className="space-y-1.5">
                {data.posts.slice(1).map(p=> (
                  <li key={p.id} className="rounded bg-white/5 px-2 py-1 line-clamp-2 text-white/80">{(p.content||'').replace(/\s+/g,' ').slice(0,160)}{(p.content||'').length>160?'…':''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}