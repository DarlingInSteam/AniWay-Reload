import React from 'react';
import { cn } from '@/lib/utils';

type MessageBubbleVariant = 'default' | 'own' | 'preview';

interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: MessageBubbleVariant;
  highlighted?: boolean;
}

export const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ variant = 'default', highlighted = false, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border px-4 py-3 text-sm leading-relaxed transition-colors duration-200',
          'group-hover/message:outline group-hover/message:outline-1 group-hover/message:outline-white/12',
          variant === 'own' && 'border-primary/50 bg-primary/20 text-white',
          variant === 'default' && 'border-white/10 bg-white/5 text-white/90',
          variant === 'preview' && 'border-white/12 bg-white/5 text-white/70',
          highlighted && 'outline outline-2 outline-primary/60',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

MessageBubble.displayName = 'MessageBubble';
