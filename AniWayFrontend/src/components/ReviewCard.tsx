import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildProfileUrl } from '../lib/profileUrl';
import { useResolvedAvatar } from '@/hooks/useResolvedAvatar';
import { MessageCircle } from 'lucide-react';
import RatingStars from './RatingStars';
import { MarkdownRenderer } from './markdown/MarkdownRenderer';
import { CommentSection } from './comments/CommentSection';

export interface ReviewData {
  id: number;
  userId: number;
  username: string;
  userDisplayName: string;
  userAvatar?: string;
  mangaId: number;
  rating: number;
  comment: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  trustFactor: number;
  trustFactorColor: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  canEdit: boolean;
  canDelete: boolean;
  userLiked?: boolean; // true = liked, false = disliked, null = no vote
}

interface ReviewCardProps {
  review: ReviewData;
  onLike: (reviewId: number) => void;
  onDislike: (reviewId: number) => void;
  onEdit: (review: ReviewData) => void;
  onDelete: (reviewId: number) => void;
  isCurrentUser?: boolean;
  onCommentsUpdate?: (reviewId: number) => Promise<void>;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onLike,
  onDislike,
  onEdit,
  onDelete,
  isCurrentUser = false
                                                      }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const resolvedAvatar = useResolvedAvatar(review.userId, review.userAvatar);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTrustFactorText = (factor: number) => {
    if (factor >= 8) return 'Надежный рецензент';
    if (factor >= 6) return 'Опытный рецензент';
    if (factor >= 4) return 'Активный пользователь';
    if (factor >= 2) return 'Новый рецензент';
    return 'Начинающий';
  };

  const handleLike = () => {
    onLike(review.id);
  };

  const handleDislike = () => {
    onDislike(review.id);
  };

  const handleEdit = () => {
    onEdit(review);
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      onDelete(review.id);
    }
  };

  const shouldTruncate = review.comment.length > 300;

  // Функция для получения цвета рейтинга
  const getRatingColor = () => {
    if (review.rating >= 8) {
      return 'border-green-400/40';
    } else if (review.rating >= 6) {
      return 'border-yellow-400/40';
    } else {
      return 'border-red-400/40';
    }
  };

  const borderColor = getRatingColor();

  return (
    <div className={`backdrop-blur-sm rounded-3xl p-5 md:p-6 transition-all duration-300 hover:bg-white/10 bg-white/5 border ${isCurrentUser ? `ring-1 ring-blue-400/20 border-blue-400/50` : borderColor}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Link
            to={buildProfileUrl(review.userId, review.userDisplayName, review.username)}
            className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-0 focus-visible:ring-2 focus-visible:ring-blue-400 transition-shadow"
            aria-label={`Открыть профиль ${review.userDisplayName}`}
          >
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={review.userDisplayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-white font-medium text-lg">
                {review.userDisplayName.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Link
                to={buildProfileUrl(review.userId, review.userDisplayName, review.username)}
                className="font-semibold text-white truncate max-w-[160px] sm:max-w-none hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
              >
                {review.userDisplayName}
              </Link>
              {isCurrentUser && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 whitespace-nowrap">
                  Ваш отзыв
                </span>
              )}
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full text-white whitespace-nowrap"
                style={{ backgroundColor: review.trustFactorColor }}
              >
                {getTrustFactorText(review.trustFactor)}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto sm:ml-0">
                <span className="hidden sm:inline">{formatDate(review.createdAt)}</span>
                {review.isEdited && (
                  <span className="text-gray-500">(изменено)</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300 flex-wrap">
              <div className="flex items-center gap-2">
                <RatingStars rating={review.rating} maxRating={10} size="sm" />
              </div>
              <span className="sm:hidden text-xs text-gray-400">
                {formatDate(review.createdAt)}
                {review.isEdited && ' (изменено)'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-end -mt-2 sm:mt-0">
          {review.canEdit && (
            <button
              onClick={handleEdit}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Редактировать"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {review.canDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Удалить"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <div className="mb-4">
          {isExpanded || !shouldTruncate ? (
            <div className="markdown-body text-gray-200 leading-relaxed text-sm md:text-base">
              <MarkdownRenderer value={review.comment} />
            </div>
          ) : (
            <div className="text-gray-200 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
              {review.comment.slice(0,300)}...
            </div>
          )}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-400 hover:text-blue-300 text-sm mt-2 font-medium"
            >
              {isExpanded ? 'Свернуть' : 'Читать полностью'}
            </button>
          )}
        </div>
      )}

      {/* Footer with likes/dislikes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/20">
        <div className="flex items-center flex-wrap gap-3 sm:gap-4">
          {/* Like button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              review.userLiked === true
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'text-gray-400 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>{review.likesCount}</span>
          </button>

          {/* Dislike button */}
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              review.userLiked === false
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-gray-400 hover:bg-red-500/10 hover:text-red-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>{review.dislikesCount}</span>
          </button>

          {/* Comments button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-gray-400 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Комментарии</span>
            {review.commentsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                {review.commentsCount}
              </span>
            )}
          </button>
        </div>

        {/* Trust factor */}
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span className="hidden sm:inline">Фактор доверия:</span>
          <span className="font-medium">{review.trustFactor.toFixed(1)}</span>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <CommentSection
            targetId={review.id}
            type="REVIEW"
            title="Комментарии к отзыву"
            maxLevel={2}
            hideHeader
          />
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
