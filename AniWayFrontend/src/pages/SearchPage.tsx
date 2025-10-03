import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export function SearchPage(){
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()
  useEffect(()=> { const h = setTimeout(()=> setDebounced(query.trim()), 250); return ()=> clearTimeout(h)}, [query])
  const mangaEnabled = debounced.length>=2
  const userEnabled = debounced.length>=2
  const { data: mangaRes } = useQuery({ queryKey:['mobile-search-manga', debounced], queryFn: ()=> apiClient.searchManga({ query: debounced }), enabled: mangaEnabled })
  const { data: userRes } = useQuery({ queryKey:['mobile-search-users', debounced], queryFn: ()=> apiClient.searchUsers({ query: debounced, limit: 12 }), enabled: userEnabled })
  return (
    <div className="container mx-auto px-4 py-5 space-y-6">
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input value={query} onChange={e=> setQuery(e.target.value)} placeholder="Поиск манги или пользователей" className="w-full bg-white/10 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>
      <div className="space-y-8 pb-10">
        {debounced.length<2 && <p className="text-sm text-white/50">Введите минимум 2 символа…</p>}
        {debounced.length>=2 && (
          <>
            <div>
              <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Манга</h2>
              <div className="grid grid-cols-3 gap-3">
                {(mangaRes||[]).slice(0,9).map((m:any)=> (
                  <button key={m.id} onClick={()=> navigate(`/manga/${m.id}`)} className="flex flex-col gap-1 text-left">
                    <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-white/10 border border-white/10">
                      {m.coverImageUrl && <img src={m.coverImageUrl} alt={m.title} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-[11px] text-white/80 line-clamp-2 leading-tight">{m.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Пользователи</h2>
              <div className="grid grid-cols-2 gap-3">
                {(userRes?.users||[]).slice(0,10).map((u:any)=> (
                  <button key={u.id} onClick={()=> navigate(`/profile/${u.id}`)} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-xs font-semibold text-white/80">{(u.username||'?')[0]}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs text-white/80 truncate">{u.username}</div>
                      <div className="text-[10px] text-white/40 truncate">{u.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export default SearchPage
