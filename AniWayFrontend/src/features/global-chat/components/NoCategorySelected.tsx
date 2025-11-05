import { MessageSquare } from 'lucide-react';

export function NoCategorySelected() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-white/60">
  <div className="w-full max-w-sm rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-8 py-10">
        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/40" />
        <h2 className="text-xl font-semibold text-white">Выберите категорию</h2>
        <p className="mt-2 text-sm text-white/60">Наверху расположены каналы глобального чата AniWay. Выберите любой, чтобы подключиться к обсуждению.</p>
      </div>
    </div>
  );
}
