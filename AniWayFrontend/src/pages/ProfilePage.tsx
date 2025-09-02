import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBookmarkStats } from '../hooks/useBookmarks'
import { useReadingStats } from '../hooks/useProgress'
import { User } from '../types'

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isAdmin, isTranslator } = useAuth()
  const { stats: bookmarkStats, loading: bookmarkLoading } = useBookmarkStats()
  const { stats: readingStats, loading: readingLoading } = useReadingStats()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<User>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-manga-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Требуется авторизация
          </h2>
          <a href="/login" className="text-primary hover:text-primary/80">
            Войти в систему
          </a>
        </div>
      </div>
    )
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditData({
      bio: user.bio || '',
      profilePicture: user.profilePicture || ''
    })
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData({})
    setError(null)
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      await updateProfile(editData)
      setIsEditing(false)
      setEditData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления профиля')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const getRoleDisplayName = () => {
    if (isAdmin) return 'Администратор'
    if (isTranslator) return 'Переводчик'
    return 'Пользователь'
  }

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-red-100 text-red-800'
    if (isTranslator) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-manga-black min-h-screen">
      <div className="bg-card shadow-xl rounded-lg overflow-hidden border border-border/30">
        {/* Заголовок профиля */}
        <div className="bg-gradient-to-r from-primary/80 to-purple-600/80 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
              {user.avatar || user.profilePicture ? (
                <img 
                  src={user.avatar || user.profilePicture} 
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-indigo-600">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1 text-white">
              <h1 className="text-3xl font-bold">{user.displayName || user.username}</h1>
              <p className="text-indigo-100 mb-2">{user.email}</p>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor()} bg-opacity-20 text-white border border-white border-opacity-30`}>
                  {getRoleDisplayName()}
                </span>
                <span className="text-white/70 text-sm">
                  Зарегистрирован: {(() => {
                    const dateStr = user.createdAt || user.registrationDate;
                    return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : 'Неизвестно';
                  })()}
                </span>
              </div>
            </div>

            <button
              onClick={isEditing ? handleCancel : handleEdit}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              {isEditing ? 'Отмена' : 'Редактировать'}
            </button>
          </div>
        </div>

        {/* Контент профиля */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Биография */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-white">О себе</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Ссылка на аватар
                  </label>
                  <input
                    type="url"
                    name="profilePicture"
                    value={editData.profilePicture || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Биография
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={editData.bio || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-border/30 rounded-md text-white focus:outline-none focus:ring-primary/50 focus:border-primary/50"
                    placeholder="Расскажите о себе..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {user.bio || 'Пользователь пока не добавил информацию о себе.'}
              </p>
            )}
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Статистика закладок */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Библиотека</h3>
              {bookmarkLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Читаю</span>
                    <span className="font-medium text-green-400">{bookmarkStats.READING}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Буду читать</span>
                    <span className="font-medium text-blue-400">{bookmarkStats.PLAN_TO_READ}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Прочитано</span>
                    <span className="font-medium text-purple-400">{bookmarkStats.COMPLETED}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Отложено</span>
                    <span className="font-medium text-yellow-400">{bookmarkStats.ON_HOLD}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Брошено</span>
                    <span className="font-medium text-red-400">{bookmarkStats.DROPPED}</span>
                  </div>
                  <hr className="my-3 border-border/30" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">В избранном</span>
                    <span className="font-medium text-red-400">{bookmarkStats.favorites}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Статистика чтения */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Статистика чтения</h3>
              {readingLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Манги прочитано</span>
                    <span className="font-medium text-white">{readingStats?.totalMangaRead || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Глав прочитано</span>
                    <span className="font-medium text-white">{readingStats?.totalChaptersRead || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Страниц прочитано</span>
                    <span className="font-medium text-white">{readingStats?.totalPagesRead || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Серия дней</span>
                    <span className="font-medium text-white">{readingStats?.readingStreak || 0}</span>
                  </div>
                  {readingStats?.favoriteGenres?.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-2">Любимые жанры</span>
                      <div className="flex flex-wrap gap-2">
                        {readingStats.favoriteGenres?.slice(0, 3).map(genre => (
                          <span key={genre} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <h3 className="text-lg font-semibold mb-4 text-white">Быстрые ссылки</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/bookmarks"
                className="p-4 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">📚</div>
                <div className="text-sm font-medium text-white">Закладки</div>
              </a>
              <a
                href="/reading-history"
                className="p-4 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">📖</div>
                <div className="text-sm font-medium text-white">История</div>
              </a>
              <a
                href="/library"
                className="p-4 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm font-medium text-white">Библиотека</div>
              </a>
              <a
                href="/catalog"
                className="p-4 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors"
              >
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm font-medium text-white">Каталог</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
