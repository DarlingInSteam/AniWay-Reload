import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError, LoadingState, EmptyState } from '@/components/ui/ApiError';
import { 
  Activity,
  BookOpen,
  Star,
  Bookmark,
  Trophy,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { extendedProfileService } from '@/services/extendedProfileService';

interface ActivityItem {
  id: string;
  type: 'read' | 'review' | 'bookmark' | 'achievement';
  description: string;
  timestamp: Date;
  relatedMangaId?: number;
}

interface UserActivityFeedProps {
  userId: number;
  isOwnProfile: boolean;
  className?: string;
  limit?: number;
}

export function UserActivityFeed({ 
  userId, 
  isOwnProfile, 
  className = '',
  limit = 8
}: UserActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const activityData = await extendedProfileService.getProfileActivity(userId, limit * 2);
      
      // Обеспечиваем уникальные ID для каждого элемента активности
      const uniqueActivities = activityData.map((activity, index) => ({
        ...activity,
        id: `${activity.id}-${index}-${Date.now()}` // Делаем ID уникальными
      }));
      
      setActivities(uniqueActivities);
    } catch (err) {
      console.error('Ошибка загрузки активности:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить активность';
      setError(errorMessage);
      
      // Очищаем активности при ошибке
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadActivity();
    }
  }, [userId, limit]);

  const formatActivityTime = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д назад`;
    if (hours > 0) return `${hours}ч назад`;
    return 'только что';
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    const iconMap = {
      read: <BookOpen className="w-4 h-4 text-blue-400" />,
      review: <Star className="w-4 h-4 text-yellow-400" />,
      bookmark: <Bookmark className="w-4 h-4 text-green-400" />,
      achievement: <Trophy className="w-4 h-4 text-purple-400" />
    };
    return iconMap[type] || <Activity className="w-4 h-4 text-gray-400" />;
  };

  const displayedActivities = showAll ? activities : activities.slice(0, limit);

  if (loading) {
    return (
      <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Активность</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Загружаем активность..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span>Активность</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApiError 
            error={error} 
            onRetry={loadActivity}
            variant="minimal"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          <span>Активность</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayedActivities.length > 0 ? (
          <div className="space-y-3">
            {displayedActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="flex items-start gap-3 text-sm p-2 rounded-lg hover:bg-white/3 transition-all duration-200 cursor-pointer group"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-200 leading-relaxed group-hover:text-white transition-colors">
                    {activity.description}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-400">
                      {formatActivityTime(activity.timestamp)}
                    </div>
                    {activity.relatedMangaId && (
                      <ChevronRight className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {activities.length > limit && !showAll && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-white/15 bg-white/3 text-gray-300 hover:bg-white/8 mt-4"
                onClick={() => setShowAll(true)}
              >
                Показать больше ({activities.length - limit})
              </Button>
            )}
            
            {showAll && activities.length > limit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-white/15 bg-white/3 text-gray-300 hover:bg-white/8 mt-4"
                onClick={() => setShowAll(false)}
              >
                Свернуть
              </Button>
            )}
          </div>
        ) : (
          <EmptyState
            title={isOwnProfile ? 'Нет активности' : 'Пользователь неактивен'}
            description={isOwnProfile 
              ? 'Начните читать мангу, чтобы увидеть активность'
              : 'Активность пользователя появится здесь'
            }
            icon={<Activity className="w-8 h-8 opacity-50" />}
          />
        )}
      </CardContent>
    </Card>
  );
}
