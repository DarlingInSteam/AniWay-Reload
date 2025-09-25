import React, { useState, useEffect, useRef } from 'react';
import { Post } from '@/types/posts';
import { postService } from '@/services/postService';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { MangaMiniCard } from './MangaMiniCard';
import { MarkdownMiniToolbar } from '@/components/markdown/MarkdownMiniToolbar';
import { MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { extractAvatar, avatarFallbackLetter } from '@/lib/avatar';
import { PostCommentsModal } from './PostCommentsModal';

interface PostItemProps {
  post: Post;
  currentUserId?: number;
  onUpdated?: (post: Post) => void;
  onDeleted?: (id: string) => void;
}

export const PostItem: React.FC<PostItemProps> = ({ post, currentUserId, onUpdated, onDeleted }) => {
  const [localPost, setLocalPost] = useState(post);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string|null>(null);

  async function handleVote(value: 1 | -1) {
    const newValue = localPost.stats.userVote === value ? 0 : value;
    const updated = await postService.vote(localPost.id, newValue);
    if (updated) {
      setLocalPost({ ...updated });
      onUpdated?.(updated);
    }
  }

  const editAreaRef = useRef<HTMLTextAreaElement|null>(null);

  function wrapEdit(before:string, after:string=before){
    const ta = editAreaRef.current; if(!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd; const sel = editContent.substring(start,end);
    const next = editContent.slice(0,start)+before+sel+after+editContent.slice(end);
    setEditContent(next);
    requestAnimationFrame(()=>{ if(!ta) return; ta.focus(); ta.selectionStart = start + before.length; ta.selectionEnd = start + before.length + sel.length; });
  }
  function applyFormat(cmd:string){
    switch(cmd){
      case 'bold': return wrapEdit('**','**');
      case 'italic': return wrapEdit('*','*');
      case 'strike': return wrapEdit('~~','~~');
      case 'code': return wrapEdit('`','`');
      case 'spoiler': return wrapEdit('>!','!<');
      case 'quote': return wrapEdit('\n> ','');
      case 'ul': return wrapEdit('\n- ','');
      case 'ol': return wrapEdit('\n1. ','');
      case 'h1': return wrapEdit('\n# ','');
      case 'h2': return wrapEdit('\n## ','');
      case 'link': return wrapEdit('[',' ](url)');
      case 'hr': return setEditContent(c=> c + (c.endsWith('\n')?'':'\n') + '\n---\n');
      case 'spark': return wrapEdit('**✨','✨**');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const updated = await postService.updatePost(localPost.id, { content: editContent });
      if (updated) {
        setLocalPost(updated);
        setEditing(false);
        onUpdated?.(updated);
      } else {
        setActionError('Не удалось сохранить (нет ответа)');
      }
    } catch (e:any) {
      setActionError(e?.message || 'Ошибка сохранения');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Удалить пост?')) return;
    setActionError(null);
    try {
      const ok = await postService.deletePost(localPost.id);
      if (ok) onDeleted?.(localPost.id); else setActionError('Удаление не удалось');
    } catch (e:any) {
      setActionError(e?.message || 'Ошибка удаления');
    }
  }

  const withinWindow = localPost.editedUntil ? new Date(localPost.editedUntil).getTime() > Date.now() : true;
  const canEdit = localPost.canEdit && withinWindow && currentUserId === localPost.userId;

  // Transform content: replace [[manga:ID]] with markdown link using cached or placeholder title
  const [resolvedContent, setResolvedContent] = useState<string>(localPost.content);
  const [referencedManga, setReferencedManga] = useState<Array<{id:number; title:string; coverUrl?: string}>>([]);
  useEffect(()=>{
    let cancelled = false;
    async function resolve(){
      const pattern = /\[\[manga:(\d+)\]\]/g;
      const ids = Array.from(new Set([...localPost.content.matchAll(pattern)].map(m=>parseInt(m[1]))));
      if(ids.length===0){ setResolvedContent(localPost.content); return; }
      const titleMap: Record<number,string> = {};
      const coverMap: Record<number,string|undefined> = {};
      await Promise.all(ids.map(async id => {
        try {
          const m = await apiFetchManga(id);
          if(m){
            titleMap[id] = m.title || `Манга #${id}`;
            coverMap[id] = m.coverUrl;
          } else {
            titleMap[id] = `Манга #${id}`;
          }
        } catch {
          titleMap[id] = `Манга #${id}`;
        }
      }));
      if(cancelled) return;
      const slugCache: Record<number,string> = {};
      // fetch slug along with title if API returns it
      const replaced = localPost.content.replace(pattern, (_,id)=>{
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
  }, [localPost.content]);

  async function apiFetchManga(id:number): Promise<{title:string; coverUrl?:string}|undefined> {
    try {
      const m = await (await import('@/lib/api')).apiClient.getMangaById(id);
      return { title: m.title, coverUrl: (m as any).coverImageUrl }; // fallback to known field
    } catch { return undefined }
  }

  const [authorName,setAuthorName] = useState<string|undefined>(undefined);
  const [authorAvatar,setAuthorAvatar] = useState<string|undefined>(undefined);
  const [commentsOpen,setCommentsOpen] = useState(false);
  // Ensure initial comments count reflects backend real count
  useEffect(()=>{
    if((localPost.stats.commentsCount||0) === 0){
      const numericId = parseInt(localPost.id as any,10);
      if(!Number.isFinite(numericId)) return;
      import('@/services/commentService').then(({commentService})=>{
        commentService.getCommentsCount(numericId,'POST').then(count=>{
          if(count>0){
            setLocalPost(lp=>({...lp, stats:{...lp.stats, commentsCount: count}}));
          }
        }).catch(()=>{});
      });
    }
  }, [localPost.id]);
  useEffect(()=>{
    (async()=>{
      try {
        const profile = await apiClient.getUserPublicProfile(localPost.userId);
        setAuthorName((profile as any).username || (profile as any).displayName || `User #${localPost.userId}`);
        setAuthorAvatar(extractAvatar(profile));
      } catch {
        setAuthorName(`User #${localPost.userId}`);
      }
    })();
  }, [localPost.userId]);

  return (
  <>
  <div className="p-4 rounded-xl glass-panel space-y-3 relative">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border border-white/15 overflow-hidden flex items-center justify-center text-xs text-slate-300 font-semibold">
          {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover"/> : avatarFallbackLetter(authorName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-slate-200">{authorName || '...'}</span>
              <span className="text-[10px] text-slate-400">ID: {localPost.id}</span>
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              {new Date(localPost.createdAt).toLocaleString()}<br/>
              {localPost.updatedAt && localPost.updatedAt !== localPost.createdAt && (
                <span className="text-purple-300">(ред.)</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {editing ? (
        <form onSubmit={handleSave} className="space-y-2">
          <MarkdownMiniToolbar onCommand={applyFormat} />
          <textarea
            ref={editAreaRef}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[140px] p-3 bg-white/5 border border-white/10 rounded-lg text-sm font-mono focus:outline-none focus:border-purple-500/60"
            disabled={saving}
          />
          {actionError && <div className="text-xs text-red-400">{actionError}</div>}
          <div className="flex gap-2 justify-end text-sm">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10">Отмена</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </form>
      ) : (
        <div className="prose prose-invert max-w-none text-sm">
          <MarkdownRenderer value={resolvedContent} />
        </div>
      )}
      {referencedManga.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {referencedManga.map(m => (
            <MangaMiniCard key={m.id} id={m.id} title={m.title} coverUrl={m.coverUrl} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-sm pt-1 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => handleVote(1)} className={"px-2 py-1 rounded text-xs " + (localPost.stats.userVote === 1 ? 'bg-green-600' : 'bg-neutral-700')}>+{localPost.stats.up}</button>
          <button onClick={() => handleVote(-1)} className={"px-2 py-1 rounded text-xs " + (localPost.stats.userVote === -1 ? 'bg-red-600' : 'bg-neutral-700')}>-{localPost.stats.down}</button>
          <span className="text-xs text-neutral-400">Score {localPost.stats.score}</span>
        </div>
        <button type="button" onClick={()=>setCommentsOpen(true)} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/10 transition">
          <MessageCircle size={14} />
          <span>Комментарии</span>
          <span className="text-[10px] px-1 rounded bg-purple-600/20 text-purple-300">
            {localPost.stats.commentsCount ?? 0}
          </span>
        </button>
        {canEdit && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-xs text-purple-300 hover:text-purple-200">Редактировать</button>
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
          </>
        )}
        {actionError && !editing && (
          <span className="text-[10px] text-red-400">{actionError}</span>
        )}
        {!withinWindow && (
          <span className="text-[10px] text-neutral-500">Окно редактирования истекло</span>
        )}
      </div>
    </div>
    <PostCommentsModal 
      open={commentsOpen} 
      onClose={()=>setCommentsOpen(false)} 
      post={localPost} 
      onPostUpdated={(p)=>{ setLocalPost(p); onUpdated?.(p); }}
      onCommentsCountChange={(delta)=>{
        setLocalPost(lp=>({
          ...lp,
          stats: { ...lp.stats, commentsCount: Math.max(0, (lp.stats.commentsCount||0) + delta) }
        }));
      }}
    />
  </>
  );
};
