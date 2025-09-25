import React, { useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { CommentSection } from '@/components/comments/CommentSection';
import { Post } from '@/types/posts';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

interface PostCommentsModalProps {
  open: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdated?: (post: Post) => void;
  // notify parent about comments count delta (+1 on create, -1 on delete)
  onCommentsCountChange?: (delta: number) => void;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ open, onClose, post, onPostUpdated, onCommentsCountChange }) => {
  useEffect(()=>{
    if(open){
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent)=>{ if(e.key==='Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return ()=>{ document.body.style.overflow = prev; window.removeEventListener('keydown', handler); };
    }
  }, [open, onClose]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-auto h-[85vh] glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <MessageCircle size={16} /> Комментарии к посту
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
              <MarkdownRenderer value={post.content} />
            </div>
          </div>
          <div>
            <CommentSection 
              targetId={post.id as any} 
              type={'POST' as any} 
              title="Комментарии" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCommentsModal;