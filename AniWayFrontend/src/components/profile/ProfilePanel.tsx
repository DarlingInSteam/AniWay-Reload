import React from 'react'
import { cn } from '@/lib/utils'

interface ProfilePanelProps {
  title?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  innerClassName?: string
  children: React.ReactNode
  noPadding?: boolean
  borderlessHeader?: boolean
}

/**
 * Унифицированная панель профиля с фоном в стиле коллекций (glass-panel p-4 lg:p-5)
 */
export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  title,
  actions,
  className,
  innerClassName,
  children,
  noPadding,
  borderlessHeader = false
}) => {
  return (
    <div className={cn('glass-panel p-4 lg:p-5 rounded-2xl shadow-lg', className)}>
      {title && (
        <div className={cn('flex items-center justify-between', !borderlessHeader && 'px-0 pb-3 mb-4 border-b border-white/10')}>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {actions}
        </div>
      )}
      <div className={cn(noPadding ? '' : '', innerClassName)}>
        {children}
      </div>
    </div>
  )
}

export default ProfilePanel
