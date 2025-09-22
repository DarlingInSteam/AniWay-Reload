import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { commentService } from '../services/commentService';
import RatingStars from './RatingStars';
import ReviewCard, { ReviewData } from './ReviewCard';
import ReviewForm from './ReviewForm';

interface MangaRatingData {
  mangaId: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: number[]; // Array of 10 elements for ratings 1-10
}

interface MangaReviewsProps {
  mangaId: number;
  mangaTitle: string;
}

export const MangaReviews: React.FC<MangaReviewsProps> = ({
  mangaId,
  mangaTitle
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [userReview, setUserReview] = useState<ReviewData | null>(null);
  const [ratingData, setRatingData] = useState<MangaRatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
    loadRatingData();
    if (user) {
      loadUserReview();
    }
  }, [mangaId, user]);

  const loadReviews = async () => {
    try {
      const headers: any = {};
      if (authService.getToken()) {
        headers['Authorization'] = `Bearer ${authService.getToken()}`;
      }
      
      const response = await fetch(`/api/auth/reviews/manga/${mangaId}`, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        
        // Загружаем количество комментариев для каждого отзыва
        const reviewsWithComments = await Promise.all(
          data.map(async (review: ReviewData) => {
            try {
              const commentsCount = await commentService.getCommentsCount(review.id, 'REVIEW');
              return { ...review, commentsCount };
            } catch (error) {
              console.error(`Failed to load comments count for review ${review.id}:`, error);
              return { ...review, commentsCount: 0 };
            }
          })
        );
        
        setReviews(reviewsWithComments);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setError('Не удалось загрузить отзывы');
    }
  };

  const loadRatingData = async () => {
    try {
      const response = await fetch(`/api/auth/reviews/manga/${mangaId}/rating`);
      if (response.ok) {
        const data = await response.json();
        setRatingData(data);
      }
    } catch (error) {
      console.error('Failed to load rating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserReview = async () => {
    try {
      const response = await fetch(`/api/auth/reviews/manga/${mangaId}/my`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Загружаем количество комментариев для пользовательского отзыва
        try {
          const commentsCount = await commentService.getCommentsCount(data.id, 'REVIEW');
          setUserReview({ ...data, commentsCount });
        } catch (error) {
          console.error(`Failed to load comments count for user review ${data.id}:`, error);
          setUserReview({ ...data, commentsCount: 0 });
        }
      }
    } catch (error) {
      console.error('Failed to load user review:', error);
    }
  };

  const handleCreateReview = async (rating: number, comment: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/reviews/manga/${mangaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (response.ok) {
        const newReview = await response.json();
        setUserReview({ ...newReview, commentsCount: 0 });
        setShowForm(false);
        await loadReviews();
        await loadRatingData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Не удалось создать отзыв');
      }
    } catch (error) {
      console.error('Failed to create review:', error);
      setError('Не удалось создать отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReview = async (rating: number, comment: string) => {
    if (!editingReview) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (response.ok) {
        const updatedReview = await response.json();
        // Сохраняем текущее количество комментариев
        const currentCommentsCount = editingReview.commentsCount || 0;
        setUserReview({ ...updatedReview, commentsCount: currentCommentsCount });
        setEditingReview(null);
        await loadReviews();
        await loadRatingData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Не удалось обновить отзыв');
      }
    } catch (error) {
      console.error('Failed to update review:', error);
      setError('Не удалось обновить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/auth/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (response.ok) {
        setUserReview(null);
        await loadReviews();
        await loadRatingData();
      } else {
        setError('Не удалось удалить отзыв');
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      setError('Не удалось удалить отзыв');
    }
  };

  const handleLikeReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/auth/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (response.ok) {
        await loadReviews();
      }
    } catch (error) {
      console.error('Failed to like review:', error);
    }
  };

  const handleDislikeReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/auth/reviews/${reviewId}/dislike`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });

      if (response.ok) {
        await loadReviews();
      }
    } catch (error) {
      console.error('Failed to dislike review:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="p-2.5 md:p-3 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Рейтинг и отзывы
            </h2>
          </div>
          
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-5">
            {/* Overall Rating - более крупный блок */}
            <div className="lg:col-span-2">
              <div className="text-center p-5 md:p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="mb-5 md:mb-6">
                  <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2 md:mb-3">
                    {ratingData?.averageRating ? ratingData.averageRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-sm text-gray-400 font-medium mb-3">из 10 баллов</div>
                  
                  {/* Звезды в две строки по 5 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="w-5 h-5 md:w-6 md:h-6">
                          <svg
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            className={star <= (ratingData?.averageRating || 0) ? "text-yellow-400" : "text-gray-600"}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {[6, 7, 8, 9, 10].map((star) => (
                        <div key={star} className="w-5 h-5 md:w-6 md:h-6">
                          <svg
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            className={star <= (ratingData?.averageRating || 0) ? "text-yellow-400" : "text-gray-600"}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2V10a2 2 0 012-2h2m2-4h.01m6.938 9.055a2.46 2.46 0 01-.346 1.258l-1.188 2.134c-.33.591-.93.906-1.566.906-.636 0-1.235-.315-1.566-.906L13.654 15.3a2.46 2.46 0 01-.346-1.258c0-1.359 1.1-2.46 2.46-2.46s2.46 1.1 2.46 2.46z" />
                  </svg>
                  <span className="text-sm font-medium">
                    {ratingData?.totalReviews || 0} отзывов
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Distribution - улучшенный дизайн */}
            <div className="lg:col-span-3">
              <div className="p-5 md:p-6 bg-white/5 rounded-2xl border border-white/10 h-full">
                <h3 className="font-bold text-white mb-5 md:mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                  <span className="text-sm md:text-base">Распределение оценок</span>
                </h3>
                {ratingData && ratingData.totalReviews > 0 ? (
                  <div className="space-y-3">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingData.ratingDistribution[rating - 1] || 0;
                      const percentage = (count / ratingData.totalReviews) * 100;
                      
                      return (
                        <div key={rating} className="group">
                          <div className="flex items-center gap-3 md:gap-4 mb-1">
                            <div className="flex items-center gap-2 w-11 md:w-12">
                              <span className="text-xs md:text-sm font-bold text-white w-5 md:w-6">{rating}</span>
                              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 relative">
                              <div className="h-2.5 md:h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out group-hover:from-yellow-300 group-hover:via-orange-400 group-hover:to-red-400"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              {percentage > 10 && (
                                <span className="absolute right-2 top-0 text-[10px] md:text-xs font-bold text-white/90 leading-3">
                                  {percentage.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <span className="text-xs md:text-sm font-medium text-gray-300 w-7 md:w-8 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm">Пока нет оценок</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Review Section */}
      {user && (
        <div>
          {!userReview && !showForm && !editingReview && (
            <div className="text-center">
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                Написать отзыв
              </button>
            </div>
          )}

          {userReview && !editingReview && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Ваш отзыв</h3>
              <ReviewCard
                review={userReview}
                onLike={handleLikeReview}
                onDislike={handleDislikeReview}
                onEdit={setEditingReview}
                onDelete={handleDeleteReview}
              />
            </div>
          )}

          {(showForm || editingReview) && (
            <ReviewForm
              mangaId={mangaId}
              existingReview={editingReview || undefined}
              onSubmit={editingReview ? handleUpdateReview : handleCreateReview}
              onCancel={() => {
                setShowForm(false);
                setEditingReview(null);
                setError(null);
              }}
              isSubmitting={submitting}
            />
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}
        </div>
      )}

      {/* All Reviews */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6">
          Все отзывы ({reviews.length})
        </h3>
        
        {reviews.length === 0 ? (
          <div className="text-center py-10 md:py-12 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 px-4">
            <div className="text-gray-400 mb-4">
              <svg className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-base md:text-lg text-white">Пока нет отзывов</p>
              <p className="text-xs md:text-sm">Станьте первым, кто оставит отзыв об этой манге!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onLike={handleLikeReview}
                onDislike={handleDislikeReview}
                onEdit={setEditingReview}
                onDelete={handleDeleteReview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MangaReviews;
