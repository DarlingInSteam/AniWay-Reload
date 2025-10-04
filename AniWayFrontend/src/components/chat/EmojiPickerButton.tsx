import React, { useCallback, useEffect, useRef, useState } from 'react';
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
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-12 right-0 z-50 w-[320px] max-w-[85vw] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl backdrop-blur-xl"
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
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;
