import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { isOpen, setIsOpen } as any)
          : child
      )}
    </div>
  )
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  children, 
  asChild, 
  isOpen, 
  setIsOpen 
}) => {
  const handleClick = () => {
    setIsOpen?.(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    } as any)
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  children, 
  align = 'end',
  isOpen,
  setIsOpen 
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  const alignClass = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0'
  }[align]

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-[50] min-w-[8rem] overflow-hidden rounded-md border bg-gray-800 p-1 text-white shadow-lg mt-1",
        alignClass
      )}
    >
      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { setIsOpen } as any)
          : child
      )}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  setIsOpen?: (open: boolean) => void
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  onClick, 
  className,
  setIsOpen 
}) => {
  const handleClick = () => {
    onClick?.()
    setIsOpen?.(false)
  }

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-700 focus:bg-gray-700",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}
