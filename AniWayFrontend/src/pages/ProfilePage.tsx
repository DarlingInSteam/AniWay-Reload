import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBookmarkStats } from '../hooks/useBookmarks'
import { useReadingStats } from '../hooks/useProgress'
import { useQuery } from '@tanstack/react-query'
import { bookmarkService } from '../services/bookmarkService'
import { User } from '../types'
import { Camera, Edit3, Settings, Trophy, Star, Clock, Users, MessageCircle, Book, TrendingUp } from 'lucide-react'

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, isAdmin, isTranslator } = useAuth()
  const { stats: bookmarkStats, loading: bookmarkLoading } = useBookmarkStats()
  const { stats: readingStats, loading: readingLoading } = useReadingStats()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<User>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Получаем избранные закладки
  const { data: favoriteBookmarks } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => bookmarkService.getFavoriteBookmarks(),
    enabled: !!user
  })

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
    if (isAdmin) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (isTranslator) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    return 'bg-primary/20 text-primary border-primary/30'
  }

  // Мок данные для демонстрации дизайна
  const mockReadingHistory = [
    { date: '01 сентября 2025', chapter: 274, manga: 'Наномашины' },
    { date: '31 августа 2025', chapter: 89, manga: 'Соло левелинг' },
    { date: '30 августа 2025', chapter: 156, manga: 'Башня Бога' },
    { date: '29 августа 2025', chapter: 45, manga: 'Чернобыльская зона' },
    { date: '28 августа 2025', chapter: 112, manga: 'Мастер клинка демонов' }
  ]

  const mockAchievements = [
    { icon: '📚', title: 'Книголюб', description: 'Прочитать 100 глав' },
    { icon: '🏆', title: 'Коллекционер', description: 'Добавить 50 манг в закладки' },
    { icon: '⭐', title: 'Критик', description: 'Оставить первый отзыв' },
    { icon: '🔥', title: 'Марафонец', description: 'Читать 7 дней подряд' }
  ]

  const userLevel = Math.floor((readingStats?.totalChaptersRead || 0) / 50) + 1
  const levelProgress = ((readingStats?.totalChaptersRead || 0) % 50) / 50 * 100

  return (
    <div className="min-h-screen bg-manga-black">
      {/* Обложка профиля */}
      <div className="relative h-80 bg-gradient-to-br from-primary/60 via-purple-600/40 to-pink-600/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-manga-black/80 via-transparent to-transparent" />
        
        {/* Кнопки действий */}
        <div className="absolute top-6 right-6 flex space-x-3">
          <button className="p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors">
            <Camera className="w-5 h-5" />
          </button>
          <button 
            onClick={isEditing ? handleCancel : handleEdit}
            className="p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          >
            {isEditing ? <Settings className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
          </button>
        </div>

        {/* Информация о пользователе */}
        <div className="absolute bottom-8 left-8 flex items-end space-x-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border-4 border-white/20 overflow-hidden">
              {user.avatar || user.profilePicture ? (
                <img 
                  src={user.avatar || user.profilePicture} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-green-500 rounded-full border-4 border-manga-black">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
          
          <div className="text-white pb-4">
            <h1 className="text-4xl font-bold mb-2">{user.displayName || user.username}</h1>
            <p className="text-white/80 mb-3">{user.email}</p>
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getRoleBadgeColor()}`}>
                {getRoleDisplayName()}
              </span>
              <span className="text-white/60 text-sm">
                Зарегистрирован: {(() => {
                  const dateStr = user.createdAt || user.registrationDate;
                  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : 'Неизвестно';
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Сетка контента */}
        <div className="grid grid-cols-12 gap-8">
          {/* Левая колонка */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Уровень */}
            <div className="bg-card rounded-2xl border border-border/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                  Уровень
                </h3>
                <span className="text-3xl font-bold text-primary">#{userLevel}</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span className="text-white">{Math.floor(levelProgress)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-primary to-purple-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    {50 - ((readingStats?.totalChaptersRead || 0) % 50)} глав до следующего уровня
                  </p>
                </div>
              </div>
            </div>

            {/* История чтения */}
            <div className="bg-card rounded-2xl border border-border/30 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                История чтения
              </h3>
              
              <div className="space-y-4">
                {mockReadingHistory.map((item, index) => (
                  <div key={index} className="border-l-2 border-primary/30 pl-4 pb-4 last:pb-0">
                    <div className="text-sm text-muted-foreground mb-1">{item.date}</div>
                    <div className="text-white">
                      Прочитана <span className="text-primary font-medium">{item.chapter} глава</span>, манги{' '}
                      <span className="text-white font-medium">{item.manga}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Избранные закладки */}
            <div className="bg-card rounded-2xl border border-border/30 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Star className="w-5 h-5 mr-2 text-primary" />
                Избранное
              </h3>
              
              {favoriteBookmarks && favoriteBookmarks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteBookmarks.slice(0, 8).map((bookmark: any) => (
                    <div key={bookmark.id} className="group cursor-pointer">
                      <div className="aspect-[3/4] bg-white/5 rounded-xl overflow-hidden mb-3 border border-border/20 group-hover:border-primary/40 transition-colors relative">
                        {(bookmark.mangaCoverUrl || bookmark.manga?.imageUrl) && (
                          <img 
                            src={bookmark.mangaCoverUrl || bookmark.manga?.imageUrl} 
                            alt={bookmark.mangaTitle || bookmark.manga?.title || 'Manga'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        {/* Прогресс чтения */}
                        {bookmark.currentChapter && bookmark.totalChapters && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                            <div className="flex justify-between items-center">
                              <span>Глава {bookmark.currentChapter}/{bookmark.totalChapters}</span>
                              <div className="w-16 bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-primary h-1 rounded-full"
                                  style={{ 
                                    width: `${Math.min(100, (bookmark.currentChapter / bookmark.totalChapters) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="text-white text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {bookmark.mangaTitle || bookmark.manga?.title || 'Без названия'}
                      </h4>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Нет избранных манг</p>
                </div>
              )}
            </div>

            {/* Достижения */}
            <div className="bg-card rounded-2xl border border-border/30 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-primary" />
                Достижения
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockAchievements.map((achievement, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl border border-border/20">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div>
                      <h4 className="text-white font-medium">{achievement.title}</h4>
                      <p className="text-muted-foreground text-sm">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Обо мне */}
        <div className="mt-8 bg-card rounded-2xl border border-border/30 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Book className="w-5 h-5 mr-2 text-primary" />
            Обо мне
          </h3>
          
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
                  className="w-full px-4 py-3 bg-white/5 border border-border/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
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
                  className="w-full px-4 py-3 bg-white/5 border border-border/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors resize-none"
                  placeholder="Расскажите о себе..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/80 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              {user.bio || 'Пользователь пока не добавил информацию о себе.'}
            </p>
          )}
        </div>

        {/* Друзья */}
        <div className="mt-8 bg-card rounded-2xl border border-border/30 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            Друзья
            <span className="ml-2 text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">Скоро</span>
          </h3>
          
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Функция друзей появится в скором времени</p>
          </div>
        </div>

        {/* Комментарии */}
        <div className="mt-8 bg-card rounded-2xl border border-border/30 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-primary" />
            Комментарии
            <span className="ml-2 text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">Скоро</span>
          </h3>
          
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Комментарии к профилю появятся в скором времени</p>
          </div>
        </div>
      </div>
    </div>
  )
}
