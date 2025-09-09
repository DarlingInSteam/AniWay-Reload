import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Friend, Community, UserActivity } from '@/types/profile';
import {
  Users,
  Shield,
  Activity,
  BookOpen,
  Star,
  Bookmark,
  Trophy
} from 'lucide-react';
import { UserStatistics } from './UserStatistics';
import { UserActivityFeed } from './UserActivityFeed';

interface ProfileSidebarProps {
  friends: Friend[];
  communities: Community[];
  activities: UserActivity[];
  isOwnProfile: boolean;
  userId: number; // Добавляем userId для загрузки данных
  profileData?: {
    readingStats?: {
      totalMangaRead: number;
      totalChaptersRead: number;
      totalPagesRead?: number;
      favoriteGenres?: string[];
      readingStreak?: number;
    };
  };
}

export function ProfileSidebar({ friends, communities, activities, isOwnProfile, userId, profileData }: ProfileSidebarProps) {
  const formatActivityTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д`;
    if (hours > 0) return `${hours}ч`;
    return 'сейчас';
  };

  const getRoleColor = (role: Community['role']) => {
    const colors = {
      member: 'bg-white/15',
      moderator: 'bg-blue-500/25',
      admin: 'bg-red-500/25'
    };
    return colors[role];
  };

  const getRoleText = (role: Community['role']) => {
    const texts = {
      member: 'Участник',
      moderator: 'Модератор',
      admin: 'Админ'
    };
    return texts[role];
  };

  return (
    <div className="space-y-6">
      {/* Друзья */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Друзья</span>
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-white/15 text-white">
                {friends.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length > 0 ? (
            <div className="space-y-3">
              {friends.slice(0, 6).map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/8 transition-all duration-200">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={friend.avatar} alt={friend.username} />
                      <AvatarFallback className="text-xs bg-white/15 text-white">
                        {friend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      friend.isOnline ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate group-hover:text-blue-300">
                      {friend.username}
                    </div>
                    <div className="text-xs text-gray-300">
                      {friend.isOnline ? 'В сети' : friend.lastSeen ?
                        formatActivityTime(friend.lastSeen) + ' назад' : 'Не в сети'}
                    </div>
                  </div>
                </div>
              ))}
              {friends.length > 6 && (
                <Button variant="outline" size="sm" className="w-full border-white/15 bg-white/3 text-gray-300 hover:bg-white/8">
                  Показать всех ({friends.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{isOwnProfile ? 'У вас пока нет друзей' : 'Нет друзей'}</p>
              <p className="text-xs mt-1">Система друзей в разработке</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Сообщества */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span>Сообщества</span>
            {communities.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-white/15 text-white">
                {communities.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communities.length > 0 ? (
            <div className="space-y-3">
              {communities.slice(0, 5).map((community) => (
                <div key={community.id} className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/8 transition-all duration-200">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={community.avatar} alt={community.name} />
                    <AvatarFallback className="text-xs bg-white/15 text-white">
                      {community.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate group-hover:text-purple-300">
                      {community.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <span>{community.memberCount} участников</span>
                      <Badge className={`${getRoleColor(community.role)} text-white text-xs px-1 py-0 border-white/15`}>
                        {getRoleText(community.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {communities.length > 5 && (
                <Button variant="outline" size="sm" className="w-full border-white/15 bg-white/3 text-gray-300 hover:bg-white/8">
                  Показать все ({communities.length})
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{isOwnProfile ? 'Вы не состоите в сообществах' : 'Не состоит в сообществах'}</p>
              <p className="text-xs mt-1">Система сообществ в разработке</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Активность с реальными данными */}
      <UserActivityFeed 
        userId={userId}
        isOwnProfile={isOwnProfile}
        limit={4}
      />

      {/* Статистика чтения с реальными данными */}
      <UserStatistics 
        userId={userId}
        profileData={profileData?.readingStats}
      />
    </div>
  );
}
