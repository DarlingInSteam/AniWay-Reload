import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useSyncedSearchParam } from '@/hooks/useSyncedSearchParam';
import { ProfileBackground } from './ProfileBackground';
// Legacy components (may be removed later)
// import { ProfileHeader } from './ProfileHeader';
// import { ProfileSummary } from './ProfileSummary';
// import { ProfileSidebar } from './ProfileSidebar';
import { ProfileFooter } from './ProfileFooter';
import {
  FavoriteComics,
  ReadingProgressModule,
  Collections,
  Reviews,
  Achievements,
  UserComments
} from './ShowcaseModules';
import { UserProfile as UserProfileType, UserProfileProps, UserReview } from '@/types/profile';
// New redesigned components
import { ProfileHero } from './ProfileHero';
import { ProfileStatsStrip } from './ProfileStatsStrip';
import { ProfileAbout } from './ProfileAbout';
import { ProfileGenres } from './ProfileGenres';
import { ProfileShowcaseFavorites } from './ProfileShowcaseFavorites';
import { ProfileActivity } from './ProfileActivity';
import { ProfileBadgesPlaceholder } from './ProfileBadgesPlaceholder';
import { ProfileReadingProgress } from './ProfileReadingProgress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { profileService } from '@/services/profileService';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function UserProfile({ userId, isOwnProfile }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTabParam] = useSyncedSearchParam<'overview' | 'library' | 'reviews' | 'comments' | 'achievements'>('tab', 'overview');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Pull both user and avatar setter in a single hook call to avoid conditional hook order issues
  const { user: currentUser, setUserAvatarLocal } = useAuth();

  // MAIN LOAD EFFECT: depends only on userId / isOwnProfile to avoid loops on avatar changes
  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные профиля из API
        const data = await profileService.getProfileData(userId);
        setProfileData(data);

        // Загружаем отзывы пользователя
        setReviewsLoading(true);
        try {
          const reviews = await profileService.getUserReviews(parseInt(userId));
          setUserReviews(reviews);
        } catch (reviewError) {
          console.error('Ошибка при загрузке отзывов:', reviewError);
          // Не считаем это критической ошибкой, просто оставляем пустой массив
        } finally {
          setReviewsLoading(false);
        }

        // Преобразуем данные в формат UserProfile
        const userProfile: UserProfileType = {
          id: data.user.id.toString(),
          username: data.user.username,
          email: data.user.email,
          displayName: data.user.displayName,
          avatar: data.user.avatar || (profile?.avatar || undefined),
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
          chaptersRead: data.readingStats?.totalChaptersRead || 0,
          
          // Новые поля из публичного API
          likesGivenCount: data.user.likesGivenCount || 0,
          commentsCount: data.user.commentsCount || 0,
        };

        setProfile(userProfile);
        // Сохраняем данные профиля для передачи в компоненты
        setProfileData(data);
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
            favoriteGenres: [],
            
            // Добавляем новые поля из публичного API
            likesGivenCount: currentUser.likesGivenCount || 0,
            commentsCount: currentUser.commentsCount || 0,
          };
          
          // Создаем fallback данные профиля
          const fallbackProfileData = {
            user: currentUser,
            bookmarks: [],
            readingProgress: [],
            readingStats: {
              totalMangaRead: 0,
              totalChaptersRead: currentUser.chaptersReadCount || 0,
              totalPagesRead: 0,
              favoriteGenres: [],
              readingStreak: 0
            }
          };
          
          setProfile(fallbackProfile);
          setProfileData(fallbackProfileData);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOwnProfile]);

  const handleProfileUpdate = async (updates: Partial<UserProfileType>) => {
    if (!profile || !isOwnProfile) return;

    try {
      
      // Преобразуем обновления в формат UpdateProfileRequest
      const profileUpdates = {
        displayName: updates.displayName,
        bio: updates.bio,
        avatar: updates.avatar
      };

      // Отправляем обновления через API
      const updatedUser = await apiClient.updateUserProfile(profileUpdates);

      // Обновляем локальное состояние профиля
      setProfile(prevProfile => {
        if (!prevProfile) return prevProfile;
        
        return {
          ...prevProfile,
          ...updates,
          // Обновляем поля из ответа сервера
          displayName: updatedUser.displayName || prevProfile.displayName,
          bio: updatedUser.bio || prevProfile.bio,
          avatar: updatedUser.avatar || prevProfile.avatar
        };
      });

      // Показываем уведомление об успехе (можно добавить toast)
      console.log('Профиль успешно сохранен');
      
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      // Показываем уведомление об ошибке (можно добавить toast)
      alert('Не удалось сохранить изменения профиля. Попробуйте еще раз.');
    }
  };

  const handleShare = () => {
    const profileUrl = window.location.href;
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
  const readingProgress = profileData ? profileService.getReadingProgressData(profileData.readingProgress) : [];
  const collections = profileData ? profileService.getCollectionsFromBookmarks(profileData.bookmarks) : [];
  const [activity, setActivity] = useState<any[]>([])
  const [activityLoaded, setActivityLoaded] = useState(false)
  useEffect(()=>{
    let cancelled = false
    const load = async () => {
      if (!profile) return
      try {
        const { extendedProfileService } = await import('@/services/extendedProfileService')
        const [readA, reviewA] = await Promise.all([
          extendedProfileService.getReadingActivity(parseInt(profile.id), 10).catch(()=>[]),
          extendedProfileService.getReviewActivity(parseInt(profile.id), 5).catch(()=>[])
        ])
        const generated = profileData ? profileService.generateUserActivity(profileData.readingProgress, profileData.bookmarks) : []
        const merged = [...readA, ...reviewA, ...generated]
          .sort((a,b)=> b.timestamp.getTime()-a.timestamp.getTime())
          .reduce((acc: any[], item)=>{ // deduplicate by id
            if (!acc.find(x=>x.id===item.id)) acc.push(item); return acc
          }, [])
          .slice(0,15)
        console.debug('[ProfileActivity] fetched counts', {read: readA.length, review: reviewA.length, generated: generated.length, merged: merged.length})
        if (!cancelled) setActivity(merged)
      } catch(e) {
        console.debug('[ProfileActivity] error loading activity, fallback to generated', e)
        // final fallback
        if (!cancelled) {
          const generated = profileData ? profileService.generateUserActivity(profileData.readingProgress, profileData.bookmarks) : []
          setActivity(generated)
        }
      } finally { if (!cancelled) setActivityLoaded(true) }
    }
    load()
    return ()=> { cancelled = true }
  }, [profile?.id, profileData])
  const achievements = profileData?.readingStats ? profileService.generateAchievements(profileData.readingStats) : [];

  // Ensure slug enforcement effect is declared BEFORE any early returns to keep hook order stable.
  useEffect(() => {
    if (!profile) return;
    const makeSlug = (name: string) => name
      .toLowerCase()
      .trim()
      .replace(/[_\s]+/g,'-')
      .replace(/[^a-z0-9-]/g,'')
      .replace(/-+/g,'-')
      .replace(/^-|-$/g,'');
    const current = window.location.pathname.split('/').pop() || '';
    const numericPart = current.split('--')[0].split('-')[0];
    if (numericPart !== profile.id) return; // safety guard
    const hasSlug = current.includes('--');
    const slug = makeSlug(profile.displayName || profile.username);
    if (!hasSlug || (hasSlug && !current.endsWith(`--${slug}`))) {
      navigate(`/profile/${profile.id}--${slug}${params.toString()?`?${params.toString()}`:''}`, { replace: true });
    }
  }, [profile, navigate, params]);

  // Заглушки для данных, которые пока не реализованы
  const mockFriends: any[] = []; // TODO: Добавить систему друзей
  const mockCommunities: any[] = []; // TODO: Добавить систему сообществ

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

  // (Slug effect moved above early returns)

  return (
    <ProfileBackground
      profile={profile}
      isOwnProfile={isOwnProfile}
    >
  <div className="container mx-auto px-4 py-10 max-w-7xl">
        {/* New Hero Section */}
  <div className="mb-6 animate-fade-in">
          <ProfileHero
            profile={profile}
            isOwn={isOwnProfile}
            onEdit={() => console.log('Edit profile (modal TODO)')}
            onShare={handleShare}
            onMore={() => console.log('More actions TBD')}
            onAvatarUpdated={async (newUrl) => {
              if (!newUrl) return;
              // Optimistic local update
              setProfile(prev => prev ? { ...prev, avatar: newUrl } : prev);
              if (isOwnProfile) {
                setUserAvatarLocal(newUrl);
              }
              // Skip immediate refetch to avoid loop (backend doesn't yet return avatar). Can be re-enabled later.
            }}
          />
          <ProfileStatsStrip profile={profile} extra={{ favorites: favoriteMangas.length, achievements: achievements.length }} />
        </div>

        {/* Desktop Layout: Табы занимают всю ширину */}
        <div className="hidden lg:block animate-fade-in">
          <Tabs value={activeTab} onValueChange={v => setActiveTabParam(v as any)} className="space-y-7">
            <TabsList className="grid grid-cols-5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-1.5 overflow-hidden">
              <TabsTrigger value="overview" className="relative group data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-4 py-2 font-medium">
                <span className="relative z-10">Обзор</span>
                <span className="pointer-events-none absolute inset-0 opacity-0 group-data-[state=active]:opacity-100 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl transition-opacity" />
              </TabsTrigger>
              <TabsTrigger value="library" className="relative group data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-4 py-2 font-medium">
                <span className="relative z-10">Библиотека</span>
                <span className="pointer-events-none absolute inset-0 opacity-0 group-data-[state=active]:opacity-100 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl transition-opacity" />
              </TabsTrigger>
              <TabsTrigger value="reviews" className="relative group data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-4 py-2 font-medium">
                <span className="relative z-10">Отзывы</span>
                <span className="pointer-events-none absolute inset-0 opacity-0 group-data-[state=active]:opacity-100 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl transition-opacity" />
              </TabsTrigger>
              <TabsTrigger value="comments" className="relative group data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-4 py-2 font-medium">
                <span className="relative z-10">Комментарии</span>
                <span className="pointer-events-none absolute inset-0 opacity-0 group-data-[state=active]:opacity-100 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl transition-opacity" />
              </TabsTrigger>
              <TabsTrigger value="achievements" className="relative group data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-4 py-2 font-medium">
                <span className="relative z-10">Достижения</span>
                <span className="pointer-events-none absolute inset-0 opacity-0 group-data-[state=active]:opacity-100 bg-gradient-to-br from-primary/30 to-primary/10 rounded-xl transition-opacity" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-7">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left / Main column */}
                <div className="space-y-7 xl:col-span-8">
                  <ProfileShowcaseFavorites favorites={favoriteMangas} />
                  <ProfileReadingProgress items={readingProgress} />
                  <ProfileActivity activities={activity} />
                  <Collections collections={collections} isOwnProfile={isOwnProfile} />
                </div>
                {/* Right / Side column */}
                <div className="space-y-7 xl:col-span-4">
                  <ProfileAbout profile={profile} isOwn={isOwnProfile} onUpdate={handleProfileUpdate} />
                  <ProfileGenres profile={profile} />
                  <ProfileBadgesPlaceholder />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Collections collections={collections} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6 max-h-96 overflow-y-auto">
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <Reviews reviews={userReviews} isOwnProfile={isOwnProfile} />
                  {userReviews.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-lg mb-2">📝 {isOwnProfile ? 'Ваши отзывы' : 'Отзывы пользователя'}</p>
                      <p>{isOwnProfile ? 'Напишите первый отзыв на мангу' : 'Пользователь пока не оставлял отзывов'}</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-6 max-h-96 overflow-y-auto">
              <UserComments userId={parseInt(userId)} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Achievements achievements={achievements} isOwnProfile={isOwnProfile} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile/Tablet Layout: Одноколоночный стек */}
        <div className="lg:hidden space-y-7 animate-fade-in">
          <Tabs value={activeTab} onValueChange={v => setActiveTabParam(v as any)} className="space-y-7">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-1.5">
              <TabsTrigger value="overview" className="relative group data-[state=active]:bg-primary/25 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-3 py-2 text-sm font-medium">
                <span className="relative z-10">Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="relative group data-[state=active]:bg-primary/25 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-3 py-2 text-sm font-medium">
                <span className="relative z-10">Библиотека</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="relative group data-[state=active]:bg-primary/25 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-3 py-2 text-sm font-medium">
                <span className="relative z-10">Отзывы</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="relative group data-[state=active]:bg-primary/25 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-3 py-2 text-sm font-medium">
                <span className="relative z-10">Комментарии</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="relative group data-[state=active]:bg-primary/25 data-[state=active]:text-primary data-[state=active]:shadow-inner hover:bg-white/10 hover:text-white transition-all duration-200 text-muted-foreground rounded-xl px-3 py-2 text-sm font-medium">
                <span className="relative z-10">Достижения</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-7">
              <div className="space-y-7">
                <ProfileShowcaseFavorites favorites={favoriteMangas} />
                <ProfileReadingProgress items={readingProgress} />
                <ProfileActivity activities={activity} />
                <ProfileAbout profile={profile} isOwn={isOwnProfile} onUpdate={handleProfileUpdate} />
                <ProfileGenres profile={profile} />
                <ProfileBadgesPlaceholder />
                <Collections collections={collections} isOwnProfile={isOwnProfile} />
              </div>
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Collections collections={collections} isOwnProfile={isOwnProfile} />
              <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
              <ReadingProgressModule progress={readingProgress} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6 max-h-96 overflow-y-auto">
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <Reviews reviews={userReviews} isOwnProfile={isOwnProfile} />
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-6 max-h-96 overflow-y-auto">
              <UserComments userId={parseInt(userId)} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Achievements achievements={achievements} isOwnProfile={isOwnProfile} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Футер профиля */}
        <div className="mt-8">
          <ProfileFooter
            userId={parseInt(userId)}
            isOwnProfile={isOwnProfile}
            onShare={handleShare}
            onExportData={handleExportData}
          />
        </div>
      </div>
    </ProfileBackground>
  );
}
