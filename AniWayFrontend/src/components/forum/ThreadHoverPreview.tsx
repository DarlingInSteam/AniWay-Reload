import { useThreadPreview } from '@/hooks/useForum'
import { useEffect, useRef, useState } from 'react'

interface Props { threadId: number; open: boolean }

export function ThreadHoverPreview({ threadId, open }: Props){
  const { data, isLoading } = useThreadPreview(threadId)
  const ref = useRef<HTMLDivElement|null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(()=> { if(open) setMounted(true) }, [open])
  if(!mounted) return null
  return (
    <div ref={ref} className={`pointer-events-none absolute left-full top-0 z-40 ml-3 w-96 max-w-[28rem] rounded-xl border border-white/10 bg-black/80 backdrop-blur p-4 text-xs text-white shadow-xl transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0'} `}>
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