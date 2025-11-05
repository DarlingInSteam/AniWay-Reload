import React from 'react';
import {
  Bold, Italic, Code, Link as LinkIcon, Quote, List, ListOrdered, Heading1, Heading2, Strikethrough, EyeOff, Sparkles, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MarkdownMiniToolbarProps {
  onCommand: (cmd: string) => void;
  small?: boolean;
  className?: string;
}

const buttons: Array<{cmd: string; label: string; icon: React.ReactNode; title: string}> = [
  { cmd: 'bold', label: 'B', icon: <Bold size={16} />, title: 'Жирный ** **' },
  { cmd: 'italic', label: 'I', icon: <Italic size={16} />, title: 'Курсив * *' },
  { cmd: 'strike', label: 'S', icon: <Strikethrough size={16} />, title: 'Зачеркнутый ~~ ~~' },
  { cmd: 'code', label: '</>', icon: <Code size={16} />, title: 'Код `inline`' },
  { cmd: 'link', label: '🔗', icon: <LinkIcon size={16} />, title: 'Ссылка [текст](url)' },
  { cmd: 'spoiler', label: '!!', icon: <EyeOff size={16} />, title: 'Спойлер >! !<' },
  { cmd: 'quote', label: '"', icon: <Quote size={16} />, title: 'Цитата > ' },
  { cmd: 'ul', label: '•', icon: <List size={16} />, title: 'Список - ' },
  { cmd: 'ol', label: '1.', icon: <ListOrdered size={16} />, title: 'Нумерованный список 1. ' },
  { cmd: 'h1', label: 'H1', icon: <Heading1 size={16} />, title: 'Заголовок # ' },
  { cmd: 'h2', label: 'H2', icon: <Heading2 size={16} />, title: 'Подзаголовок ## ' },
  { cmd: 'hr', label: '—', icon: <Minus size={16} />, title: 'Горизонтальная линия ---' },
  { cmd: 'spark', label: '*', icon: <Sparkles size={16} />, title: 'Украшение **✨**' },
];

export const MarkdownMiniToolbar: React.FC<MarkdownMiniToolbarProps> = ({ onCommand, small, className }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 pb-1 sm:pb-0',
        'overflow-x-auto sm:overflow-visible',
        'flex-nowrap sm:flex-wrap',
        'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
        'px-0.5 sm:px-0',
        className
      )}
    >
      {buttons.map(btn => (
        <button
          key={btn.cmd}
          type="button"
          onClick={() => onCommand(btn.cmd)}
          title={btn.title}
          className={cn(
            'group relative flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-[.96]',
            small ? 'h-7 w-7 text-[13px]' : 'h-8 w-8'
          )}
        >
          <span className="sr-only">{btn.label}</span>
          {btn.icon}
          <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100 hidden md:block">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MarkdownMiniToolbar;