import React from 'react';

interface MangaMiniCardProps {
  id: number;
  title: string;
  coverUrl?: string;
}

export const MangaMiniCard: React.FC<MangaMiniCardProps> = ({ id, title, coverUrl }) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/gi,'').replace(/\s+/g,'-').replace(/-+/g,'-');
  return (
    <a href={`/manga/${id}--${slug}`} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs">
      {coverUrl && <img src={coverUrl} alt={title} className="w-8 h-12 object-cover rounded" />}
      <span className="line-clamp-2 leading-snug text-slate-200">{title}</span>
    </a>
  );
};
