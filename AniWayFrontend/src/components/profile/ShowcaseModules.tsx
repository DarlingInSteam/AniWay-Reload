import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FavoriteManga,
  ReadingProgress,
  UserCollection,
  UserReview,
  Achievement
} from '@/types/profile';
import {
  Heart,
  BookOpen,
  Folder,
  MessageSquare,
  Trophy,
  Star,
  MoreHorizontal
} from 'lucide-react';

interface ShowcaseModuleProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isEditable?: boolean;
  onEdit?: () => void;
  className?: string;
}

function ShowcaseModule({ title, icon, children, isEditable, onEdit, className }: ShowcaseModuleProps) {
  return (
    <Card className={`bg-white/3 backdrop-blur-md border border-white/8 shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </div>
          {isEditable && (
            <Button onClick={onEdit} variant="ghost" size="sm" className="p-1 h-auto hover:bg-white/8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

interface FavoriteComicsProps {
  favorites: FavoriteManga[];
  isOwnProfile: boolean;
}

export function FavoriteComics({ favorites, isOwnProfile }: FavoriteComicsProps) {
  const displayedFavorites = favorites.slice(0, 6);

  return (
    <ShowcaseModule
      title="Любимая манга"
      icon={<Heart className="w-5 h-5 text-red-500" />}
      isEditable={isOwnProfile}
    >
      {displayedFavorites.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {displayedFavorites.map((manga) => (
            <div key={manga.id} className="group cursor-pointer">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2">
                <img
                  src={manga.coverImage || '/placeholder-manga.png'}
                  alt={manga.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-yellow-600 text-white text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    {manga.rating}
                  </Badge>
                </div>
              </div>
              <h4 className="text-sm font-medium text-white truncate">{manga.title}</h4>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile ? 'Добавьте мангу в избранное' : 'Нет избранной манги'}
        </div>
      )}
      {favorites.length > 6 && (
        <Button variant="outline" className="w-full mt-4 border-gray-600 text-gray-300">
          Показать все ({favorites.length})
        </Button>
      )}
    </ShowcaseModule>
  );
}

interface ReadingProgressProps {
  progress: ReadingProgress[];
  isOwnProfile: boolean;
}

export function ReadingProgressModule({ progress, isOwnProfile }: ReadingProgressProps) {
  const displayedProgress = progress.slice(0, 5);

  return (
    <ShowcaseModule
      title="Читаю сейчас"
      icon={<BookOpen className="w-5 h-5 text-blue-500" />}
      isEditable={isOwnProfile}
    >
      {displayedProgress.length > 0 ? (
        <div className="space-y-4">
          {displayedProgress.map((item) => {
            const progressPercentage = (item.currentChapter / item.totalChapters) * 100;
            return (
              <div key={item.mangaId} className="flex gap-3">
                <img
                  src={item.coverImage || '/placeholder-manga.png'}
                  alt={item.title}
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate mb-1">
                    {item.title}
                  </h4>
                  <div className="text-xs text-gray-400 mb-2">
                    Глава {item.currentChapter} из {item.totalChapters}
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(progressPercentage)}% завершено
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile ? 'Начните читать мангу' : 'Пользователь ничего не читает'}
        </div>
      )}
    </ShowcaseModule>
  );
}

interface CollectionsProps {
  collections: UserCollection[];
  isOwnProfile: boolean;
}

export function Collections({ collections, isOwnProfile }: CollectionsProps) {
  const displayedCollections = collections.slice(0, 4);

  return (
    <ShowcaseModule
      title="Коллекции"
      icon={<Folder className="w-5 h-5 text-purple-500" />}
      isEditable={isOwnProfile}
    >
      {displayedCollections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedCollections.map((collection) => (
            <div key={collection.id} className="group cursor-pointer">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-gray-800">
                {collection.coverImages.length > 0 ? (
                  <div className="grid grid-cols-2 h-full">
                    {collection.coverImages.slice(0, 4).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Folder className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>
              <h4 className="text-sm font-medium text-white truncate mb-1">
                {collection.name}
              </h4>
              <div className="text-xs text-gray-400">
                {collection.mangaCount} манги • {collection.isPublic ? 'Публичная' : 'Приватная'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile ? 'Создайте свою первую коллекцию' : 'Нет коллекций'}
        </div>
      )}
    </ShowcaseModule>
  );
}

interface ReviewsProps {
  reviews: UserReview[];
  isOwnProfile: boolean;
}

export function Reviews({ reviews, isOwnProfile }: ReviewsProps) {
  const displayedReviews = reviews.slice(0, 3);

  return (
    <ShowcaseModule
      title="Отзывы"
      icon={<MessageSquare className="w-5 h-5 text-green-500" />}
      isEditable={isOwnProfile}
    >
      {displayedReviews.length > 0 ? (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-700 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-white truncate">
                  {review.mangaTitle}
                </h4>
                <div className="flex items-center gap-1 ml-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm">{review.rating}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 line-clamp-3 mb-2">
                {review.text}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(review.createdAt).toLocaleDateString('ru-RU')}</span>
                <span>{review.likes} лайков</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile ? 'Напишите первый отзыв' : 'Нет отзывов'}
        </div>
      )}
    </ShowcaseModule>
  );
}

interface AchievementsProps {
  achievements: Achievement[];
  isOwnProfile: boolean;
}

export function Achievements({ achievements, isOwnProfile }: AchievementsProps) {
  const displayedAchievements = achievements.slice(0, 8);

  const getRarityColor = (rarity: Achievement['rarity']) => {
    const colors = {
      common: 'bg-gray-600',
      rare: 'bg-blue-600',
      epic: 'bg-purple-600',
      legendary: 'bg-yellow-600'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <ShowcaseModule
      title="Достижения"
      icon={<Trophy className="w-5 h-5 text-yellow-500" />}
      isEditable={isOwnProfile}
    >
      {displayedAchievements.length > 0 ? (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {displayedAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="group relative cursor-pointer"
              title={`${achievement.name}: ${achievement.description}`}
            >
              <div className={`w-12 h-12 rounded-lg ${getRarityColor(achievement.rarity)} flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform`}>
                {achievement.icon}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {isOwnProfile ? 'Получите первое достижение' : 'Нет достижений'}
        </div>
      )}
      {achievements.length > 8 && (
        <Button variant="outline" className="w-full mt-4 border-gray-600 text-gray-300">
          Показать все ({achievements.length})
        </Button>
      )}
    </ShowcaseModule>
  );
}
