import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
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
  const [favoriteBookmarks, setFavoriteBookmarks] = useState(null)

  useEffect(() => {
    const loadFavoriteBookmarks = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/auth/bookmarks/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const bookmarks = await response.json()
          setFavoriteBookmarks(bookmarks)
        }
      } catch (error) {
        console.error('Error loading favorite bookmarks:', error)
      }
    }

    if (userProfile) {
      loadFavoriteBookmarks()
    }
  }, [userProfile])

  // Моковые данные для демонстрации
  const mockStats = {
    chaptersRead: userProfile?.chaptersReadCount || 0,
    mangasStarted: 12,
    completedManga: 8,
    streak: 7,
    level: Math.floor((userProfile?.chaptersReadCount || 0) / 50) + 1,
    exp: (userProfile?.chaptersReadCount || 0) % 50,
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
    { type: 'completed', manga: 'Death Note', time: '3 дня назад' }
  ]

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="relative mb-8">
          {/* Cover Photo */}
          <div className="h-64 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute top-4 right-4">
              <button className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all">
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="relative -mt-16 mx-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center relative">
                    <User className="w-10 h-10 text-white" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <button className="absolute -bottom-1 -right-1 bg-white/20 backdrop-blur-sm p-1.5 rounded-full hover:bg-white/30 transition-all">
                    <Edit3 className="w-3 h-3 text-white" />
                  </button>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {userProfile?.displayName || userProfile?.username || 'Пользователь'}
                    </h1>
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-white" />
                      <span className="text-white font-semibold text-sm">LVL {mockStats.level}</span>
                    </div>
                  </div>
                  
                  {userProfile?.bio && (
                    <p className="text-white/80 mb-3">{userProfile.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
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
                    <div className="flex items-center justify-between text-white/80 text-sm mb-1">
                      <span>Прогресс до {mockStats.level + 1} уровня</span>
                      <span>{mockStats.exp}/{mockStats.nextLevelExp} XP</span>
                    </div>
                    <div className="bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(mockStats.exp / mockStats.nextLevelExp) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all text-white">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all text-white font-medium">
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
            { icon: BookOpen, label: 'Глав прочитано', value: mockStats.chaptersRead, color: 'from-blue-500 to-cyan-500' },
            { icon: Heart, label: 'В избранном', value: favoriteBookmarks?.length || 0, color: 'from-pink-500 to-rose-500' },
            { icon: Trophy, label: 'Завершено', value: mockStats.completedManga, color: 'from-yellow-500 to-orange-500' },
            { icon: Zap, label: 'Серия дней', value: mockStats.streak, color: 'from-purple-500 to-indigo-500' }
          ].map((stat, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all group cursor-pointer">
              <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-white/70 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Favorite Manga */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Избранные манги
                </h3>
                <button className="text-white/70 hover:text-white transition-colors text-sm">
                  Смотреть все
                </button>
              </div>
              
              {favoriteBookmarks && favoriteBookmarks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favoriteBookmarks.slice(0, 8).map((bookmark: any) => (
                    <div key={bookmark.id} className="group cursor-pointer">
                      <div className="aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden mb-3 relative hover:scale-105 transition-all duration-300">
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
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (bookmark.currentChapter / bookmark.totalChapters) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {bookmark.mangaTitle || bookmark.manga?.title || 'Без названия'}
                      </h4>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Избранных манг пока нет</p>
                  <p className="text-white/40 text-sm mt-2">Добавьте мангу в избранное, чтобы увидеть её здесь</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-blue-500" />
                Последняя активность
              </h3>
              
              <div className="space-y-4">
                {mockActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'read' ? 'bg-blue-500/20 text-blue-400' :
                      activity.type === 'favorite' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {activity.type === 'read' && <BookOpen className="w-4 h-4" />}
                      {activity.type === 'favorite' && <Heart className="w-4 h-4" />}
                      {activity.type === 'completed' && <Trophy className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        {activity.type === 'read' && `Прочитал главу ${activity.chapter} - ${activity.manga}`}
                        {activity.type === 'favorite' && `Добавил в избранное ${activity.manga}`}
                        {activity.type === 'completed' && `Завершил чтение ${activity.manga}`}
                      </p>
                      <p className="text-white/60 text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-yellow-500" />
                Достижения
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {mockAchievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`p-4 rounded-xl border-2 transition-all ${
                      achievement.unlocked 
                        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
                        : 'bg-white/5 border-white/10 opacity-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{achievement.icon}</div>
                    <h4 className="text-white font-medium text-sm mb-1">{achievement.name}</h4>
                    <p className="text-white/60 text-xs">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Статистика
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Среднее в день</span>
                  <span className="text-white font-medium">2.5 главы</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Любимый жанр</span>
                  <span className="text-white font-medium">Сёнен</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Время чтения</span>
                  <span className="text-white font-medium">42ч в месяц</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Рейтинг</span>
                  <span className="text-white font-medium">#1,234</span>
                </div>
              </div>
            </div>

            {/* Social Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-purple-500" />
                Социальное
              </h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Друзья
                  </span>
                  <span className="text-white/60">15</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Комментарии
                  </span>
                  <span className="text-white/60">48</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default ProfilePage
