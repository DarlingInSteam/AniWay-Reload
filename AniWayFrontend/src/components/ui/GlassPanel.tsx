import React from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'inline' | 'accent'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  asChild?: boolean
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8'
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  className,
  children,
  variant = 'default',
  padding = 'md',
  ...rest
}) => {
  const base = variant === 'inline' ? 'glass-inline' : variant === 'accent' ? 'glass-panel glass-accent' : 'glass-panel'
  return (
    <div className={cn(base, paddingMap[padding], className)} {...rest}>
      {children}
    </div>
  )
}

export default GlassPanel
