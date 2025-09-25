import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { MangaResponseDTO } from '@/types';

interface MangaReferencePickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (mangaId: number) => void;
}

export const MangaReferencePicker: React.FC<MangaReferencePickerProps> = ({ open, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MangaResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=>{
    if(!open){
      setQ('');
      setResults([]);
      return;
    }
  },[open]);

  async function performSearch(query: string){
    if(!query){ setResults([]); setError(null); return; }
    setLoading(true); setError(null);
    try {
      let res: MangaResponseDTO[] = [];
      try { res = await apiClient.searchManga({ query }); } catch {}
      if(!res || res.length===0){
        try {
          const paged = await apiClient.searchMangaPaged({ query, limit: 30 });
          // @ts-ignore
          res = (paged?.content || paged?.items || paged) as MangaResponseDTO[];
        } catch {}
      }
      setResults(Array.isArray(res)? res.slice(0,30): []);
      if(!res || res.length===0) setError('Ничего не найдено');
    } catch(e:any){
      setError(e?.message || 'Ошибка поиска'); setResults([]);
    } finally { setLoading(false); }
  }

  const debounceRef = useRef<number|undefined>(undefined);
  useEffect(()=>{
    if(q.trim().length < 3){
      setResults([]); setError(null); return;
    }
    // debounce
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(()=>{
      performSearch(q.trim());
    }, 350);
  }, [q]);

  function handleSearch(e: React.FormEvent){
    e.preventDefault(); e.stopPropagation();
    performSearch(q.trim());
  }

  function pick(m: MangaResponseDTO){
    onPick(m.id);
    onClose();
  }

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-auto bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Выбор манги</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-xs">✕</button>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 relative">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Название..." className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-600 text-sm" />
          <button type="submit" disabled={loading} className="px-3 py-1 rounded bg-purple-600 text-sm disabled:opacity-50 min-w-[70px]">{loading? '...' : 'Поиск'}</button>
          {q.trim().length>0 && q.trim().length<3 && (
            <div className="absolute -bottom-5 left-0 text-[10px] text-neutral-400">Введите минимум 3 символа</div>
          )}
        </form>
        <div className="max-h-80 overflow-auto space-y-2 pr-1 custom-scroll">
          {error && <div className="text-xs text-red-400">{error}</div>}
          {results.length===0 && !loading && !error && <div className="text-xs text-neutral-500">Нет результатов</div>}
          {results.map(m => {
            const slug = m.title.toLowerCase().replace(/[^a-z0-9\s-]/gi,'').replace(/\s+/g,'-').replace(/-+/g,'-');
            return (
              <button key={m.id} type="button" onClick={()=>pick(m)} className="w-full text-left flex gap-3 p-2 rounded hover:bg-neutral-800">
                {m.coverImageUrl && <img src={m.coverImageUrl} alt={m.title} className="w-10 h-14 object-cover rounded" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium line-clamp-2">{m.title}</div>
                  <div className="text-[10px] text-neutral-500 truncate">/manga/{m.id}--{slug}</div>
                </div>
                <span className="text-[10px] text-purple-300">Добавить</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
