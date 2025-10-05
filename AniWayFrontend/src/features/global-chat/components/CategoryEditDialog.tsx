import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import type { CategoryView } from '@/types/social';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CategoryEditPayload {
  title?: string;
  description?: string;
  isDefault: boolean;
  isArchived: boolean;
}

interface CategoryEditDialogProps {
  category: CategoryView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (payload: CategoryEditPayload) => Promise<void>;
}

export function CategoryEditDialog({ category, open, onOpenChange, onUpdate }: CategoryEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setTitle(category.title);
      setDescription(category.description ?? '');
      setIsDefault(category.isDefault);
      setIsArchived(category.isArchived);
    }
  }, [category, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) {
      toast.error('Выберите категорию для редактирования');
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const payload: CategoryEditPayload = {
      title: trimmedTitle || undefined,
      description: trimmedDescription === '' ? '' : trimmedDescription,
      isDefault,
      isArchived,
    };

    setSubmitting(true);
    try {
      await onUpdate(payload);
      toast.success('Категория обновлена');
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.message || 'Не удалось обновить категорию';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-background/95 text-white">
        <DialogHeader>
          <DialogTitle>Настройки категории</DialogTitle>
          <DialogDescription className="text-sm text-white/60">
            Обновите параметры выбранного канала.
          </DialogDescription>
        </DialogHeader>
        {category ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Название"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
            />
            <Textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Описание"
              className="min-h-[90px] border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40"
            />
            <div className="flex flex-col gap-2 text-xs text-white/70">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={event => setIsDefault(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                Сделать категорией по умолчанию
              </label>
              <label className="flex items-center gap-2 text-orange-200/80">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={event => setIsArchived(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                Переместить в архив
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-white/60">Выберите категорию для редактирования.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { CategoryEditPayload };
