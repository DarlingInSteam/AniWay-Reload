import { useState, useEffect } from 'react';
import { ProfileBackground } from './ProfileBackground';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSummary } from './ProfileSummary';
import { ProfileSidebar } from './ProfileSidebar';
import { ProfileFooter } from './ProfileFooter';
import {
  FavoriteComics,
  ReadingProgressModule,
  Collections,
  Reviews,
  Achievements
} from './ShowcaseModules';
import { UserProfile as UserProfileType, UserProfileProps } from '@/types/profile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { profileService } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';

export function UserProfile({ userId, isOwnProfile }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные профиля из API
        const data = await profileService.getProfileData(userId);
        setProfileData(data);

        // Преобразуем данные в формат UserProfile
        const userProfile: UserProfileType = {
          id: data.user.id.toString(),
          username: data.user.username,
          email: data.user.email,
          displayName: data.user.displayName,
          avatar: data.user.avatar,
          bio: data.user.bio,
          role: data.user.role,
          isOnline: true, // TODO: Реализовать систему онлайн статуса
          lastSeen: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
          backgroundImage: undefined, // TODO: Добавить поддержку фоновых изображений
          socialLinks: undefined, // TODO: Добавить поддержку социальных сетей
          favoriteGenres: data.readingStats?.favoriteGenres || [],
          joinedDate: new Date(data.user.createdAt),
          totalReadingTime: 0, // TODO: Добавить отслеживание времени чтения
          mangaRead: data.readingStats?.totalMangaRead || 0,
          chaptersRead: data.readingStats?.totalChaptersRead || 0
        };

        setProfile(userProfile);
      } catch (err) {
        console.error('Ошибка при загрузке профиля:', err);
        setError('Не удалось загрузить данные профиля');

        // Если профиль не найден и это текущий пользователь, используем данные из контекста
        if (isOwnProfile && currentUser) {
          const fallbackProfile: UserProfileType = {
            id: currentUser.id.toString(),
            username: currentUser.username,
            email: currentUser.email,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar,
            bio: currentUser.bio,
            role: currentUser.role,
            isOnline: true,
            joinedDate: new Date(currentUser.createdAt),
            totalReadingTime: 0,
            mangaRead: currentUser.chaptersReadCount || 0,
            chaptersRead: currentUser.chaptersReadCount || 0,
            favoriteGenres: []
          };
          setProfile(fallbackProfile);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId, isOwnProfile, currentUser]);

  const handleProfileUpdate = async (updates: Partial<UserProfileType>) => {
    if (!profile || !isOwnProfile) return;

    try {
      // Обновляем профиль через AuthContext для собственного профиля
      if (currentUser) {
        // Преобразуем обновления в формат User
        const userUpdates = {
          displayName: updates.displayName,
          bio: updates.bio,
          avatar: updates.avatar
        };

        // TODO: Реализовать обновление профиля через API
        // await updateProfile(userUpdates);

        // Обновляем локальное состояние
        setProfile({ ...profile, ...updates });
      }
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
    }
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      // TODO: Показать уведомление об успешном копировании
      console.log('Ссылка на профиль скопирована');
    });
  };

  const handleExportData = () => {
    if (!profileData) return;

    // Экспортируем данные пользователя в JSON
    const exportData = {
      user: profileData.user,
      bookmarks: profileData.bookmarks,
      readingProgress: profileData.readingProgress,
      readingStats: profileData.readingStats,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `profile-data-${profile?.username}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // Подготавливаем данные для компонентов
  const favoriteMangas = profileData ? profileService.getFavoriteMangas(profileData.bookmarks) : [];
  const readingProgress = profileData ? profileService.getReadingProgressData(profileData.readingProgress, profileData.bookmarks) : [];
  const collections = profileData ? profileService.getCollectionsFromBookmarks(profileData.bookmarks) : [];
  const userActivities = profileData ? profileService.generateUserActivity(profileData.readingProgress, profileData.bookmarks) : [];
  const achievements = profileData?.readingStats ? profileService.generateAchievements(profileData.readingStats) : [];

  // Заглушки для данных, которые пока не реализованы
  const mockReviews: any[] = []; // TODO: Добавить систему отзывов
  const mockFriends: any[] = []; // TODO: Добавить систему друзей
  const mockCommunities: any[] = []; // TODO: Добавить систему сообществ
  const mockComments: any[] = []; // TODO: Добавить комментарии к профилю

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ошибка загрузки профиля</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Профиль не найден</h2>
          <p className="text-gray-400">Пользователь с указанным ID не существует</p>
        </div>
      </div>
    );
  }

  return (
    <ProfileBackground
      profile={profile}
      isOwnProfile={isOwnProfile}
      onBackgroundUpdate={(backgroundImage) => handleProfileUpdate({ backgroundImage })}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Заголовок профиля - по центру */}
        <div className="mb-8">
          <ProfileHeader
            profile={profile}
            isOwnProfile={isOwnProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>

        {/* Desktop Layout: Трёхколоночный с новым расположением */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Левая колонка - Табы и основной контент */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-4 bg-white/3 backdrop-blur-md border border-white/8 rounded-xl shadow-lg">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Обзор</TabsTrigger>
                <TabsTrigger value="library" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Библиотека</TabsTrigger>
                <TabsTrigger value="reviews" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Отзывы</TabsTrigger>
                <TabsTrigger value="achievements" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Достижения</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
                <ReadingProgressModule progress={readingProgress} isOwnProfile={isOwnProfile} />
                <Collections collections={collections} isOwnProfile={isOwnProfile} />
              </TabsContent>

              <TabsContent value="library" className="space-y-6">
                <Collections collections={collections} isOwnProfile={isOwnProfile} />
                <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6">
                <Reviews reviews={mockReviews} isOwnProfile={isOwnProfile} />
                {mockReviews.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-lg mb-2">📝 Система отзывов</p>
                    <p>Функция находится в разработке</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <Achievements achievements={achievements} isOwnProfile={isOwnProfile} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Правая колонка - О пользователе + Сайдбар */}
          <div className="lg:col-span-4 space-y-6">
            {/* О пользователе */}
            <ProfileSummary
              profile={profile}
              isOwnProfile={isOwnProfile}
              onProfileUpdate={handleProfileUpdate}
            />

            {/* Сайдбар */}
            <ProfileSidebar
              friends={mockFriends}
              communities={mockCommunities}
              activities={userActivities}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>

        {/* Mobile/Tablet Layout: Одноколоночный стек */}
        <div className="lg:hidden space-y-6">
          <ProfileSummary
            profile={profile}
            isOwnProfile={isOwnProfile}
            onProfileUpdate={handleProfileUpdate}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-white/3 backdrop-blur-md border border-white/8 rounded-xl shadow-lg">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Обзор</TabsTrigger>
              <TabsTrigger value="library" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Библиотека</TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Отзывы</TabsTrigger>
              <TabsTrigger value="achievements" className="data-[state=active]:bg-white/15 data-[state=active]:backdrop-blur-sm data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-white/8 transition-all duration-200 text-gray-300">Достижения</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
              <ReadingProgressModule progress={readingProgress} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Collections collections={collections} isOwnProfile={isOwnProfile} />
              <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Reviews reviews={mockReviews} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Achievements achievements={achievements} isOwnProfile={isOwnProfile} />
            </TabsContent>
          </Tabs>

          <ProfileSidebar
            friends={mockFriends}
            communities={mockCommunities}
            activities={userActivities}
            isOwnProfile={isOwnProfile}
          />
        </div>

        {/* Футер профиля */}
        <div className="mt-8">
          <ProfileFooter
            comments={mockComments}
            isOwnProfile={isOwnProfile}
            canComment={true}
            onShare={handleShare}
            onExportData={handleExportData}
          />
        </div>
      </div>
    </ProfileBackground>
  );
}
