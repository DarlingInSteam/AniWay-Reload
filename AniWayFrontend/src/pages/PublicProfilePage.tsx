import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../lib/api'
import { User } from '../types'
import { CommentSection } from '../components/comments/CommentSection'
import { 
  User as UserIcon, 
  Camera,
  UserPlus,
  MessageSquare,
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
  MessageCircle,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [favoriteBookmarks, setFavoriteBookmarks] = useState<any[]>([])
  const [readingStats, setReadingStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookmarksLoading, setBookmarksLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)

  const isOwnProfile = currentUser && userProfile && currentUser.id === userProfile.id

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return

      try {
        setLoading(true)
        
        // Загружаем публичный профиль пользователя
        const profile = await apiClient.getUserPublicProfile(parseInt(userId))
        setUserProfile(profile)

        // Загружаем реальные данные пользователя
        setBookmarksLoading(true)
        setStatsLoading(true)
        
        try {
          // Пытаемся загрузить публичные закладки пользователя
          const bookmarks = await apiClient.getUserPublicBookmarks(profile.username)
          console.log('Loaded public bookmarks:', bookmarks)
          setFavoriteBookmarks(bookmarks || [])
        } catch (bookmarkError) {
          console.error('Failed to load public bookmarks:', bookmarkError)
          setFavoriteBookmarks([])
        } finally {
          setBookmarksLoading(false)
        }

        try {
          // Для публичных профилей статистика может быть недоступна
          // В будущем можно создать endpoint для публичной статистики
          console.log('Public stats not available for other users')
          setReadingStats({
            totalChaptersRead: 0,
            mangasStarted: 0,
            completedManga: 0,
            readingStreak: 0
          })
        } catch (statsError) {
          console.error('Failed to load reading stats:', statsError)
          setReadingStats(null)
        } finally {
          setStatsLoading(false)
        }
        
      } catch (error) {
        console.error('Error loading profile:', error)
        setError('Не удалось загрузить профиль пользователя')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  // Статистика (используем реальные данные если есть, иначе 0 для публичных профилей)
  const chaptersRead = readingStats?.totalChaptersRead || readingStats?.chaptersRead || 0
  const completedManga = readingStats?.completedManga || favoriteBookmarks?.filter(b => b.status === 'COMPLETED')?.length || 0
  
  const mockStats = {
    chaptersRead: chaptersRead,
    mangasStarted: readingStats?.mangasStarted || 0,
    completedManga: completedManga,
    streak: readingStats?.readingStreak || 0,
    level: Math.floor(chaptersRead / 50) + 1,
    exp: chaptersRead % 50,
    nextLevelExp: 50
  }

  const mockAchievements = [
    { id: 1, name: 'Первые шаги', description: 'Прочитать первую мангу', icon: '🌟', unlocked: true },
    { id: 2, name: 'Книжный червь', description: 'Прочитать 100 глав', icon: '📚', unlocked: true },
    { id: 3, name: 'Марафонец', description: '7 дней подряд', icon: '🏃‍♂️', unlocked: false },
    { id: 4, name: 'Коллекционер', description: '10 манг в избранном', icon: '💎', unlocked: true }
  ]

  const mockActivity = [
    { type: 'read', manga: 'One Piece', chapter: 43, time: '2 часа назад' },
    { type: 'favorite', manga: 'Naruto', time: '1 день назад' },
    { type: 'completed', manga: 'Death Note', time: '3 дня назад' },
    { type: 'read', manga: 'Attack on Titan', chapter: 25, time: '5 дней назад' },
    { type: 'favorite', manga: 'Dragon Ball', time: '1 неделю назад' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Ошибка</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link 
            to="/" 
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Вернуться на главную
          </Link>
        </div>
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
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к поиску
          </Link>
        </div>

        {/* Header Section */}
        <div className="relative mb-8">
          {/* Cover Photo */}
          <div className="h-64 bg-gradient-to-r from-primary/80 via-primary to-secondary rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          {/* Profile Info */}
          <div className="relative -mt-16 mx-6">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border/30">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center relative border border-border/30">
                    <UserIcon className="w-10 h-10 text-white" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-card flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
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
                      <span>На сайте с {new Date(userProfile?.registrationDate || userProfile?.createdAt || '').toLocaleDateString()}</span>
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
                {!isOwnProfile && (
                  <div className="flex gap-2">
                    <button className="bg-secondary backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-secondary/80 transition-all text-muted-foreground border border-border/30 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Написать
                    </button>
                    <button className="bg-primary px-6 py-2 rounded-xl hover:bg-primary/80 transition-all text-primary-foreground font-medium flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Добавить в друзья
                    </button>
                  </div>
                )}
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
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Пользователь пока не добавил мангу в избранное</p>
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
                  <span className="text-foreground font-medium">2.1 главы</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Любимый жанр</span>
                  <span className="text-foreground font-medium">Сёнен</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Время чтения</span>
                  <span className="text-foreground font-medium">28ч в месяц</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Рейтинг</span>
                  <span className="text-foreground font-medium">#2,156</span>
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
                  <span className="text-muted-foreground">12</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 bg-card/30 rounded-xl hover:bg-card/50 transition-colors text-foreground">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Комментарии
                  </span>
                  <span className="text-muted-foreground">23</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-6 border border-border/30 mt-8">
          {userProfile && (
            <CommentSection
              targetId={userProfile.id}
              type="PROFILE"
              title={`Комментарии к профилю ${userProfile.username}`}
              maxLevel={3}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default PublicProfilePage
