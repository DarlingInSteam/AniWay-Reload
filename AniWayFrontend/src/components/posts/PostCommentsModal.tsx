import React, { useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { CommentSection } from '@/components/comments/CommentSection';
import { Post } from '@/types/posts';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { MangaMiniCard } from './MangaMiniCard';
import { apiClient } from '@/lib/api';

interface PostCommentsModalProps {
  open: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdated?: (post: Post) => void;
  // notify parent about comments count delta (+1 on create, -1 on delete)
  onCommentsCountChange?: (delta: number) => void;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ open, onClose, post, onPostUpdated, onCommentsCountChange }) => {
  // Author profile (avatar + nick)
  const [authorName,setAuthorName] = useState<string|undefined>();
  const [authorAvatar,setAuthorAvatar] = useState<string|undefined>();
  useEffect(()=>{
    if(!open) return;
    (async()=>{
      try {
        const profile = await apiClient.getUserPublicProfile(post.userId);
        setAuthorName((profile as any).username || (profile as any).displayName || `User #${post.userId}`);
        // @ts-ignore gather potential avatar fields
        setAuthorAvatar(profile.avatarUrl || profile.profileImageUrl || profile.imageUrl || profile.avatar || profile.avatarURL || profile.profileAvatar || profile.avatarPath);
      } catch { setAuthorName(`User #${post.userId}`); }
    })();
  }, [open, post.userId]);
  useEffect(()=>{
    if(open){
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return ()=>{ document.body.style.overflow = prev; window.removeEventListener('keydown', handler); };
    }
  }, [open, onClose]);

  // Resolve manga references inside modal (replicates logic from PostItem)
  const [resolvedContent, setResolvedContent] = useState(post.content);
  const [referencedManga, setReferencedManga] = useState<Array<{id:number; title:string; coverUrl?:string}>>([]);
  useEffect(()=>{
    if(!open) return; // only process when modal is open
    let cancelled = false;
    async function resolve(){
      const pattern = /\[\[manga:(\d+)\]\]/g;
      const ids = Array.from(new Set([...post.content.matchAll(pattern)].map(m=>parseInt(m[1]))));
      if(ids.length===0){ setResolvedContent(post.content); setReferencedManga([]); return; }
      const titleMap: Record<number,string> = {}; const coverMap: Record<number,string|undefined> = {};
      await Promise.all(ids.map(async id => {
        try {
          const m = await apiClient.getMangaById(id);
          if(m){
            titleMap[id] = (m as any).title || `Манга #${id}`;
            coverMap[id] = (m as any).coverUrl || (m as any).coverImageUrl;
          } else { titleMap[id] = `Манга #${id}`; }
        } catch { titleMap[id] = `Манга #${id}`; }
      }));
      if(cancelled) return;
      const slugCache: Record<number,string> = {};
      const replaced = post.content.replace(pattern, (_,id)=>{
        const num = parseInt(id);
        const title = titleMap[num];
        const slug = slugCache[num] || title.toLowerCase().replace(/[^a-z0-9\s-]/gi,'').replace(/\s+/g,'-').replace(/-+/g,'-');
        return `[${title}](/manga/${num}--${slug})`;
      });
      setResolvedContent(replaced);
      setReferencedManga(ids.map(id=>({ id, title: titleMap[id], coverUrl: coverMap[id] })));
    }
    resolve();
    return ()=>{ cancelled = true };
  }, [open, post.content]);

  // Comments count handling
  const [commentsCount, setCommentsCount] = useState<number|undefined>(undefined);
  const handleCountChange = (count: number) => {
    setCommentsCount(prev => {
      if(prev === undefined){
        // initial load: compute delta from post.stats if available
        if(typeof post.stats?.commentsCount === 'number' && post.stats.commentsCount !== count){
          const delta = count - (post.stats.commentsCount||0);
          if(delta !== 0) onCommentsCountChange?.(delta);
        }
      } else if(prev !== count){
        const delta = count - prev;
        if(delta !== 0) onCommentsCountChange?.(delta);
      }
      return count;
    });
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-auto h-[85vh] glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border border-white/15 overflow-hidden flex items-center justify-center text-xs text-slate-300 font-semibold">
              {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover"/> : (authorName? authorName[0]?.toUpperCase(): '?')}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium text-slate-200 truncate">{authorName || '...'}</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MessageCircle size={12} /> Комментарии {commentsCount !== undefined && (
                  <span className="text-purple-300">({commentsCount})</span>
                )}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-slate-300" aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
        {/* Scrollable Body (vertical stack) */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Пост</div>
            <div className="prose prose-invert max-w-none text-sm">
              <MarkdownRenderer value={resolvedContent} />
            </div>
            {referencedManga.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {referencedManga.map(m => (
                  <MangaMiniCard key={m.id} id={m.id} title={m.title} coverUrl={m.coverUrl} />
                ))}
              </div>
            )}
          </div>
          <div>
            <CommentSection 
              targetId={post.id as any} 
              type={'POST' as any} 
              title="Комментарии" 
              onCountChange={handleCountChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCommentsModal;