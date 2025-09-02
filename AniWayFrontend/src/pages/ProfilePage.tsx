import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { 
  User, 
  Edit3, 
  Camera, 
  Settings,
  BookOpen, 
  Heart, 
  Trophy, 
  Clock, 
  TrendingUp, 
  Star, 
  Award,
  Calendar,
  MapPin,
  Sparkles,
  Zap,
  Users,
  MessageCircle
} from 'lucide-react'

const ProfilePage = () => {
  const { user: userProfile, loading: userLoading } = useAuth()

  // Load favorite bookmarks
  const [favoriteBookmarks, setFavoriteBookmarks] = useState<any[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  
  // Load reading stats
  const [readingStats, setReadingStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    const loadFavoriteBookmarks = async () => {
      try {
        setBookmarksLoading(true)
        const token = authService.getToken()
        console.log('Token exists:', !!token)
        console.log('Is authenticated:', authService.isAuthenticated())
        
        if (!token || !authService.isAuthenticated()) {
          console.log('No valid token found, skipping bookmark load')
          return
        }

        console.log('Making request to /api/bookmarks/favorites')
        const response = await fetch('/api/bookmarks/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        
        if (response.ok) {
          const bookmarks = await response.json()
          console.log('Loaded bookmarks:', bookmarks)
          setFavoriteBookmarks(bookmarks || [])
        } else {
          console.log('Failed to load bookmarks, response status:', response.status)
          const errorText = await response.text()
          console.log('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error loading favorite bookmarks:', error)
        setFavoriteBookmarks([])
      } finally {
        setBookmarksLoading(false)
      }
    }

    const loadReadingStats = async () => {
      try {
        setStatsLoading(true)
        const token = authService.getToken()
        
        if (!token || !authService.isAuthenticated()) {
          console.log('No valid token found, skipping stats load')
          return
        }

        console.log('Making request to /api/auth/progress/stats')
        const response = await fetch('/api/auth/progress/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const stats = await response.json()
          console.log('Loaded reading stats:', stats)
          setReadingStats(stats)
        } else {
          console.log('Failed to load stats, response status:', response.status)
          const errorText = await response.text()
          console.log('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error loading reading stats:', error)
        setReadingStats(null)
      } finally {
        setStatsLoading(false)
      }
    }

    if (userProfile) {
      loadFavoriteBookmarks()
      loadReadingStats()
    }
  }, [userProfile])

  // Статистика (используем реальные данные если есть, иначе mock)
  const chaptersRead = readingStats?.totalChaptersRead || readingStats?.chaptersRead || userProfile?.chaptersReadCount || 0
  const completedManga = readingStats?.completedManga || favoriteBookmarks?.filter(b => b.status === 'COMPLETED')?.length || 8
  
  const mockStats = {
    chaptersRead: chaptersRead,
    mangasStarted: readingStats?.mangasStarted || favoriteBookmarks?.length || 12,
    completedManga: completedManga,
    streak: readingStats?.readingStreak || 7,
    level: Math.floor(chaptersRead / 50) + 1,
    exp: chaptersRead % 50,
    nextLevelExp: 50
  }

  const mockAchievements = [
    { id: 1, name: 'Первые шаги', description: 'Прочитать первую мангу', icon: '🌟', unlocked: true },
    { id: 2, name: 'Книжный червь', description: 'Прочитать 100 глав', icon: '📚', unlocked: true },
    { id: 3, name: 'Марафонец', description: '7 дней подряд', icon: '🏃‍♂️', unlocked: true },
    { id: 4, name: 'Коллекционер', description: '10 манг в избранном', icon: '💎', unlocked: false }
  ]

  const mockActivity = [
    { type: 'read', manga: 'One Piece', chapter: 43, time: '2 часа назад' },
    { type: 'favorite', manga: 'Naruto', time: '1 день назад' },
    { type: 'completed', manga: 'Death Note', time: '3 дня назад' },
    { type: 'read', manga: 'Attack on Titan', chapter: 25, time: '5 дней назад' },
    { type: 'favorite', manga: 'Dragon Ball', time: '1 неделю назад' },
    { type: 'read', manga: 'My Hero Academia', chapter: 18, time: '1 неделю назад' },
    { type: 'completed', manga: 'Fullmetal Alchemist', time: '2 недели назад' },
    { type: 'read', manga: 'Demon Slayer', chapter: 12, time: '2 недели назад' }
  ]

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 left-40 w-80 h-80 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="relative mb-8">
          {/* Cover Photo */}
          <div className="h-64 bg-gradient-to-r from-primary/80 via-primary to-secondary rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-4 right-4">
              <button className="bg-white/20 backdrop-blur-sm p-2 rounded-xl hover:bg-white/30 transition-all border border-white/20">
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="relative -mt-16 mx-6">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border/30">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center relative border border-border/30">
                    <User className="w-10 h-10 text-white" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-card flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <button className="absolute -bottom-1 -right-1 bg-card/80 backdrop-blur-sm p-1.5 rounded-lg hover:bg-card transition-all border border-border/30">
                    <Edit3 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                      {userProfile?.displayName || userProfile?.username || 'Пользователь'}
                    </h1>
                    <div className="bg-gradient-to-r from-accent to-orange-500 px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-black" />
                      <span className="text-black font-semibold text-sm">LVL {mockStats.level}</span>
                    </div>
                  </div>
                  
                  {userProfile?.bio && (
                    <p className="text-muted-foreground mb-3">{userProfile.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>На сайте с {new Date(userProfile?.createdAt || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Россия</span>
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-muted-foreground text-sm mb-1">
                      <span>Прогресс до {mockStats.level + 1} уровня</span>
                      <span>{mockStats.exp}/{mockStats.nextLevelExp} XP</span>
                    </div>
                    <div className="bg-secondary rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-accent to-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(mockStats.exp / mockStats.nextLevelExp) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="bg-secondary backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-secondary/80 transition-all text-muted-foreground border border-border/30">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="bg-primary px-6 py-2 rounded-xl hover:bg-primary/80 transition-all text-primary-foreground font-medium">
                    Редактировать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: BookOpen, label: 'Глав прочитано', value: mockStats.chaptersRead, color: 'from-primary to-primary/80' },
            { icon: Heart, label: 'В избранном', value: favoriteBookmarks?.length || 0, color: 'from-red-500 to-red-600' },
            { icon: Trophy, label: 'Завершено', value: mockStats.completedManga, color: 'from-accent to-orange-500' },
            { icon: Zap, label: 'Серия дней', value: mockStats.streak, color: 'from-green-500 to-green-600' }
          ].map((stat, index) => (
            <div key={index} className="bg-card/50 backdrop-blur-xl rounded-2xl p-4 border border-border/30 hover:bg-card/70 transition-all group cursor-pointer">
              <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-muted-foreground text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Favorite Manga */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Избранные манги
                </h3>
                <button className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Смотреть все
                </button>
              </div>
              
              {favoriteBookmarks && favoriteBookmarks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favoriteBookmarks.slice(0, 4).map((bookmark: any) => (
                    <div key={bookmark.id} className="group cursor-pointer">
                      <div className="aspect-[3/4] bg-card/30 rounded-2xl overflow-hidden mb-3 relative hover:scale-105 transition-all duration-300">
                        {(bookmark.mangaCoverUrl || bookmark.manga?.imageUrl) && (
                          <img 
                            src={bookmark.mangaCoverUrl || bookmark.manga?.imageUrl} 
                            alt={bookmark.mangaTitle || bookmark.manga?.title || 'Manga'}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Progress indicator */}
                        {bookmark.currentChapter && bookmark.totalChapters && (
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2">
                              <div className="flex justify-between items-center text-white text-xs mb-1">
                                <span>Глава {bookmark.currentChapter}</span>
                                <span>{Math.round((bookmark.currentChapter / bookmark.totalChapters) * 100)}%</span>
                              </div>
                              <div className="bg-white/20 rounded-full h-1">
                                <div 
                                  className="bg-gradient-to-r from-primary to-accent h-1 rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (bookmark.currentChapter / bookmark.totalChapters) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="text-foreground text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {bookmark.mangaTitle || bookmark.manga?.title || 'Без названия'}
                      </h4>
                    </div>
                  ))}
                </div>
              ) : bookmarksLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Загрузка избранного...</p>
                </div>
              ) : (
                /* Показываем демо данные, если нет реальных закладок */
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { 
                      id: 'demo1', 
                      mangaTitle: 'One Piece', 
                      mangaCoverUrl: 'https://via.placeholder.com/300x400/3B82F6/white?text=One+Piece',
                      currentChapter: 43,
                      totalChapters: 100 
                    },
                    { 
                      id: 'demo2', 
                      mangaTitle: 'Naruto', 
                      mangaCoverUrl: 'https://via.placeholder.com/300x400/FFD700/black?text=Naruto',
                      currentChapter: 25,
                      totalChapters: 72 
                    },
                    { 
                      id: 'demo3', 
                      mangaTitle: 'Attack on Titan', 
                      mangaCoverUrl: 'https://via.placeholder.com/300x400/EF4444/white?text=AOT',
                      currentChapter: 18,
                      totalChapters: 50 
                    },
                    { 
                      id: 'demo4', 
                      mangaTitle: 'Death Note', 
                      mangaCoverUrl: 'https://via.placeholder.com/300x400/1F2937/white?text=Death+Note',
                      currentChapter: 12,
                      totalChapters: 12 
                    }
                  ].map((bookmark: any) => (
                    <div key={bookmark.id} className="group cursor-pointer">
                      <div className="aspect-[3/4] bg-card/30 rounded-2xl overflow-hidden mb-3 relative hover:scale-105 transition-all duration-300">
                        <img 
                          src={bookmark.mangaCoverUrl} 
                          alt={bookmark.mangaTitle}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Progress indicator */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2">
                            <div className="flex justify-between items-center text-white text-xs mb-1">
                              <span>Глава {bookmark.currentChapter}</span>
                              <span>{Math.round((bookmark.currentChapter / bookmark.totalChapters) * 100)}%</span>
                            </div>
                            <div className="bg-white/20 rounded-full h-1">
                              <div 
                                className="bg-gradient-to-r from-primary to-accent h-1 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(100, (bookmark.currentChapter / bookmark.totalChapters) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <h4 className="text-foreground text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {bookmark.mangaTitle}
                      </h4>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />
                Последняя активность
              </h3>
              
              <div className="space-y-4">
                {mockActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-card/30 rounded-xl hover:bg-card/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'read' ? 'bg-primary/20 text-primary' :
                      activity.type === 'favorite' ? 'bg-red-500/20 text-red-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {activity.type === 'read' && <BookOpen className="w-4 h-4" />}
                      {activity.type === 'favorite' && <Heart className="w-4 h-4" />}
                      {activity.type === 'completed' && <Trophy className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground text-sm">
                        {activity.type === 'read' && `Прочитал главу ${activity.chapter} - ${activity.manga}`}
                        {activity.type === 'favorite' && `Добавил в избранное ${activity.manga}`}
                        {activity.type === 'completed' && `Завершил чтение ${activity.manga}`}
                      </p>
                      <p className="text-muted-foreground text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-accent" />
                Достижения
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {mockAchievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 rounded-xl border-2 transition-all ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-br from-accent/20 to-orange-500/20 border-accent/30' 
                        : 'bg-card/20 border-border/20 opacity-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{achievement.icon}</div>
                    <h4 className="text-foreground font-medium text-sm mb-1">{achievement.name}</h4>
                    <p className="text-muted-foreground text-xs">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Статистика
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Среднее в день</span>
                  <span className="text-foreground font-medium">2.5 главы</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Любимый жанр</span>
                  <span className="text-foreground font-medium">Сёнен</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Время чтения</span>
                  <span className="text-foreground font-medium">42ч в месяц</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Рейтинг</span>
                  <span className="text-foreground font-medium">#1,234</span>
                </div>
              </div>
            </div>

            {/* Social Section */}
            <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                Социальное
              </h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-card/30 rounded-xl hover:bg-card/50 transition-colors text-foreground">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Друзья
                  </span>
                  <span className="text-muted-foreground">15</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 bg-card/30 rounded-xl hover:bg-card/50 transition-colors text-foreground">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Комментарии
                  </span>
                  <span className="text-muted-foreground">48</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30 mt-8">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
            <MessageCircle className="w-5 h-5 text-primary" />
            Комментарии к профилю
          </h3>
          
          {/* Comment Input */}
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white font-bold">
                У
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Оставить комментарий..."
                  className="w-full bg-card/50 border border-border/30 rounded-xl p-3 text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors">
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {/* Mock comments */}
            {[
              {
                id: 1,
                user: 'MangaFan123',
                avatar: '🥷',
                time: '2 часа назад',
                text: 'Отличная коллекция манги! Особенно нравится твой выбор в жанре сёнен 👍'
              },
              {
                id: 2,
                user: 'OtakuReader',
                avatar: '🔥',
                time: '1 день назад',
                text: 'Впечатляющий прогресс чтения! Как успеваешь столько читать?'
              },
              {
                id: 3,
                user: 'AnimeGirl',
                avatar: '🌸',
                time: '3 дня назад',
                text: 'Можешь посоветовать что-то из своего списка избранного?'
              }
            ].map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 bg-card/30 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full flex items-center justify-center text-lg">
                  {comment.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{comment.user}</span>
                    <span className="text-muted-foreground text-sm">•</span>
                    <span className="text-muted-foreground text-sm">{comment.time}</span>
                  </div>
                  <p className="text-foreground">{comment.text}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-muted-foreground hover:text-primary text-sm transition-colors">
                      Ответить
                    </button>
                    <button className="text-muted-foreground hover:text-red-500 text-sm transition-colors flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      2
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-6">
            <button className="text-primary hover:text-primary/80 font-medium transition-colors">
              Загрузить ещё комментарии
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ProfilePage }
export default ProfilePage
