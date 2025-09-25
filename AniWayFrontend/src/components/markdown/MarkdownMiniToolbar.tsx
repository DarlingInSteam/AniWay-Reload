import React from 'react';
import {
  Bold, Italic, Code, Link as LinkIcon, Quote, List, ListOrdered, Heading1, Heading2, Strikethrough, EyeOff, Sparkles, Minus
} from 'lucide-react';

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
    <div className={"flex flex-wrap gap-1.5 " + (className||'')}> 
      {buttons.map(btn => (
        <button
          key={btn.cmd}
          type="button"
          onClick={()=> onCommand(btn.cmd)}
          title={btn.title}
          className="group relative flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition active:scale-[.95]"
        >
          <span className="sr-only">{btn.label}</span>
          {btn.icon}
          <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap hidden md:block">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MarkdownMiniToolbar;