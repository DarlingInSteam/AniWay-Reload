import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { ProfileEditModal } from './ProfileEditModal';
import { ProfileStatsStrip } from './ProfileStatsStrip';
import { ProfileGenres } from './ProfileGenres';
import { ProfileShowcaseFavorites } from './ProfileShowcaseFavorites';
import { ProfileActivity } from './ProfileActivity';
import { PostComposer } from '@/components/posts/PostComposer';
import { PostList } from '@/components/posts/PostList';
import { useUserLevel } from '@/hooks/useUserLevel';
// LevelIndicator removed from overview to avoid duplication; header now shows minimal level block fed by backend
// import { LevelIndicator, getMockLevelData } from './LevelIndicator';
import { ProfileBadgesPlaceholder } from './ProfileBadgesPlaceholder';
import { BadgeList } from './BadgeList';
import { ProfileReadingProgress } from './ProfileReadingProgress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { profileService } from '@/services/profileService';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import useFriendData from '@/hooks/useFriendData';
import useUserMiniBatch from '@/hooks/useUserMiniBatch';
import { ProfileFriendActions } from './ProfileFriendActions';
import { ProfileFriendList } from './ProfileFriendList';
import { ProfileFriendRequests } from './ProfileFriendRequests';
// Added level overview section component dependencies
import React from 'react';

function LevelOverviewSection({ profile, isOwnProfile, currentUserId, activity, mobile }: any) {
  const userIdNum = parseInt(profile.id);
  // No level block here anymore to prevent duplication; header (ProfileHero) shows level.
  if (mobile) {
    return (
      <div className="space-y-7">
        {isOwnProfile && <PostComposer userId={userIdNum} onCreated={() => {}} />}
        <PostList userId={userIdNum} currentUserId={currentUserId} />
        <ProfileActivity activities={activity} />
        <ProfileGenres profile={profile} />
        <BadgeList userId={userIdNum} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="space-y-7 xl:col-span-8">
        {isOwnProfile && <PostComposer userId={userIdNum} onCreated={() => {}} />}
        <PostList userId={userIdNum} currentUserId={currentUserId} />
      </div>
      <div className="space-y-7 xl:col-span-4">
        <ProfileActivity activities={activity} />
        <ProfileGenres profile={profile} />
        <BadgeList userId={userIdNum} />
      </div>
    </div>
  );
}

export function UserProfile({ userId, isOwnProfile }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTabParam] = useSyncedSearchParam<'overview' | 'library' | 'friends' | 'reviews' | 'comments' | 'achievements'>('tab', 'overview');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const allowedTabs = ['overview', 'library', 'friends', 'reviews', 'comments', 'achievements'];
    if (!allowedTabs.includes(activeTab)) {
      setActiveTabParam('overview');
    }
  }, [activeTab, setActiveTabParam]);

  // Pull both user and avatar setter in a single hook call to avoid conditional hook order issues
  const { user: currentUser, setUserAvatarLocal } = useAuth();
  const targetUserId = parseInt(userId);
  const {
    friends: visibleFriends,
    incomingRequests,
    outgoingRequests,
    status: friendshipStatus,
    incomingRequestForTarget,
    outgoingRequestForTarget,
    refresh: refreshFriendData,
    loading: friendLoading,
    error: friendError,
  } = useFriendData(targetUserId, currentUser?.id);

  const userMiniIds = useMemo(() => {
    const ids = new Set<number>();
    visibleFriends.forEach(friend => ids.add(friend.friendUserId));
    incomingRequests.forEach(request => ids.add(request.requesterId));
    outgoingRequests.forEach(request => ids.add(request.receiverId));
    ids.add(targetUserId);
    if (currentUser?.id) {
      ids.add(currentUser.id);
    }
    return Array.from(ids);
  }, [visibleFriends, incomingRequests, outgoingRequests, targetUserId, currentUser?.id]);

  const miniUsers = useUserMiniBatch(userMiniIds);

  const currentUserMini = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      avatar: currentUser.avatar || undefined,
    };
  }, [currentUser]);

  const targetUserMini = useMemo(() => {
    if (profile) {
      return {
        id: parseInt(profile.id),
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatar: profile.avatar,
      };
    }
    return miniUsers[targetUserId] || null;
  }, [profile, miniUsers, targetUserId]);

  const userMiniMap = useMemo(() => {
    const map = { ...miniUsers };
    if (currentUserMini) {
      map[currentUserMini.id] = currentUserMini;
    }
    if (targetUserMini) {
      map[targetUserMini.id] = targetUserMini;
    }
    return map;
  }, [miniUsers, currentUserMini, targetUserMini]);

  const sendFriendRequest = useCallback(async (message?: string) => {
    try {
      await apiClient.createFriendRequest({ targetUserId, message });
      await refreshFriendData();
    } catch (err) {
      console.error('Failed to send friend request', err);
      throw err;
    }
  }, [targetUserId, refreshFriendData]);

  const acceptFriendRequest = useCallback(async (requestId: string) => {
    try {
      await apiClient.acceptFriendRequest(requestId);
      await refreshFriendData();
    } catch (err) {
      console.error('Failed to accept friend request', err);
      throw err;
    }
  }, [refreshFriendData]);

  const declineFriendRequest = useCallback(async (requestId: string) => {
    try {
      await apiClient.declineFriendRequest(requestId);
      await refreshFriendData();
    } catch (err) {
      console.error('Failed to decline friend request', err);
      throw err;
    }
  }, [refreshFriendData]);

  const removeFriend = useCallback(async (friendUserId: number) => {
    if (!friendUserId) return;
    try {
      await apiClient.removeFriend(friendUserId);
      await refreshFriendData();
    } catch (err) {
      console.error('Failed to remove friend', err);
      throw err;
    }
  }, [refreshFriendData]);

  const handleOpenMessages = useCallback(() => {
    if (!targetUserMini) return;
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate('/messages', {
      state: {
        composeSession: Date.now(),
        composeUser: {
          id: targetUserMini.id,
          displayName: targetUserMini.displayName,
          username: targetUserMini.username,
          avatar: targetUserMini.avatar,
        },
      },
    });
  }, [navigate, targetUserMini, currentUser]);

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
          setReviewsCount(reviews.length); // initial count
        } catch (reviewError) {
          console.error('Ошибка при загрузке отзывов:', reviewError);
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
          // Если статистика чтения отсутствует (публичный просмотр), используем счетчик из userDTO
          chaptersRead: (data.readingStats?.totalChaptersRead != null)
            ? data.readingStats.totalChaptersRead
            : (data.user.chaptersReadCount || 0),
          
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

  // Lightweight async fetch for reviews count (can use optimized endpoint later)
  useEffect(()=>{
    let cancelled = false;
    import('@/services/reviewsService').then(({ reviewsService })=>{
      reviewsService.getUserReviewsCountFast(parseInt(userId)).then(c=>{ if(!cancelled) setReviewsCount(c); });
    });
    return ()=> { cancelled = true };
  }, [userId]);

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
          <ProfileEditModal profile={profile} open={editOpen} onOpenChange={setEditOpen} onUpdated={(data)=> { handleProfileUpdate(data as any); if(data.avatar){ setUserAvatarLocal(data.avatar) } }} />
          <ProfileHero
            profile={profile}
            isOwn={isOwnProfile}
            onEdit={() => setEditOpen(true)}
            onAvatarUpdated={async (newUrl) => {
              if (!newUrl) return;
              // Optimistic local update
              setProfile(prev => prev ? { ...prev, avatar: newUrl } : prev);
              if (isOwnProfile) {
                setUserAvatarLocal(newUrl);
              }
              // Skip immediate refetch to avoid loop (backend doesn't yet return avatar). Can be re-enabled later.
            }}
            onOpenMessages={!isOwnProfile ? handleOpenMessages : undefined}
          />
          <ProfileStatsStrip profile={profile} extra={{ favorites: undefined, achievements: achievements.length, reviewsCount }} />
        </div>

        <div className="mb-6 animate-fade-in">
          <ProfileFriendActions
            isOwnProfile={isOwnProfile}
            targetUser={targetUserMini}
            status={friendshipStatus}
            incomingRequestForTarget={incomingRequestForTarget}
            outgoingRequestForTarget={outgoingRequestForTarget}
            onSendRequest={sendFriendRequest}
            onAcceptRequest={acceptFriendRequest}
            onDeclineRequest={declineFriendRequest}
            onRemoveFriend={removeFriend}
            isAuthenticated={!!currentUser}
            loading={friendLoading}
          />
        </div>

        {/* Desktop Layout: Табы занимают всю ширину */}
        <div className="hidden lg:block animate-fade-in">
          <Tabs value={activeTab} onValueChange={v => setActiveTabParam(v as any)} className="space-y-7">
            <TabsList className="glass-panel p-1.5 rounded-2xl gap-1.5 grid grid-cols-6 xl:grid-cols-6">
              <TabsTrigger value="overview" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition focus-visible:outline-none data-[state=active]:text-white data-[state=active]:shadow-inner data-[state=active]:bg-white/10">
                <span className="relative z-10">Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition data-[state=active]:text-white data-[state=active]:bg-white/10">
                <span className="relative z-10">Библиотека</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition data-[state=active]:text-white data-[state=active]:bg-white/10">
                <span className="relative z-10">Друзья</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition data-[state=active]:text-white data-[state=active]:bg-white/10">
                <span className="relative z-10">Отзывы</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition data-[state=active]:text-white data-[state=active]:bg-white/10">
                <span className="relative z-10">Комментарии</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="relative group rounded-xl px-4 py-2 font-medium text-xs tracking-wide uppercase text-slate-400 hover:text-white transition data-[state=active]:text-white data-[state=active]:bg-white/10">
                <span className="relative z-10">Достижения</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-7">
              <LevelOverviewSection profile={profile} isOwnProfile={isOwnProfile} currentUserId={currentUser?.id} activity={activity} />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Collections collections={collections} isOwnProfile={isOwnProfile} />

            </TabsContent>

            <TabsContent value="friends" className="space-y-6">
              {friendError ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-6 text-center text-sm text-red-200">
                  Не удалось загрузить информацию о друзьях. Попробуйте обновить страницу позже.
                </div>
              ) : friendLoading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {isOwnProfile ? (
                    <>
                      <ProfileFriendRequests
                        incoming={incomingRequests}
                        outgoing={outgoingRequests}
                        users={userMiniMap}
                        onAccept={acceptFriendRequest}
                        onDecline={declineFriendRequest}
                      />
                      <ProfileFriendList
                        friends={visibleFriends}
                        users={userMiniMap}
                        title="Мои друзья"
                        emptyMessage="Добавьте пользователей в друзья, чтобы следить за их активностью."
                      />
                    </>
                  ) : (
                    <ProfileFriendList
                      friends={visibleFriends}
                      users={userMiniMap}
                      title="Друзья пользователя"
                      emptyMessage="Пока нет друзей, которых можно показать."
                    />
                  )}
                </>
              )}
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
            <TabsList
              role="tablist" aria-label="Разделы профиля"
              className="flex w-full flex-nowrap overflow-x-auto gap-2 bg-black/30 border border-white/10 backdrop-blur rounded-2xl px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent whitespace-nowrap scroll-smooth [&>*]:flex-shrink-0"
              ref={(el)=>{ if(el){ el.scrollLeft = 0 } }}
            >
              <TabsTrigger value="overview" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Обзор
              </TabsTrigger>
              <TabsTrigger value="library" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Библиотека
              </TabsTrigger>
              <TabsTrigger value="friends" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Друзья
              </TabsTrigger>
              <TabsTrigger value="reviews" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Отзывы
              </TabsTrigger>
              <TabsTrigger value="comments" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Комментарии
              </TabsTrigger>
              <TabsTrigger value="achievements" className="px-5 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white data-[state=active]:text-white data-[state=active]:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Достижения
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-7">
              <LevelOverviewSection profile={profile} isOwnProfile={isOwnProfile} currentUserId={currentUser?.id} activity={activity} mobile />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <Collections collections={collections} isOwnProfile={isOwnProfile} />
              <FavoriteComics favorites={favoriteMangas} isOwnProfile={isOwnProfile} />
              <ReadingProgressModule progress={readingProgress} isOwnProfile={isOwnProfile} />
            </TabsContent>

            <TabsContent value="friends" className="space-y-6">
              {friendError ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-6 text-center text-sm text-red-200">
                  Не удалось загрузить информацию о друзьях. Попробуйте позже.
                </div>
              ) : friendLoading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {isOwnProfile ? (
                    <>
                      <ProfileFriendRequests
                        incoming={incomingRequests}
                        outgoing={outgoingRequests}
                        users={userMiniMap}
                        onAccept={acceptFriendRequest}
                        onDecline={declineFriendRequest}
                      />
                      <ProfileFriendList
                        friends={visibleFriends}
                        users={userMiniMap}
                        title="Мои друзья"
                        emptyMessage="Добавьте пользователей в друзья, чтобы видеть их здесь."
                      />
                    </>
                  ) : (
                    <ProfileFriendList
                      friends={visibleFriends}
                      users={userMiniMap}
                      title="Друзья пользователя"
                      emptyMessage="Пока нет друзей, которых можно показать."
                    />
                  )}
                </>
              )}
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
