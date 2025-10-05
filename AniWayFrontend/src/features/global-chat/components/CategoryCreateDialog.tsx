import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CategoryCreatePayload {
  title: string;
  slug?: string;
  description?: string;
  isDefault: boolean;
}

interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CategoryCreatePayload) => Promise<void>;
}

export function CategoryCreateDialog({ open, onOpenChange, onCreate }: CategoryCreateDialogProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setSlug('');
      setDescription('');
      setIsDefault(false);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Укажите название категории');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        title: trimmedTitle,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        isDefault,
      });
      toast.success('Категория создана');
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.message || 'Не удалось создать категорию';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-background/95 text-white">
        <DialogHeader>
          <DialogTitle>Новая категория</DialogTitle>
          <DialogDescription className="text-sm text-white/60">
            Настройте новый канал глобального чата.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Название"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
          />
          <input
            type="text"
            value={slug}
            onChange={event => setSlug(event.target.value)}
            placeholder="Slug (опционально)"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary/60 focus:outline-none"
          />
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Описание"
            className="min-h-[90px] border-white/15 bg-white/5 text-sm text-white placeholder:text-white/40"
          />
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={event => setIsDefault(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40"
            />
            Сделать категорией по умолчанию
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { CategoryCreatePayload };
