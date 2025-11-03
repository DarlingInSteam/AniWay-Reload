import React, { useState, useRef } from 'react';
import { postService } from '@/services/postService';
import { extractMangaReferenceRawTokens, PostAttachmentInput } from '@/types/posts';
import { MangaReferencePicker } from './MangaReferencePicker';
import { MarkdownMiniToolbar } from '@/components/markdown/MarkdownMiniToolbar';

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
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<PostAttachmentInput[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function wrapSelection(before: string, after: string = before){
    const ta = textareaRef.current; if(!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd; const sel = content.substring(start,end);
    const next = content.slice(0,start) + before + sel + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(()=>{ if(!ta) return; ta.focus(); ta.selectionStart = start + before.length; ta.selectionEnd = start + before.length + sel.length; });
  }
  function applyFormat(type: string){
    switch(type){
      case 'bold': return wrapSelection('**','**');
      case 'italic': return wrapSelection('*','*');
      case 'strike': return wrapSelection('~~','~~');
      case 'code': return wrapSelection('`','`');
      case 'spoiler': return wrapSelection('>!','!<');
      case 'quote': return wrapSelection('\n> ','');
      case 'ul': return wrapSelection('\n- ','');
      case 'ol': return wrapSelection('\n1. ','');
      case 'h1': return wrapSelection('\n# ','');
      case 'h2': return wrapSelection('\n## ','');
      case 'link': return wrapSelection('[',' ](url)');
      case 'hr': return setContent(c => c + (c.endsWith('\n')? '' : '\n') + '\n---\n');
      case 'spark': return wrapSelection('**✨','✨**');
    }
  }
  async function handleImagePick(){ fileInputRef.current?.click(); }
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const files = e.target.files ? Array.from(e.target.files) : []; if(!files.length) return;
    setUploading(true);
    try { const uploaded = await postService.uploadImages(files); if(uploaded.length){ setAttachments(a=>[...a,...uploaded]); setContent(c=> c + uploaded.map(u=>`\n\n![${u.filename}](${u.url})`).join('')); } }
    finally { setUploading(false); e.target.value=''; }
  }
  async function handleSubmit(e: React.FormEvent){
    e.preventDefault(); if(!content.trim()) return;
    setSubmitting(true); setError(null);
    try { await postService.createPost(userId,{ content, attachments }); setContent(''); setAttachments([]); onCreated?.(); }
    catch(e:any){ setError(e?.message || 'Ошибка создания поста'); }
    finally { setSubmitting(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="relative p-4 rounded-2xl border border-white/12 bg-white/[0.04] space-y-3 shadow-sm">
      <MarkdownMiniToolbar onCommand={applyFormat} />
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="w-full resize-y min-h-[160px] leading-relaxed p-3 bg-white/[0.02] focus:bg-white/[0.05] transition border border-white/12 focus:border-purple-500/50 rounded-xl text-sm font-mono relative z-10 outline-none placeholder:text-slate-500"
          placeholder="Напишите пост... Поддерживается markdown. Ссылки на мангу: [[manga:123]]"
          value={content}
          onChange={e=>setContent(e.target.value)}
          disabled={submitting}
        />
        {content && (
          <div className="pointer-events-none absolute inset-0 p-3 whitespace-pre-wrap font-mono text-sm text-transparent selection:bg-purple-500/40 z-0" aria-hidden>
            {content.split(/(\[\[manga:\d+\]\])/g).map((part,i)=>{
              const match = part.match(/\[\[manga:(\d+)\]\]/);
              if(match){ return <span key={i} className="text-sky-300/90 underline decoration-dotted">{part}</span>; }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}
      </div>
      {refs.length>0 && (
        <div className="flex flex-wrap gap-1.5 text-[10px] font-medium text-purple-200/90">
          {refs.map(r=> <span key={r} className="px-2 py-0.5 rounded-full border border-purple-400/30 bg-purple-500/10">manga:{r}</span>)}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          <button
            type="button"
            onClick={handleImagePick}
            disabled={uploading||submitting}
            className="px-3 py-1.5 rounded-md border border-white/12 bg-white/[0.03] hover:bg-white/[0.08] text-[11px] font-medium text-slate-200 disabled:opacity-50 transition"
          >{uploading? 'Загрузка...' : 'Изображения'}</button>
          <button
            type="button"
            onClick={()=>setPickerOpen(true)}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md border border-white/12 bg-white/[0.03] hover:bg-white/[0.08] text-[11px] font-medium text-slate-200 disabled:opacity-50 transition"
          >Манга</button>
          {attachments.length>0 && <span className="text-[11px] text-slate-400">Изображений: {attachments.length}</span>}
        </div>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-sm font-medium text-white shadow disabled:opacity-50 transition"
        >{submitting ? 'Публикация...' : 'Опубликовать'}</button>
      </div>
      <MangaReferencePicker open={pickerOpen} onClose={()=>setPickerOpen(false)} onPick={id=> setContent(c=> c + (c.endsWith(' ')||c===''? '' : ' ') + `[[manga:${id}]] `)} />
    </form>
  );
};
