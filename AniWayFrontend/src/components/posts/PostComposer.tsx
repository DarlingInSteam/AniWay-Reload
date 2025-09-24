import React, { useState, useRef, useMemo } from 'react';
import { postService } from '@/services/postService';
import { extractMangaReferenceRawTokens, PostAttachmentInput } from '@/types/posts';
import { MangaReferencePicker } from './MangaReferencePicker';

interface PostComposerProps {
  userId: number;
  onCreated?: () => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ userId, onCreated }) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refs = extractMangaReferenceRawTokens(content);
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<PostAttachmentInput[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleImagePick(){
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const files = e.target.files ? Array.from(e.target.files) : [];
    if(files.length===0) return;
    setUploading(true);
    try {
      const uploaded = await postService.uploadImages(files);
      if(uploaded.length){
        setAttachments(a => [...a, ...uploaded]);
        setContent(c => c + uploaded.map(u=>`\n\n![${u.filename}](${u.url})`).join(''));
      }
    } finally { setUploading(false); e.target.value=''; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
  await postService.createPost(userId, { content, attachments });
      setContent('');
  setAttachments([]);
      onCreated?.();
    } catch (e: any) {
      setError(e.message || 'Ошибка создания поста');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 border border-neutral-700 rounded bg-neutral-800/50">
      <div className="relative">
        <textarea
          className="w-full resize-y min-h-[140px] p-2 bg-neutral-900 border border-neutral-600 rounded text-sm font-mono"
          placeholder="Напишите пост... Поддерживается markdown. Ссылки на мангу: [[manga:123]]"
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={submitting}
        />
        {/* Live token highlight overlay */}
        {content && (
          <div className="pointer-events-none absolute inset-0 p-2 whitespace-pre-wrap font-mono text-sm text-transparent selection:bg-purple-500/40" aria-hidden>
            {content.split(/(\[\[manga:\d+\]\])/g).map((part,i)=>{
              const match = part.match(/\[\[manga:(\d+)\]\]/);
              if(match){
                return <span key={i} className="text-sky-300/90 underline decoration-dotted">{part}</span>;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}
      </div>
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs text-purple-300">
          {refs.map(r => <span key={r} className="px-1.5 py-0.5 bg-purple-700/30 rounded">manga:{r}</span>)}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          <button type="button" onClick={handleImagePick} disabled={uploading || submitting} className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50">{uploading? 'Загрузка...' : 'Изображения'}</button>
          <button type="button" onClick={()=>setPickerOpen(true)} disabled={submitting} className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50">Манга</button>
          {attachments.length>0 && <span className="text-xs text-neutral-400">Изображений: {attachments.length}</span>}
        </div>
        <div>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
        >{submitting ? 'Публикация...' : 'Опубликовать'}</button>
        </div>
      </div>
      <MangaReferencePicker
        open={pickerOpen}
        onClose={()=>setPickerOpen(false)}
        onPick={(id)=> setContent(c => c + (c.endsWith(' ')||c===''? '' : ' ') + `[[manga:${id}]] `)}
      />
    </form>
  );
};
