import { MessageSquare } from 'lucide-react';

export function NoCategorySelected() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-white/60">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-dashed border-white/15 bg-white/5 px-8 py-10 shadow-[0_12px_40px_rgba(15,23,42,0.35)]">
        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/40" />
        <h2 className="text-xl font-semibold text-white">Выберите категорию</h2>
        <p className="mt-2 text-sm text-white/60">Слева представлены каналы глобального чата AniWay. Выберите любой, чтобы начать общение.</p>
      </div>
    </div>
  );
}
