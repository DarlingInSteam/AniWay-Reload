import React, { useState, useRef } from 'react';
import { postService } from '@/services/postService';
import { extractMangaReferenceRawTokens } from '@/types/posts';

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
  const [attachments, setAttachments] = useState<string[]>([]);

  async function handleImagePick(){
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    setUploading(true);
    try {
      const att = await postService.uploadImage(file);
      if(att && att.id){
        setAttachments(a => [...a, att.id!]);
        setContent(c => c + `\n\n![image](${att.url})`);
      }
    } finally { setUploading(false); e.target.value=''; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
  await postService.createPost(userId, { content, attachmentIds: attachments });
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
      <textarea
        className="w-full resize-y min-h-[120px] p-2 bg-neutral-900 border border-neutral-600 rounded text-sm"
        placeholder="Напишите пост... Поддерживается markdown. Ссылки на мангу: [[manga:123]]"
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={submitting}
      />
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs text-purple-300">
          {refs.map(r => <span key={r} className="px-1.5 py-0.5 bg-purple-700/30 rounded">manga:{r}</span>)}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          <button type="button" onClick={handleImagePick} disabled={uploading || submitting} className="px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50">{uploading? 'Загрузка...' : 'Изображение'}</button>
          {attachments.length>0 && <span className="text-xs text-neutral-400">Прикреплено: {attachments.length}</span>}
        </div>
        <div>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
        >{submitting ? 'Публикация...' : 'Опубликовать'}</button>
        </div>
      </div>
    </form>
  );
};
