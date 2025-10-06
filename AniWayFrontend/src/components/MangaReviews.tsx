import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReviews, ReviewData } from '../hooks/useReviews';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

interface MangaReviewsProps {
  mangaId: number;
  mangaTitle: string;
}

export const MangaReviews: React.FC<MangaReviewsProps> = ({
  mangaId,
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewData | null>(null);

  // Используем новый хук для работы с отзывами
  const {
    reviews,
    userReview,
    error,
    isLoading,
    isCreating,
    isUpdating,
    createReview,
    updateReview,
    deleteReview,
    likeReview,
    dislikeReview,
    updateCommentsCount,
    clearError
  } = useReviews(mangaId);

  // Новые состояния для фильтрации и сортировки
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');



  // Подготовка отзывов для отображения с учетом фильтрации и сортировки
  const preparedReviews = useMemo(() => {
    // Объединяем отзывы пользователя с общими отзывами
    let allReviews = [...reviews];
    
    // Добавляем userReview, если он есть и его еще нет в списке reviews
    if (userReview && !reviews.find((r: ReviewData) => r.id === userReview.id)) {
      allReviews = [userReview, ...allReviews];
    }
    
    let filteredReviews = allReviews;

    // Фильтрация по настроению
    if (activeTab === 'positive') {
      filteredReviews = allReviews.filter((r: ReviewData) => r.rating >= 8);
    } else if (activeTab === 'neutral') {
      filteredReviews = allReviews.filter((r: ReviewData) => r.rating >= 6 && r.rating < 8);
    } else if (activeTab === 'negative') {
      filteredReviews = allReviews.filter((r: ReviewData) => r.rating < 6);
    }

    // Поиск по тексту отзыва
    if (search) {
      filteredReviews = filteredReviews.filter((r: ReviewData) =>
        r.comment.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Сортировка
    filteredReviews.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'rating') {
        return sortOrder === 'desc'
          ? (b.rating - a.rating)
          : (a.rating - b.rating);
      } else {
        // Сортировка по лайкам вместо helpfulCount
        return sortOrder === 'desc'
          ? (b.likesCount - a.likesCount)
          : (a.likesCount - b.likesCount);
      }
    });

    return filteredReviews;
  }, [reviews, userReview, activeTab, search, sortBy, sortOrder]);

  // Статистика настроений
  const sentimentStats = useMemo(() => {
    // Объединяем отзывы пользователя с общими отзывами для статистики
    let allReviews = [...reviews];
    if (userReview && !reviews.find((r: ReviewData) => r.id === userReview.id)) {
      allReviews = [userReview, ...allReviews];
    }
    
    const positive = allReviews.filter((r: ReviewData) => r.rating >= 8).length;
    const neutral = allReviews.filter((r: ReviewData) => r.rating >= 6 && r.rating < 8).length;
    const negative = allReviews.filter((r: ReviewData) => r.rating < 6).length;
    const total = allReviews.length;

    return { positive, neutral, negative, total };
  }, [reviews, userReview]);

  // Обработчики для создания и обновления отзывов
  const handleCreateReview = async (rating: number, comment: string) => {
    // Валидация: комментарий обязателен
    if (!comment || comment.trim().length === 0) {
      return;
    }

    createReview(rating, comment);
    setShowForm(false);
  };

  const handleUpdateReview = async (rating: number, comment: string) => {
    if (!editingReview) return;
    
    // Валидация: комментарий обязателен
    if (!comment || comment.trim().length === 0) {
      return;
    }
    
    updateReview(editingReview.id, rating, comment);
    setEditingReview(null);
  };

  const handleDeleteReview = async (reviewId: number) => {
    deleteReview(reviewId);
  };

  const handleLikeReview = async (reviewId: number) => {
    likeReview(reviewId);
  };

  const handleDislikeReview = async (reviewId: number) => {
    dislikeReview(reviewId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10">
        <div>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Рейтинг и отзывы
              </h2>
            </div>
            
            {/* Кнопка написать/редактировать отзыв */}
            {user ? (
              !userReview ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white font-medium transition-colors flex items-center gap-2 hover:bg-white/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8" />
                  </svg>
                  Написать отзыв
                </button>
              ) : (
                <button
                  onClick={() => setEditingReview(userReview)}
                  className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white font-medium transition-colors flex items-center gap-2 hover:bg-white/10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Редактировать отзыв
                </button>
              )
            ) : (
              <div className="text-center text-sm text-gray-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Войдите для отзыва
              </div>
            )}
          </div>

          {/* Tabs and Toolbar - новый дизайн */}
          <div>
            {/* Вкладки настроения */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
              {([
                { id: 'all', label: 'Все', count: sentimentStats.total },
                { id: 'positive', label: 'Положительные', count: sentimentStats.positive },
                { id: 'neutral', label: 'Нейтральные', count: sentimentStats.neutral },
                { id: 'negative', label: 'Отрицательные', count: sentimentStats.negative },
              ] as const).map((tab, index, array) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  } ${index < array.length - 1 ? 'border-r border-white/10' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{tab.label}</span>
                    <span className="text-xs text-gray-400">{tab.count}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Toolbar сортировка + поиск */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Сортировать</span>
                <div className="relative">
                  <select
                    className="appearance-none bg-card border border-border/30 text-white text-sm rounded-lg px-3 py-2 pr-8 [&>option]:bg-card [&>option]:text-white hover:bg-secondary transition-colors"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="date" className="bg-card text-white">По дате</option>
                    <option value="rating" className="bg-card text-white">По оценке</option>
                    <option value="helpful" className="bg-card text-white">По полезности</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">▼</span>
                </div>
                <button
                  className="px-2 py-2 rounded-lg border border-border/30 bg-card text-white hover:bg-secondary transition-colors"
                  title="Порядок"
                  onClick={() => setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              <div className="flex-1">
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по отзывам"
                    className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 pl-9 placeholder:text-gray-500"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Форма для написания отзыва (когда блок "Ваш отзыв" скрыт) */}
      {(showForm || editingReview) && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6 md:p-8">
          <ReviewForm
            mangaId={mangaId}
            existingReview={editingReview || undefined}
            onSubmit={editingReview ? handleUpdateReview : handleCreateReview}
            onCancel={() => {
              setShowForm(false);
              setEditingReview(null);
              clearError();
            }}
            isSubmitting={isCreating || isUpdating}
          />

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
          Все отзывы ({preparedReviews.length})
        </h3>
        
        {preparedReviews.length === 0 ? (
          <div className="text-center py-10 md:py-12 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 px-4">
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
            {preparedReviews.map((review: ReviewData) => (
              <ReviewCard
                key={review.id}
                review={review}
                onLike={handleLikeReview}
                onDislike={handleDislikeReview}
                onEdit={setEditingReview}
                onDelete={handleDeleteReview}
                isCurrentUser={user?.id === review.userId}
                onCommentsUpdate={async () => Promise.resolve()}
              />
            ))}
          </div>
        )}
      </div>


    </div>
  );
};

export default MangaReviews;
