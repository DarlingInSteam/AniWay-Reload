import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ApiError, LoadingState, EmptyState } from '@/components/ui/ApiError';
import { 
  BookOpen, 
  Clock, 
  Bookmark, 
  Heart, 
  Trophy,
  TrendingUp,
  Target,
  Calendar
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { extendedProfileService } from '@/services/extendedProfileService';
import { reviewsService } from '@/services/reviewsService';

interface StatisticsData {
  totalMangaRead: number;
  totalChaptersRead: number;
  totalReadingTimeMinutes: number;
  favoriteGenres: string[];
  readingStreak: number;
  averageRating: number;
}

interface UserStatisticsProps {
  userId?: number;
  className?: string;
  profileData?: {
    totalMangaRead: number;
    totalChaptersRead: number;
    totalPagesRead?: number;
    favoriteGenres?: string[];
    readingStreak?: number;
  };
}

export function UserStatistics({ userId, className = '', profileData }: UserStatisticsProps) {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateAverageRating = async (userId?: number): Promise<number> => {
    try {
      const reviews = await reviewsService.getUserReviews(userId);
      if (reviews.length === 0) return 0;
      
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      return totalRating / reviews.length;
    } catch (error) {
      console.error('Ошибка при расчете средней оценки:', error);
      return 0;
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Рассчитываем среднюю оценку из отзывов пользователя
      const averageRating = await calculateAverageRating(userId);
      
      // Если переданы данные профиля, используем их
      if (profileData) {
        setStatistics({
          totalMangaRead: profileData.totalMangaRead || 0,
          totalChaptersRead: profileData.totalChaptersRead || 0,
          totalReadingTimeMinutes: 0, // TODO: Добавить отслеживание времени
          favoriteGenres: profileData.favoriteGenres || [],
          readingStreak: profileData.readingStreak || 0,
          averageRating: averageRating
        });
        setLoading(false);
        return;
      }
      
      const stats = await extendedProfileService.getProfileStatistics();
      setStatistics({
        totalMangaRead: stats.totalMangaRead || 0,
        totalChaptersRead: stats.totalChaptersRead || 0,
        totalReadingTimeMinutes: stats.totalReadingTimeMinutes || 0,
        favoriteGenres: stats.favoriteGenres || [],
        readingStreak: stats.readingStreak || 0,
        averageRating: averageRating // Используем рассчитанную среднюю оценку
      });
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось загрузить статистику';
      setError(errorMessage);
      
      // При ошибке показываем нулевые значения
      setStatistics({
        totalMangaRead: 0,
        totalChaptersRead: 0,
        totalReadingTimeMinutes: 0,
        favoriteGenres: [],
        readingStreak: 0,
        averageRating: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [userId, profileData]);

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ч`;
    }
    const days = Math.floor(hours / 24);
    return `${days} д`;
  };

  const getTopGenres = (genres: string[]): string => {
    if (genres.length === 0) return 'Нет данных';
    return genres.slice(0, 3).join(', ');
  };

  if (loading) {
    return (
      <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-400" />
            <span>Статистика</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Загружаем статистику..." />
        </CardContent>
      </Card>
    );
  }

  if (error && !statistics) {
    return (
      <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-400" />
            <span>Статистика</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ApiError 
            error={error} 
            onRetry={loadStatistics}
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
          <BookOpen className="w-5 h-5 text-orange-400" />
          <span>Статистика</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Манги прочитано</span>
            </div>
            <span className="text-sm font-medium text-white">
              {statistics?.totalMangaRead || 0}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Глав прочитано</span>
            </div>
            <span className="text-sm font-medium text-white">
              {statistics?.totalChaptersRead || 0}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Время чтения</span>
            </div>
            <span className="text-sm font-medium text-white">
              {statistics ? formatReadingTime(statistics.totalReadingTimeMinutes) : '0 мин'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Серия чтения</span>
            </div>
            <span className="text-sm font-medium text-white">
              {statistics?.readingStreak || 0} дней
            </span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-300">Средняя оценка</span>
            </div>
            <span className="text-sm font-medium text-white">
              {statistics?.averageRating ? statistics.averageRating.toFixed(1) : '0.0'}
            </span>
          </div>

          {statistics?.favoriteGenres && statistics.favoriteGenres.length > 0 && (
            <div className="py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-300">Любимые жанры</span>
              </div>
              <p className="text-sm text-white pl-6">
                {getTopGenres(statistics.favoriteGenres)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
