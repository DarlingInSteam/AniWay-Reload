import React, { useState, useEffect } from 'react';
import { Post } from '@/types/posts';
import { postService } from '@/services/postService';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { MangaMiniCard } from './MangaMiniCard';

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

  async function handleVote(value: 1 | -1) {
    const newValue = localPost.stats.userVote === value ? 0 : value;
    const updated = await postService.vote(localPost.id, newValue);
    if (updated) {
      setLocalPost({ ...updated });
      onUpdated?.(updated);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updated = await postService.updatePost(localPost.id, { content: editContent });
    setSaving(false);
    if (updated) {
      setLocalPost(updated);
      setEditing(false);
      onUpdated?.(updated);
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить пост?')) return;
    const ok = await postService.deletePost(localPost.id);
    if (ok) onDeleted?.(localPost.id);
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

  return (
  <div className="p-4 rounded-xl glass-panel space-y-3">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>ID: {localPost.id}</span>
        <span>{new Date(localPost.createdAt).toLocaleString()}</span>
      </div>
      {editing ? (
        <form onSubmit={handleSave} className="space-y-2">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[100px] p-2 bg-neutral-900 border border-neutral-600 rounded text-sm"
            disabled={saving}
          />
          <div className="flex gap-2 justify-end text-sm">
            <button type="button" onClick={() => setEditing(false)} className="px-2 py-1 bg-neutral-700 rounded">Отмена</button>
            <button type="submit" disabled={saving} className="px-3 py-1 bg-purple-600 rounded disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
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
      <div className="flex items-center gap-3 text-sm pt-1">
        <div className="flex items-center gap-1">
          <button onClick={() => handleVote(1)} className={"px-2 py-1 rounded text-xs " + (localPost.stats.userVote === 1 ? 'bg-green-600' : 'bg-neutral-700')}>+{localPost.stats.up}</button>
          <button onClick={() => handleVote(-1)} className={"px-2 py-1 rounded text-xs " + (localPost.stats.userVote === -1 ? 'bg-red-600' : 'bg-neutral-700')}>-{localPost.stats.down}</button>
          <span className="text-xs text-neutral-400">Score {localPost.stats.score}</span>
        </div>
        {canEdit && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-xs text-purple-300 hover:text-purple-200">Редактировать</button>
            <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
          </>
        )}
        {!withinWindow && (
          <span className="text-[10px] text-neutral-500">Окно редактирования истекло</span>
        )}
      </div>
    </div>
  );
};
