import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FavoriteManga,
  UserReadingProgress,
  UserCollection,
  UserReview,
  Achievement
} from '@/types/profile';
import { CommentResponseDTO, EnhancedCommentResponseDTO } from '@/types/comments';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useUserComments, EnhancedCommentResponseDTO as HookEnhancedCommentResponseDTO } from '@/hooks/useUserComments';
import { useUserReviews } from '@/hooks/useUserReviews';
import {
  Heart,
  BookOpen,
  Folder,
  MessageSquare,
  Trophy,
  Star,
  MoreHorizontal,
  ThumbsUp,
  Reply
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
          {isOwnProfile ? (
            <div>
              <p>Добавьте мангу в избранное</p>
            </div>
          ) : (
            <div>
              <p className="mb-2">💝 Избранное скрыто</p>
              <p className="text-xs">Пользователь не открыл свои избранные манги для публичного просмотра</p>
            </div>
          )}
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
  progress: UserReadingProgress[];
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
          {isOwnProfile ? (
            <div>
              <p>Начните читать мангу</p>
            </div>
          ) : (
            <div>
              <p className="mb-2">📖 Прогресс чтения скрыт</p>
              <p className="text-xs">Пользователь не открыл свой прогресс для публичного просмотра</p>
            </div>
          )}
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
          {isOwnProfile ? (
            <div>
              <p>Создайте свою первую коллекцию</p>
            </div>
          ) : (
            <div>
              <p className="mb-2">📚 Коллекции скрыты</p>
              <p className="text-xs">Пользователь не открыл свои коллекции для публичного просмотра</p>
            </div>
          )}
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

// Вспомогательная функция для получения типа комментария на русском
function getCommentTypeText(type: string): string {
  switch (type) {
    case 'MANGA':
      return 'Манга';
    case 'CHAPTER':
      return 'Глава';
    case 'PROFILE':
      return 'Профиль';
    case 'REVIEW':
      return 'Отзыв';
    default:
      return type;
  }
}

interface UserCommentsProps {
  userId: number;
  isOwnProfile: boolean;
}

export function UserComments({ userId, isOwnProfile }: UserCommentsProps) {
  const [showAll, setShowAll] = useState(false);
  const { comments, loading, error } = useUserComments(userId, showAll ? 50 : 5);

  const getCommentTypeText = (type: string): string => {
    switch (type) {
      case 'MANGA': return 'Манга';
      case 'CHAPTER': return 'Глава';
      case 'PROFILE': return 'Профиль';
      case 'REVIEW': return 'Отзыв';
      default: return type;
    }
  };

  const getCommentTypeIcon = (type: string): string => {
    switch (type) {
      case 'MANGA': return '📖';
      case 'CHAPTER': return '📄';
      case 'PROFILE': return '👤';
      case 'REVIEW': return '⭐';
      default: return '❓';
    }
  };

  const getCommentTypeColor = (type: string): string => {
    switch (type) {
      case 'MANGA': return 'text-purple-400';
      case 'CHAPTER': return 'text-blue-400';
      case 'PROFILE': return 'text-green-400';
      case 'REVIEW': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const calculateRating = (comment: CommentResponseDTO) => {
    return comment.likesCount - comment.dislikesCount;
  };

  if (loading) {
    return (
      <ShowcaseModule
        title="Комментарии пользователя"
        icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
        isEditable={false}
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="h-16 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </ShowcaseModule>
    );
  }

  if (error) {
    return (
      <ShowcaseModule
        title="Комментарии пользователя"
        icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
        isEditable={false}
      >
        <div className="text-center py-8 text-red-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-lg mb-2">⚠️ Ошибка загрузки</p>
          <p className="text-sm">{error}</p>
        </div>
      </ShowcaseModule>
    );
  }

  return (
    <ShowcaseModule
      title="Комментарии пользователя"
      icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
      isEditable={false}
    >
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => {
            const rating = calculateRating(comment);
            const isReply = comment.parentCommentId !== null;
            const commentType = (comment as any).commentType || comment.type;
            
            return (
              <div key={comment.id} className="border-b border-gray-700 last:border-b-0 pb-4 last:pb-0">
                {/* Заголовок комментария */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {getCommentTypeText(commentType || 'UNKNOWN')}
                      </Badge>
                      <span className={`text-xs flex items-center gap-1 ${getCommentTypeColor(commentType || 'UNKNOWN')}`}>
                        <span>{getCommentTypeIcon(commentType || 'UNKNOWN')}</span>
                        <span className="truncate max-w-48">
                          {commentType} #{comment.targetId}
                        </span>
                      </span>
                    </div>
                    
                    {/* Информация об авторе */}
                    <div className="text-xs text-gray-500 mb-1">
                      от <span className="text-blue-400 font-medium">{comment.username}</span>
                      {isReply && comment.parentCommentAuthor && (
                        <span className="ml-2 text-orange-400">
                          в ответ на @{comment.parentCommentAuthor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Рейтинг и статистика */}
                  <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                    <div className={`flex items-center gap-1 font-medium ${
                      rating > 0 ? 'text-green-400' : 
                      rating < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      <ThumbsUp className={`w-3 h-3 ${rating < 0 ? 'rotate-180' : ''}`} />
                      <span>{rating > 0 ? `+${rating}` : rating}</span>
                    </div>
                  </div>
                </div>

                {/* Содержимое комментария */}
                <div className="relative">
                  {isReply && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-400 to-transparent"></div>
                  )}
                  
                  {/* Цитата родительского комментария (если есть) */}
                  {isReply && comment.parentCommentContent && (
                    <div className="mb-2 pl-3 border-l-2 border-orange-400/30">
                      <div className="bg-gray-800/50 rounded-md p-2 text-xs">
                        <div className="flex items-center gap-1 mb-1 text-orange-400">
                          <Reply className="w-3 h-3" />
                          <span>@{comment.parentCommentAuthor}:</span>
                        </div>
                        <p className="text-gray-400 italic line-clamp-2">
                          "{comment.parentCommentContent}"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className={`text-sm text-gray-300 line-clamp-3 mb-2 ${isReply ? 'pl-3' : 'pl-2'} ${
                    isReply ? 'border-l-2 border-orange-400/30' : 'border-l-2 border-gray-700'
                  }`}>
                    {comment.content}
                  </p>
                </div>

                {/* Метаинформация */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-2">
                    <time dateTime={comment.createdAt}>
                      {new Date(comment.createdAt).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {comment.isEdited && (
                      <span className="text-yellow-400 text-xs px-1.5 py-0.5 rounded bg-yellow-400/10">
                        ред.
                      </span>
                    )}
                    {comment.isDeleted && (
                      <span className="text-red-400 text-xs px-1.5 py-0.5 rounded bg-red-400/10">
                        удален
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {comments.length >= 5 && (
            <Button 
              variant="outline" 
              className="w-full mt-4 border-gray-600 text-gray-300 hover:bg-white/8"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Скрыть комментарии' : 'Показать все комментарии'}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-lg mb-2">💬 {isOwnProfile ? 'Ваши комментарии' : 'Комментарии пользователя'}</p>
          <p>{isOwnProfile ? 'Напишите первый комментарий' : 'Пользователь пока не оставлял комментариев'}</p>
        </div>
      )}
    </ShowcaseModule>
  );
}

// Новый компонент для отзывов пользователя
interface UserReviewsShowcaseProps {
  userId: number;
  isOwnProfile: boolean;
}

export function UserReviewsShowcase({ userId, isOwnProfile }: UserReviewsShowcaseProps) {
  const { reviews, loading, error } = useUserReviews(userId, 3);

  if (loading) {
    return (
      <ShowcaseModule
        title="Отзывы"
        icon={<Star className="w-5 h-5 text-green-500" />}
        isEditable={isOwnProfile}
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2 mb-2"></div>
              <div className="h-16 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </ShowcaseModule>
    );
  }

  if (error) {
    return (
      <ShowcaseModule
        title="Отзывы"
        icon={<Star className="w-5 h-5 text-green-500" />}
        isEditable={isOwnProfile}
      >
        <div className="text-center py-8 text-red-400">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-lg mb-2">⚠️ Ошибка загрузки</p>
          <p className="text-sm">{error}</p>
        </div>
      </ShowcaseModule>
    );
  }

  return (
    <ShowcaseModule
      title="Отзывы"
      icon={<Star className="w-5 h-5 text-green-500" />}
      isEditable={isOwnProfile}
    >
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-700 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-white truncate">
                  {review.mangaTitle || `Манга #${review.mangaId}`}
                </h4>
                <div className="flex items-center gap-1 ml-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm">{review.rating}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 line-clamp-3 mb-2">
                {review.comment}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(review.createdAt).toLocaleDateString('ru-RU')}</span>
                <div className="flex items-center gap-2">
                  <span>{review.likesCount} лайков</span>
                  {review.isEdited && (
                    <span className="text-yellow-400 text-xs px-1.5 py-0.5 rounded bg-yellow-400/10">
                      ред.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-lg mb-2">⭐ Отзывы</p>
          <p>{isOwnProfile ? 'Напишите первый отзыв' : 'Пользователь пока не оставлял отзывов'}</p>
        </div>
      )}
    </ShowcaseModule>
  );
}

