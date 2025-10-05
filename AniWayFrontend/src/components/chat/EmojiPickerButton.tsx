import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  anchorClassName?: string;
}

export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onEmojiSelect,
  disabled,
  className,
  anchorClassName,
}) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'above' | 'below'>('above');

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth ?? 320;
    const panelHeight = panelRef.current?.offsetHeight ?? 360;
    const margin = 12;

    let top = rect.top - panelHeight - margin;
    let nextPlacement: 'above' | 'below' = 'above';
    if (top < margin) {
      top = rect.bottom + margin;
      nextPlacement = 'below';
    }
    if (top + panelHeight > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - panelHeight - margin);
    }

  let left = rect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

    setPosition({ top, left });
    setPlacement(nextPlacement);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        panelRef.current &&
        anchorRef.current &&
        !panelRef.current.contains(target) &&
        !anchorRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, updatePosition]);

  const handleEmojiSelect = useCallback(
    (emoji: any) => {
      if (emoji?.native) {
        onEmojiSelect(emoji.native as string);
      }
      setOpen(false);
    },
    [onEmojiSelect]
  );

  return (
    <div className={cn('relative', className)}>
      <Button
        ref={anchorRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={cn('h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white hover:border-primary/50 hover:bg-primary/10', anchorClassName)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Выбрать эмодзи"
        title="Выбрать эмодзи"
      >
        <Smile className="h-5 w-5" />
      </Button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: position.top, left: position.left }}
              className={cn(
                'fixed z-[1000] w-[320px] max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl backdrop-blur-xl transition-transform duration-150 ease-out',
                placement === 'below' ? 'origin-top scale-100' : 'origin-bottom scale-100'
              )}
            >
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                perLine={8}
                emojiSize={24}
                emojiButtonSize={36}
                theme="dark"
                locale="ru"
                searchPosition="top"
                previewPosition="none"
                navPosition="top"
                skinTonePosition="search"
                maxFrequentRows={2}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default EmojiPickerButton;
