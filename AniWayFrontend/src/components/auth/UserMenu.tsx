import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useResolvedAvatar } from '@/hooks/useResolvedAvatar'

export const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout, isAdmin, isTranslator } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setIsOpen(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          to="/login"
          className="text-muted-foreground hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Вход
        </Link>
        <Link
          to="/register"
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Регистрация
        </Link>
      </div>
    )
  }

  const resolvedAvatar = useResolvedAvatar(user?.id, user?.avatar)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-muted-foreground hover:text-white focus:outline-none"
      >
        {resolvedAvatar ? (
          <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10">
            <img src={resolvedAvatar} alt={user.username} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{user.username}</p>
          {(isAdmin || isTranslator) && (
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Администратор' : 'Переводчик'}
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-50 border border-border/30">
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Мой профиль
          </Link>

          <Link
            to="/bookmarks"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Закладки
          </Link>

          <Link
            to="/reading-history"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            История чтения
          </Link>
          <Link
            to="/settings"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Настройки
          </Link>

          {isTranslator && (
            <>
              <hr className="my-1 border-border/30" />
              <Link
                to="/translator"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Панель переводчика
              </Link>
            </>
          )}

          {/* Раздел управления доступен только для администраторов */}
          {isAdmin && (
            <>
              <hr className="my-1 border-border/30" />
              <Link
                to="/admin"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Управление
              </Link>
              <Link
                to="/admin/users"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Управление пользователями
              </Link>
            </>
          )}

          <hr className="my-1 border-border/30" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-secondary transition-colors"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
