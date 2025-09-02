import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

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
        <a
          href="/login"
          className="text-muted-foreground hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Вход
        </a>
        <a
          href="/register"
          className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Регистрация
        </a>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-muted-foreground hover:text-white focus:outline-none"
      >
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
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
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Мой профиль
          </a>
          
          <a
            href="/library"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Моя библиотека
          </a>

          <a
            href="/bookmarks"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Закладки
          </a>

          <a
            href="/reading-history"
            className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
            onClick={() => setIsOpen(false)}
          >
            История чтения
          </a>

          {isTranslator && (
            <>
              <hr className="my-1 border-border/30" />
              <a
                href="/translator"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Панель переводчика
              </a>
            </>
          )}

          {isAdmin && (
            <>
              <hr className="my-1 border-border/30" />
              <a
                href="/admin"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Админ панель
              </a>
              <a
                href="/admin/users"
                className="block px-4 py-2 text-sm text-white hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Управление пользователями
              </a>
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
